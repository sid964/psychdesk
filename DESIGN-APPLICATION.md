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
