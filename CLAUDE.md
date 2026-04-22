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
- `index.html` - Primary portfolio/personal page (cyberpunk theme, dark mode)
- `index_apple.html` - Alternative theme version
- `hidden/` - Alternative theme versions (plain, geometric, cyber_old)
- `blog/` - Blog posts as markdown files
  - `blog1/` and `blog2/` subdirectories for organizing posts
- `holidays/` - Special interactive pages (e.g., christmas.html with canvas-based particle effects)
- `images/` - Assets (profile images, project thumbnails)

## Adding Content

### Blog Posts
1. Create a `.md` file in `blog/blog2/` (current active blog directory)
2. Blog posts use standard markdown format
3. They are referenced in the main HTML files, which handle rendering

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
- **SoundCloud Widget API**: For embedded audio (see index.html)

No npm packages or build tools are used—everything is loaded from CDN or written inline.

## Recent Work
- Active work on OCR integration (DPSK OCR)
- Multiple theme variations (cyberpunk is current default)
- Interactive elements (particle effects, animated backgrounds)
- Blog content additions

## File Organization Notes
- Markdown blog files are currently stored in `blog/blog2/`—check this folder first for recent posts
- Alternative HTML versions in `hidden/` folder maintain legacy themes
- Each major page is a standalone HTML file (no templates or partials)
