# Adding an indexed Psychology book

PsychDesk's Library displays **indexed study companions**, not a dump of every PDF stored in Google Drive. Drive PDFs remain in the separate **Drive files** workspace.

## New book workflow

1. Obtain the owner's edition and verify its title, authors, edition and actual printed chapter headings against the supplied book.
2. Prepare original study notes or a lawful excerpt for each reading section. Do not publish copyrighted complete textbook PDF text, figures, DRM content or restricted manuals in GitHub Pages. Store originals in the owner's private Google Drive.
3. Copy `_new-book.example.json` to `<permanent-book-id>.json` (for example, `biopsychology-10e.json`), replacing every placeholder with verified content. Packages beginning with `_` do not ship.
4. Assign permanent lowercase IDs to the book, chapters, sections and blocks. A new edition should have a different book ID. **Do not rename existing IDs**: saved bookmarks, highlights, progress and source links depend on them.
5. Mark each section as `detailed` or `guide` so a short note is never presented as a full chapter. Never invent PDF page numbers; omit `page` if unknown. Only use `pdfOffset` for a verified printed-page-to-PDF mapping.
6. Run `node scripts/build-book-catalog.cjs --write`, then `node scripts/build-book-catalog.cjs --check` and the complete Node/Chromium CI suite.
7. Make one reviewable PR, test a brand-new book and an existing book, merge on green CI, and verify the live deployment assets before adding another book.

## Provenance and update rules

- Current reviewed package: `psychopathology-9e.json`, from the owner's Kindle-style companion, **16 chapters / 76 reading parts**. Chapter 1 has eight detailed parts; 68 later parts are concise study guides. It is **not the full textbook**.
- Book packages are authored, static JSON. The generator uses Node built-ins and does not access Google Drive, Firebase, paid APIs, OCR, user files or private credentials.
- Source JSON is committed alongside a generated `book-catalog.js`. The CI check fails on a stale generated catalog or malformed IDs, chapters, text blocks, page mappings or duplicate book IDs.
- Adding new chapters should be additive. Rewriting highlighted passages may invalidate quote+offset anchors; preserve stable text when possible. Never silently reset saved reading progress.
- More books can be added without changing reader code. Large catalogs may eventually merit per-book lazy loading; measure real startup impact before any such change.

## Manual checks after adding a book

Open the new and existing book on mobile and desktop; confirm contents, page references and reading style; mark a chapter read and ensure counts change; reload and check bookmarks/highlights; sign in on two real devices and verify Google sync (automation cannot prove OAuth); confirm Drive PDFs, Notes, Ink, Flashcards and the existing Psychopathology lesson graph still work.
