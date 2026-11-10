/* Frame loop and luminous layer of the build choreography.
 *
 * One requestAnimationFrame loop serves every module that is building. Each
 * frame it (1) samples the modules' clocks and lets every stage write its DOM,
 * (2) reads geometry once for all of them, then (3) draws the conductor
 * threads, voice sparks, links and impact rings on a single fixed canvas.
 * Keeping writes before reads means one layout per frame however many modules
 * build together. The loop owns no content: if it never runs, the module
 * clocks still complete and every module still appears. */

const TAU = Math.PI * 2;
const TRAIL_MS = 190;
const SIGNAL = '#fff3c4';
const WHITE = '#ffffff';

/* Share of the impact measure spent converging before the shock front. */
export const CONVERGE = .34;
export const easeInOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

const entries = new Map();
const anchorElements = new Map();
const colorCache = new Map();
const sprites = new Map();
let effects = [];
let spawned = [];
let canvas = null, context = null, compact = null, shown = false;
let frameRequest = 0, pixelRatio = 1, viewWidth = 0, viewHeight = 0;

function rgba(hex, alpha) {
  let channels = colorCache.get(hex);
  if (!channels) {
    const value = parseInt(hex.slice(1), 16);
    channels = `${value >> 16 & 255},${value >> 8 & 255},${value & 255}`;
    colorCache.set(hex, channels);
  }
  return `rgba(${channels},${Math.max(0, Math.min(1, alpha))})`;
}

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  canvas.width = Math.round(viewWidth * pixelRatio);
  canvas.height = Math.round(viewHeight * pixelRatio);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;
}

function ensureCanvas() {
  if (canvas?.isConnected) return !!context;
  if (typeof document === 'undefined' || !document.body) return false;
  canvas = document.createElement('canvas');
  canvas.className = 'agent-ensemble';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  shown = false;
  document.body.appendChild(canvas);
  context = canvas.getContext('2d');
  compact = window.matchMedia('(max-width: 1000px)');
  window.addEventListener('resize', resize);
  resize();
  return !!context;
}

/* An idle full-screen canvas is still a full-screen layer to blend. */
function show(visible) {
  if (shown === visible) return;
  shown = visible;
  canvas.hidden = !visible;
}

/* Soft light is drawn from small cached sprites instead of a new gradient per
 * spark per frame. */
function sprite(color, kind) {
  const key = kind + color;
  let image = sprites.get(key);
  if (!image) {
    image = document.createElement('canvas');
    image.width = image.height = 64;
    const paint = image.getContext('2d');
    if (paint) {
      const glow = paint.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, rgba(color, kind === 'spark' ? .62 : 1));
      glow.addColorStop(kind === 'spark' ? .35 : .3, rgba(color, kind === 'spark' ? .2 : .45));
      glow.addColorStop(1, rgba(color, 0));
      paint.fillStyle = glow;
      paint.fillRect(0, 0, 64, 64);
    }
    sprites.set(key, image);
  }
  return image;
}

/* Threads leave the conductor rail: the portrait for the identity module and
 * the section's navigation entry for everything else. */
function anchorFor(group, origin) {
  let element = anchorElements.get(group);
  if (!element || !element.isConnected) {
    element = document.querySelector(group === 'origin' ? '.wb-portrait' : `.wb-nav a[href="#${group}"]`);
    if (!element) return null;
    anchorElements.set(group, element);
  }
  const box = element.getBoundingClientRect();
  if (!box.width || box.bottom < 0 || box.top > viewHeight) return null;
  if (group === 'origin') {
    return origin.x >= box.right - 8
      ? { x: box.right, y: box.top + box.height / 2, vertical: false }
      : { x: box.left + Math.min(26, box.width / 2), y: box.bottom, vertical: true };
  }
  if (compact.matches) {
    const bar = element.parentElement.getBoundingClientRect();
    if (bar.bottom < 0 || bar.top > viewHeight) return null;
    const x = Math.max(bar.left + 14, Math.min(box.left + box.width / 2, bar.right - 14));
    return { x, y: bar.bottom, vertical: true };
  }
  const dot = element.lastElementChild.getBoundingClientRect();
  return { x: dot.left + dot.width / 2, y: dot.top + dot.height / 2, vertical: false };
}

function threadCurve(anchor, origin) {
  if (anchor.vertical) {
    const reach = Math.max(18, Math.abs(origin.y - anchor.y) * .5);
    return [anchor, { x: anchor.x, y: anchor.y + reach }, { x: origin.x, y: origin.y - reach * .6 }, origin];
  }
  const reach = Math.max(36, Math.abs(origin.x - anchor.x) * .5);
  return [anchor, { x: anchor.x + reach, y: anchor.y }, { x: origin.x - reach * .55, y: origin.y - Math.min(26, reach * .2) }, origin];
}

