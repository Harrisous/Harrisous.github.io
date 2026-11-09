/* Decorative, local choreography. No AI requests or simulated DOM clicks. */
const { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } = React;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const clamp = (value, maximum) => Math.max(0, Math.min(value, maximum));

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function useAgentBuild() {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [enabled, setEnabled] = useState(() => !prefersReducedMotion());
  const [runId, setRunId] = useState(0);
  const [modules, setModules] = useState({});
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden');

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

  const skip = useCallback(() => setEnabled(false), []);
  const replay = useCallback(() => {
    setRunId(value => value + 1);
    setEnabled(!prefersReducedMotion());
  }, []);
  const reportModule = useCallback((id, state) => {
    setModules(previous => {
      if (previous[id] === state || (state === null && !(id in previous))) return previous;
      const next = { ...previous };
      if (state === null) delete next[id];
      else next[id] = state;
      return next;
    });
  }, []);

  const states = Object.values(modules);
  const modulePending = states.filter(state => state === 'pending').length;
  const moduleActive = states.filter(state => state === 'active').length;
  const moduleRunning = enabled && !reducedMotion && modulePending + moduleActive > 0;

  useEffect(() => {
    if (!enabled) return;
    const onKey = event => { if (event.key === 'Escape') setEnabled(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  return {
    runId, reducedMotion, enabled: enabled && !reducedMotion, pageVisible,
    running: moduleRunning, moduleRunning, modulePending, moduleActive,
    reportModule, replay, skip,
  };
}

/* The scheduler consumes visible time only. Both viewport and page visibility
 * use pause/resume; disposal never publishes into an unmounted component. */
export function createAgentModuleClock({ duration, onTick, initialElapsed = 0 }) {
  let elapsed = clamp(initialElapsed, duration);
  let startedAt = 0;
  let timer = null;
  let disposed = false;
  const sample = () => {
    elapsed = Math.min(duration, elapsed + performance.now() - startedAt);
    onTick(elapsed);
  };
  const resume = () => {
    if (disposed || timer !== null || elapsed >= duration) return;
    startedAt = performance.now();
    timer = setTimeout(() => {
      timer = null;
      sample();
      resume();
    }, Math.min(16, duration - elapsed));
  };
  const pause = () => {
    if (disposed || timer === null) return;
    clearTimeout(timer);
    timer = null;
    sample();
  };
  const dispose = () => {
    disposed = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return { resume, pause, dispose, get elapsed() { return elapsed; } };
}

// Every non-empty module has the same visible-time budget. More text is split
// across workers rather than extending the wait before the finished content.
export function getAgentModuleFrame(elapsed, characterCount) {
  const typeAt = 460;
  const typedAt = 1600;
  const doneAt = characterCount ? 2000 : 0;
  const base = { count: 0, frameProgress: 1, travelProgress: 1, clickProgress: 0, styleProgress: 0, doneAt };
  if (elapsed >= doneAt) return { ...base, phase: 'complete', count: characterCount, styleProgress: 1 };
  if (elapsed < 240) return { ...base, phase: 'framing', frameProgress: elapsed / 240, travelProgress: 0 };
  if (elapsed < 360) return { ...base, phase: 'arriving', travelProgress: (elapsed - 240) / 120 };
  if (elapsed < typeAt) return { ...base, phase: 'clicking', clickProgress: (elapsed - 360) / 100 };
  if (elapsed < typedAt) return { ...base, phase: 'typing', count: Math.floor(characterCount * (elapsed - typeAt) / (typedAt - typeAt)) };
  return { ...base, phase: 'styling', count: characterCount, styleProgress: (elapsed - typedAt) / 400 };
}

function splitCharacters(text) {
  return typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), item => item.segment)
    : Array.from(text);
}

/* Contiguous, non-overlapping assignments preserve every character, including
 * whitespace and grapheme clusters. Prefer paragraph boundaries near each cut. */
export function splitAgentWork(text) {
  const characters = splitCharacters(text);
  const workerCount = characters.length >= 800 ? 3 : characters.length >= 350 ? 2 : 1;
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

function framePoint(width, height, progress) {
  const w = Math.max(0, width - 2);
  const h = Math.max(0, height - 2);
  let distance = progress * (w + h) * 2;
  if (distance <= w) return { x: 1 + distance, y: 1 };
  distance -= w;
  if (distance <= h) return { x: 1 + w, y: 1 + distance };
  distance -= h;
  if (distance <= w) return { x: 1 + w - distance, y: 1 + h };
  return { x: 1, y: 1 + h - (distance - w) };
}

export function AgentModule({ build, name, color = '#67e8f9', rawText = '', className = '', children }) {
  const id = useId();
  const rootRef = useRef(null);
  const rawRef = useRef(null);
  const copyRef = useRef(null);
  const labelRefs = useRef([]);
  const clockRef = useRef(null);
  const fitRef = useRef('');
  const work = useMemo(() => splitAgentWork(rawText).map(splitCharacters), [rawText]);
  const characterCount = work.reduce((total, characters) => total + characters.length, 0);
  const duration = getAgentModuleFrame(0, characterCount).doneAt;
  const [inView, setInView] = useState(false);
  const [state, setState] = useState(() => ({ runId: build.runId, elapsed: build.enabled ? 0 : duration, preserve: false }));
  const [geometry, setGeometry] = useState(null);
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
      initialElapsed: state.elapsed,
      onTick: elapsed => setState(previous => previous.runId === runId ? { ...previous, elapsed } : previous),
    });
    clockRef.current = clock;
    if (inView && build.pageVisible) clock.resume();
    return () => { clock.dispose(); if (clockRef.current === clock) clockRef.current = null; };
  }, [build.runId, build.enabled, state.runId, duration]);

  useEffect(() => {
    if (inView && build.pageVisible) {
      setState(previous => previous.preserve ? { ...previous, preserve: false } : previous);
      clockRef.current?.resume();
    } else clockRef.current?.pause();
  }, [inView, build.pageVisible, build.runId, state.runId]);

  const resetPending = state.runId !== build.runId;
  const preserveCompleted = !inView && (resetPending ? state.elapsed >= duration || state.preserve : state.preserve);
  const elapsed = !build.enabled || preserveCompleted ? duration : resetPending ? 0 : state.elapsed;
  const frame = getAgentModuleFrame(elapsed, characterCount);
  const counts = work.map(characters => getAgentModuleFrame(elapsed, characters.length).count);
  const visibleCount = counts.reduce((total, count) => total + count, 0);
  const waiting = build.enabled && duration > 0 && !inView && elapsed === 0;
  const phase = waiting ? 'pending' : frame.phase;
  const active = phase !== 'pending' && phase !== 'complete';
  const reportState = !build.enabled || duration === 0 ? 'complete' : resetPending || preserveCompleted || waiting ? 'pending' : frame.phase === 'complete' ? 'complete' : 'active';

  useEffect(() => { build.reportModule(id, reportState); }, [id, reportState, build.reportModule]);
  useEffect(() => () => build.reportModule(id, null), [id, build.reportModule]);

  useLayoutEffect(() => {
    if (!active) return;
    let cancelled = false;
    const measure = (refit = false) => {
      if (cancelled || !rootRef.current || !copyRef.current || !rawRef.current) return;
      const host = rootRef.current.getBoundingClientRect();
      const raw = rawRef.current;
      const copy = copyRef.current;
      const fitKey = `${build.runId}:${host.width}:${host.height}:${rawText}`;
      if (refit === true || fitRef.current !== fitKey) {
        // Most raw content is shorter than the styled module. A 10px floor
        // preserves readable type; unusually long text pans instead of shrinking.
        let size = 13;
        copy.style.fontSize = `${size}px`;
        while (size > 10 && copy.scrollHeight > raw.clientHeight) {
          size -= .5;
          copy.style.fontSize = `${size}px`;
        }
        fitRef.current = fitKey;
      }
      const readWorker = (characters, index) => {
        const chunk = copy.children[index];
        const character = chunk?.children[Math.max(0, counts[index] - 1)];
        const node = character?.firstChild;
        if (!node) return null;
        const range = document.createRange();
        range.setStart(node, counts[index] ? node.length : 0);
        range.collapse(true);
        const caret = Array.from(range.getClientRects()).find(rect => rect.height > 0);
        const glyph = character.getBoundingClientRect();
        const label = labelRefs.current[index]?.getBoundingClientRect();
        return {
          x: (caret ? caret.left : counts[index] ? glyph.right : glyph.left) - host.left,
          y: (caret?.top ?? glyph.top) - host.top,
          height: caret?.height || glyph.height,
          labelWidth: label?.width || 0,
          labelHeight: label?.height || 0,
        };
      };
      if (!visibleCount) raw.scrollTop = 0;
      let workers = work.map(readWorker);
      // All workers stay visible whenever the raw copy fits. For unusually long
      // content, pan only when every insertion point has moved below the window.
      const rawBox = raw.getBoundingClientRect();
      const present = workers.filter(Boolean);
      if (present.length && present.every(worker => host.top + worker.y > rawBox.bottom)) {
        raw.scrollTop += host.top + present[0].y + present[0].height - rawBox.bottom + 3;
        workers = work.map(readWorker);
      }
      const next = { width: host.width, hostHeight: host.height, workers };
      const equalWorker = (a, b) => a === b || (a && b && Object.keys(a).every(key => Math.abs(a[key] - b[key]) < .1));
      setGeometry(previous => previous && Math.abs(previous.width - next.width) < .1 && Math.abs(previous.hostHeight - next.hostHeight) < .1
        && previous.workers.length === next.workers.length && next.workers.every((worker, index) => equalWorker(worker, previous.workers[index])) ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measure()) : null;
    observer?.observe(rootRef.current);
    const refit = () => measure(true);
    window.addEventListener('resize', refit);
    document.fonts?.addEventListener('loadingdone', refit);
    document.fonts?.ready.then(refit);
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener('resize', refit);
      document.fonts?.removeEventListener('loadingdone', refit);
    };
  }, [active, visibleCount, rawText, build.runId]);

  const revealForFocus = () => {
    clockRef.current?.dispose();
    setState({ runId: build.runId, elapsed: duration, preserve: false });
  };
  const start = geometry ? framePoint(geometry.width, geometry.hostHeight, frame.frameProgress) : { x: 1, y: 1 };
  const travel = 1 - Math.pow(1 - frame.travelProgress, 3);
  const role = phase === 'framing' ? 'LAYOUT' : phase === 'styling' ? 'STYLE' : 'TYPE';
  const workerColors = [color, ...['#ff65d9', '#a7ff4c', '#00e5ff'].filter(candidate => candidate !== color)].slice(0, 3);
  const placedLabels = [];
  const decorations = work.map((characters, index) => {
    const worker = geometry?.workers[index];
    const target = worker ? { x: worker.x, y: worker.y + worker.height * .7 } : start;
    const styleTravel = 1 - Math.pow(1 - frame.styleProgress, 3);
    const pointer = phase === 'framing' ? start
      : phase === 'arriving' ? { x: 1 + (target.x - 1) * travel, y: 1 + (target.y - 1) * travel }
      : phase === 'styling' && geometry ? { x: target.x + (geometry.width - 18 - index * 22 - target.x) * styleTravel, y: target.y + (18 + index * 25 - target.y) * styleTravel }
      : target;
    const labelWidth = worker?.labelWidth || 94;
    const labelHeight = worker?.labelHeight || 18;
    const labelX = geometry ? clamp(pointer.x + 14, geometry.width - labelWidth - 3) : 0;
    const naturalLabelY = geometry ? clamp(pointer.y + 15, geometry.hostHeight - labelHeight - 3) : 0;
    // Short adjacent paragraphs can put insertion points on neighboring lines.
    // Move their labels, never the actual measured pointer tip.
    const collides = y => placedLabels.some(other => labelX < other.x + other.width + 3 && labelX + labelWidth + 3 > other.x
      && y < other.y + other.height + 3 && y + labelHeight + 3 > other.y);
    const labelCandidates = [naturalLabelY, ...placedLabels.flatMap(other => [other.y + other.height + 4, other.y - labelHeight - 4])]
      .map(y => geometry ? clamp(y, geometry.hostHeight - labelHeight - 3) : y);
    const labelY = labelCandidates.find(y => !collides(y)) ?? naturalLabelY;
    placedLabels.push({ x: labelX, y: labelY, width: labelWidth, height: labelHeight });
    const pressed = phase === 'clicking' && frame.clickProgress < .55 ? .84 : 1;
    return {
      pointer, labelX, labelY, worker,
      visible: !!worker && (phase === 'styling' || (pointer.y >= 0 && pointer.y <= geometry.hostHeight)),
      scaleX: geometry && pointer.x > geometry.width - 20 ? -pressed : pressed,
      scaleY: geometry && pointer.y > geometry.hostHeight - 24 ? -pressed : pressed,
    };
  });
  return (
    <div className={`agent-module ${className}`} ref={rootRef} onFocusCapture={revealForFocus}
      style={{ '--agent-color': color, '--agent-style-progress': frame.styleProgress }}
      data-build-state={phase} data-build-count={visibleCount} data-build-worker-count={work.length} data-build-duration={duration} data-build-run={build.runId}
      data-build-visible={inView} data-build-paused={!inView || !build.pageVisible} data-build-replay-pending={preserveCompleted}>
      <div className="agent-module-final" style={{ opacity: frame.styleProgress }}>{children}</div>
      {phase !== 'complete' && <div className="agent-module-scene" aria-hidden="true" style={{ opacity: 1 - frame.styleProgress }}>
        <svg className="agent-module-frame" width="100%" height="100%" focusable="false">
          <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" pathLength="1" strokeDasharray={`${frame.frameProgress} 1`} />
        </svg>
        <div className="agent-module-raw" ref={rawRef}><div className="agent-module-raw-copy" ref={copyRef}>
          {work.map((characters, workerIndex) => <span className="agent-module-raw-chunk" data-worker-index={workerIndex} data-worker-count={counts[workerIndex]} key={workerIndex}>
            {characters.map((character, position) => <span data-visible={position < counts[workerIndex]} key={position}>{character}</span>)}
          </span>)}
        </div></div>
        {active && decorations.map((decoration, index) => (phase !== 'framing' || index === 0) && <React.Fragment key={index}>
          {decoration.worker && phase === 'typing' && <span className="agent-module-caret" data-worker-index={index} style={{ left: decoration.worker.x, top: decoration.worker.y, height: decoration.worker.height, color: workerColors[index], opacity: decoration.visible ? 1 : 0 }} />}
          <span className="agent-module-pointer" data-worker-index={index} style={{ left: decoration.pointer.x, top: decoration.pointer.y, color: workerColors[index], opacity: decoration.visible ? 1 : 0 }}>
            <svg viewBox="0 0 20 25" width="16" height="20" focusable="false" style={{ transform: `scale(${decoration.scaleX}, ${decoration.scaleY})` }}><path d="M0 0 18 14l-7 1-4 8Z" fill="currentColor" stroke="#071018" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            {phase === 'clicking' && <span className="agent-module-click" style={{ opacity: 1 - frame.clickProgress, transform: `translate(-50%, -50%) scale(${.5 + frame.clickProgress * 1.2})` }} />}
          </span>
          <span className="agent-module-label" data-worker-index={index} ref={element => { labelRefs.current[index] = element; }} style={{ left: decoration.labelX, top: decoration.labelY, '--agent-color': workerColors[index], opacity: decoration.visible ? 1 : 0 }}>{name}{work.length > 1 ? `.${index + 1}` : ''} · {role}</span>
        </React.Fragment>)}
      </div>}
    </div>
  );
}
