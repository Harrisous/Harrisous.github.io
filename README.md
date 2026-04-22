# Harrisous.github.io

Personal portfolio site for **Haochen "Harry" Li**, served at
[https://harrisous.github.io](https://harrisous.github.io). Static site, GitHub Pages — no
build step.

---

## The main page: `index.html` (Graph-OS)

A cyberpunk-themed, single-page portfolio laid out as a "living filesystem":

```
[ IDENTITY ]     [ EXPAND_PROFILE ]     [ PROJECTS · BLOGS · RESOURCES ]
  avatar             (opens inline,          tabbed rings, horizontal
  + callsign          pushes rings             switching, folder-style
  + contact           right; ✕ or             title tab, arrows on the
  + expand btn        click-outside           left, gradient fade top/bottom
                      to collapse)
```

- **Three-column flex layout**, centred horizontally in the viewport.
- **Rings**: one focused ring at a time, the other two peek out behind and to the right
  (semi-transparent + scaled down). Switch via the top tabs, the `← →` keys, or by clicking
  a background ring.
- **Rail "folder"**: each ring is rendered as a panel with a custom `clip-path` polygon that
  leaves a raised tab at the top-left where the title (`// PROJECTS` / `// BLOGS` /
  `// RESOURCES`) sits.
- **Items**: vertical cover-flow inside the folder, focused item enlarged with title +
  keywords + `[ENTER]` prompt. `↑ ↓` or mouse wheel to navigate. `Enter` or click to open
  a detail card.
- **Identity**: click the avatar to toggle BGM (a SoundCloud track by P.T. Adamczyk, looping
  from `Cyberpunk 2077`). The pink halo pulses while playing. `[▶] EXPAND_PROFILE` pops an
  inline dossier with full education, experience, skills, and contact info.
- **Canvas background**: layered perceptron firing forward/backward signals, matrix rain,
  drifting particles with neon connections, occasional glitch bars and pulse rings. Respects
  `prefers-reduced-motion`.

### Keyboard map
| Key        | Action                                         |
|------------|------------------------------------------------|
| `← / →`    | Cycle focused ring                             |
| `↑ / ↓`    | Cycle item inside the focused ring             |
| `Enter`    | Open the focused item's detail card            |
| `Esc`      | Close detail, or collapse EXPAND_PROFILE       |

---

## Content lives in `data/rings.json`

All profile / projects / blogs / resources data is editable from one JSON file — no HTML
changes needed:

```json
{
  "profile":   { "name": "...", "callsign": "HARRY", "educationFull": [...],
                 "experience": [...], "skills": {...},
                 "contact": { "email": "...", "linkedin": "...", "github": "..." } },
  "projects":  [ { "id": "PROJ_001", "title": "...", "category": "...",
                   "description": "...", "stack": [...], "link": "...", "image": "..." } ],
  "blogs":     [ { "id": "BLOG_01", ..., "active": true } ],
  "resources": [ { "id": "RES_01", ..., "active": true } ]
}
```

- Project IDs run `PROJ_001` → `PROJ_011` ascending. New projects append at the next index.
- Images: `./images/project_<NNN>.png` (zero-padded 3 digits). Missing images render as an
  in-page `NO_SIGNAL` SVG placeholder — the page never shows a broken image icon.
- `active: false` on a blog/resource entry renders it dashed and non-clickable (WIP slot).

---

## Other pages

| Path                      | What it is                                             |
|---------------------------|--------------------------------------------------------|
| `index_apple.html`        | Alternative "Apple-style" theme of the same portfolio  |
| `index_backup.html`       | Previous cyberpunk layout (kept as reference)          |
| `hidden/*.html`           | Older theme variants (plain, geometric, cyber_old)     |
| `blog/blog1/blog1.html`   | "How AI Sees Cats — Grad-CAM Visualization"            |
| `blog/blog2/*.html`       | Field Manual chapters (CH_01..CH_04, CH_05 WIP)        |
| `holidays/christmas.html` | Canvas-based Christmas particle tree                   |

---

## Dev

No build step.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly via `file://` also works, but the `fetch('./data/rings.json')`
call fails under that scheme — a minimal inline fallback copy will render instead of the
full content. Always use the local server for real testing.

### Deploy

`git push` to `main` — GitHub Pages serves the repo root.

---

## Stack

- HTML + Tailwind CSS (CDN) + custom CSS for cyberpunk effects
- React 18 + Babel standalone (inline JSX, no bundler)
- HTML5 Canvas 2D for the background animation
- SoundCloud Widget API for BGM
