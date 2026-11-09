#!/usr/bin/env node
'use strict';

/*
 * Deterministic lifecycle and module-timeline checks against actual source.
 * Run: node scripts/verify_agent_build.cjs
 * Optional precompiled IIFE: --bundle <path> (global name AgentBuildTest).
 * This small hook runner supplies a fake clock and browser events. DOM/CSS,
 * focus, and animation rendering still need the browser smoke test.
 */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
let temporaryDirectory;

function readBundle() {
  const args = process.argv.slice(2);
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--bundle') {
      throw new Error('Usage: node scripts/verify_agent_build.cjs [--bundle <AgentBuildTest IIFE>]');
    }
    return fs.readFileSync(path.resolve(args[1]), 'utf8');
  }

  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-build-tests-'));
  const source = path.join(root, 'src', 'agent-build.jsx');
  const output = path.join(temporaryDirectory, 'agent-build.js');
  const options = { cwd: root, encoding: 'utf8', stdio: 'pipe' };
  if (process.platform === 'win32') {
    // Environment arguments keep Unicode/spaces in local paths out of shell code.
    execFileSync('powershell.exe', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
      '$ErrorActionPreference = "Stop"; & npx.cmd --yes esbuild $env:AGENT_BUILD_TEST_SOURCE --bundle --format=iife --global-name=AgentBuildTest "--outfile=$env:AGENT_BUILD_TEST_OUTPUT"; exit $LASTEXITCODE',
    ], { ...options, env: { ...process.env, AGENT_BUILD_TEST_SOURCE: source, AGENT_BUILD_TEST_OUTPUT: output } });
  } else {
    execFileSync('npx', [
      '--yes', 'esbuild', source, '--bundle', '--format=iife',
      '--global-name=AgentBuildTest', `--outfile=${output}`,
    ], options);
  }
  return fs.readFileSync(output, 'utf8');
}

function removeTemporaryBundle() {
  if (!temporaryDirectory) return;
  const resolved = path.resolve(temporaryDirectory);
  // Only remove the directory this process created directly under the temp root.
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('agent-build-tests-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    emit(type, event = {}) { [...(listeners.get(type) || [])].forEach(listener => listener(event)); },
    count() { return [...listeners.values()].reduce((total, entries) => total + entries.size, 0); },
  };
}

