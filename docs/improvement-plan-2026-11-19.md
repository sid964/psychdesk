# PsychDesk — phased improvement plan (19 November 2026)

Baseline: `main` commit `f7190f03f83007344c3bfce4fe19bd4ed9e82ba9`. This is an implementation checklist, not a declaration that every feature has been tested.

## Non-destructive delivery rules

- One focused reviewable branch and PR per phase. Merge only after tests and review.
- Keep free-only GitHub Pages, Google Sign-In, Firestore, Google Drive and account data.
- Preserve all notes, ink, sticky notes, books, flashcards, subject progress and saved visual tools.
- Preserve the Settings icon, AMOLED true black and warm-paper theme.
- Do not clear browser storage or force Firestore migration as a cache workaround.
- Browser mocks do not prove real Google OAuth, Drive uploads, actual GPU frame rates or live offline behavior.

## Phase 1 — safety and reliability (in progress)

- [x] Capture current main SHA, existing checks and the open World-polish PR.
- [x] Review startup, history, backup recovery, session resume and account-scoped timers.
- [x] Reconcile an account's timer with its own subjects after data loads.
- [x] Clear transient focus and recall selections on account switch.
- [x] Add regression tests for both data-isolation scenarios.
- [x] Bump the app-script URL and service-worker release key.
- [x] Pin Chromium smoke to Ubuntu 24.04: Playwright 1.56.1 fails to install on GitHub's Ubuntu 26.04 runner.
- [ ] Verify complete Node test suite and Chromium browser smoke on this PR.
- [ ] Manually verify real signed-in switching, Drive restoration, refresh, and offline use.
- [ ] Merge the reviewed PR, then begin Phase 2.

## Phase 2 — homepage and navigation

Remove repeated homepage shortcuts and conflicting next-study prompts; one clear Continue action, quick note and focus. Make main navigation simple and consistent on desktop and mobile. Preserve advanced tools through secondary entrypoints and accessibility.

## Phase 3 — learning

Place Psychopathology within Overall Psychology and make its actual lessons and chapter progress primary. Keep the concept graph optional; distinguish finished lessons from chapter outlines.

## Phase 4 — tool consolidation

Group Notes/Ink/Sticky/Voice capture, Library/Reader/References, and Mind Maps/Study Board in the interface. Avoid migrating or deleting their existing storage formats. Remove redundant Study Flow recommendations.

## Phase 5 — interactive 3D world

Improve naturalness, interaction, navigation and quality scaling. Preserve the existing world and lazy-load graphics only when used. Respect reduced-motion and run real device GPU checks.

## Phase 6 — release verification

Run responsive, keyboard, navigation, Firebase, Drive, local-save failure, backup recovery, service worker and old-cache upgrade checks. Compare actual performance before and after changes.

## Baseline

GitHub Actions for `f7190f03f83007344c3bfce4fe19bd4ed9e82ba9` shows passing Tests, browser smoke, live-release verification, dictionary checks, and Pages deployment (12 November 2026). Psychology public-content validation passed on 16 November 2026. These checks do not cover all live account and device scenarios.
