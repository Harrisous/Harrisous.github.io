#!/usr/bin/env node
'use strict';

/*
 * Deterministic lifecycle and module-timeline checks against actual source.
 * Run: node scripts/verify_agent_build.cjs
 * Optional precompiled IIFE: --bundle <path> (global name AgentBuildTest).
 * This small hook runner supplies a fake clock, fake animation frames and
 * browser events. DOM/CSS, focus, and animation rendering still need the
 * browser smoke test.
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

function createHarness(source, { reducedMotion = false, hidden = false, frames = true } = {}) {
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
      // `frames: false` models a page that counts as visible but is never painted.
      if (frames) timers.set(id, { callback: () => callback(now), due: now + 16 });
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
      now = Math.max(now, next[1].due);
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
    // A busy main thread: time passes while no frame or timer can run.
    stall(milliseconds) { now += milliseconds; },
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

  check('an idle page schedules nothing and never expires', h => {
    assert.equal(h.build.enabled, true);
    assert.equal(h.build.ready, true, 'Without a font API there is nothing to wait for');
    assert.equal(h.timerCount, 0);
    h.advance(120000);
    assert.equal(h.build.enabled, true, 'Elapsed wall time must not disable future modules');
    assert.equal(h.timerCount, 0);
  });
  check('skip disables all work until an explicit replay', h => {
    h.act(build => build.skip());
    assert.equal(h.build.enabled, false);
    h.visibility(false);
    h.visibility(true);
    assert.equal(h.build.enabled, false, 'Returning to the page must not restart skipped builds');
    assert.equal(h.timerCount, 0);
  });
  check('replay increments the run and re-enables skipped builds', h => {
    const initialRun = h.build.runId;
    h.act(build => build.replay());
    assert.equal(h.build.runId, initialRun + 1);
    assert.equal(h.build.enabled, true);
    h.act(build => build.skip());
    assert.equal(h.build.enabled, false);
    h.act(build => build.replay());
    assert.equal(h.build.runId, initialRun + 2);
    assert.equal(h.build.enabled, true);
  });
  check('initially hidden and later visible pages expose the correct pause signal', h => {
    assert.equal(h.build.pageVisible, false);
    h.advance(10000);
    assert.equal(h.timerCount, 0);
    h.visibility(true);
    assert.equal(h.build.pageVisible, true);
    h.visibility(false);
    assert.equal(h.build.pageVisible, false);
  }, { hidden: true });
  check('Escape skips builds while unrelated keys leave them enabled', h => {
    h.key('ArrowRight');
    assert.equal(h.build.enabled, true);
    h.key('Escape');
    assert.equal(h.build.enabled, false);
  });
  check('initial reduced motion disables modules, including replay', h => {
    assert.equal(h.build.reducedMotion, true);
    assert.equal(h.build.enabled, false);
    assert.equal(h.timerCount, 0);
    h.act(build => build.replay());
    assert.equal(h.build.enabled, false);
    assert.equal(h.timerCount, 0);
  }, { reducedMotion: true });
  check('preference changes stop activity and require an explicit replay', h => {
    h.motion(true);
    assert.equal(h.build.reducedMotion, true);
    assert.equal(h.build.enabled, false);
    h.motion(false);
    assert.equal(h.build.reducedMotion, false);
    assert.equal(h.build.enabled, false);
    h.act(build => build.replay());
    assert.equal(h.build.enabled, true);
  });

  check('each timeline runs intent, division, voices, composition, then impact', h => {
    assert.equal(typeof h.frame, 'function');
    for (const length of [1, 24, 180, 700, 4000, 25000]) {
      const duration = h.frame(0, length).doneAt;
      assert.equal(duration, 2000, 'Every non-empty module must use the same two-second visible-time budget');
      const phases = [];
      let previousCount = 0;
      let sawPartialText = false;
      const previous = { summonProgress: 0, frameProgress: 0, travelProgress: 0, styleProgress: 0 };
      for (let elapsed = 0; elapsed <= duration; elapsed++) {
        const frame = h.frame(elapsed, length);
        if (phases.at(-1) !== frame.phase) phases.push(frame.phase);
        for (const property of Object.keys(previous)) {
          assert.ok(Number.isFinite(frame[property]) && frame[property] >= 0 && frame[property] <= 1, `${property} must stay in [0, 1]`);
          assert.ok(frame[property] >= previous[property], `${property} must never run backwards`);
          previous[property] = frame[property];
        }
        assert.ok(Number.isInteger(frame.count) && frame.count >= previousCount && frame.count <= length);
        if (['intent', 'division', 'voices'].includes(frame.phase)) {
          assert.equal(frame.count, 0, 'Raw text cannot appear before the frame is drawn and the voices arrive');
          assert.equal(frame.styleProgress, 0);
        }
        if (frame.phase === 'intent') assert.equal(frame.frameProgress, 0, 'The frame waits for the arriving spark');
        if (frame.frameProgress > 0) assert.equal(frame.summonProgress, 1, 'Division follows the completed summons');
        if (frame.travelProgress > 0) assert.equal(frame.frameProgress, 1, 'The voices part only once the frame is closed');
        if (frame.count > 0) assert.equal(frame.travelProgress, 1, 'Writing follows the arrival of every voice');
        if (frame.count < length) assert.equal(frame.styleProgress, 0, 'Impact cannot begin before every character is written');
        if (frame.phase === 'composition') assert.equal(frame.styleProgress, 0);
        if (frame.phase === 'impact') assert.equal(frame.count, length);
        assert.equal(frame.elapsed, elapsed, 'A frame carries the time it was sampled at');
        if (frame.count > 0 && frame.count < length) sawPartialText = true;
        previousCount = frame.count;
      }
      assert.deepEqual(phases, ['intent', 'division', 'voices', 'composition', 'impact', 'complete']);
      if (length > 1) assert.ok(sawPartialText, 'Text must have intermediate reveal states');
      assert.equal(previousCount, length);
      assert.equal(h.frame(duration + 10000, length).phase, 'complete');
      assert.equal(h.frame(duration, length).styleProgress, 1);
    }
  });
  check('parallel assignments preserve exact content and use bounded team sizes', h => {
    const samples = [
      '', 'Short introduction.', 'x'.repeat(20), 'x'.repeat(59), 'x'.repeat(60), 'x'.repeat(349), 'x'.repeat(350),
      'Jul. 2026 \u2013 Present\nMiami, FL\nJemm Tec\nArtificial Intelligence Engineer',
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
      assert.equal(chunks.length, segments.length >= 60 ? 3 : segments.length >= 20 ? 2 : 1, 'All but the briefest modules are drafted by all three voices');
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
    assert.ok(frames.every(frame => frame.phase === 'composition' && frame.count > 0), 'Every worker must be genuinely revealing its own content');
    assert.ok(frames.every((frame, index) => frame.count < chunks[index].length));
    const deadlines = chunks.map(chunk => h.frame(0, chunk.length).doneAt);
    assert.equal(new Set(deadlines).size, 1, 'Worker count must not extend the module deadline');
    assert.equal(deadlines[0], 2000);
    for (const chunk of chunks) {
      const styled = h.frame(1800, chunk.length);
      assert.equal(styled.phase, 'impact');
      assert.equal(styled.count, chunk.length, 'All content precedes the impact phase');
      assert.equal(h.frame(2000, chunk.length).phase, 'complete');
    }
  });
  check('simultaneous starts form a bounded cascade without timers', h => {
    assert.equal(typeof h.build.claimSlot, 'function');
    const delays = Array.from({ length: 12 }, () => h.build.claimSlot());
    assert.equal(delays[0], 0, 'The first module starts at once');
    assert.ok(delays.every((delay, index) => !index || delay >= delays[index - 1]), 'Later modules never start before earlier ones');
    assert.ok(delays[1] > 0 && delays[2] > delays[1], 'Modules that become eligible together are spaced apart');
    assert.ok(Math.max(...delays) <= 420, 'The cascade must not postpone content indefinitely');
    assert.equal(h.timerCount, 0, 'Claiming a slot must not schedule shared work');
    h.advance(600);
    assert.equal(h.build.claimSlot(), 0, 'A module that enters alone later starts immediately');
    for (let index = 0; index < 5; index++) h.build.claimSlot();
    h.act(build => build.replay());
    assert.equal(h.build.claimSlot(), 0, 'Replay restarts the cascade from its first slot');
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
    assert.equal(h.timerCount, 0, 'An idle clock schedules nothing');
    clock.resume();
    const scheduled = h.timerCount;
    assert.ok(scheduled > 0);
    clock.resume();
    assert.equal(h.timerCount, scheduled, 'Repeated resume must not duplicate scheduled work');
    h.advance(1040);
    assert.equal(clock.elapsed, 1000);
    assert.deepEqual(ticks, [1000], 'Without marks a clock publishes once, on completion');
    assert.equal(h.timerCount, 0);
    clock.resume();
    h.advance(5000);
    assert.equal(ticks.length, 1);
  });
  check('clocks publish only when a mark is crossed, on pause and on completion', h => {
    const ticks = [];
    const clock = h.createClock({ duration: 1000, marks: [200, 500], onTick: elapsed => ticks.push(elapsed) });
    clock.resume();
    h.advance(192);
    assert.deepEqual(ticks, [], 'Frames between marks must not re-render the module');
    h.advance(16);
    assert.deepEqual(ticks, [208]);
    h.advance(400);
    assert.deepEqual(ticks, [208, 512]);
    clock.pause();
    assert.deepEqual(ticks, [208, 512, 608]);
    clock.resume();
    h.advance(420);
    assert.deepEqual(ticks, [208, 512, 608, 1000]);
  });
  check('pausing one module does not pause another or consume hidden time', h => {
    const ticksA = [], ticksB = [];
    const a = h.createClock({ duration: 1000, onTick: elapsed => ticksA.push(elapsed) });
    const b = h.createClock({ duration: 1000, onTick: elapsed => ticksB.push(elapsed) });
    a.resume();
    b.resume();
    h.advance(205);
    a.pause();
    assert.equal(a.elapsed, 205, 'Pause preserves time since the last frame');
    const pausedTicks = ticksA.length;
    a.pause();
    h.advance(820);
    assert.equal(a.elapsed, 205);
    assert.equal(ticksA.length, pausedTicks);
    assert.equal(b.elapsed, 1000);
    a.resume();
    h.advance(820);
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
    h.advance(800);
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
  check('live time advances between frames without publishing or overshooting', h => {
    const ticks = [];
    const clock = h.createClock({ duration: 1000, onTick: elapsed => ticks.push(elapsed) });
    assert.equal(clock.live, 0);
    clock.resume();
    h.advance(10);
    assert.equal(clock.live, 10, 'The frame loop can sample motion between frames');
    assert.equal(clock.elapsed, 0);
    assert.equal(ticks.length, 0, 'Sampling must not publish into React');
    h.advance(200);
    clock.pause();
    assert.equal(clock.live, clock.elapsed, 'A paused clock reports its stored time');
    assert.equal(clock.live, 210);
    h.advance(5000);
    assert.equal(clock.live, 210);
    clock.resume();
    h.advance(5000);
    assert.equal(clock.live, 1000);
    clock.dispose();
    assert.equal(clock.live, 1000);
  });
  check('a late frame consumes bounded time, so a busy page stretches a build instead of skipping it', h => {
    const clock = h.createClock({ duration: 2000, onTick: () => {} });
    clock.resume();
    h.advance(32);
    assert.equal(clock.elapsed, 32);
    h.stall(400);
    assert.ok(clock.live <= 32 + 34, 'Sampling during a stall is bounded too');
    h.advance(0);
    assert.equal(clock.elapsed, 66, 'One frame may consume at most 34ms of the timeline');
    h.advance(160);
    assert.equal(clock.elapsed, 226, 'Regular frames resume at full speed');
  });
  check('without animation frames a timer still completes the clock', h => {
    const ticks = [];
    const clock = h.createClock({ duration: 1000, marks: [300], onTick: elapsed => ticks.push(elapsed) });
    clock.resume();
    h.advance(170);
    assert.equal(clock.elapsed, 0, 'One quiet period is treated as a late frame, not a stall');
    h.advance(3000);
    assert.equal(clock.elapsed, 1000, 'Content must never wait for animation frames');
    assert.equal(ticks.at(-1), 1000);
    assert.ok(ticks.length >= 2, 'Marks are still published on the way');
    assert.equal(h.timerCount, 0);
  }, { frames: false });
  check('clock cancellation leaves sibling schedules intact', h => {
    const ticks = [];
    const cancelled = h.createClock({ duration: 1000, onTick: () => assert.fail('Disposed clock must not publish') });
    const live = h.createClock({ duration: 1000, onTick: elapsed => ticks.push(elapsed) });
    cancelled.resume();
    live.resume();
    const scheduled = h.timerCount;
    cancelled.dispose();
    assert.equal(h.timerCount, scheduled, 'A sibling keeps the shared frame');
    h.advance(1040);
    assert.equal(ticks.at(-1), 1000);
    assert.equal(h.timerCount, 0);
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
