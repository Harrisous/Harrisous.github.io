#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// The controller is browser-independent apart from injected widget/DOM APIs.
const source = fs.readFileSync(path.join(__dirname, '../src/bgm.js'), 'utf8').replace(/export /g, '');
const context = vm.createContext({ React: {}, console });
vm.runInContext(source + '\nglobalThis.makeController = createBgmController;', context);

function harness({ apiPresent = true, iframePresent = true } = {}) {
  let now = 0, nextId = 0;
  const timers = new Map(), changes = [], calls = [], listeners = new Map(), scripts = [];
  const widget = {
    bind(event, handler) { listeners.set(event, handler); },
    unbind(event) { listeners.delete(event); },
    play() { calls.push(['play']); }, pause() { calls.push(['pause']); },
    setVolume(value) { calls.push(['volume', value]); },
  };
  const Events = Object.fromEntries(['READY', 'PLAY', 'PAUSE', 'FINISH', 'ERROR'].map(k => [k, k]));
  const Widget = Object.assign(() => widget, { Events });
  const win = {
    SC: apiPresent ? { Widget } : undefined,
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { due: now + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const iframe = { dataset: { src: 'https://w.soundcloud.com/player/?url=test' }, attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
  };
  const doc = {
    querySelector: () => scripts.find(s => s.parentNode) || null,
    createElement: () => {
      const handlers = new Map();
      return { dataset: {}, addEventListener: (type, fn) => handlers.set(type, fn),
        removeEventListener: type => handlers.delete(type),
        emit(type) { handlers.get(type)?.(); },
        remove() { this.parentNode = null; },
      };
    },
    head: { appendChild(script) { script.parentNode = this; scripts.push(script); } },
  };
  const controller = context.makeController({ iframe: iframePresent ? iframe : null, onChange: value => changes.push(value), win, doc });
  return {
    controller, calls, changes, iframe, scripts, listeners, timers,
    emit(event) { listeners.get(event)?.(); },
    installApi() { win.SC = { Widget }; scripts.at(-1).emit('load'); },
    async settle() { await Promise.resolve(); await Promise.resolve(); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.due <= end).sort((a,b) => a[1].due - b[1].due)[0];
        if (!next) break;
        now = next[1].due; timers.delete(next[0]); next[1].fn();
      }
      now = end;
    },
  };
}

