# Library transformation — execution plan (20 November 2026)

## Delivery constraints
- One branch and independently verified pull request per phase. Do not merge failures or overwrite account data.
- Keep GitHub Pages, existing Firebase/Google login, Firestore sync, Drive PDFs, notes, flashcards, saved progress and the Settings icon.
- Account reading records use existing `data.bookReading`; stable IDs keep records intact. No destructive migration.
- Real Google OAuth and multi-device sync are **not** proven by local/CI mocks. Require manual signed-in verification.
- The supplied file named `.zip` is actually standalone HTML. This source is the owner's own **reading companion**, not the complete textbook PDF. Preserve its content provenance.

## Phase 7 — Foundation and safe import
- Reuse merged PR #84 foundation, `book-reader.js`, `bookReading` and existing cloud-sync mechanisms.
- Convert the uploaded companion into `book-catalog.js` with one stable `psychopathology-9e` book ID; 16 chapter IDs, 76 section IDs and stable text-block IDs.
- Preserve 8 detailed first-chapter parts and label remaining 68 sections as **short guides**. A chapter index is **not** evidence that its full text is available.
- Existing old Psychology lessons and graph remain unchanged. Original PDFs remain outside the public GitHub repo.
- Regression test source counts, update the PWA release key and verify book catalog against published GitHub Pages.

## Phase 8 — Library home redesign (next separate PR)
- Make **Library** the primary Books bookshelf with a Continue Reading hero, book search, covers and per-book achievements.
- Move the existing subject-by-subject Drive/upload library into its own **Drive Files** route; preserve PDFs, links and references.
- Do not create fake indexed books for Biopsychology or DSM-5 until their contents are supplied.

## Phase 9 — Indexed reader (separate PR)
- Keep book-specific table of contents, themes, notes, highlights, PDF source handoff and chapter status.
- Add clear chapter **Read / In progress / Not started** state and manual chapter completion without overwriting the older part completion state.
- Keep original Psychology → Psychopathology learning route available.

## Phase 10 — Drive PDF reader (separate PR)
- Align the current PDF.js reader with book-reader appearance and navigation while preserving original PDF page geometry.
- Keep Drive-uploaded files and original PDF bytes private; do not load them into the public indexed catalog.
- Make PDF reading position account-specific and compatible with current local page bookmarks.

## Phase 11 — Achievements and Google sync (separate PR)
- Show **completed chapters, remaining chapters and overall reading milestones** across books.
- Store milestones in account-synced study data; offline edits must be guarded against cross-account mixing and conflicting writes.
- Do not infer completed chapters solely from opening their content.

## Phase 12 — Multi-book indexing workflow (separate PR)
- Create documented, tested import path from supplied book text/indexes to stable catalog objects.
- Verify source chapter headings and flag excerpts/short guides, without promising full book content.
- Keep authored books selectable through one reader.

## Phase 13 — Release quality and deployment (separate PR)
- Browser/test matrix: phone/tablet/desktop, tabs, keyboard, anchors, local storage, signed-in mocks, PDF/Drive routes, cached upgrades.
- Verify every modified critical production asset by content digest, deploy and monitor CI.
- Manual sign-in, Drive and actual hardware measurements remain outstanding until performed by a person.
