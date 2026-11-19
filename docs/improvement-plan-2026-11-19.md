# PsychDesk — phased improvement plan (19 November 2026)

Baseline: `main` commit `f7190f03f83007344c3bfce4fe19bd4ed9e82ba9`. This is an implementation checklist, not a declaration that every feature has been tested.

## Non-destructive delivery rules

- One focused reviewable branch and PR per phase. Merge only after tests and review.
- Keep free-only GitHub Pages, Google Sign-In, Firestore, Google Drive and account data.
- Preserve all notes, ink, sticky notes, books, flashcards, subject progress and saved visual tools.
- Preserve the Settings icon, AMOLED true black and warm-paper theme.
- Do not clear browser storage or force Firestore migration as a cache workaround.
- Browser mocks do not prove real Google OAuth, Drive uploads, actual GPU frame rates or live offline behavior.

## Phase 1 — safety and reliability (merged and deployed via PR #78)

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

## Phase 2 — homepage and navigation (merged and deployed via PR #79)

- [x] Five primary destinations: Home, Learn, Notes, Library and Focus, consistent on desktop and mobile.
- [x] Keep Planner, Flashcards, Study Flow, Ink and university preparation reachable through a secondary desktop menu or the Explore hub.
- [x] Remove duplicated home study paths, next-step card and repeated tools drawer.
- [x] Preserve saved reading/note resume, quick note, Focus, living Memory Garden and 3D World entry.
- [x] Group recent notes, curated discoveries, garden status and memory postcard under one optional disclosure.
- [x] Add responsive browser tests for primary navigation, child-tab highlighting, tool access and unchanged study records.
- [ ] Verify Phase 2 Node tests and Chromium smoke including old-to-new offline upgrade.
- [ ] Review and merge the stacked Phase 2 PR only after Phase 1 has been accepted.

## Phase 3 — learning (merged and deployed via PR #80)

- [x] Keep Psychopathology within Overall Psychology, rather than adding a primary navigation destination.
- [x] Put the Chapter 1 authored lesson list and a scrollable 16-chapter index beside the reader.
- [x] Add Continue action based on existing local account-specific completion and last-read state.
- [x] Mark Chapters 2–16 honestly as outlines, without inventing unverified lesson content.
- [x] Keep the interactive graph optional and below the textbook reader.
- [x] Preserve source references, previous/next lesson actions, question feedback, flashcards and existing progress.
- [x] Extend browser regression to cover chapter navigation and the Continue action.
- [ ] CI and browser layout verified, PR reviewed and merged into main.
- [ ] GitHub Pages and live-release verification green for the Phase 3 merge.

## Phase 4 — tool consolidation (merged and deployed via PR #81)

- [x] Add a shared Notes workspace selector for Typed, Handwriting, Sticky and Voice notes, preserving their existing storage and routes.
- [x] Add a Library workspace selector for Books & files, PDF Reader and References.
- [x] Add a Visual Thinking selector for Mind Maps, Study Board and Connected Learning.
- [x] Show everyday tools first in Explore, with the entire specialty tool inventory reachable inside a collapsed `Browse individual tools` section.
- [x] Keep unrelated records and features intact; no destructive migration, no new Firebase/Drive dependencies.
- [x] Add browser checks for responsive tool navigation, access to every specialty tool, and unchanged data.
- [ ] Verify Node tests and full Chromium smoke including past-release caching, World navigation and Psychopathology.
- [ ] Merge the Phase 4 PR, then verify GitHub Pages deployment and exact live-release hashes.

Phase 1, 2 and 3 have all been merged and their production deployments verified.

## Phase 5 — interactive 3D world (first incremental implementation)

- [x] Keep the existing explorable landscape, interactive study destinations and lazy-loaded World renderer.
- [x] Add more natural early/late daylight colors and softer sky/ambient lighting without remote assets.
- [x] Ease resident walks at path ends, gradually interpolate turns and reduce robotic gait snapping.
- [x] Raise high-tier animation cap to 60 FPS with refresh-jitter tolerance; retain lower tiers and automatic software-GPU fallback.
- [x] Make a graphics-tier change announce updated quality in the accessible World status.
- [x] Bump dynamic World module and offline cache version to avoid stale renderer files.
- [x] Add unit regression for time-of-day lighting, animation, accessibility and zero extra fetches.
- [ ] Verify Node unit suite, Chromium World navigation and cross-release offline upgrades.
- [ ] Review, merge and verify the published Phase 5 release on GitHub Pages.
- [ ] Validate visual fidelity and frame pacing on actual supported Android/Zenbook hardware before claiming a performance improvement.

This is the first small realism pass; additional visual refinements require screenshot and real GPU review.

## Phase 6 — release verification

Run responsive, keyboard, navigation, Firebase, Drive, local-save failure, backup recovery, service worker and old-cache upgrade checks. Compare actual performance before and after changes.

## Baseline

GitHub Actions for `f7190f03f83007344c3bfce4fe19bd4ed9e82ba9` shows passing Tests, browser smoke, live-release verification, dictionary checks, and Pages deployment (12 November 2026). Psychology public-content validation passed on 16 November 2026. These checks do not cover all live account and device scenarios.
