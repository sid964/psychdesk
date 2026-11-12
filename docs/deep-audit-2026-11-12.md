# PsychDesk repair audit — 12 November 2026

This is a bounded repair pass and an actionable checkpoint, **not a claim that the complete application has been audited**. The requested 60–120 minute exhaustive review is not complete. Read the companion inventory for exact source-review coverage.

## Protection and baseline

- Baseline/default branch: `main`, `41934d734aeecf5a30de808e4e57105146b1398d`.
- Clean fresh checkout; repair branch `repair/deep-stability-audit-20261112`. No unrelated local changes were present.
- Recent main tests, browser smoke, dictionary checks, live-release verification and Pages deployment were successful. Older failed run `43202336163` expected a v80 cache literal while source used v81; logs confirm a test expectation failure, subsequently repaired on main. No workflows were rerun speculatively.
- Open PR #69 is unrelated World visual polish. It is not included or merged.
- Static Pages deployment remains unchanged. No force push, history rewrite, record deletion, production database write, security-rule change or credential change.
- Rollback: revert the repair merge through a normal commit/PR. Restore baseline source if necessary; do not clear browser/Firestore/Drive storage. Cache rollback needs a fresh release name, not manual deletion of user data.

## Confirmed defects and repairs

| ID | Severity | Reproduction / root cause | Minimal repair | Evidence |
| --- | --- | --- | --- | --- |
| H1 | P1 | Home → World → Recall → Back returns home. Bridge replaces World entry before entering a destination. | Keep World as actual predecessor; Back/Forward restore it. | Reproduced on published site; actual bridge behavioral tests cover all six destinations; expanded browser regression. |
| H3 | P1 | Tools section jump/skip-link hashes were treated as unknown app routes and returned Home. | Preserve the current view on native anchor entries without changing their fragment. | Reproduced live; bridge anchor Back/Forward tests; responsive browser anchor assertions. |
| H2 | P1 | Direct `#pd-world` entry → close calls Back without a known in-app predecessor. | Mark normally pushed World entries; close direct entries in place. | Test includes an external predecessor and asserts zero Back calls/no added entry. |
| C1 | P1 | Offline navigation to World receives root `index.html`; World assets were absent from precache. | Match each navigation document to its own current-cache HTML; precache World fallback and missing active lidar assets. | Executable service-worker routing and entrypoint asset-inventory tests. Real offline browser check added. |
| W1 | P1 | Persisted pagehide disposes renderer/controls; browser page-cache restoration has no pageshow restart. | Pause for persisted pagehide, resume on pageshow, dispose only on final exit. | Lifecycle block executes with resource counters; browser GPU behavior still needs CI/device verification. |
| W2 | P2 | Directional-light shadow render targets have a separate disposal lifecycle. | Dispose sun shadow on final exit alongside deduplicated materials/geometries/textures. | Resource-counter regression. No GPU-memory benchmark claimed. |
| W3 | P2 | Escape with a discovery open hides it and exits the whole World in the same handler. | First Escape dismisses discovery and returns focus to exit; subsequent Escape exits. | Actual UI-module Escape regression PASS; end-to-end keyboard confirmation pending. |
| A1 | P2 | Worker rejects “Operant conditioning”, “Theory of mind”, “Anxiety” because regex alternatives are not grouped/anchored as full words. | Match only complete generic labels. | Actual worker message regression with exact source definitions. |
| A2 | P2 | Single supplied subject never suggested: top score compared to undefined runner-up. | Treat missing runner-up score as zero, retaining minimum evidence threshold. | Actual worker regression. |
| A3 | P2 | Edit/delete a note while analysis is pending; old result can file the edited note and retain a stale artifact. | Recheck current revision after analysis and before automatic subject assignment; mark stale jobs; stop starting jobs after mode becomes calm. | Asynchronous queue tests cover edit, deletion, and unchanged successful reversible organization. |
| P1 | P2 | Landscape repeatedly evaluates the same 216 route samples for every vegetation candidate. | Cache exact immutable route samples once. | CPU benchmark with real Three.js 0.180.0; byte-identical generated geometry/instances at both tiers. |

Second-pass findings (including an additional live keyboard reproduction):

