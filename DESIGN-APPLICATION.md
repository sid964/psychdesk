# PsychDesk design skill application

Adapted from the **landing-page-design** skill supplied on 9 November 2026.

PsychDesk is a **personal psychology study application**. The landing page conversion template (pricing, testimonials, promotional FAQ, repeated signup CTA, tagline sales reveal) is deliberately **not** applied: it would add friction to studying. The primary home action remains **continue the last session or start a note**, while Focus is secondary.

## Adopted rules

- **One primary UI typeface:** Manrope. Caveat remains loaded only for handwriting-like note experiences; the handwritten ink features and their data format are unchanged.
- **Named, reusable foundations:** spacing values and heading sizes are declared in `design-system.css`. The homepage follows a clear 60 / 48 / 36 / 30 / 24 scale with readable 16 / 24 body copy. Small screen controls stay at least 44px tall.
- **AMOLED and warm paper:** true black for the dark app canvas and flat charcoal cards; warm off-white light surfaces. Sage is reserved for actions and living garden illustration, not a tinted dark backdrop.
- **Garden as an illustration:** the original, responsive, animated SVG, tree and pond interactions, and time-of-day reactions stay intact. The garden is an exception to any generic ban on atmospheric illustration, and becomes the hero's intentional visual rather than covering text.
- **Subtle motion:** existing navigation and garden movement remain; interface controls use `cubic-bezier(.22,1,.36,1)` and transform/opacity where possible. Reduced motion preference is respected by the existing motion system and new layer.
- **Accessible navigation:** active desktop and mobile tab buttons expose `aria-current=page`. Keyboard focus stays visible. The Settings button and its SVG are untouched.
- **No data or service changes:** authentication, Firestore, Google Drive, IndexedDB, study tools and service worker update logic are preserved.

## Source of truth and scope

`design-system.css` is **the final UI presentation layer**, loaded after `garden-refresh.css`. Do not scatter additional overrides among existing stylesheets. `design-accessibility.js` only synchronizes navigation semantics with the active class; it does not change routes or persisted state.

## Verification

- Run `node --test tests/*.test.mjs tests/*.test.cjs functions/tests/*.test.cjs` and check all JavaScript with `node --check`.
- Run the existing desktop/mobile Playwright browser audit (320, 360, 390, 768, 1024 and 1440px) and motion tests in CI.
- Check the garden is visible and animates normally, tabs work, 390px has no horizontal overflow, primary action is visible without scrolling, mobile buttons are tappable, and reduced motion disables decorative animation.
- The live deployment workflow checks the versioned CSS, accessibility script and v70 service-worker cache.

No layout overhaul, fabricated product claims, new paid dependencies or destructive data migration was included.

## Editorial refinement (second pass)

**Home structure**: The living garden stays the first screen, with the primary continue/new-note action directly beneath a factual psychology-study headline. The notebook and daily concept now come immediately after the garden; the derived next-step suggestion is a quieter, secondary panel below those cards. The saved-concepts section uses functional copy rather than repeated garden metaphors.

**Navigation**: Desktop routes are ordered Study desk, Notebooks, Library, Planner, Focus, Explore. Specialist routes still exist in the app and remain available through Explore; their event handlers are not changed. The narrow phone header keeps the PsychDesk name visible above 345px while retaining quick note, theme, Google account, Drive and Settings controls. The account control is visually icon-only on phones, but its current text and sync status remain in its accessible label.

**Visual language**: Flat surfaces on non-illustrative UI, subtle text gradient in the hero, stronger 14–16px supporting copy, more obvious reading hierarchy and consistent button targets. The SVG illustration remains animated and interactive. Drive's connected status uses a steady accent instead of a perpetual spinner.

**Regression checks**: In addition to the existing navigation, autosave, ink, motion and theme audits, CI checks the garden's visibility, hierarchy, primary action within the initial phone viewport, branded phone header and accessible account controls. No login, sync, Drive or study-data storage code was modified.

## Personal desk pass (9 November 2026)

The previous approach interpreted the uploaded design skill too literally for an individual study workspace: an attractive hero was still mostly a generic landing page. This pass changes the **information architecture**, not the account or automation model.

- The homepage names a real recent reading material and saved page number, last opened workspace, or recent note when that information exists. Long titles are shortened visually and escaped. If no history exists, it uses a truthful first-use message instead of an invented activity.
- The notebook below the garden always represents an actual recent note or a one-tap new-note entry, rather than duplicating the reading shelf already described in the hero.
- The living garden remains the original animated SVG; existing saved concept IDs still determine its flower controls. A compact, account-scoped status explains how many saved ideas it reflects and opens the existing saved-concepts dialog. Empty state tells the user how their first flower appears.
- The daily discovery card says what it is and whether that idea is already saved. No fabricated recommendation or AI-inferred personalization is claimed.
- An optional memory postcard appears only if there is a real concept saved more than two days earlier. It never sends a notification, calculates a streak or invents a reminder; tapping it reopens the existing sourced concept.
- The redundant saved-concepts promotional block was removed; no new preferences, accounts, external APIs, paid services, note copies or storage schemas were introduced.
- Automated browser auditing now verifies that saving a curated concept creates a visible garden flower and a working button into the saved collection, using only isolated local test data.

The home should feel personal because it **remembers the work the user actually did**, not because it uses personal-sounding slogans or manufactured progress.
