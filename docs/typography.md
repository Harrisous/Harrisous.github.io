# Homepage typography

The homepage combines three complementary families:

- **Space Grotesk, 500–700:** headings and identity. Its proportional, geometric
  forms retain the technical character of its Space Mono origins without making
  titles look like terminal output.
- **IBM Plex Sans, 400–600:** descriptions and longer STAR paragraphs. It supplies
  a coherent reading face with distinct normal, medium and semibold weights.
- **JetBrains Mono, 400–700:** navigation numbers, metadata, tags, buttons and the
  simulated agents' raw text. This retains continuity with the original homepage.

All three are self-hosted Latin WOFF2 subsets with `font-display: swap`. Their
combined font payload is 99,432 bytes. Text outside these subsets uses the CSS
fallback stack; no external font request is needed for the English homepage.

`src/fonts.css` preserves the weight ranges and Unicode coverage declared by the
official Google Fonts stylesheet. It is imported before Tailwind compilation.
Relative font URLs work both from this source and from `assets/site.css`.

## Sources and licenses

- [Space Grotesk, Florian Karsten](https://fonts.floriankarsten.com/space-grotesk)
- [IBM Design Language: Typeface](https://www.ibm.com/design/language/typography/typeface/)
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- [Google Fonts CSS source](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400..600&family=JetBrains+Mono:wght@400..700&family=Space+Grotesk:wght@500..700&display=swap)

Exact download URLs are recorded in `assets/fonts/sources.json`. The unmodified
upstream SIL Open Font License texts and copyright notices accompany the fonts:
`ibmplexsans-OFL.txt`, `jetbrainsmono-OFL.txt`, and `spacegrotesk-OFL.txt`.

The previous Share Tech Mono family is no longer needed on the active homepage.
Independent archived pages keep their existing font setup.