| ID | Severity | Root cause and repair | Verification |
| --- | --- | --- | --- |
| F1 | P1 | Browser CI reproduced a note editor being detached during typing after reload. A late initial signed-out Firebase callback unconditionally closed dialogs/reset guest modules despite unchanged identity. Skip only the already-guest/no-user transition; preserve cached-private-to-guest clearing. | Positive and privacy-isolation regressions; responsive browser case retained without a timing workaround. |
| D1 | P1 | Sticky transitions ignored failed saves and reset/replace the editor, including after the debounce timer was cleared. Track unsaved writing independently and stop New/Edit/From-note transitions until saving succeeds. | Three actual-module failure/retry regressions; each fails against baseline and passes after repair. |
| M1 | P2 | Homepage ambient animations continued while the opaque World covered them. Reuse the existing ambient-pause lifecycle while `psychworld-open` is active. | Runtime regression verifies pause/resume without changing motion preference. |
| K1 | P2 | Tab from the World exit reached the covered homepage skip link; Shift+Tab was trapped on the exit. Preserve/restore background inert state and use native iframe focus order. | Reproduced in the published UI; actual bridge inert-state test; browser reverse-Tab assertion. |
| D2 | P2 | Late bibliography import/DOI responses could open a preview after an account reset; DOI could also interrupt a different screen. Bind requests to source workspace/generation and the originating lookup surface. | Account reset, navigation-away and successful current-owner regressions. |

No aesthetic CSS, fonts, themes, spacing, Settings icon, academic content or feature inventory changed. No files removed or consolidated.

## Continued same-session safety follow-up

After merging the first repair PR, continued inspection found and reproduced two more lifecycle defects, plus a release-tag omission. These changes use a separate branch from the verified merge, `repair/setup-verification-loop-20261112`.

| ID | Severity | Root cause and repair | Verification |
| --- | --- | --- | --- |
| G1 | P1 | A successful Drive verification emits `psychdesk:drive-connected`; the setup listener invalidated that active check and recursively launched another. Ignore the active check's own success event until its promise settles. | Baseline test reaches five calls before a safety stop; repaired test completes exactly one check and shows All set. Added real status-UI browser scenario with mocked services, no real Google grant. |
| T1 | P2 | The first-visit timer could append an interactive tour invitation after World focus isolation was established. Defer offering it while `psychworld-open` is active. | Actual tour timer callback test fails before the fix and passes after; invitation still appears after returning to study. |
| C2 | P1 reliability risk | Sticky Notes was changed but its first repair HTML still reused `copy-sober-1`, allowing an existing HTTP-cache response until expiry. Correct its URL, advance cache to v83 and check all repaired entrypoint URLs against obsolete values. | All repaired entrypoint script URLs differ from their obsolete versions; no storage clearing or forced reload added. This does not prove every old-cache upgrade/obsolete-UI-flash scenario fixed. |

## Performance evidence

Isolated CPU scene-construction benchmark in this Linux environment, real Three.js 0.180.0, three measured runs after one warmup per implementation/tier. Canvas textures disabled by a null 2D-context stand-in; no renderer/GPU involved. Median high: **307.98 → 84.76 ms**. Median medium: **89.55 → 22.30 ms**. These are landscape-construction timings, not whole-page startup, FPS, GPU or physical-device measurements.

Geometry/instance/transform SHA-256 is identical before/after:

- High: `09a7332443cac189c92b4257e23e8e8ffa254bfd275efad7f840f71fd80e6fda`.
- Medium: `8647edf25c99fbcdc77d18fd08d67f96444c1c15dedac46e5f5954b63e103a45`.

No changes to World materials, terrain shape, lighting, camera, motion style, object placement or quality settings.

## Verification at branch preparation

- Baseline: 199 unit tests passed.
- After repairs: 239 unit tests passed, zero failed/skipped. Suite includes persistence, nested ink-array serialization, size safeguards, account isolation, Drive, academic content, imports, notes, recall and local automation using isolated stand-ins/mocks.
- All 108 JavaScript/test files present after the first repair passed `node --check`; the follow-up tour test and changed scripts were checked separately, including the reproducible opt-in landscape benchmark. `git diff --check` passes.
- Public concept validator passes for 14 entries, against a stated target of 365; this validates structure/URLs, not scientific claims.
- New regression cases were run against a separate full baseline copy and exposed the old navigation, missing cache assets, queue, extraction and lifecycle behavior. Existing Home-alias behavior is not counted as a baseline bug merely because the test stand-in represents relative cache URLs differently.
- Live baseline: first guest load, World → Recall → Back observed through browser UI, without sign-in or study-data writes. Shared browser cannot create WebGL contexts; accessible destination navigation worked. Extension metadata errors are browser-environment noise, separate from WebGL failure.
- Local Playwright launch failed before loading app: Chromium `socket() failed: Operation not permitted`. Local HTTP server is not reachable from the separate shared browser (`ERR_CONNECTION_REFUSED`). No escalation or security workaround attempted.
- GitHub browser smoke expanded to include five exact requested viewports, touch emulation on phone widths, note save/close/reload, flashcard review persistence, theme restoration, home overflow, offline World/main and reconnect. Expanded World smoke checks real WebGL once, then all six navigation destinations, Back/Forward, reload and direct close. Repeated non-rendering route checks use the supported graphics-unavailable path to avoid redundant software-GPU scene rebuilding. Responsive/offline checks run before GPU smoke. All first-repair browser checks passed in run 43209108351 on head 0aa7ddf. The added setup event-chain browser case is pending follow-up CI.

