# PsychDesk Pikachu study companion

## What is included

This feature adds a recognizable, independently drawn **Pikachu character** in `companion/pikachu.js`: yellow body, red cheeks, black-tipped ears, lightning-bolt tail, expressive eyes, articulated paws, and footstep shapes. SVG parts are animated with browser CSS (ear twitches, tail swing, blink, waving paws, pointing, walking feet, clapping/celebrating, thinking, resting/sleeping, sync and disconnected expressions). It does not download or copy artwork from Pokémon game files, fan packs, or third-party graphics.

**Important:** Pikachu and Pokémon are owned by their respective rightsholders; the independently authored drawing is not official or licensed. This repository and GitHub Pages website are currently public. Keeping a site for personal study does not make its publicly served copies private. Making the repository private later also does not retroactively remove copied assets or guarantee the Pages site will stop being accessible. Confirm your hosting and repository visibility separately before sharing.

## Walking around the website

Pikachu can walk to points **anywhere in the usable visible app viewport**, rather than being confined to a corner. He avoids the desktop navigation rail, top header, and mobile bottom navigation and stays inside the visual viewport when the mobile keyboard changes its size. Browser-native Web Animations move the entire character between stops with slight curved paths and visible alternating foot/paw motion; animation is scheduled only during walking, with no permanent JavaScript drawing loop.

In **Playful**, walks are more frequent; in **Calm** (default), he walks infrequently after a longer inactive period. Walking stops promptly when you interact with the page, type, scroll, open a modal, use Ink Notes, activate the Focus timer, or hide the browser tab. You can trigger an immediate walk by tapping Pikachu → **Go exploring**. The feature respects reduced-motion settings and can be switched off independently through Preferences → Roam.

## Live interactions and speech bubbles

* Tap: wave / open contextual guide menu. Double-tap: happy high-five. Long press: menu. Drag with mouse, finger, or compatible stylus: choose a resting edge. Shift+Arrow while Pikachu is focused: nudge position.
* Menu: Find a feature, Quick note, Drive connection status, Preferences, Wave hello, Go exploring. Guidance uses existing PsychDesk navigation hooks; no AI service or study-content inspection.
* Speech bubble: small dismissible, accessible status messages for greeting, guidance, achievement, and confirmed Drive state; a maximum of two pending follow-up messages. Bubbles stay off during typing, handwriting, modals and other suppressed contexts.
* Settings: Calm/Playful/Hidden; three sizes; independent Roam/Bubbles/Gestures toggles; Return to saved position. Preferences persist in the companion-specific localStorage entry, not in Firebase study data.
* True achievement signals are emitted by existing study logic only after confirmed task completion, logged focus time, or flashcard review queue completion. Drive status follows the existing verified connection events, never optimistic guesses.
* **Alt+Shift+P** restores the companion, although your browser/OS may reserve some shortcuts.

## Files and integration

* `companion/pikachu.js`: self-contained character drawing
* `companion/companion.js`: character states, events, feature registry, drag/roam behavior, accessible menu, preferences, bubble controller
* `companion/companion.css`: AMOLED interface, walk/gesture animations, reduced-motion rules
* `index.html`: loads the drawing before the companion module
* `sw.js`: caches scripts and stylesheet for existing PWA behavior

No extra npm package, game engine, API key, analytics, cloud AI, or network service is added. Existing authentication, Drive integrations, content, settings icon, and study collections are unchanged.

## Limitations

This is handcrafted **vector/CSS 2D animation**, not a professional frame-by-frame anime animation or licensed official sprite sheet. Characters roam within the **visible viewport**, not off-screen down the entire scrolling document; scrolling itself pauses roaming to preserve readability. No claimed benchmarks for 90/120 Hz devices. The pet can be paused or hidden completely. Its free movement may briefly overlay noncritical content during idle time; disable Roam if you prefer an always-stationary companion.
