# HARRY / GRAPH_OS

Personal portfolio for Haochen "Harry" Li, hosted on GitHub Pages.

## Open workspace

Desktop uses a sticky identity column with a large portrait, social icons and a
numbered navigation rail. Narrow screens use an in-flow profile and a sticky,
horizontally scrollable section bar. Scroll position updates the active link.

Document order: Education, Experience, Projects, Publications, Blogs, Resources,
Study notes, Skills. All 21 entries, descriptions and tags stay in the document.
The two WIP entries have no active link. Project chronology is documented in
`docs/project-chronology.md`; unknown dates are not invented.
Projects use four concise STAR paragraphs (Situation, Task, Action, Result), with
reported outcomes kept in context. Projects 008–011 use line-drawn system
schematics in `images/schematics/` (SVG, flat strokes, drawn from each project's
actual architecture). The earlier AI-generated glass renders remain in
`images/generated/` with their prompts in `docs/image-prompts.md`, and the first
SVG studies in `images/illustrations/`; the homepage references neither.

A triptych opens the document. It is static and deliberately brief: it names
the three voices, **Futurism** (cyan, `F`), **Realism** (gold, `R`) and
**Cyberpunk** (magenta, `C`), then gives one line for the impact where they
collide. Each education entry, experience, project card and skills group is then
drafted by those three voices when it enters the viewport, in five measures named
on its frame:

1. **Signal** (`intent`). One spark leaves the conductor rail (the section's
   navigation entry, or the portrait for the identity block) along a thread.
2. **Frame** (`division`). Two sparks draw the frame in opposite directions.
3. **F R C** (`voices`). They meet at the far corner and part as the three voices.
4. **Draft** (`composition`). The voices write the real raw content in parallel,
   each in its own colour, linked by message pulses.
5. **Impact** (`impact`). The voices collide at the origin; a diagonal shock front
   of three lines (cyan leading, a white core, magenta trailing) erases the draft
   plate over the finished module, and the spark returns to the rail.

Each module completes in 2,000ms of visible time. All but the briefest copy is
written by three voices (two below 60 characters, one below 20); more voices
never extend the duration. Modules that become eligible together start as a 70ms
cascade, capped at 420ms, instead of in lockstep.
Each module owns its clock, so cards farther down the page wait for the reader.
Leaving the viewport or hiding the tab pauses unfinished builds. Reserved final
geometry prevents layout shifts. The header offers Replay builds; Escape ends all
builds, and keyboard focus reveals the focused module immediately.
Reduced-motion users see the completed page immediately. Full semantic content
remains accessible throughout. No AI service or API key is involved; the footer
colophon says so to visitors.

### How the build stays smooth

- React renders a module only when its measure changes (six commits per build).
  The draft text, the shock front and the light are written once per animation
  frame by a single loop in `src/agent-ensemble.js`.
- That loop lets every building module write first and reads geometry afterwards,
  so a frame costs one layout however many modules build together. The draft is
  rewritten about 30 times a second inside a `contain: strict` box; sparks move
  on every frame.
- Module clocks advance per frame and a frame may consume at most 34ms, so a busy
  main thread (page load, a long task) stretches a build instead of skipping part
  of it. If frames stop arriving, a timer still completes every module.
- Builds wait up to 500ms for the page's own fonts, so the draft is measured once.
- During impact the finished module already lies under the opaque draft plate.
  Only the plate's own layer is repainted; the beam moves by `transform` alone.
- The background canvas is drawn about 30 times a second at unchanged speed.

The light is purely additive: if the canvas never paints, each module still
completes on its own clock.

### Background lattice

The fixed canvas behind the document draws a rhombille lattice
(`src/lattice.js`): every hexagon is a cube corner with three faces in the three
voice colours, and a slow swell moves through it. The cubes under and around the
pointer rise and brighten in one soft patch that follows it, strongest at the
pointer and gone within about two cells; it is kept faint because it sits behind
text. A click or tap sends one ring of height outwards. Touch devices get the
swell and the tap ring only; reduced motion draws a single still frame.

Matrix rain, the occasional glitch bars and the terminal columns remain under the
lattice at their earlier 18% strength. The canvas is sized in device pixels
(capped) so the lattice edges stay thin.

## Source and content

- `data/rings.json`: all portfolio content, including `profile.triptych` and
  `profile.colophon`. Preserve IDs, links and inactive flags.
- `src/app.jsx`: entry point, content loading, image fallback, background canvas loop, BGM.
- `src/lattice.js`: the rhombille lattice and its pointer highlight.
- `src/workbench.jsx` / `src/workbench.css`: responsive open layout, cards, triptych.
- `src/agent-build.jsx` / `src/agent-build.css`: build lifecycle, clocks, the five
  measures, the per-module stage (draft text and shock front) and the controls.
- `src/agent-ensemble.js`: the shared frame loop and the canvas that draws threads,
  sparks, links and impact rings.
- `src/styles.css`: CSS entry, imports and base styles.
- `assets/`: compiled JS/CSS and self-hosted React 18 runtimes.
- `assets/fonts/` and `src/fonts.css`: self-hosted Space Grotesk, IBM Plex Sans,
  and JetBrains Mono, with upstream licenses.
- `src/bgm.js`: opt-in SoundCloud playback, readiness, retry and status handling.
- `mascot/`: retained historical assets; the current homepage does not load them.

`index_backup.html`, `hidden/`, blogs and holiday pages retain their existing
independent layouts. The Apple-style alternate page (`index_apple.html`) was
retired on 2026-11-09; the homepage no longer offers a mode switch.

## Build and verify

Node.js/npm and Python are required. There is no runtime server or in-browser
compiler; **rebuild the tracked assets after changing source files**:

```sh
npx --yes esbuild src/app.jsx --bundle --minify --format=iife --global-name=HarryGraphOS --outfile=assets/app.js
npx --yes tailwindcss@3.4.17 -c tailwind.config.cjs -i src/styles.css -o assets/site.css --minify
python scripts/verify_index.py
node scripts/verify_agent_build.cjs
node scripts/verify_bgm.cjs
git diff --check
```

Bump the `?v=` values in `index.html` after a build. Tailwind resolves the local CSS
imports. `--bundle` is required for the JSX modules. Content-only JSON changes do
not require a build.

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/ locally. Opening via `file://` cannot load the full JSON
feed and uses only the minimal fallback content.

## Deploy

GitHub Pages serves the repository root. Pushing to `main` deploys the checked-in
assets. Feature branches and local previews do not change the public site.

## Design reference

The first build choreography (labelled cursors typing into each module) drew on
the interaction idea of
[Cursor Swarm](https://www.framer.com/marketplace/templates/cursor/). It has been
replaced by the ensemble choreography above, whose three voices come from the
triptych rather than a cursor metaphor.
Layout references include [Brittany Chiang](https://brittanychiang.com/) and the
[open-source v4 portfolio](https://github.com/bchiang7/v4). The composition and
animation implementation here are original; no template code was copied.

The triptych copy is original and lives in `profile.triptych`; it is set in the
page's three existing families (see `docs/typography.md`).

The profile lists three numbered focus lines, without boxes, below “AI Engineer”. Editorial entry titles
link directly to their destinations, with separate button-styled navigation
links. In-progress entries remain non-clickable. BGM starts only on request;
PLAY/PAUSE events drive its status, and failures expose retry plus a track link.

Fresh visits and page refreshes always start with BGM OFF. No playback preference
is persisted and the SoundCloud iframe has no source until the first play request.
