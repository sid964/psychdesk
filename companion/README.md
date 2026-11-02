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

These are three distinct still image poses, not original frame-by-frame animation footage; the existing CSS and browser animations provide transitions. The new local sprite atlas is deliberately small, reusable, and available through PsychDesk's existing service worker.

## Controls and integration

Calm, Playful, and Hidden behavior modes remain available. Tap Pikachu for the study menu and **Go exploring**, **Wave hello**, Quick Note, Drive status, navigation guidance, and preferences. Drag with mouse, touch, or stylus to reposition; double-tap for a high-five; long-press for the menu. Roaming, bubbles, and gestures can be toggled independently. The companion pauses around typing, handwriting, dialogs, active study, and browser backgrounding; reduced-motion preference is respected.

Changes are scoped to the companion scripts/styles, the local asset, the `index.html` cache-busting versions, and `sw.js`. Existing Firebase, Drive, notes, study collections, settings logo, and navigation hooks remain unchanged.

## Known limitations

The original reference images are relatively small and come from three different scenes, so the transparent matte may contain small edge artifacts when zoomed. Pose transitions are state swaps, not skeletal animation. If you prefer high-detail cinematic motion, additional artwork frames can be supplied later without rebuilding the companion.
