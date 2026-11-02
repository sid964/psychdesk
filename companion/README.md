# PsychDesk floating study companion

## Artwork licensing

The public feature currently uses an original lavender orb placeholder with animated expressions. **It does not include Pikachu.** No Pikachu/Pokémon artwork or animation rights have been supplied, so no recognizable Pokémon assets were committed. An image being publicly viewable does not mean it can be redistributed in a public GitHub repository or on GitHub Pages.

Before publishing Pikachu, obtain permission for web display and public repository redistribution. Supply optimized, transparent licensed assets (such as SVG or animated WebP) for each pose. Declare the approved paths in a script before the companion script in index.html:

~~~html
<script>
window.PsychDeskCompanionArtwork = {
  idle: 'companion/assets/authorized-idle.webp',
  resting: 'companion/assets/authorized-rest.webp',
  sleeping: 'companion/assets/authorized-sleep.webp',
  walking: 'companion/assets/authorized-walk.webp',
  interacting: 'companion/assets/authorized-curious.webp',
  guiding: 'companion/assets/authorized-guide.webp',
  celebrating: 'companion/assets/authorized-celebrate.webp',
  syncing: 'companion/assets/authorized-sync.webp',
  disconnected: 'companion/assets/authorized-worried.webp'
};
</script>
~~~

Use same-origin paths and only publish the image files if the license permits their redistribution. The module switches art according to behavior and falls back to the original neutral mascot when no authorized art is configured. Rich ear, limb, tail, and face animations must be authored into licensed animated exports; the UI module does not generate a complex skeletal rig from one static image.

## Functionality

- Calm (default), Playful, and Hidden behavior modes with Small, Medium, or Large sizes.
- Native pointer dragging for mouse, touch and stylus, edge docking, keyboard repositioning with Shift+Arrow, responsive viewport clamps and saved local preferences.
- Idle breathing/blinking, walking, curious, resting, sleeping, celebrating, syncing, disconnected, and guidance expressions. Playful exploration is occasional and pauses while the user is busy. No perpetual JS render loop.
- Automatic suppression around typing, drawing, modals and the mobile keyboard, plus hidden-tab suspension and reduced-motion support.
- Small contextual menu: open feature guidance, create a quick note, check actual Drive connection status, or change behavior and size.
- Guidance calls existing PsychDesk navigation and highlights the relevant existing control. It doesn't use new AI or inspect study contents.
- Genuine achievement events fire only after successful task completion, logged focus sessions, or completion of a flashcard review queue. Verified Drive connection and operation events provide factual sync feedback.

## Restore and maintain

Open **Settings → Study companion** to select Calm, Playful, or Hidden. The keyboard shortcut **Alt+Shift+P** restores Calm (some system shortcuts may take precedence). Preferences are stored locally under the key psychdesk-companion-v1; they are not part of study backups, account identity, Firebase, or Drive tokens.

The module is isolated in companion/companion.js and companion/companion.css. Only minimal event hooks were added to app.js and cloud.js; index.html and sw.js load and cache it.

## Explicit limitations

This release does **not** represent a licensed Pikachu, a full Pokémon 2D rig, measured 90/120 Hz performance, a new AI tutor, or guaranteed avoidance of every future dynamic interface element. Actual recognizable Pikachu appearance and professionally authored character motion depend on properly authorized and supplied art assets. No private note content is transmitted to the companion.
