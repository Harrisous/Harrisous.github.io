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
reported outcomes kept in context. Four AI-generated concept covers in
`images/generated/` illustrate projects 008–011. Exact prompts are in
`docs/image-prompts.md`; previous SVG studies remain in `images/illustrations/`.

Each education entry, experience, project card and skills group builds when it
enters the viewport: a layout agent draws the frame, a writer progressively enters
the real raw content, then a stylist applies the final presentation together.
Each module completes in 2,000ms of visible time. Longer copy is assigned to two
or three simultaneous writers, with distinct cursors at their actual insertion
positions; the extra workers do not extend the duration.
Each module owns its clock, so cards farther down the page wait for the reader.
Leaving the viewport or hiding the tab pauses unfinished builds. Reserved final
geometry prevents layout shifts. The header offers Skip builds / Replay builds;
Escape skips all builds, and keyboard focus reveals the focused module immediately.
Reduced-motion users see the completed page immediately. Full semantic content
remains accessible throughout. No AI service or API key is involved.

## Source and content

- `data/rings.json`: all portfolio content. Preserve IDs, links and inactive flags.
- `src/app.jsx`: entry point, content loading, image fallback, Canvas background, BGM.
- `src/workbench.jsx` / `src/workbench.css`: responsive open layout and cards.
- `src/agent-build.jsx` / `src/agent-build.css`: simulated build and controls.
- `src/styles.css`: CSS entry, imports and base styles.
- `assets/`: compiled JS/CSS and self-hosted React 18 runtimes.
- `assets/fonts/` and `src/fonts.css`: self-hosted Space Grotesk, IBM Plex Sans,
  and JetBrains Mono, with upstream licenses.
- `src/bgm.js`: opt-in SoundCloud playback, readiness, retry and status handling.
- `mascot/`: retained historical assets; the current homepage does not load them.

`index_apple.html`, `index_backup.html`, `hidden/`, blogs and holiday pages retain
their existing independent layouts.

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

The cursor choreography draws on the interaction idea of
[Cursor Swarm](https://www.framer.com/marketplace/templates/cursor/).
Layout references include [Brittany Chiang](https://brittanychiang.com/) and the
[open-source v4 portfolio](https://github.com/bchiang7/v4). The composition and
animation implementation here are original; no template code was copied.

The profile uses three focus tags below “AI Engineer”. Editorial entry titles
link directly to their destinations, with separate button-styled navigation
links. In-progress entries remain non-clickable. BGM starts only on request;
PLAY/PAUSE events drive its status, and failures expose retry plus a track link.

Fresh visits and page refreshes always start with BGM OFF. No playback preference
is persisted and the SoundCloud iframe has no source until the first play request.