function bezier(curve, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {
    x: a * curve[0].x + b * curve[1].x + c * curve[2].x + d * curve[3].x,
    y: a * curve[0].y + b * curve[1].y + c * curve[2].y + d * curve[3].y,
  };
}

function strokeThread(curve, from, to, color, alpha) {
  if (to <= from || alpha <= 0) return;
  const gradient = context.createLinearGradient(curve[0].x, curve[0].y, curve[3].x, curve[3].y);
  gradient.addColorStop(0, rgba(color, alpha * .3));
  gradient.addColorStop(1, rgba(color, alpha));
  context.strokeStyle = gradient;
  context.lineWidth = 1;
  context.beginPath();
  for (let step = 0; step <= 28; step++) {
    const point = bezier(curve, lerp(from, to, step / 28));
    if (step) context.lineTo(point.x, point.y);
    else context.moveTo(point.x, point.y);
  }
  context.stroke();
}

function glowDot(x, y, color, radius, alpha) {
  if (alpha <= 0) return;
  const reach = radius * 4;
  context.globalAlpha = Math.min(1, alpha);
  context.drawImage(sprite(color, 'dot'), x - reach, y - reach, reach * 2, reach * 2);
  context.globalAlpha = 1;
}

function drawRing(x, y, radius, color, alpha) {
  if (alpha <= 0) return;
  context.strokeStyle = rgba(color, alpha);
  context.lineWidth = 1;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.stroke();
}

function drawSpark(x, y, core, color, size) {
  const reach = size * 5.5;
  context.drawImage(sprite(color, 'spark'), x - reach, y - reach, reach * 2, reach * 2);
  context.fillStyle = core;
  context.beginPath();
  context.moveTo(x, y - size * 1.3);
  context.lineTo(x + size, y);
  context.lineTo(x, y + size * 1.3);
  context.lineTo(x - size, y);
  context.closePath();
  context.fill();
}

/* Trails are stored in document coordinates so they stay attached to their
 * module while the reader scrolls. */
function drawTrails(entry, now) {
  const scrollX = window.scrollX, scrollY = window.scrollY;
  for (const spark of entry.sparks) {
    if (!spark) continue;
    const trail = spark.trail;
    while (trail.length && now - trail[0].at > TRAIL_MS) trail.shift();
    for (let index = 1; index < trail.length; index++) {
      const from = trail[index - 1], to = trail[index];
      if (Math.abs(to.x - from.x) + Math.abs(to.y - from.y) > 260) continue;
      const strength = 1 - (now - to.at) / TRAIL_MS;
      context.strokeStyle = rgba(spark.color, strength * strength * .75);
      context.lineWidth = .5 + strength * 1.7;
      context.beginPath();
      context.moveTo(from.x - scrollX, from.y - scrollY);
      context.lineTo(to.x - scrollX, to.y - scrollY);
      context.stroke();
    }
  }
}

function place(entry, index, x, y, core, color, size, now) {
  const spark = entry.sparks[index] || (entry.sparks[index] = { trail: [], color });
  const pageX = x + window.scrollX, pageY = y + window.scrollY;
  const last = spark.trail[spark.trail.length - 1];
  spark.color = color;
  // A resting spark leaves no trail to extend.
  if (!last || Math.abs(last.x - pageX) + Math.abs(last.y - pageY) > .3) spark.trail.push({ x: pageX, y: pageY, at: now });
  drawSpark(x, y, core, color, size);
}

function drawLinks(points, now, alpha) {
  if (alpha <= 0) return;
  for (let first = 0; first < points.length; first++) {
    for (let second = first + 1; second < points.length; second++) {
      const a = points[first], b = points[second];
      const gradient = context.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, rgba(a.color, .5 * alpha));
      gradient.addColorStop(1, rgba(b.color, .5 * alpha));
      context.strokeStyle = gradient;
      context.lineWidth = .9;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
      // A message travels each link; alternate links run in opposite directions.
      const beat = (now / 560 + (first + second) * .31) % 1;
      const along = (first + second) % 2 ? 1 - beat : beat;
      glowDot(lerp(a.x, b.x, along), lerp(a.y, b.y, along), WHITE, 1.5, Math.sin(beat * Math.PI) * .95 * alpha);
    }
  }
}

function pushRing(element, x, y, color, radius, life) {
  spawned.push({ kind: 'ring', element, x, y, color, radius, life, at: performance.now() });
}