let passed = 0;
async function check(name, run, options) {
  const h = harness(options);
  try { await run(h); console.log(`PASS ${name}`); passed++; }
  finally { h.controller.destroy(); assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0); }
}
(async () => {
  await check('does not load or play before a user click', async h => {
    assert.equal(h.iframe.attributes.src, undefined); assert.equal(h.calls.length, 0); assert.equal(h.timers.size, 0);
  });
  await check('waits for READY and confirms playing only on PLAY', async h => {
    h.controller.toggle(); await h.settle();
    assert.equal(h.iframe.attributes.loading, 'eager'); assert.ok(h.iframe.attributes.src);
    assert.equal(h.calls.length, 0, 'No transport or volume command is valid before READY');
    assert.equal(h.controller.state.status, 'loading'); assert.equal(h.controller.state.playing, false);
    h.emit('READY'); assert.deepEqual(h.calls, [['volume',50],['play']]);
    assert.equal(h.controller.state.playing, false);
    h.emit('PLAY'); assert.equal(h.controller.state.playing, true); assert.equal(h.controller.state.status, 'playing');
    assert.equal(h.timers.size, 0);
  });
  await check('a second click cancels queued playback', async h => {
    h.controller.toggle(); await h.settle(); h.controller.toggle(); h.emit('READY');
    assert.equal(h.calls.filter(c => c[0] === 'play').length, 0); assert.equal(h.controller.state.playing, false);
  });
  await check('latest volume is applied on READY and subsequent changes', async h => {
    h.controller.toggle(); await h.settle(); h.controller.setVolume(23); h.emit('READY');
    assert.deepEqual(h.calls[0], ['volume',23]); h.controller.setVolume(120); assert.deepEqual(h.calls.at(-1), ['volume',100]);
    h.controller.setVolume(NaN); assert.equal(h.controller.state.vol,100);
  });
  await check('pause and finish follow actual widget events', async h => {
    h.controller.toggle(); await h.settle(); h.emit('READY'); h.emit('PLAY');
    h.controller.toggle(); assert.deepEqual(h.calls.at(-1),['pause']); h.emit('PAUSE');
    assert.equal(h.controller.state.playing,false); h.controller.toggle(); h.emit('PLAY'); h.emit('FINISH');
    assert.equal(h.controller.state.status,'paused'); assert.equal(h.controller.state.playing,false);
  });
  await check('initial PAUSE does not cancel requested first playback', async h => {
    h.controller.toggle(); await h.settle(); h.emit('PAUSE'); h.emit('READY');
    assert.deepEqual(h.calls.at(-1), ['play']);
  });
  await check('late PAUSE acknowledgement cannot cancel a newer resume request', async h => {
    h.controller.toggle(); await h.settle(); h.emit('READY'); h.emit('PLAY');
    h.controller.toggle(); // Request pause, but its acknowledgement is delayed.
    h.controller.toggle(); // Resume is now the latest user intent.
    h.emit('PAUSE');
    assert.equal(h.controller.state.playing, false, 'Show the actual pause until resumed PLAY is confirmed');
    assert.equal(h.controller.state.status, 'loading');
    h.emit('PLAY');
    assert.equal(h.controller.state.playing, true);
    assert.equal(h.controller.state.status, 'playing');
    assert.deepEqual(h.calls.filter(c => c[0] !== 'volume'), [['play'], ['pause'], ['play']]);
    assert.equal(h.timers.size, 0);
  });
  await check('an unsolicited pause after confirmed playback remains authoritative', async h => {
    h.controller.toggle(); await h.settle(); h.emit('READY'); h.emit('PLAY');
    h.emit('PAUSE');
    assert.equal(h.controller.state.playing, false); assert.equal(h.controller.state.status, 'paused');
    h.controller.toggle();
    assert.deepEqual(h.calls.at(-1), ['play'], 'The next click must resume, not invert stale desired state');
    h.emit('PLAY'); assert.equal(h.controller.state.playing, true);
  });
  await check('load timeout surfaces an error and retry can recover', async h => {
    h.controller.toggle(); await h.settle(); h.advance(12000);
    assert.equal(h.controller.state.status, 'error'); assert.equal(h.listeners.size,0);
    h.controller.retry(); await h.settle(); h.emit('READY'); h.emit('PLAY');
    assert.equal(h.controller.state.status, 'playing'); assert.equal(h.controller.state.error,'');
  });
  await check('blocked playback surfaces a recovery message after five seconds', async h => {
    h.controller.toggle(); await h.settle(); h.emit('READY'); h.advance(5000);
    assert.equal(h.controller.state.status,'error'); assert.equal(h.controller.state.playing,false);
    assert.match(h.controller.state.error,/Playback did not start/);
    const plays = h.calls.filter(c=>c[0]==='play').length;
    h.controller.retry();
    assert.equal(h.calls.filter(c=>c[0]==='play').length, plays+1, 'A policy-blocked retry must play synchronously without another load');
    h.emit('PLAY'); assert.equal(h.controller.state.status,'playing');
  });
  await check('widget errors are reported without optimistic playing state', async h => {
    h.controller.toggle(); await h.settle(); h.emit('ERROR');
    assert.equal(h.controller.state.status,'error'); assert.equal(h.controller.state.playing,false);
  });
  await check('script failure can be retried with a fresh script', async h => {
    h.controller.toggle(); h.scripts[0].emit('error'); await h.settle();
    assert.equal(h.controller.state.status,'error'); assert.equal(h.scripts[0].parentNode,null);
    h.controller.retry(); assert.equal(h.scripts.length,2); h.installApi(); await h.settle(); h.emit('READY'); h.emit('PLAY');
    assert.equal(h.controller.state.status,'playing');
  }, { apiPresent:false });
  await check('unmount cancels loading and ignores late async completion', async h => {
    h.controller.toggle(); const script=h.scripts[0]; h.controller.destroy(); const n=h.changes.length;
    script.emit('load'); await h.settle(); h.advance(20000);
    assert.equal(h.changes.length,n); assert.equal(h.iframe.attributes.src,undefined); assert.equal(script.parentNode,null);
  }, { apiPresent:false });
  await check('missing iframe fails safely without scheduling work', async h => {
    h.controller.toggle(); assert.equal(h.controller.state.status,'error'); assert.equal(h.timers.size,0);
  }, { iframePresent:false });
  console.log(`\n${passed} BGM lifecycle and playback checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