function createHarness(source, { reducedMotion = false, hidden = false } = {}) {
  let slots = [], cursor = 0, pendingEffects = [], dirty = false, api;
  let now = 0, nextTimerId = 0, mounted = true;
  const timers = new Map();
  const clocks = new Set();
  const document = { ...eventTarget(), visibilityState: hidden ? 'hidden' : 'visible' };
  const preference = { ...eventTarget(), matches: reducedMotion };
  const window = { ...eventTarget(), matchMedia: () => preference };
  const sameDependencies = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

  const React = {
    useState(initial) {
      const slot = cursor++;
      if (!slots[slot]) slots[slot] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[slot].value, update => {
        assert.ok(mounted, 'No state updates should occur after unmount');
        const value = typeof update === 'function' ? update(slots[slot].value) : update;
        if (!Object.is(slots[slot].value, value)) {
          slots[slot].value = value;
          dirty = true;
        }
      }];
    },
    useEffect(effect, dependencies) {
      const slot = cursor++;
      if (!slots[slot] || !sameDependencies(slots[slot].dependencies, dependencies)) {
        pendingEffects.push(() => {
          slots[slot]?.cleanup?.();
          slots[slot] = { dependencies, cleanup: effect() };
        });
      }
    },
    useCallback(callback, dependencies) {
      const slot = cursor++;
      if (!slots[slot] || !sameDependencies(slots[slot].dependencies, dependencies)) {
        slots[slot] = { dependencies, value: callback };
      }
      return slots[slot].value;
    },
    useMemo(factory, dependencies) {
      const slot = cursor++;
      if (!slots[slot] || !sameDependencies(slots[slot].dependencies, dependencies)) {
        slots[slot] = { dependencies, value: factory() };
      }
      return slots[slot].value;
    },
    useRef(initial) {
      const slot = cursor++;
      if (!slots[slot]) slots[slot] = { value: { current: initial } };
      return slots[slot].value;
    },
  };
  React.useLayoutEffect = React.useEffect;
  const context = vm.createContext({
    React, document, window, performance: { now: () => now },
    setTimeout(callback, delay) {
      const id = ++nextTimerId;
      timers.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) {
      const id = ++nextTimerId;
      timers.set(id, { callback: () => callback(now), due: now + 16 });
      return id;
    },
    cancelAnimationFrame(id) { timers.delete(id); },
  });
  vm.runInContext(source, context, { filename: 'agent-build.test-bundle.js' });
  assert.equal(typeof context.AgentBuildTest?.useAgentBuild, 'function', 'Bundle must export AgentBuildTest.useAgentBuild');

  function flush() {
    let renderCount = 0;
    do {
      assert.ok(++renderCount < 30, 'Hook should settle without an effect/render loop');
      dirty = false;
      cursor = 0;
      pendingEffects = [];
      api = context.AgentBuildTest.useAgentBuild();
      pendingEffects.forEach(effect => effect());
    } while (dirty);
  }

  function advance(milliseconds) {
    const end = now + milliseconds;
    while (true) {
      const next = [...timers]
        .filter(([, timer]) => timer.due <= end)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      now = next[1].due;
      timers.delete(next[0]);
      next[1].callback();
      flush();
    }
    now = end;
  }

  flush();
  return {
    get build() { return api; },
    get frame() { return context.AgentBuildTest.getAgentModuleFrame; },
    get splitWork() { return context.AgentBuildTest.splitAgentWork; },
    createClock(options) {
      assert.equal(typeof context.AgentBuildTest.createAgentModuleClock, 'function');
      const clock = context.AgentBuildTest.createAgentModuleClock(options);
      clocks.add(clock);
      return clock;
    },
    get now() { return now; },
    get timerCount() { return timers.size; },
    get listenerCount() { return document.count() + window.count() + preference.count(); },
    advance,
    act(action) { action(api); flush(); },
    visibility(visible) {
      document.visibilityState = visible ? 'visible' : 'hidden';
      document.emit('visibilitychange');
      flush();
    },
    motion(reduced) {
      preference.matches = reduced;
      preference.emit('change', { matches: reduced });
      flush();
    },
    key(key) { window.emit('keydown', { key }); flush(); },
    unmount() {
      if (!mounted) return;
      slots.forEach(slot => slot?.cleanup?.());
      clocks.forEach(clock => clock.dispose());
      mounted = false;
      assert.equal(timers.size, 0, 'Unmount must cancel all scheduled timers');
      assert.equal(this.listenerCount, 0, 'Unmount must detach all browser listeners');
    },
  };
}