function drawEntry(entry, now) {
  const frame = entry.frame, box = entry.box;
  const elapsed = Math.min(64, now - (entry.seenAt ?? now));
  entry.seenAt = now;
  if (!box.width || box.bottom < -160 || box.top > viewHeight + 160) return;
  const width = box.width, height = box.height;
  const left = box.left + .5, top = box.top + .5, right = box.right - .5, bottom = box.bottom - .5;
  const origin = { x: left, y: top };
  const color = entry.color, voiceColors = entry.voiceColors;
  const voiceCount = voiceColors.length;
  const anchor = anchorFor(entry.group, origin);
  const curve = anchor && threadCurve(anchor, origin);
  drawTrails(entry, now);

  // SIGNAL: one spark travels from the conductor rail to the module.
  if (frame.phase === 'intent') {
    const progress = easeInOutCubic(frame.summonProgress);
    if (progress <= 0) return;
    let head = origin;
    if (curve) {
      strokeThread(curve, 0, progress, color, .8);
      glowDot(anchor.x, anchor.y, color, 2.2, .9);
      head = bezier(curve, progress);
    } else drawRing(origin.x, origin.y, 3 + (1 - progress) * 24, color, progress * .8);
    place(entry, 0, head.x, head.y, SIGNAL, color, 3, now);
    return;
  }

  if (curve) {
    strokeThread(curve, 0, 1, color, frame.phase === 'impact' ? .1 : .17);
    glowDot(anchor.x, anchor.y, color, 1.8, .7);
    const beat = ((now - entry.bornAt) % 780) / 780;
    const message = bezier(curve, beat);
    glowDot(message.x, message.y, color, 1.4, Math.sin(beat * Math.PI) * .8);
  }

  // FRAME: two sparks draw the frame in opposite directions.
  if (frame.phase === 'division') {
    const distance = easeInOutCubic(frame.frameProgress) * (width + height);
    const a = distance <= width ? { x: left + distance, y: top } : { x: right, y: Math.min(bottom, top + distance - width) };
    const b = distance <= height ? { x: left, y: top + distance } : { x: Math.min(right, left + distance - height), y: bottom };
    context.strokeStyle = rgba(color, .9);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left, top);
    if (distance > width) context.lineTo(right, top);
    context.lineTo(a.x, a.y);
    context.moveTo(left, top);
    if (distance > height) context.lineTo(left, bottom);
    context.lineTo(b.x, b.y);
    context.stroke();
    place(entry, 0, a.x, a.y, WHITE, color, 2.8, now);
    place(entry, 1, b.x, b.y, WHITE, color, 2.8, now);
    return;
  }

  // F / R / C: the two meet at the far corner and part as the three voices.
  if (frame.phase === 'voices') {
    if (!entry.met) {
      entry.met = true;
      pushRing(entry.element, width, height, SIGNAL, 26, 460);
    }
    const progress = easeOutCubic(frame.travelProgress);
    for (let index = 0; index < voiceCount; index++) {
      const target = entry.voices[index] || { x: width / 2, y: height / 2 };
      const targetX = left + target.x, targetY = top + target.y;
      const normalX = -(targetY - bottom), normalY = targetX - right;
      const length = Math.hypot(normalX, normalY) || 1;
      const bend = Math.sin(progress * Math.PI) * (index - (voiceCount - 1) / 2) * 34;
      const x = lerp(right, targetX, progress) + normalX / length * bend;
      const y = lerp(bottom, targetY, progress) + normalY / length * bend;
      entry.resting[index] = { x: x - left, y: y - top };
      place(entry, index, x, y, WHITE, voiceColors[index], 2.6, now);
    }
    return;
  }

  // DRAFT: the voices write in parallel, linked by their messages.
  if (frame.phase === 'composition') {
    // Rest points arrive with each rewrite of the draft (about 30Hz); the
    // sparks ease towards them on every frame.
    const ease = 1 - Math.exp(-elapsed / 28);
    const points = [];
    for (let index = 0; index < voiceCount; index++) {
      const target = entry.voices[index];
      const resting = entry.resting[index] || (target && { x: target.x, y: target.y });
      if (!resting) continue;
      if (target) {
        resting.x = lerp(resting.x, target.x, ease);
        resting.y = lerp(resting.y, target.y, ease);
      }
      entry.resting[index] = resting;
      if (target && target.hidden) continue;
      points.push({ index, x: left + resting.x, y: top + resting.y, color: voiceColors[index] });
    }
    context.lineWidth = .6;
    for (const point of points) {
      context.strokeStyle = rgba(point.color, .1);
      context.beginPath();
      context.moveTo(left, top);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
    drawLinks(points, now, 1);
    for (const point of points) place(entry, point.index, point.x, point.y, WHITE, point.color, 2.4, now);
    return;
  }

  // IMPACT: the voices collide at the origin; the module's shock front takes over.
  if (frame.styleProgress < CONVERGE) {
    const progress = easeInOutCubic(frame.styleProgress / CONVERGE);
    const points = [];
    for (let index = 0; index < voiceCount; index++) {
      const resting = entry.resting[index];
      if (!resting) continue;
      points.push({ index, x: left + lerp(resting.x, 0, progress), y: top + lerp(resting.y, 0, progress), color: voiceColors[index] });
    }
    drawLinks(points, now, 1 - progress);
    for (const point of points) place(entry, point.index, point.x, point.y, WHITE, point.color, 2.4 + progress * .9, now);
  } else if (!entry.merged) {
    entry.merged = true;
    pushRing(entry.element, 0, 0, SIGNAL, 36, 520);
    voiceColors.forEach((voice, index) => pushRing(entry.element, 0, 0, voice, 26 - index * 8, 440 - index * 60));
  }
}