## Mandatory scenario status at branch preparation

| Scenario | Status / limits |
| --- | --- |
| No obsolete-UI flash | Unverified across an actual old-cache upgrade. Current deferred-home startup protection remains; no forced reload loop exists in current code. |
| World → Recall → Back | Bridge behavioral PASS; baseline live bug reproduced; repaired browser smoke PASS (all six destinations). |
| 3D initialize/dispose | Isolated lifecycle PASS; real GPU and physical hardware unverified locally. |
| Sections | Unit contracts and five-viewport responsive browser run PASS. |
| Study content survives refresh | Existing isolated persistence and real-browser note/recall refresh flows PASS. |
| Authentication unchanged | Mock tests PASS; real Google consent/session restoration unverified. |
| Drive state | Mock tests PASS; real private transfers and grants unverified. |
| Study tools | Unit suite PASS; only bounded browser workflows scheduled. |
| Design preserved | No aesthetic source changes; CI screenshots inspected, with no obvious layout regression in the tested views. No pixel-identical baseline comparison claimed. |
| Consistent cache release | v83, changed script URLs, own-document offline fallback and precache inventory PASS; old-to-new activation not fully verified. |
| No high-severity console errors | No uncaught page errors in the tested five-viewport flows and World smoke; baseline shared browser WebGL disabled. |
| Predictable CI | First repair PR checks PASS; deployment and live-release verification PASS; follow-up checks pending. |

## Data safety and limitations

Firestore JSON-string format, legacy decode compatibility and the 750,000-byte safeguard are unchanged. Authentication change is limited to suppressing a redundant initial guest-to-guest reset; actual account changes still flush editors and reset account state. Real user notes, ink, imports, saved concepts, preferences, Drive files and Google grants were not used for destructive tests. No backend deployment/billing enabled.

Pending work: remaining source files per inventory, full CSS specificity/visual pass, comprehensive reader/import/reference/ink/session interactions, authenticated flows, old-service-worker upgrade/slow-network/cross-tab cases, second browser engine, real stylus, GPU memory/FPS, source-textbook editorial verification. Psychopathology hierarchy is preserved; source textbook was not reopened for line-by-line content validation in this pass. Do not label any of these verified based on unit tests alone.

First repair PR (merged): https://github.com/sid964/psychdesk/pull/72. First repair commit: `9a21e9a7d204573ec84de4b8eb8af7cc50d9c9d9`. First release merge: `e8487cdc5b2636e77c1a7b00e3216eaf90020890`. All 14 independently downloaded critical HTML/JS/service-worker files match that merge. Pages deployment and live-release verifier passed. Follow-up publication results will be recorded in its PR description and final user report. No 60–120 minute exhaustive-completion claim is made.

## Final lifecycle continuation

The garden observer retained detached SVG scenes after `refreshHome` replaced their container. Release disconnected targets before observing current scenes and when a disconnected-target notification arrives; schedule the existing observer pass after modal close as well. A regression executes the real garden module and fails against the preceding release (the old homepage target remains retained), then verifies replacement, modal removal, and observer-callback cleanup. Illustration markup, CSS, interactions and motion are unchanged. Garden script URL is versioned; cache advances to v84. No GPU/heap measurement is claimed.

The preceding follow-up PR #73 merged as `1fe8a2df41097d3b541e487d99bb4bd7e714e9cc`; all required checks, Pages, post-merge browser smoke and live verifier passed. All 16 downloaded critical files matched that commit; shared browser reload loaded the corrected URLs. The original textbook brief contents were reopened: the 16 chapter outline names and start pages agree with the course data. This is a bounded outline comparison, not line-by-line verification of the explanatory paraphrases or completed teaching material for chapters 2–16.

Final lifecycle branch unit verification: 240 passed, zero failures/skips. The first suite run correctly failed two cache-version expectations after v84 was advanced; their release expectation was updated, preserving their existing asset/fetch assertions. Final branch browser and publication results are recorded in its PR.
