# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current homepage (2026-11-09)

The active homepage is the open-workspace design; the carousel descriptions in
historical notes below refer to the previous layout. See README.md for commands.

- Static React 18 UMD with **compiled** esbuild and Tailwind v3 assets; no backend.
- `src/app.jsx` loads data and retains Canvas/BGM/image helpers.
- `src/workbench.jsx` + `src/workbench.css` render all five content sections and
  the full experience, education and skills in one responsive document.
- `src/agent-build.jsx` + `src/agent-build.css` build individual modules on viewport
  entry in 2,000ms: frame, parallel progressive raw text, then final styling.
  Longer content uses two or three writers. Each module pauses while
  offscreen or the tab is hidden; Skip, Replay, Escape and reduced motion are supported.
- Reserve final geometry during the progressive visual reveal and retain complete
  semantic content. Keyboard focus reveals its module. Do not restore tab-only
  content, masked carousels, global arrow-key capture or a blocking page loader.
- Desktop has a sticky portrait/social/navigation rail; mobile has a sticky top
  section bar. Order: Education, Experience, Projects, Publications, Blogs,
  Resources, Study Notes, Skills. The agent console and old directory are removed.
- All content stays in `data/rings.json`; `active: false` entries remain non-clickable.
- Keep the Apple mode, backup and hidden historical pages intact.
- The active homepage no longer loads the cyber cat; retain its historical assets.
- Privacy: never add phone numbers. Email is allowed only on the main homepage,
  its JSON feed and fallback. Keep it out of alternative/archived pages.
- Preserve project IDs `PROJ_001` etc. Projects have `star` fields for Situation,
  Task, Action and Result; descriptions remain short summaries. Images use local
  optimized WebP assets, including AI-generated covers in `images/generated/`;
  missing images retain a local NO_SIGNAL placeholder. No new external image fetch.

## Corner mascot (`mascot/`)

A drop-in 3D mascot — chibi anime girl in a penguin kigurumi ("Guga"), generated with
Meshy image-to-3D from a figurine photo. Fixed camera (no orbit), bottom-right corner,
transparent WebGL canvas over the page.

Files:
- `mascot/mascot.js` — the whole runtime (ES module). Self-initializes on `window load`.
- `mascot/penguin.glb` — optimized model (316 KB: ~43k tris, Draco, 1024² WebP basecolor).
- `mascot/raw/` — original 21 MB Meshy export, **gitignored**; keep locally as source.
- `mascot/test.html` — standalone test page with interaction checklist + click-through probe.

Adopt on a page by adding the Three.js import map + module script (see header comment in
`mascot.js` or `test.html` for the exact snippet).

Behaviour / design decisions:
- The mesh is static (no rig) — all moves are procedural whole-body transforms
  (squash-stretch bounce, spin-hop, lean) + canvas-drawn emotion sprites (hearts, ♪,
  `guga~!` speech bubble, anger mark). Click = reaction (head taps give head-pat hearts,
  4+ fast clicks = annoyed); press-drag across her = petting with heart trail.
- Render-on-demand: rAF loop runs only while a tween/sprite/pet is active; otherwise the
  canvas is a static frame with zero GPU cost (important on `index.html`, which already
  runs a full-screen 2D canvas).
- The Meshy pedestal disc is still in the geometry — hidden by a clipping plane
  (`PEDESTAL_FRAC` in mascot.js) and excluded from raycast hits. Don't re-export to
  remove it; the clip is cheaper than touching the asset.
- Pointer events: the host div is `pointer-events: none` except while the cursor
  raycast-hits her body, so underlying page UI stays clickable (verified by the probe
  in test.html).
- The GLB **requires** Draco + WebP support (`extensionsRequired`); the optimization
  stripped vertex normals, so `mascot.js` runs `computeVertexNormals()` at load —
  don't remove that line.
- Re-optimizing a new raw export:
  `npx @gltf-transform/cli unlit raw.glb t1.glb && prune && weld && simplify --ratio 0.08 --error 0.01 && optimize --compress draco --texture-compress webp --texture-size 1024 --simplify false`
  (run as separate commands; see git history for the exact sequence).

## Development

### Building `index.html` assets (required after editing `src/`)
The main page no longer compiles JSX/Tailwind in the browser. Source lives in `src/`,
served artifacts in `assets/` (checked in — GitHub Pages serves them as-is):

- `src/app.jsx` → `assets/app.js`:
  `npx --yes esbuild src/app.jsx --bundle --minify --format=iife --global-name=HarryGraphOS --outfile=assets/app.js`
- `src/styles.css` + `tailwind.config.cjs` → `assets/site.css`:
  `npx --yes tailwindcss@3.4.17 -c tailwind.config.cjs -i src/styles.css -o assets/site.css --minify`
  (Tailwind v3 syntax; custom classes toggled at runtime must be in the config `safelist`.)
- React 18 UMD is self-hosted at `assets/vendor/` — no CDN.
- After rebuilding, bump the `?v=` cache-buster on the `site.css` / `app.js` references in
  `index.html`.
- Editing `data/rings.json` alone needs NO rebuild (fetched at runtime), but keep
  `FALLBACK_DATA` in `src/app.jsx` roughly in sync for `file://` viewing.

### Local Testing
- Other pages (index_apple, hidden/, holidays/) still open directly — no build step
- To test with live reload: `python -m http.server 8000` or similar (required for
  `index.html` so the `rings.json` fetch works)