function drawEffect(effect, now) {
  const progress = (now - effect.at) / effect.life;
  if (progress >= 1 || (effect.element && !effect.element.isConnected)) return false;
  if (progress < 0) return true;
  const box = effect.element ? effect.element.getBoundingClientRect() : null;
  if (effect.kind === 'ring') {
    const x = effect.x + (box ? box.left : 0), y = effect.y + (box ? box.top : 0);
    drawRing(x, y, 2 + easeOutCubic(progress) * effect.radius, effect.color, (1 - progress) * (1 - progress) * .9);
    return true;
  }
  // The signal reports back along its thread once the module is sealed.
  const origin = { x: box.left + .5, y: box.top + .5 };
  const anchor = anchorFor(effect.group, origin);
  if (!anchor) return false;
  const curve = threadCurve(anchor, origin);
  const position = 1 - easeInOutCubic(progress);
  strokeThread(curve, Math.max(0, position - .04), Math.min(1, position + .24), effect.color, .7 * (1 - progress * .5));
  const head = bezier(curve, position);
  drawSpark(head.x, head.y, SIGNAL, effect.color, 2.2);
  if (progress > .9 && !effect.arrived) {
    effect.arrived = true;
    spawned.push({ kind: 'ring', element: null, x: anchor.x, y: anchor.y, color: effect.color, radius: 11, life: 380, at: now });
  }
  return true;
}

function render(now) {
  frameRequest = 0;
  const live = [];
  // 1. Writes: every building module updates its own DOM from its clock.
  for (const [id, entry] of entries) {
    if (!entry.element.isConnected) { entries.delete(id); continue; }
    if (entry.paused) continue;
    entry.frame = entry.sample();
    entry.stage.write(entry.frame, now);
    if (entry.frame.phase !== 'complete') live.push(entry);
  }
  // 2. Reads: one layout serves every module.
  for (const entry of live) {
    entry.box = entry.element.getBoundingClientRect();
    const voices = entry.stage.read(entry.box);
    if (voices) entry.voices = voices;
  }
  // 3. Light.
  if (ensureCanvas()) {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, viewWidth, viewHeight);
    context.globalCompositeOperation = 'lighter';
    for (const entry of live) drawEntry(entry, now);
    effects = effects.filter(effect => drawEffect(effect, now));
    if (spawned.length) {
      effects.push(...spawned);
      spawned = [];
    }
    show(live.length > 0 || effects.length > 0);
  } else effects = [];
  if (live.length || effects.length) frameRequest = requestAnimationFrame(render);
}

function start() {
  if (!frameRequest && typeof requestAnimationFrame === 'function') frameRequest = requestAnimationFrame(render);
}

export const ensemble = {
  /* Called when a module begins a run. `stage` exposes write(frame, now) and
   * read(box); `sample` returns the module's current timeline frame. */
  set(id, { run, element, group, color, voiceColors, paused, sample, stage }) {
    let entry = entries.get(id);
    if (!entry || entry.run !== run) {
      entry = { run, sparks: [], resting: [], voices: [], bornAt: performance.now(), met: false, merged: false };
      entries.set(id, entry);
    }
    Object.assign(entry, { element, group, color, voiceColors, paused, sample, stage });
    if (!paused) start();
  },
  pause(id, paused) {
    const entry = entries.get(id);
    if (!entry || entry.paused === paused) return;
    entry.paused = paused;
    start();
  },
  remove(id) {
    if (entries.delete(id)) start();
  },
  /* A module resolved on its own clock: send the signal back to the conductor. */
  seal(id) {
    const entry = entries.get(id);
    if (!entry) return;
    entries.delete(id);
    effects.push({ kind: 'return', element: entry.element, group: entry.group, color: entry.color, life: 460, at: performance.now() });
    start();
  },
};
