/* Rhombille lattice: the field behind the document.
 *
 * Each hexagon of the lattice is drawn as a cube corner with three faces, one
 * per voice (cyan top, gold right, magenta left). A slow swell moves through
 * it. The cubes under and around the pointer rise and brighten in one soft
 * patch, strongest at the pointer and gone within about two cells; it is kept
 * faint because it sits behind text. A click or tap sends one ring of height
 * outwards.
 *
 * The caller owns the canvas, the clock and the frame rate; this module only
 * draws into the context it is given. */

const FACES = [[0, 229, 255], [245, 230, 99], [255, 101, 217]];
const FACE_WEIGHT = [1, .72, .72];
const EDGE = [170, 215, 230];
const LEVELS = 16;
const FACE_MAX = .3;
const EDGE_MAX = .5;
/* The resting field: how far the swell lifts a cube, and the alpha of a face
 * and of an edge at rest. These three set how faint the whole lattice is. */
const SWELL = .24;
const FACE_REST = .02;
const EDGE_REST = .032;
/* The pointer patch: how far it reaches (in cells, as a Gaussian radius) and
 * how much it lifts the cube directly under the pointer. */
const GLOW_REACH = 1.4;
const GLOW_LIFT = .42;
const WAVE_SPEED = 560;
const WAVE_LIFE = 1.6;
const UNIT = [0, 1, 2, 3, 4, 5].map(corner => {
  const angle = (corner * 60 - 90) * Math.PI / 180;
  return [Math.cos(angle), Math.sin(angle)];
});
// Each face is the cube's raised centre plus three consecutive hexagon corners.
const FACE_CORNERS = [[5, 0, 1], [1, 2, 3], [3, 4, 5]];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const colour = (channels, alpha) => `rgba(${channels[0]},${channels[1]},${channels[2]},${alpha.toFixed(3)})`;
// Faint shades get most of the levels, so the idle swell does not band.
const levelOf = (alpha, maximum) => Math.min(LEVELS - 1, Math.floor(Math.sqrt(clamp(alpha / maximum, 0, 1)) * LEVELS));
const alphaOf = (level, maximum) => Math.pow((level + .5) / LEVELS, 2) * maximum;

function swell(x, y, t) {
  const first = Math.sin((x - y) * .004 - t);
  const second = Math.sin(x * .002 + y * .005 - t * 1.3) * .5;
  const third = Math.sin(x * .006 - y * .002 - t * .8) * .3;
  const fourth = Math.sin(t * .6 + Math.sin(x * .012 + y * .078) * 43.75) * .25;
  return clamp((first + second + third + fourth) / 2.05, -1, 1);
}