- `python scripts/verify_index.py` — checks unsafe JS patterns, blank-link hardening,
  missing/oversized images, and that no in-browser compilers snuck back in

### Deploying Changes
- Git push to main branch automatically deploys to GitHub Pages
- All files in the root are served directly (compiled `assets/` included)

## Key Design Patterns

### React Components
`index.html` is pre-compiled: JSX in `src/app.jsx`, built with esbuild to `assets/app.js`
(see "Building `index.html` assets"). React/ReactDOM UMD are self-hosted in `assets/vendor/`.

Secondary pages may still use the legacy inline pattern (Babel standalone + CDN):
```html
<div id="root"></div>
<script type="text/babel">
  // JSX code here
  ReactDOM.createRoot(document.getElementById('root')).render(...)
</script>
```
Do not reintroduce Babel/Tailwind CDN compilers into `index.html` — `scripts/verify_index.py`
fails on them.

### Canvas-Based Effects
Complex visual effects (like the Christmas particle tree) use HTML5 Canvas directly with JavaScript, not DOM/React. This provides better performance for animations.

### External Dependencies
- **`index.html`**: fully self-hosted — compiled Tailwind CSS + React 18 UMD from
  `assets/`; only Google Fonts and the SoundCloud widget are external.
- **Secondary pages**: Tailwind CDN / React CDN / Babel standalone (legacy pattern).
- **SoundCloud Widget API**: loaded lazily on first BGM toggle (`useBgm` injects the
  script and sets the iframe `src` from `data-src`). The iframe (`#sc-iframe`) is hidden
  via CSS but keeps real `width/height` attributes. Track: "The Rebel Path" by
  P.T. Adamczyk.

No packages are checked into the repo (`node_modules` is not committed); builds run
through `npx` on demand.

## Recent Work
- Rebuilt `index.html` as a Graph-OS layout: centered 3-column (identity · expand-slot · rings),
  folder-style rails with a raised title tab, horizontal ring switching, stacked semi-transparent
  inactive rings on the right.
- Externalised content to `data/rings.json`; renumbered projects to `PROJ_001..PROJ_011`.
- Identity card got a contact-icon row (email / LinkedIn / GitHub SVGs) and `EXPAND_PROFILE`
  now pops the dossier inline (with `✕` close button and click-outside auto-collapse).
- BGM: hardened SoundCloud init (preloaded script + poll for `window.SC`, simplified toggle).
- Added `MobileScene` (<768px): vertical profile / contact / skills-ticker / tabbed-list flow
  sharing `Dossier` and `DetailView` with desktop.
- Reworked the canvas background: hexagonal "water" grid (radius 48 mobile / 64 desktop),
  matrix rain, and scrolling fake terminal process-log columns along both screen edges
  (up to 24 columns on ultrawide).
- Archived the previous main page to `hidden/index_till_2026Apr.html`.
- Built the `mascot/` corner mascot module (3D penguin girl, click reactions + petting);
  not yet wired into any production page — test at `mascot/test.html`.
- Perf refactor: moved `index.html` inline JSX/CSS to `src/app.jsx` + `src/styles.css`,
  compiled to `assets/app.js` / `assets/site.css` (esbuild + Tailwind v3 CLI); self-hosted
  React UMD in `assets/vendor/`; optimized WebP images in `images/optimized/`; added
  `scripts/verify_index.py` + `scripts/optimize_images.py`.
- Added a 4th ring: PUBLICATIONS (neonLime `#a7ff4c`, `PUB_001` = StableAML paper in
  *Blockchain* Vol. 4, 2026). Desktop carousel now has a 3-deep inactive stack
  (`slot-next` / `slot-mid` / `slot-prev`); mobile tab abbreviated `PUBS`.
- Experience updated: Jemm Tec (AI Engineer, Jul 2026–present, Miami) added on top;
  GOSVEA entry retitled "AI Agent Software Engineer", closed out Feb–Jun 2026.
- 2026-09-16: removed email/phone from every served page and **rewrote git history**
  (`git filter-repo --replace-text`) to redact them from all past commits — every commit
  hash before this date changed and `main` was force-pushed. Any clone or worktree made
  before then holds the old history: re-clone it rather than pulling, and never merge or
  push from a stale clone (it would reintroduce the redacted data).
- Profile location updated to Miami, FL.
- 2026-10-12: added a 5th ring, STUDY NOTES (`notes` in `data/rings.json`, orange `#ff8a3d`,
  `.k-notes`; mobile tab `NOTES`; IDs `NOTE_01`, `NOTE_02`, …). It links the DeepSeek course and the
  Feynman edition of its lesson 1, both claude.ai Artifacts from the Harrisous/Study-Notes repo.
  Ring tabs' letter-spacing dropped to .06em so five labels fit.

## File Organization Notes
- Markdown blog files are currently stored in `blog/blog2/`—check this folder first for recent posts
- Alternative HTML versions in `hidden/` folder maintain legacy themes
- Each major page is a standalone HTML file (no templates or partials)
- `index_backup.html` is the previous cyberpunk layout, kept as reference for the canvas
  background pattern and the SoundCloud widget wiring — do not delete.

## Gotchas

- JSX modules require esbuild `--bundle`; rebuild tracked JS/CSS and bump cache versions.
- Serve through HTTP for the real JSON content, not `file://`.
- Directory links navigate within the document; no detail modal or keyboard carousel.
- Full text and tag lists are intentional. Keep the two WIP entries visible but inert.
- Source checks cover every JSX module under `src/`.
