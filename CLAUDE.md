# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Harrisous.github.io** is a personal website and portfolio hosted on GitHub Pages. It's a static site with no build process or server-side components.

### Tech Stack
- **Frontend**: HTML, Tailwind CSS (CDN), React 18 (CDN with Babel for JSX)
- **Styling**: Tailwind CSS for utility-first design; custom CSS for special pages
- **Interactivity**: Inline React components (no bundling needed)
- **Hosting**: GitHub Pages (static files only)

## Site Structure

### Main Pages
- `index.html` - Primary portfolio/personal page (cyberpunk Graph-OS theme, dark mode)
- `index_backup.html` - Previous cyberpunk layout (kept as reference for canvas/BGM patterns)
- `index_apple.html` - Alternative "Apple-style" theme; linked from the mobile top bar
  (`[ SWITCH_MODE ]`) — don't delete
- `hidden/` - Alternative theme versions (plain, geometric, cyber_old) plus
  `index_till_2026Apr.html`, the archived pre-April-2026 main page
- `blog/` - Blog posts as markdown files
  - `blog1/` and `blog2/` subdirectories for organizing posts
- `holidays/` - Special interactive pages (e.g., christmas.html with canvas-based particle effects)
- `images/` - Assets (profile images, project thumbnails)
- `data/rings.json` - Structured content feed for `index.html` (profile, projects, blogs, resources)
- `mascot/` - Floating corner mascot (3D chibi penguin girl, Three.js) — see "Corner mascot" below

### `index.html` layout (Graph-OS)
`App` branches on `matchMedia('(min-width: 768px)')`: ≥768px renders `GraphScene`
(desktop), <768px renders `MobileScene`. Both share the `Dossier` and `DetailView`
components and the same `useBgm` hook, so detail cards and the profile dossier behave
identically on both.

**Desktop (`GraphScene`)** — three-column flex layout centred horizontally in the viewport:

1. **Identity column** (`w-[440px]`) — avatar w/ BGM toggle, volume slider, identity card
   (callsign / name / title / education short / contact icon row / `[▶] EXPAND_PROFILE` button).
2. **Expand slot** (`0 → 460px`, animated) — inline dossier panel with `✕` close button; opens
   beside identity, pushes the rings column right; closes on `Esc` or any outside click.
3. **Rings column** (`w-[560px]`) — centered tab row (`PROJECTS / BLOGS / RESOURCES`, equal
   `170 × 54` tabs) above a rails-area that shows exactly one "folder" rail at a time,
   with inactive rings stacked behind/right (opacity 0.25–0.4, blur + scale).

**Mobile (`MobileScene`)** — single vertical scroll: top bar (`[ SWITCH_MODE ]` link to
`index_apple.html` + BGM toggle), profile card with `EXPAND_PROFILE`, contact links,
background blurb, horizontal skills ticker, then a tabbed PROJECTS / BLOGS / RESOURCES
card list. Tapping an item opens the same `DetailView` as desktop; `active: false` items
render at 40% opacity and are not tappable.

### Rail folder geometry
Each rail is a custom `clip-path` polygon with a raised tab at the top-left
(x: 12 → 202, y: 0 → 30) that holds the `// PROJECTS | // BLOGS | // RESOURCES` label. Below
the tab, the body holds `rail-header` + `rail-items` (fixed height 430px, masked top/bottom
with a `linear-gradient` fade). Up/down chevrons sit in a vertical `.rail-arrows` column to
the LEFT of the rail, vertically centred.

### Keyboard / mouse map (desktop scene only)
- `← / →` — cycle focused ring (horizontal slide)
- `↑ / ↓` — cycle focused item inside the active ring
- `Enter` — open focused item's detail card
- `Esc` — close detail; or collapse expand panel when no detail is open
- Mouse wheel over active rail — scroll items (150ms debounce)
- Click a background (inactive) ring — focus it
- Click avatar — toggle BGM (volume slider is separate; doesn't toggle)
- Click outside the expand panel — collapse it

## Adding Content

### Editing profile / projects / blogs / resources / publications on `index.html`
All content for the Graph-OS main page lives in `data/rings.json` — NOT inline in HTML.
`index.html` fetches it on mount and falls back to a minimal inline copy only if the
fetch fails (e.g., when opening via `file://`).

Shape:
```
{
  "profile":      { name, callsign, title, educationShort[], educationFull[], experience[],
                    skills{}, contact{ email, linkedin, github, location } },
  "projects":     [ { id, title, category, description, stack[], link, image } ],
  "blogs":        [ { id, title, category, description, stack[], link, image, active? } ],
  "resources":    [ { id, title, category, description, stack[], link, image, active? } ],
  "publications": [ { id, title, category, description, stack[], link, image } ]
}
```

The four rings render as tabs PROJECTS / BLOGS / RESOURCES / PUBLICATIONS (desktop rails +
mobile card list; the mobile tab is abbreviated to `PUBS`). Ring order/colors live in
`RING_META` + `ringOrder` (desktop) and `MobileTabs` (mobile) in `src/app.jsx`; the
publications accent color is neonLime `#a7ff4c` (`.k-publications` in `src/styles.css`).
Publication IDs are `PUB_001`, `PUB_002`, … ascending.

Conventions:
- Project IDs are `PROJ_001`, `PROJ_002`, … appended ascending (no `PROJ_NEW_*` prefix).
- A new project at position N expects `./images/project_<NNN>.png` (3-digit, zero-padded).
  Missing images render as an in-page `NO_SIGNAL` SVG placeholder — no external request.
- `active: false` disables an item (dashed border, not clickable). Useful for WIP blogs/chapters.

### Blog Posts
1. Create a `.md` file in `blog/blog2/` (current active blog directory)
2. Blog posts use standard markdown format
3. Add a resources entry in `data/rings.json` pointing to the rendered `.html` if one exists,
   or keep the entry `active: false` until published.

### New Pages
- Create `.html` files in root or subdirectories
- Use Tailwind CSS from CDN for styling
- Can use inline React for interactivity (see index.html for the pattern)
- For complex animations, use HTML5 Canvas (see holidays/christmas.html)

### Styling Approach
- **Tailwind CSS**: Primary styling utility (loaded from CDN)
- **Custom CSS**: Embedded in `<style>` tags for specific effects
- **Theme customization**: Modify Tailwind config in the `<head>` section or override with custom CSS
- Main colors defined: cyber theme (neonBlue, neonPink, neonYellow)

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
  `npx esbuild src/app.jsx --minify --format=iife --global-name=HarryGraphOS --outfile=assets/app.js`
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

## File Organization Notes
- Markdown blog files are currently stored in `blog/blog2/`—check this folder first for recent posts
- Alternative HTML versions in `hidden/` folder maintain legacy themes
- Each major page is a standalone HTML file (no templates or partials)
- `index_backup.html` is the previous cyberpunk layout, kept as reference for the canvas
  background pattern and the SoundCloud widget wiring — do not delete.

## Gotchas
- `clip-path` clips children too. The rail title sits on a custom polygon tab — don't nest
  it inside another `clip-path` without inheriting, or it will be invisible.
- Body has `overflow-x: hidden`; inactive rings that offset ~+260px right of the rings
  column rely on this so they don't create a horizontal scrollbar.
- `data/rings.json` is fetched relatively (`./data/rings.json`). When opening `index.html`
  directly via `file://`, the fetch fails and the minimal inline `FALLBACK_DATA` renders.
  For real testing always use `python3 -m http.server`.
- Image filenames are strict `project_001.png` through `project_011.png`. Missing images do
  not break the page — they render as a dashed `NO_SIGNAL` SVG placeholder in-place.
