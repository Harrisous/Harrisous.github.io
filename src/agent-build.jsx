/* Decorative, local choreography. No AI requests or simulated DOM clicks.
 *
 * Every module is drafted by three voices (futurism, realism, cyberpunk) and
 * resolved when they collide:
 *   SIGNAL   intent       one spark arrives from the conductor rail
 *   FRAME    division     two sparks draw the frame in opposite directions
 *   F R C    voices       they meet at the far corner and part as the three
 *   DRAFT    composition  the three write the real content in parallel
 *   IMPACT   impact       they collide; one shock front resolves the final form
 *
 * React renders a module only when its measure changes. Everything continuous
 * (the draft text, the front, the light) is driven once per frame by
 * ./agent-ensemble.js through the stage created here. */
import { ensemble, easeInOutCubic, CONVERGE } from './agent-ensemble.js';
const { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } = React;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const clamp = (value, maximum) => Math.max(0, Math.min(value, maximum));

/* The three voices, in the order they write. The triptych above the document
 * introduces them with the same marks and colours. */
export const VOICES = [
  { key: 'futurism', mark: 'F', color: '#00e5ff' },
  { key: 'realism', mark: 'R', color: '#f5e663' },
  { key: 'cyberpunk', mark: 'C', color: '#ff65d9' },
];
const MEASURES = ['intent', 'division', 'voices', 'composition', 'impact'];
const MEASURE_LABELS = { intent: 'SIGNAL', division: 'FRAME', composition: 'DRAFT', impact: 'IMPACT' };

/* Modules that become eligible together start as a cascade, not in lockstep. */
const STAGGER_STEP = 70;
const STAGGER_LIMIT = 420;
/* Characters each voice keeps luminous behind its insertion point. */
const WET_INK = 9;
/* The draft is rewritten about thirty times a second; the light moves every frame. */
const TEXT_STEP = 30;
/* Builds wait briefly for the page's own fonts so the draft is measured once. */
const BUILD_FONTS = ['400 13px "JetBrains Mono"', '600 16px "Space Grotesk"', '400 16px "IBM Plex Sans"'];
const READY_LIMIT = 500;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function fontsSettled() {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.check !== 'function') return true;
  try { return BUILD_FONTS.every(font => document.fonts.check(font)); } catch { return true; }
}