export function createLattice(context) {
  let width = 0, height = 0, radius = 38, drawnAt = 0;
  let waves = [];
  const pointer = { x: 0, y: 0, active: false };
  // The patch follows the pointer with a short glide and fades with its presence.
  const glow = { x: 0, y: 0, strength: 0, placed: false };
  const faceBuckets = FACES.map(() => Array.from({ length: LEVELS }, () => []));
  const edgeBuckets = Array.from({ length: LEVELS }, () => []);

  const onMove = event => {
    if (event.pointerType === 'touch') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  };
  const onLeave = () => { pointer.active = false; };
  // `click`, not `pointerdown`: a finger that starts a scroll is not a press.
  const onPress = event => {
    waves.push({ x: event.clientX, y: event.clientY, at: performance.now() });
    if (waves.length > 4) waves.shift();
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('click', onPress, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);
  window.addEventListener('blur', onLeave);

  function draw(now, t) {
    const seconds = clamp((now - drawnAt) / 1000, 0, .1);
    drawnAt = now;
    const step = radius * Math.sqrt(3);
    const rise = radius * 1.5;
    const cell = radius * 1.6;

    if (pointer.active) {
      const glide = glow.placed ? 1 - Math.exp(-seconds * 22) : 1;
      glow.x += (pointer.x - glow.x) * glide;
      glow.y += (pointer.y - glow.y) * glide;
      glow.placed = true;
    }
    glow.strength += ((pointer.active ? 1 : 0) - glow.strength) * (1 - Math.exp(-seconds * 6));
    if (!pointer.active && glow.strength < .01) glow.placed = false;
    waves = waves.filter(wave => now - wave.at < WAVE_LIFE * 1000);

    const strength = glow.strength;
    const breath = 1 + .12 * Math.sin(t * 1.3);
    for (const levels of faceBuckets) for (const bucket of levels) bucket.length = 0;
    for (const bucket of edgeBuckets) bucket.length = 0;

    const rows = Math.ceil(height / rise) + 2;
    const columns = Math.ceil(width / step) + 2;
    for (let row = -1; row < rows; row++) {
      for (let column = -1; column < columns; column++) {
        const x = column * step + (row & 1 ? step / 2 : 0);
        const y = row * rise;
        let lift = SWELL * swell(x, y, t);
        if (strength > .005) {
          const distance = Math.hypot(x - glow.x, y - glow.y) / (cell * GLOW_REACH);
          if (distance < 3) {
            // The patch presses the swell flat beneath it, so its brightness
            // does not rise and fall with whatever wave happens to pass under.
            const reach = strength * Math.exp(-distance * distance);
            lift = lift * (1 - .8 * reach) + GLOW_LIFT * reach;
          }
        }
        for (const wave of waves) {
          const age = (now - wave.at) / 1000;
          const gap = Math.hypot(x - wave.x, y - wave.y) - age * WAVE_SPEED;
          lift += 1.2 * Math.exp(-gap * gap / 9800) * (1 - age / WAVE_LIFE);
        }

        const centreLift = y - lift * radius * .45;
        const faceAlpha = (FACE_REST + .2 * Math.max(0, lift)) * breath;
        const edges = edgeBuckets[levelOf(EDGE_REST + .26 * Math.abs(lift), EDGE_MAX)];
        for (let face = 0; face < 3; face++) {
          const corners = FACE_CORNERS[face];
          const bucket = faceBuckets[face][levelOf(faceAlpha * FACE_WEIGHT[face], FACE_MAX)];
          bucket.push(x, centreLift,
            x + radius * UNIT[corners[0]][0], y + radius * UNIT[corners[0]][1],
            x + radius * UNIT[corners[1]][0], y + radius * UNIT[corners[1]][1],
            x + radius * UNIT[corners[2]][0], y + radius * UNIT[corners[2]][1]);
          // One spoke and one outline segment per face draw every lattice edge once.
          edges.push(x, centreLift, x + radius * UNIT[corners[2]][0], y + radius * UNIT[corners[2]][1],
            x + radius * UNIT[face][0], y + radius * UNIT[face][1], x + radius * UNIT[face + 1][0], y + radius * UNIT[face + 1][1]);
        }
      }
    }

    for (let face = 0; face < 3; face++) {
      for (let level = 0; level < LEVELS; level++) {
        const bucket = faceBuckets[face][level];
        if (!bucket.length) continue;
        context.fillStyle = colour(FACES[face], alphaOf(level, FACE_MAX));
        context.beginPath();
        for (let index = 0; index < bucket.length; index += 8) {
          context.moveTo(bucket[index], bucket[index + 1]);
          context.lineTo(bucket[index + 2], bucket[index + 3]);
          context.lineTo(bucket[index + 4], bucket[index + 5]);
          context.lineTo(bucket[index + 6], bucket[index + 7]);
          context.closePath();
        }
        context.fill();
      }
    }
    context.lineWidth = 1;
    for (let level = 0; level < LEVELS; level++) {
      const bucket = edgeBuckets[level];
      if (!bucket.length) continue;
      context.strokeStyle = colour(EDGE, alphaOf(level, EDGE_MAX));
      context.beginPath();
      for (let index = 0; index < bucket.length; index += 4) {
        context.moveTo(bucket[index], bucket[index + 1]);
        context.lineTo(bucket[index + 2], bucket[index + 3]);
      }
      context.stroke();
    }

    // The press itself: three thin rings, the same order as a module's front.
    context.lineWidth = 1.2;
    for (const wave of waves) {
      const age = (now - wave.at) / 1000;
      const fade = (1 - age / WAVE_LIFE) * .3;
      [[FACES[0], 7], [[255, 251, 230], 0], [FACES[2], -7]].forEach(([channels, offset]) => {
        context.strokeStyle = colour(channels, fade);
        context.beginPath();
        context.arc(wave.x, wave.y, Math.max(0, age * WAVE_SPEED + offset), 0, Math.PI * 2);
        context.stroke();
      });
    }
  }

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      radius = nextWidth < 768 ? 30 : 38;
    },
    draw,
    dispose() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('click', onPress);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    },
  };
}
