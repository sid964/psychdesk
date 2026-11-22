# DSM-5 (2013) source-index audit — staging only

This document tracks verification of the user's uploaded DSM-5 for the PsychDesk study companion. **It is not a public-book release and contains no copyrighted diagnostic criteria or textbook paragraphs.**

## Current status (23 November 2026)
- 392 indexed study entries preserve the previous source IDs. These entries include disorder families, specifiers, research conditions, and non-disorder clinical-attention codes; do not present 392 as the number of independently verified psychiatric diagnoses.
- 401 raw classification candidates reconciled: 325 directly linked entries, 19 OCR name variants, 39 chapter/group labels, 18 broken OCR fragments. No unresolved candidates in that **classification-list audit**.
- All 392 indexed titles have a body-page anchor checked via the original PDF (383 found near expected viewer page, 2 found in the nearby chapter, 7 visually confirmed on PDF page images).
- 244 entries remain **incomplete original postgraduate notes** despite selected source material and some explanatory guidance.
- Full diagnostic code/subtype verification and copyright clearance have not been performed.

## Explicit release gate
Do **not** register this manifest as a finished PsychDesk Library book or merge any DSM-5 study content to the public site while original classroom notes and source/rights verification are incomplete. The original copyrighted PDF and selected verbatim source paragraphs must remain local or in private authorized storage.

Only originally authored explanatory notes, bibliographic metadata, source navigation, and appropriately licensed diagrams may be published. Any current DSM-5-TR or ICD updates must be clearly differentiated from this historical 2013 edition.

## Approved reader and future integration
Reuse the desktop-first Biological Psychology reading interface, including the collapsible contents sidebar, original stable book IDs, per-account progress, bookmarks, source-page navigation, and no redesign. Use the audited manifest as an inventory rather than a direct user-facing book catalog. When a book package is ready, verify topic count, correct source page linking, cloud progress isolation and browser tests before merge.

See `docs/dsm5-2013-study-manifest.json` for the index and `tests/dsm5-study-manifest.test.cjs` for machine-checkable integrity assertions.
