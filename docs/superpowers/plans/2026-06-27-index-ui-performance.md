# Index UI Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `index.html` desktop/mobile UI, load speed, and static-site safety without changing the portfolio content model.

**Architecture:** Keep the current single-page React experience, but reduce runtime cost and resource weight. Add a local verification script that checks security and performance invariants, then optimize images, links, missing image handling, responsive layout, and motion behavior.

**Tech Stack:** Static HTML, React 18 UMD, local CSS/JS, Python/Pillow for image generation, local validation scripts.

---

### File Structure

- Modify: `index.html` - page markup, resource loading, responsive UI refinements, accessibility, and runtime behavior.
- Modify: `data/rings.json` - project image references for optimized assets and missing-image fallbacks.
- Modify: `mascot/cyber-cat.js` - companion image loading behavior if it affects mobile performance.
- Modify: `mascot/cyber-cat.css` - companion positioning and reduced-motion/mobile behavior.
- Create: `scripts/verify_index.py` - local checks for unsafe patterns, external-link hardening, missing assets, and performance regressions.
- Create: `scripts/optimize_images.py` - deterministic optimized WebP generation for large homepage images.
- Create: `images/optimized/*.webp` - generated lightweight homepage image assets.

### Task 1: Add Verification Guardrails

- [ ] Create `scripts/verify_index.py` with checks for unsafe HTML/JS patterns, missing image references, target-blank links without `noopener noreferrer`, and blocking production CDN compilers.
- [ ] Run `python scripts/verify_index.py`.
- [ ] Confirm it fails against the current page because Babel/Tailwind CDN compilers and missing project images still exist.

### Task 2: Optimize Homepage Images

- [ ] Create `scripts/optimize_images.py` using Pillow.
- [ ] Generate WebP variants under `images/optimized/` for `profile.png`, `relic.png`, and `project_001.png` through `project_007.png`.
- [ ] Add generated fallback placeholders for `project_008` through `project_011`.
- [ ] Update `data/rings.json` to reference optimized images.

### Task 3: Harden Links And Resource Loading

- [ ] Update external links to use `rel="noopener noreferrer"`.
- [ ] Avoid eager loading for non-critical images.
- [ ] Keep SoundCloud loading user-triggered and avoid adding new third-party scripts.

### Task 4: Refine Desktop And Mobile UI

- [ ] Improve desktop layout sizing so profile, rail tabs, detail panels, and footer do not crowd on common laptop widths.
- [ ] Improve mobile cards, tabs, spacing, and mascot position to avoid overlap.
- [ ] Add responsive typography and stable image aspect ratios.
- [ ] Respect `prefers-reduced-motion` for scanlines, glitch effects, orbit particles, and mascot animation.

### Task 5: Verify

- [ ] Run `python scripts/verify_index.py`.
- [ ] Serve the site locally.
- [ ] Check desktop and mobile render behavior with browser automation or screenshots.
- [ ] Report exact verification commands and remaining risks.
