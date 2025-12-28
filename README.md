## Tokutei Study Hub

A lightweight web app for studying the provided 特定技能 (Tokutei) PDF texts with search, notes, and flashcards. Everything runs in the browser—no build or server required.

### Getting started

1. Place the PDF files alongside the app (already included in this repository).
2. Open `index.html` in your browser.
3. Pick a study set from the dropdown, then:
   - Navigate pages with the Prev/Next buttons or jump to a page number.
   - Use **Search** to find keywords across the document.
   - Capture **Notes** tied to the current page.
   - Add **Flashcards** to drill important points. Notes and cards are stored locally in your browser.

### Implementation details

- Uses [PDF.js](https://mozilla.github.io/pdf.js/) via CDN to render and index text for search.
- Notes and flashcards are saved in `localStorage`, scoped per PDF.
- Responsive layout adapts to narrow screens while keeping reader and study tools visible.
