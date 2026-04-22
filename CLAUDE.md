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
- `index_apple.html` - Alternative theme version
- `hidden/` - Alternative theme versions (plain, geometric, cyber_old)
- `blog/` - Blog posts as markdown files
  - `blog1/` and `blog2/` subdirectories for organizing posts
- `holidays/` - Special interactive pages (e.g., christmas.html with canvas-based particle effects)
- `images/` - Assets (profile images, project thumbnails)
- `data/rings.json` - Structured content feed for `index.html` (profile, projects, blogs, resources)

### `index.html` layout (Graph-OS)
Three-column flex layout centred horizontally in the viewport:

1. **Identity column** (`w-[440px]`) — avatar w/ BGM toggle, volume slider, identity card
   (callsign / name / title / education short / contact icon row / `[▶] EXPAND_PROFILE` button).
2. **Expand slot** (`0 → 460px`, animated) — inline dossier panel with `✕` close button; opens
   beside identity, pushes the rings column right; closes on `Esc` or any outside click.
3. **Rings column** (`w-[560px]`) — centered tab row (`PROJECTS / BLOGS / RESOURCES`, equal
   `170 × 54` tabs) above a rails-area that shows exactly one "folder" rail at a time,
   with inactive rings stacked behind/right (opacity 0.25–0.4, blur + scale).

### Rail folder geometry
Each rail is a custom `clip-path` polygon with a raised tab at the top-left
(x: 12 → 202, y: 0 → 30) that holds the `// PROJECTS | // BLOGS | // RESOURCES` label. Below
the tab, the body holds `rail-header` + `rail-items` (fixed height 430px, masked top/bottom
with a `linear-gradient` fade). Up/down chevrons sit in a vertical `.rail-arrows` column to
the LEFT of the rail, vertically centred.

### Keyboard / mouse map
- `← / →` — cycle focused ring (horizontal slide)
- `↑ / ↓` — cycle focused item inside the active ring
- `Enter` — open focused item's detail card
- `Esc` — close detail; or collapse expand panel when no detail is open
- Mouse wheel over active rail — scroll items (150ms debounce)
- Click a background (inactive) ring — focus it
- Click avatar — toggle BGM (volume slider is separate; doesn't toggle)
- Click outside the expand panel — collapse it

## Adding Content

### Editing profile / projects / blogs / resources on `index.html`
All content for the Graph-OS main page lives in `data/rings.json` — NOT inline in HTML.
`index.html` fetches it on mount and falls back to a minimal inline copy only if the
fetch fails (e.g., when opening via `file://`).

Shape:
```
{
  "profile":   { name, callsign, title, educationShort[], educationFull[], experience[],
                 skills{}, contact{ email, linkedin, github, location } },
  "projects":  [ { id, title, category, description, stack[], link, image } ],
  "blogs":     [ { id, title, category, description, stack[], link, image, active? } ],
  "resources": [ { id, title, category, description, stack[], link, image, active? } ]
}
```

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

## Development

### Local Testing
- No build step required
- Open HTML files directly in a browser or use any local server
- To test with live reload: `python -m http.server 8000` or similar

### Deploying Changes
- Git push to main branch automatically deploys to GitHub Pages
- All files in the root are served directly
- No build artifacts or compilation needed

## Key Design Patterns

### React Components (Inline)
React components are written directly in HTML using Babel's JSX support:
```html
<div id="root"></div>
<script type="text/babel">
  // JSX code here
  ReactDOM.createRoot(document.getElementById('root')).render(...)
</script>
```

### Canvas-Based Effects
Complex visual effects (like the Christmas particle tree) use HTML5 Canvas directly with JavaScript, not DOM/React. This provides better performance for animations.

### External Dependencies
- **Tailwind CSS**: Loaded from CDN (script tag)
- **React & ReactDOM**: Version 18 from CDN
- **Babel**: Standalone for in-browser JSX compilation
- **SoundCloud Widget API**: Preloaded in `<head>` so `window.SC` is ready on first avatar click.
  The iframe (`#sc-iframe`) has real `width/height` attributes but is hidden via
  `display: none` — the widget API still controls playback. Track: "The Rebel Path" by
  P.T. Adamczyk.

No npm packages or build tools are used—everything is loaded from CDN or written inline.

## Recent Work
- Rebuilt `index.html` as a Graph-OS layout: centered 3-column (identity · expand-slot · rings),
  folder-style rails with a raised title tab, horizontal ring switching, stacked semi-transparent
  inactive rings on the right.
- Externalised content to `data/rings.json`; renumbered projects to `PROJ_001..PROJ_011`.
- Identity card got a contact-icon row (email / LinkedIn / GitHub SVGs) and `EXPAND_PROFILE`
  now pops the dossier inline (with `✕` close button and click-outside auto-collapse).
- Canvas background layered perceptron with fwd/bwd signal propagation, matrix rain, glitch bars.
- BGM: hardened SoundCloud init (preloaded script + poll for `window.SC`, simplified toggle).

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
