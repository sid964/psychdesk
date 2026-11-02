# PsychDesk Pikachu study companion

## User-supplied character artwork

The companion now renders three **user-provided reference images**, trimmed to transparent backgrounds and packaged into a small local sprite atlas in `companion/assets/pikachu-user-poses.png`. The atlas contains standing (left), waving/jumping (middle), and forward-leaning walking/crawling (right) poses. It replaces the hand-drawn Pikachu illustration in normal operation; the vector remains a fallback if the atlas fails to load.

The pose images were supplied by the site owner for this integration. Their originality, underlying Pokémon rights, and redistribution permissions have **not** been independently verified. Pokémon/Pikachu remain associated with their respective rights holders. Note that `sid964/psychdesk` and the GitHub Pages site are currently public. Making the repository private later does not necessarily make Pages private or remove copies from caches or previous commits.

## How the images behave

- **Idle / resting:** standing portrait.
- **Tap / greeting / celebration:** waving/jumping portrait with brief motion.
- **Walk / explore:** forward-leaning portrait, used while moving around the usable viewport.
- **Guide / point:** waving portrait accompanies the existing navigation highlight.
- **Sleep / focus:** standing portrait rests quietly, with a small sleep indicator.
- **Drive sync / disconnect:** restrained expression feedback, only from verified app events.

The three user-provided poses now drive a small **cel-style animated character**. Walking alternates between upright and forward-leaning poses at contact and lift-off, while the body and ground shadow respond separately. Idle, stretch, glance, greeting, celebration, thinking, focus sleep, syncing and disconnected states use different timing, scale, tilt and expressions. This feels more alive than simply dragging a still image, while remaining lightweight. **It is not a hand-rigged animation of every photographic ear, paw and tail, nor new original animation footage.** The articulated SVG remains available as a fallback when image loading fails.

## Controls and integration

Calm, Playful, and Hidden behavior modes remain available. Tap Pikachu for the study menu and **Go exploring**, **Wave hello**, Quick Note, Drive status, navigation guidance, and preferences. Drag with mouse, touch, or stylus to reposition; double-tap for a high-five; long-press for the menu. Roaming, bubbles, and gestures can be toggled independently. The companion pauses around typing, handwriting, dialogs, active study, and browser backgrounding; reduced-motion preference is respected.

Changes are scoped to the companion scripts/styles, the local asset, the `index.html` cache-busting versions, and `sw.js`. Existing Firebase, Drive, notes, study collections, settings logo, and navigation hooks remain unchanged.

## Known limitations

The original reference images are relatively small and come from three different scenes, so the transparent matte may contain small edge artifacts when zoomed. Pose transitions are state swaps, not skeletal animation. If you prefer high-detail cinematic motion, additional artwork frames can be supplied later without rebuilding the companion.

## Living-character experience (v3)

- **Calm stays quiet:** after extended inactivity Pikachu occasionally looks around, stretches, rests, or takes a short walk. **Playful** makes these interactions more frequent and enables longer walks.
- **Go exploring** can send Pikachu across the usable viewport. Walking selects destinations away from editors, nav controls, headers and dialogs, pauses for interaction/scroll/focus/handwriting, and respects reduced motion. Movement uses browser-native Web Animations rather than a continuous JavaScript render loop.
- **Tap to interact:** a single tap plays a wave before opening the menu, while a quick double tap gives a cheerful high-five. Long press opens the controls immediately; mouse hover makes Pikachu look toward the pointer. Status speech bubbles are dismissible, tagged by type, and limited in length.
- **AMOLED UI polish:** smaller, grouped controls with improved focus indicators, a readable identity header, tuned bubble anchoring, subtle golden accents and no new full-screen gradients or global visual changes. The existing homepage Settings icon is untouched.
- **Privacy/data:** the pet still stores only its own local preferences; no study note content, Firebase tokens or Google Drive contents are read by the character. Its guidance uses existing PsychDesk actions.

### Animation and asset limits

The current atlas remains a small set of extracted poses from the images supplied in the conversation. Changing between these poses produces a cel-animation effect, but the individual bitmap limbs are not a full 2D bone rig. The separately drawn SVG fallback has animated ear, limb and tail shapes. No 90/120 Hz performance benchmarks are claimed. The uploaded references are used on the owner's instructions; underlying Pokémon IP rights and public distribution permission were not independently verified.
