# Usability and accessibility follow-up — 3 November 2026

This pass inspected the existing local site, ran browser accessibility checks on
20 screens in both themes, and exercised populated review/planner flows. It
preserves the current visual style and data model.

## Issues fixed

- Planner topics appeared after every subject tile. The task queue now comes
  first; subject editing and materials remain below it.
- Flashcards could not be restricted to a course. A labeled subject filter now
  controls both due review and the displayed deck. New cards default to the
  selected subject. Changing subject resets the revealed answer. Other subjects'
  cards are not rescheduled by reviewing the selected one.
- Navigation replaced page contents without moving keyboard focus. It now focuses
  the page heading. Revealing an answer focuses the rating controls; after rating,
  focus moves to the next question or the heading. Planner filters preserve focus
  and announce their selected state with aria-pressed.
- Light-mode empty states, navigation labels and timer/filter controls lacked
  sufficient text contrast in tested states. Targeted color corrections keep the
  same surfaces and component shapes. The sticky-note empty state now follows
  the light theme rather than retaining a black surface.
- The flashcard source selector and pasted-text field lacked explicit accessible
  names. They now have them. Heatmap cells use an appropriate image role for
  their descriptive labels. Flashcard edit controls identify their question.

## References consulted

- [W3C: Understanding Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [Nielsen Norman Group: Recognition vs. Recall](https://www.nngroup.com/articles/recognition-and-recall/)
- The retrieval, spacing and interleaving references in
  [STUDY-LAYOUT-RESEARCH.md](STUDY-LAYOUT-RESEARCH.md).

Interface controls should be recognizable without memorizing icons or locations;
learning exercises deliberately ask the student to retrieve knowledge. Those are
different purposes. Research does not establish a single ideal website layout.

## Validation and limits

- 119 existing Node tests pass, including persistence and account isolation.
- The full local Chromium browser audit passes at six viewport widths.
- Syllabus browser regression passes at four widths.
- Review workflow regression verifies subject isolation, scheduling, answer reset,
  default subject for new cards, keyboard focus, and planner hierarchy.
- axe-core 4.10.3 reports zero violations for the selected WCAG tags across the
  40 screen/theme states in the final run. This is an automated result for those
  rendered states, not a declaration of complete WCAG compliance. It does not
  cover every modal, populated record, assistive technology or real device.
- Firestore rules were inspected for owner-only access and default denial. They
  were not changed. No real Google sign-in, production sync, private Drive transfer
  or deployed Functions authorization was exercised. No production study data was
  accessed or modified.

Run the new checks with the local server on port 8765:

```
NODE_PATH=/workspace/psychdesk-tools/node_modules CHROMIUM_PATH=/usr/bin/chromium node tests/review-workflow-browser.cjs
NODE_PATH=/workspace/psychdesk-tools/node_modules CHROMIUM_PATH=/usr/bin/chromium node tests/accessibility-browser.cjs
```

Accessibility checks require `axe-core@4.10.3` alongside Playwright 1.56.1 in the
external tool directory. The report is written to `/tmp/psychdesk-accessibility.json`.