function runChecks(source) {
  let passed = 0;
  function check(name, run, options) {
    const harness = createHarness(source, options);
    try {
      run(harness);
    } finally {
      harness.unmount();
    }
    console.log(`PASS ${name}`);
    passed++;
  }

  check('no modules means no running work or global deadline', h => {
    assert.equal(h.build.enabled, true);
    assert.equal(h.build.modulePending, 0);
    assert.equal(h.build.moduleActive, 0);
    assert.equal(h.build.moduleRunning, false);
    assert.equal(h.timerCount, 0);
    h.advance(120000);
    assert.equal(h.build.enabled, true, 'Elapsed wall time must not disable future modules');
  });
  check('pending, active and completed modules are aggregated independently', h => {
    h.act(build => {
      build.reportModule('identity', 'pending');
      build.reportModule('work', 'pending');
      build.reportModule('knowledge', 'active');
      build.reportModule('footer', 'complete');
    });
    assert.equal(h.build.modulePending, 2);
    assert.equal(h.build.moduleActive, 1);
    assert.equal(h.build.moduleRunning, true);
    assert.equal(h.build.running, h.build.moduleRunning);
    h.act(build => build.reportModule('knowledge', 'complete'));
    assert.equal(h.build.moduleActive, 0);
    assert.equal(h.build.moduleRunning, true, 'Pending sections still have work remaining');
    h.act(build => {
      build.reportModule('identity', 'active');
      build.reportModule('identity', 'active');
      build.reportModule('work', 'complete');
    });
    assert.equal(h.build.modulePending, 0);
    assert.equal(h.build.moduleActive, 1, 'Repeated status reports must not duplicate a module');
    h.act(build => build.reportModule('identity', 'complete'));
    assert.equal(h.build.moduleRunning, false);
    assert.equal(h.build.enabled, true, 'Completed modules must not disable later mounted work');
  });
  check('unregistering modules removes their pending and active counts', h => {
    h.act(build => {
      build.reportModule('one', 'pending');
      build.reportModule('two', 'active');
    });
    h.act(build => {
      build.reportModule('one', null);
      build.reportModule('two', null);
      build.reportModule('missing', null);
    });
    assert.equal(h.build.modulePending, 0);
    assert.equal(h.build.moduleActive, 0);
    assert.equal(h.build.moduleRunning, false);
  });
  check('pending offscreen modules survive arbitrary wall time', h => {
    h.act(build => build.reportModule('offscreen', 'pending'));
    h.advance(120000);
    assert.equal(h.build.modulePending, 1);
    assert.equal(h.build.moduleRunning, true);
    assert.equal(h.timerCount, 0, 'Pending work must not create a shared timer');
  });
  check('skip disables all work even before module reports settle', h => {
    h.act(build => {
      build.reportModule('one', 'pending');
      build.reportModule('two', 'active');
    });
    h.act(build => build.skip());
    assert.equal(h.build.enabled, false);
    assert.equal(h.build.moduleRunning, false);
    h.visibility(false);
    h.visibility(true);
    h.act(build => build.reportModule('late-module', 'pending'));
    assert.equal(h.build.moduleRunning, false);
  });
  check('replay increments the run and accepts freshly reset module states', h => {
    h.act(build => build.reportModule('one', 'complete'));
    const initialRun = h.build.runId;
    h.act(build => build.replay());
    assert.equal(h.build.runId, initialRun + 1);
    assert.equal(h.build.enabled, true);
    h.act(build => build.reportModule('one', 'pending'));
    assert.equal(h.build.modulePending, 1);
    h.act(build => build.skip());
    h.act(build => build.replay());
    assert.equal(h.build.runId, initialRun + 2);
    assert.equal(h.build.moduleRunning, true);
  });
  check('initially hidden and later visible pages expose the correct pause signal', h => {
    assert.equal(h.build.pageVisible, false);
    h.act(build => build.reportModule('one', 'pending'));
    h.advance(10000);
    assert.equal(h.build.modulePending, 1);
    assert.equal(h.timerCount, 0);
    h.visibility(true);
    assert.equal(h.build.pageVisible, true);
    h.visibility(false);
    assert.equal(h.build.pageVisible, false);
  }, { hidden: true });
  check('Escape skips pending work while unrelated keys leave it enabled', h => {
    h.act(build => build.reportModule('one', 'pending'));
    h.key('ArrowRight');
    assert.equal(h.build.enabled, true);
    h.key('Escape');
    assert.equal(h.build.enabled, false);
    assert.equal(h.build.moduleRunning, false);
  });
  check('initial reduced motion disables modules, including replay', h => {
    assert.equal(h.build.reducedMotion, true);
    assert.equal(h.build.enabled, false);
    h.act(build => build.reportModule('one', 'pending'));
    assert.equal(h.build.moduleRunning, false);
    assert.equal(h.timerCount, 0);
    h.act(build => build.replay());
    assert.equal(h.build.enabled, false);
    assert.equal(h.timerCount, 0);
  }, { reducedMotion: true });
  check('preference changes stop activity and require an explicit replay', h => {
    h.act(build => build.reportModule('one', 'active'));
    h.motion(true);
    assert.equal(h.build.reducedMotion, true);
    assert.equal(h.build.enabled, false);
    assert.equal(h.build.moduleRunning, false);
    h.motion(false);
    assert.equal(h.build.reducedMotion, false);
    assert.equal(h.build.enabled, false);
    h.act(build => build.replay());
    assert.equal(h.build.enabled, true);
    assert.equal(h.build.moduleRunning, true);
  });

  check('each timeline draws its frame, clicks, types progressively, then styles', h => {
    assert.equal(typeof h.frame, 'function');
    for (const length of [1, 24, 180, 700, 4000, 25000]) {
      const duration = h.frame(0, length).doneAt;
      assert.equal(duration, 2000, 'Every non-empty module must use the same two-second visible-time budget');
      const phases = [];
      let previousCount = 0;
      let sawPartialText = false;
      for (let elapsed = 0; elapsed <= duration; elapsed++) {
        const frame = h.frame(elapsed, length);
        if (phases.at(-1) !== frame.phase) phases.push(frame.phase);
        for (const property of ['frameProgress', 'travelProgress', 'clickProgress', 'styleProgress']) {
          assert.ok(Number.isFinite(frame[property]) && frame[property] >= 0 && frame[property] <= 1, `${property} must stay in [0, 1]`);
        }
        assert.ok(Number.isInteger(frame.count) && frame.count >= previousCount && frame.count <= length);
        if (['framing', 'arriving', 'clicking'].includes(frame.phase)) {
          assert.equal(frame.count, 0, 'Raw text cannot appear before the frame and click finish');
          assert.equal(frame.styleProgress, 0);
        }
        if (frame.count > 0) assert.equal(frame.frameProgress, 1, 'Typing follows the completed outline');
        if (frame.count < length) assert.equal(frame.styleProgress, 0, 'Styling cannot begin before every character is typed');
        if (frame.phase === 'typing') assert.equal(frame.styleProgress, 0);
        if (frame.phase === 'styling') assert.equal(frame.count, length);
        if (frame.count > 0 && frame.count < length) sawPartialText = true;
        previousCount = frame.count;
      }
      assert.deepEqual(phases, ['framing', 'arriving', 'clicking', 'typing', 'styling', 'complete']);
      if (length > 1) assert.ok(sawPartialText, 'Text must have intermediate reveal states');
      assert.equal(previousCount, length);
      assert.equal(h.frame(duration + 10000, length).phase, 'complete');
      assert.equal(h.frame(duration, length).styleProgress, 1);
    }
  });
  check('parallel assignments preserve exact content and use bounded team sizes', h => {
    const samples = [
      '', 'Short introduction.', 'x'.repeat(349), 'x'.repeat(350),
      'A long unbroken word '.repeat(45),
      ['Situation: ' + 'context '.repeat(30), 'Task: ' + 'goal '.repeat(35), 'Action: ' + 'method '.repeat(65), 'Result: Delivered the working system.'].join('\n'),
      '👩🏽‍💻你好e\u0301 '.repeat(220),
    ];
    for (const original of samples) {
      const chunks = Array.from(h.splitWork(original));
      assert.equal(chunks.join(''), original, 'Workers must never omit, duplicate or reorder raw text');
      assert.ok(chunks.length >= 1 && chunks.length <= 3);
      if (chunks.length > 1) assert.ok(chunks.every(chunk => chunk.length > 0), 'Every worker must receive real work');
      const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(original)].map(item => item.segment);
      assert.equal(chunks.length, segments.length >= 800 ? 3 : segments.length >= 350 ? 2 : 1);
      let offset = 0;
      const boundaries = new Set([0]);
      for (const segment of segments) { offset += segment.length; boundaries.add(offset); }
      offset = 0;
      for (const chunk of chunks) {
        offset += chunk.length;
        assert.ok(boundaries.has(offset), 'A worker boundary cannot cut a grapheme cluster');
      }
    }
  });
  check('parallel workers reveal different chunks simultaneously and finish together', h => {
    const chunks = Array.from(h.splitWork(['Situation: ' + 'context '.repeat(30), 'Task: ' + 'goal '.repeat(35), 'Action: ' + 'method '.repeat(65), 'Result: Shipped.'].join('\n')));
    assert.equal(chunks.length, 3);
    const frames = chunks.map(chunk => h.frame(1000, chunk.length));
    assert.ok(frames.every(frame => frame.phase === 'typing' && frame.count > 0), 'Every worker must be genuinely revealing its own content');
    assert.ok(frames.every((frame, index) => frame.count < chunks[index].length));
    const deadlines = chunks.map(chunk => h.frame(0, chunk.length).doneAt);
    assert.equal(new Set(deadlines).size, 1, 'Worker count must not extend the module deadline');
    assert.equal(deadlines[0], 2000);
    for (const chunk of chunks) {
      const styled = h.frame(1800, chunk.length);
      assert.equal(styled.phase, 'styling');
      assert.equal(styled.count, chunk.length, 'All content precedes the unified styling phase');
      assert.equal(h.frame(2000, chunk.length).phase, 'complete');
    }
  });
  check('empty modules are complete without a timeline', h => {
    const frame = h.frame(0, 0);
    assert.equal(frame.phase, 'complete');
    assert.equal(frame.count, 0);
    assert.equal(frame.doneAt, 0);
    assert.equal(frame.styleProgress, 1);
  });
  check('module clocks start only when resumed and complete without overshoot', h => {
    const ticks = [];
    const clock = h.createClock({ duration: 1000, onTick: elapsed => ticks.push(elapsed) });
    h.advance(5000);
    assert.equal(ticks.length, 0);
    assert.equal(clock.elapsed, 0);
    clock.resume();
    clock.resume();
    assert.equal(h.timerCount, 1, 'Repeated resume must not duplicate scheduled work');
    h.advance(1000);
    assert.equal(clock.elapsed, 1000);
    assert.equal(ticks.at(-1), 1000);
    assert.ok(ticks.every((value, index) => value >= 0 && value <= 1000 && (!index || value > ticks[index - 1])));
    assert.equal(h.timerCount, 0);
    const completedTicks = ticks.length;
    clock.resume();
    h.advance(5000);
    assert.equal(ticks.length, completedTicks);
  });
  check('pausing one module does not pause another or consume hidden time', h => {
    const ticksA = [], ticksB = [];
    const a = h.createClock({ duration: 1000, onTick: elapsed => ticksA.push(elapsed) });
    const b = h.createClock({ duration: 1000, onTick: elapsed => ticksB.push(elapsed) });
    a.resume();
    b.resume();
    h.advance(205);
    a.pause();
    assert.equal(a.elapsed, 205, 'Pause preserves time since the last tick');
    const pausedTicks = ticksA.length;
    a.pause();
    h.advance(795);
    assert.equal(a.elapsed, 205);
    assert.equal(ticksA.length, pausedTicks);
    assert.equal(b.elapsed, 1000);
    a.resume();
    h.advance(795);
    assert.equal(a.elapsed, 1000);
    assert.equal(h.timerCount, 0);
  });
  check('page visibility can pause all clocks without resetting their progress', h => {
    const clock = h.createClock({ duration: 1000, onTick: () => {} });
    clock.resume();
    h.advance(225);
    h.visibility(false);
    assert.equal(h.build.pageVisible, false);
    // AgentModule reacts to this exposed signal by calling pause/resume.
    clock.pause();
    h.advance(30000);
    assert.equal(clock.elapsed, 225);
    assert.equal(h.timerCount, 0);
    h.visibility(true);
    clock.resume();
    h.advance(775);
    assert.equal(clock.elapsed, 1000);
  });
  check('restored clocks continue from elapsed time and dispose without publishing', h => {
    const ticks = [];
    const clock = h.createClock({ duration: 1000, initialElapsed: 400, onTick: elapsed => ticks.push(elapsed) });
    assert.equal(clock.elapsed, 400);
    clock.resume();
    h.advance(192);
    assert.equal(clock.elapsed, 592);
    const tickCount = ticks.length;
    clock.dispose();
    assert.equal(ticks.length, tickCount, 'Disposal must not update an unmounted module');
    assert.equal(h.timerCount, 0);
    clock.resume();
    clock.pause();
    clock.dispose();
    h.advance(20000);
    assert.equal(ticks.length, tickCount);
  });
  check('clock cancellation leaves sibling schedules intact', h => {
    const ticks = [];
    const cancelled = h.createClock({ duration: 1000, onTick: () => assert.fail('Disposed clock must not publish') });
    const live = h.createClock({ duration: 1000, onTick: elapsed => ticks.push(elapsed) });
    cancelled.resume();
    live.resume();
    cancelled.dispose();
    assert.equal(h.timerCount, 1);
    h.advance(1000);
    assert.equal(ticks.at(-1), 1000);
  });
  check('completed initial clocks never schedule work', h => {
    for (const initialElapsed of [1000, 1400]) {
      const clock = h.createClock({ duration: 1000, initialElapsed, onTick: () => assert.fail('Complete clock must stay idle') });
      clock.resume();
      assert.equal(clock.elapsed, 1000);
    }
    h.advance(2000);
    assert.equal(h.timerCount, 0);
  });
  check('unmount clears preference, visibility and keyboard listeners', h => {
    h.act(build => build.reportModule('one', 'active'));
    assert.ok(h.listenerCount > 0);
    h.unmount();
    h.advance(20000);
  });
  check('unmount while hidden also clears every browser listener', h => {
    h.visibility(false);
    h.unmount();
    h.advance(20000);
  });

  console.log(`\n${passed} agent-build lifecycle, timeline and clock checks passed.`);
}

try {
  runChecks(readBundle());
} catch (error) {
  console.error(error.stack || error);
  if (error.stderr) console.error(String(error.stderr));
  process.exitCode = 1;
} finally {
  removeTemporaryBundle();
}