export function useAgentBuild() {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [enabled, setEnabled] = useState(() => !prefersReducedMotion());
  const [runId, setRunId] = useState(0);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden');
  const [ready, setReady] = useState(fontsSettled);
  const nextSlot = useRef(0);

  useEffect(() => {
    const preference = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setEnabled(false);
    };
    preference.addEventListener('change', update);
    update();
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    update();
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (ready) return;
    let waiting = true;
    const open = () => { if (waiting) { waiting = false; setReady(true); } };
    const limit = setTimeout(open, READY_LIMIT);
    Promise.all(BUILD_FONTS.map(font => document.fonts.load(font))).then(open, open);
    return () => { waiting = false; clearTimeout(limit); };
  }, [ready]);

  const skip = useCallback(() => setEnabled(false), []);
  const replay = useCallback(() => {
    nextSlot.current = 0;
    setRunId(value => value + 1);
    setEnabled(!prefersReducedMotion());
  }, []);
  /* Returns how long a module should wait before its first measure. A module
   * that enters alone starts at once; simultaneous ones are spaced and capped. */
  const claimSlot = useCallback(() => {
    const now = performance.now();
    const slot = Math.min(Math.max(now, nextSlot.current), now + STAGGER_LIMIT);
    nextSlot.current = slot + STAGGER_STEP;
    return slot - now;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onKey = event => { if (event.key === 'Escape') setEnabled(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  return { runId, reducedMotion, enabled: enabled && !reducedMotion, pageVisible, ready, claimSlot, replay, skip };
}

/* Module clocks consume visible time only, one frame at a time. A frame may
 * consume at most FRAME_LIMIT, so a busy main thread (page load, a long task)
 * stretches a build slightly instead of skipping part of it. All running
 * clocks share one animation frame; if frames stop arriving while the page
 * still counts as visible, a timer keeps the content arriving. */
const FRAME_LIMIT = 34;
const STALL_AFTER = 180;
const runningClocks = new Set();
let tickerFrame = 0, tickerGuard = null, framesSeen = 0, framesChecked = 0, quietPeriods = 0;

function stepClocks(limit) {
  const now = performance.now();
  for (const clock of [...runningClocks]) clock.step(now, limit);
}
function syncTicker() {
  if (runningClocks.size) {
    if (!tickerFrame) tickerFrame = requestAnimationFrame(onTickerFrame);
    if (tickerGuard === null) tickerGuard = setTimeout(onTickerGuard, STALL_AFTER);
    return;
  }
  if (tickerFrame) cancelAnimationFrame(tickerFrame);
  if (tickerGuard !== null) clearTimeout(tickerGuard);
  tickerFrame = 0;
  tickerGuard = null;
  quietPeriods = 0;
}
function onTickerFrame() {
  tickerFrame = 0;
  framesSeen++;
  stepClocks(FRAME_LIMIT);
  syncTicker();
}
function onTickerGuard() {
  tickerGuard = null;
  // One quiet period is a late frame after a long task; two in a row mean
  // frames have stopped, and the timeline falls back to wall time.
  quietPeriods = framesSeen === framesChecked ? quietPeriods + 1 : 0;
  framesChecked = framesSeen;
  if (quietPeriods >= 2) stepClocks(Infinity);
  syncTicker();
}

/* `onTick` publishes only when a mark is crossed, on pause and on completion.
 * `elapsed` is the time consumed up to the last frame; `live` adds the current
 * frame so the light can be sampled between publications. */
export function createAgentModuleClock({ duration, onTick, initialElapsed = 0, marks = [] }) {
  let elapsed = clamp(initialElapsed, duration);
  let sampledAt = 0;
  let running = false;
  let disposed = false;
  const consume = (now, limit) => {
    const before = elapsed;
    elapsed = Math.min(duration, elapsed + clamp(now - sampledAt, limit));
    sampledAt = now;
    return before;
  };
  const stop = () => {
    running = false;
    runningClocks.delete(clock);
    syncTicker();
  };
  const clock = {
    step(now, limit) {
      if (!running) return;
      const before = consume(now, limit);
      const done = elapsed >= duration;
      if (done) stop();
      if (done || marks.some(mark => before < mark && mark <= elapsed)) onTick(elapsed);
    },
    resume() {
      if (disposed || running || elapsed >= duration) return;
      running = true;
      sampledAt = performance.now();
      runningClocks.add(clock);
      syncTicker();
    },
    pause() {
      if (disposed || !running) return;
      consume(performance.now(), FRAME_LIMIT);
      stop();
      onTick(elapsed);
    },
    dispose() {
      disposed = true;
      if (running) stop();
    },
    get elapsed() { return elapsed; },
    get live() { return running ? Math.min(duration, elapsed + clamp(performance.now() - sampledAt, FRAME_LIMIT)) : elapsed; },
  };
  return clock;
}

// Every non-empty module has the same visible-time budget. More text is split
// across voices rather than extending the wait before the finished content.
const DIVISION_AT = 220;
const VOICES_AT = 520;
const COMPOSITION_AT = 680;
const IMPACT_AT = 1560;
const COMPLETE_AT = 2000;
const MARKS = [DIVISION_AT, VOICES_AT, COMPOSITION_AT, IMPACT_AT];
const written = (elapsed, length) => (elapsed >= IMPACT_AT ? length
  : elapsed < COMPOSITION_AT ? 0 : Math.floor(length * (elapsed - COMPOSITION_AT) / (IMPACT_AT - COMPOSITION_AT)));
export function getAgentModuleFrame(elapsed, characterCount) {
  const doneAt = characterCount ? COMPLETE_AT : 0;
  const base = { elapsed, count: 0, summonProgress: 1, frameProgress: 1, travelProgress: 1, styleProgress: 0, doneAt };
  if (elapsed >= doneAt) return { ...base, phase: 'complete', count: characterCount, styleProgress: 1 };
  if (elapsed < DIVISION_AT) return { ...base, phase: 'intent', summonProgress: elapsed / DIVISION_AT, frameProgress: 0, travelProgress: 0 };
  if (elapsed < VOICES_AT) return { ...base, phase: 'division', frameProgress: (elapsed - DIVISION_AT) / (VOICES_AT - DIVISION_AT), travelProgress: 0 };
  if (elapsed < COMPOSITION_AT) return { ...base, phase: 'voices', travelProgress: (elapsed - VOICES_AT) / (COMPOSITION_AT - VOICES_AT) };
  if (elapsed < IMPACT_AT) return { ...base, phase: 'composition', count: written(elapsed, characterCount) };
  return { ...base, phase: 'impact', count: characterCount, styleProgress: (elapsed - IMPACT_AT) / (COMPLETE_AT - IMPACT_AT) };
}

function splitCharacters(text) {
  return typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), item => item.segment)
    : Array.from(text);
}

/* Contiguous, non-overlapping assignments preserve every character, including
 * whitespace and grapheme clusters. Prefer paragraph boundaries near each cut.
 * All but the briefest modules are written by all three voices. */
export function splitAgentWork(text) {
  const characters = splitCharacters(text);
  const workerCount = characters.length >= 60 ? 3 : characters.length >= 20 ? 2 : 1;
  const chunks = [];
  let start = 0;
  for (let worker = 0; worker < workerCount - 1; worker++) {
    const remainingWorkers = workerCount - worker;
    const targetSize = (characters.length - start) / remainingWorkers;
    const target = start + targetSize;
    const lower = Math.ceil(start + targetSize * .6);
    const upper = Math.floor(start + targetSize * 1.4);
    let newline = -1, whitespace = -1;
    for (let end = lower; end <= upper && end < characters.length; end++) {
      const before = characters[end - 1];
      if (before.includes('\n') && (newline < 0 || Math.abs(end - target) < Math.abs(newline - target))) newline = end;
      if (/\s/u.test(before) && (whitespace < 0 || Math.abs(end - target) < Math.abs(whitespace - target))) whitespace = end;
    }
    const end = newline > 0 ? newline : whitespace > 0 ? whitespace : Math.round(target);
    chunks.push(characters.slice(start, end).join(''));
    start = end;
  }
  chunks.push(characters.slice(start).join(''));
  return chunks;
}

function firstBox(range) {
  const boxes = range.getClientRects();
  for (let index = 0; index < boxes.length; index++) if (boxes[index].height > 0) return boxes[index];
  return null;
}

/* The shock front follows a 112deg gradient line, so it leans 22deg from
 * vertical. The plate's mask and the beam are both placed from one length. */
const FRONT_SIN = Math.sin(112 * Math.PI / 180);
const FRONT_COS = Math.abs(Math.cos(112 * Math.PI / 180));
const FRONT_FEATHER = 64;
const BEAM_TAIL = 180;

/* A stage owns one module's draft and front while it builds. The frame loop
 * calls write() for every module before it calls read() for any of them. */
function createAgentStage({ plate, raw, copy, beam, work, colors, fitCache }) {
  // Per voice: settled text, wet ink, and the reserved remainder that keeps
  // every later character in its final position.
  copy.textContent = '';
  const voices = work.map((chunk, index) => {
    const line = document.createElement('span');
    line.className = 'agent-module-raw-chunk';
    line.style.setProperty('--agent-voice', colors[index]);
    const parts = ['', 'agent-module-ink', 'agent-module-unwritten'].map((className, part) => {
      const span = document.createElement('span');
      if (className) span.className = className;
      const text = document.createTextNode(part === 2 ? chunk.text : '');
      span.appendChild(text);
      line.appendChild(span);
      return text;
    });
    copy.appendChild(line);
    return { chunk, parts, count: 0, settled: 0 };
  });
  const bar = beam.firstElementChild;
  const range = document.createRange();
  let width = -1, height = -1, stale = true, wroteAt = -Infinity, front = -1;
  const onFonts = () => { fitCache.current = null; width = -1; };
  document.fonts?.addEventListener?.('loadingdone', onFonts);

  const fit = () => {
    const key = `${width}:${height}`;
    if (fitCache.current?.key !== key) {
      // Most raw content is shorter than the styled module. A 10px floor keeps
      // the draft readable; unusually long text pans instead of shrinking.
      let size = 13;
      copy.style.fontSize = `${size}px`;
      while (size > 10 && copy.scrollHeight > raw.clientHeight) {
        size -= .5;
        copy.style.fontSize = `${size}px`;
      }
      fitCache.current = { key, size };
    } else copy.style.fontSize = `${fitCache.current.size}px`;
  };
  // Each voice rests where its next character will appear.
  const locate = (voice, box) => {
    const [settled, ink, unwritten] = voice.parts;
    const { offsets } = voice.chunk;
    let rect = null, trailing = false;
    if (unwritten.length) {
      range.setStart(unwritten, 0);
      range.setEnd(unwritten, Math.min(unwritten.length, offsets[voice.count + 1] - offsets[voice.count]));
      rect = firstBox(range);
    }
    if (!rect) {
      const last = ink.length ? ink : settled;
      if (last.length) {
        range.setStart(last, last.length - 1);
        range.setEnd(last, last.length);
        rect = firstBox(range);
        trailing = true;
      }
    }
    // Resting on the baseline, a voice's trail reads as an underline, not a strike.
    return rect ? { x: (trailing ? rect.right : rect.left) - box.left, y: rect.bottom - 1.5 - box.top, top: rect.top, bottom: rect.bottom, hidden: false } : null;
  };

  return {
    write(frame, now) {
      const composing = frame.phase === 'composition';
      const hold = composing && now - wroteAt < TEXT_STEP;
      let changed = false;
      for (const voice of voices) {
        const { text, offsets, length } = voice.chunk;
        const count = written(frame.elapsed, length);
        const settled = composing ? Math.max(0, count - WET_INK) : count;
        if (hold || (count === voice.count && settled === voice.settled)) continue;
        if (settled !== voice.settled) voice.parts[0].data = text.slice(0, offsets[settled]);
        voice.parts[1].data = text.slice(offsets[settled], offsets[count]);
        if (count !== voice.count) voice.parts[2].data = text.slice(offsets[count]);
        voice.count = count;
        voice.settled = settled;
        changed = true;
      }
      if (changed) {
        wroteAt = now;
        stale = true;
      }
      const sweep = frame.phase === 'complete' ? 1
        : frame.phase === 'impact' ? easeInOutCubic(clamp((frame.styleProgress - CONVERGE) / (1 - CONVERGE), 1)) : 0;
      const next = Math.round(sweep * (Math.max(0, width) * FRONT_SIN + Math.max(0, height) * FRONT_COS + FRONT_FEATHER) * 2) / 2;
      if (next !== front) {
        front = next;
        plate.style.setProperty('--agent-front', `${next}px`);
        bar.style.transform = `translate3d(${((next - BEAM_TAIL) / FRONT_SIN).toFixed(1)}px,0,0) skewX(-22deg)`;
      }
    },
    read(box) {
      const resized = box.width !== width || box.height !== height;
      if (!resized && !stale) return null;
      if (resized) {
        width = box.width;
        height = box.height;
        front = -1;
        fit();
      }
      stale = false;
      const pane = raw.getBoundingClientRect();
      let points = voices.map(voice => locate(voice, box));
      // All voices stay visible whenever the draft fits. For unusually long
      // content, pan only when every insertion point has moved below the window.
      const present = points.filter(Boolean);
      if (present.length && present.every(point => point.top > pane.bottom)) {
        raw.scrollTop += present[0].bottom - pane.bottom + 3;
        points = voices.map(voice => locate(voice, box));
      }
      for (const point of points) if (point) point.hidden = point.bottom < pane.top - 2 || point.top > pane.bottom + 2;
      return points;
    },
    dispose() {
      document.fonts?.removeEventListener?.('loadingdone', onFonts);
    },
  };
}

export function AgentModule({ build, name, group = 'origin', color = '#67e8f9', rawText = '', className = '', children }) {
  const id = useId();
  const rootRef = useRef(null);
  const plateRef = useRef(null);
  const rawRef = useRef(null);
  const copyRef = useRef(null);
  const beamRef = useRef(null);
  const clockRef = useRef(null);
  const sampleRef = useRef(null);
  const latestRef = useRef({ elapsed: 0, characterCount: 0 });
  const phaseRef = useRef('pending');
  const fitRef = useRef(null);
  const work = useMemo(() => splitAgentWork(rawText).map(text => {
    const offsets = [0];
    for (const character of splitCharacters(text)) offsets.push(offsets[offsets.length - 1] + character.length);
    return { text, offsets, length: offsets.length - 1 };
  }), [rawText]);
  const voices = useMemo(() => VOICES.slice(0, work.length), [work.length]);
  const voiceColors = useMemo(() => voices.map(voice => voice.color), [voices]);
  const characterCount = work.reduce((total, chunk) => total + chunk.length, 0);
  const duration = getAgentModuleFrame(0, characterCount).doneAt;
  const [inView, setInView] = useState(false);
  const [state, setState] = useState(() => ({ runId: build.runId, elapsed: build.enabled ? 0 : duration, preserve: false }));
  const [sealed, setSealed] = useState(false);
  const stateRef = useRef(state);
  const inViewRef = useRef(inView);
  stateRef.current = state;
  inViewRef.current = inView;

  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') { setInView(true); return; }
    const observer = new IntersectionObserver(entries => {
      setInView(entries.some(entry => entry.isIntersecting));
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!build.enabled) {
      setState({ runId: build.runId, elapsed: duration, preserve: false });
    } else if (stateRef.current.runId !== build.runId) {
      const wasComplete = stateRef.current.elapsed >= duration || stateRef.current.preserve;
      setState({ runId: build.runId, elapsed: 0, preserve: wasComplete && !inViewRef.current });
    }
  }, [build.runId, build.enabled, duration]);

  useEffect(() => {
    if (!build.enabled || state.runId !== build.runId || state.elapsed >= duration) return;
    const runId = build.runId;
    const clock = createAgentModuleClock({
      duration,
      marks: MARKS,
      initialElapsed: state.elapsed,
      onTick: elapsed => setState(previous => previous.runId === runId ? { ...previous, elapsed } : previous),
    });
    clockRef.current = clock;
    return () => { clock.dispose(); if (clockRef.current === clock) clockRef.current = null; };
  }, [build.runId, build.enabled, state.runId, duration]);

  // Declared after the clock effect so a fresh clock exists when this one runs.
  useEffect(() => {
    const clock = clockRef.current;
    if (!inView || !build.ready || !build.pageVisible) { clock?.pause(); return; }
    setState(previous => previous.preserve ? { ...previous, preserve: false } : previous);
    if (!clock) return;
    const delay = clock.elapsed === 0 ? build.claimSlot() : 0;
    if (delay <= 0) { clock.resume(); return; }
    const timer = setTimeout(() => clock.resume(), delay);
    return () => clearTimeout(timer);
  }, [inView, build.ready, build.pageVisible, build.runId, build.enabled, state.runId, duration]);

  const resetPending = state.runId !== build.runId;
  const preserveCompleted = !inView && (resetPending ? state.elapsed >= duration || state.preserve : state.preserve);
  const elapsed = !build.enabled || preserveCompleted ? duration : resetPending ? 0 : state.elapsed;
  const frame = getAgentModuleFrame(elapsed, characterCount);
  const waiting = build.enabled && duration > 0 && !(inView && build.ready) && elapsed === 0;
  const phase = waiting ? 'pending' : frame.phase;
  const active = phase !== 'pending' && phase !== 'complete';
  const paused = !inView || !build.pageVisible;
  latestRef.current = { elapsed, characterCount };
  if (!sampleRef.current) {
    // The frame loop samples the running clock, so nothing here waits on React.
    sampleRef.current = () => getAgentModuleFrame(clockRef.current ? clockRef.current.live : latestRef.current.elapsed, latestRef.current.characterCount);
  }

  useEffect(() => () => { ensemble.remove(id); }, [id]);
  useEffect(() => { setSealed(false); }, [build.runId]);

  useLayoutEffect(() => {
    if (!active) return;
    const stage = createAgentStage({ plate: plateRef.current, raw: rawRef.current, copy: copyRef.current, beam: beamRef.current, work, colors: voiceColors, fitCache: fitRef });
    ensemble.set(id, { run: build.runId, element: rootRef.current, group, color, voiceColors, paused: true, sample: sampleRef.current, stage });
    return () => stage.dispose();
  }, [active, work, voiceColors, group, color, build.runId, id]);
  // Declared after the stage effect so the entry exists before it is released.
  useLayoutEffect(() => {
    if (active) ensemble.pause(id, paused);
  }, [active, paused, work, voiceColors, group, color, build.runId, id]);

  // A module that reaches impact on its own clock is sealed: the signal returns
  // along its thread and the frame keeps a brief afterglow.
  useLayoutEffect(() => {
    const previous = phaseRef.current;
    phaseRef.current = phase;
    if (active) return;
    if (phase === 'complete' && previous === 'impact' && build.enabled) {
      ensemble.seal(id);
      setSealed(true);
    } else ensemble.remove(id);
  }, [phase, active, build.enabled, id]);

  const revealForFocus = () => {
    clockRef.current?.dispose();
    setState({ runId: build.runId, elapsed: duration, preserve: false });
  };
  const measure = MEASURES.indexOf(phase);
  return (
    <div className={`agent-module ${className}`} ref={rootRef} onFocusCapture={revealForFocus}
      onAnimationEnd={event => { if (event.animationName === 'agent-seal') setSealed(false); }}
      style={{ '--agent-color': color }}
      data-build-state={phase} data-build-worker-count={work.length} data-build-duration={duration} data-build-run={build.runId}
      data-build-visible={inView} data-build-paused={paused} data-build-replay-pending={preserveCompleted} data-build-sealed={sealed ? '' : undefined}>
      <div className="agent-module-final">{children}</div>
      {phase !== 'complete' && <div className="agent-module-scene" aria-hidden="true">
        <div className="agent-module-plate" ref={plateRef}>
          <span className="agent-module-edge agent-module-edge-top" />
          <span className="agent-module-edge agent-module-edge-right" />
          <span className="agent-module-edge agent-module-edge-left" />
          <span className="agent-module-edge agent-module-edge-bottom" />
          {/* The draft is written by the stage; React never gives it children. */}
          <div className="agent-module-raw" ref={rawRef}><div className="agent-module-raw-copy" ref={copyRef} /></div>
        </div>
        <div className="agent-module-hud">
          <b>{name}</b>
          <span className="agent-module-pips">{MEASURES.map((key, index) => <i key={key} data-measure={index === measure ? 'now' : index < measure ? 'past' : undefined} />)}</span>
          <em>{phase === 'voices' ? voices.map(voice => <span key={voice.key} style={{ color: voice.color }}>{voice.mark}</span>) : MEASURE_LABELS[phase]}</em>
        </div>
      </div>}
      {active && <span className="agent-module-beam" aria-hidden="true" ref={beamRef}><i /></span>}
    </div>
  );
}
