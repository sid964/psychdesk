# Neko — PsychDesk's screen cat

The companion uses the open-source Oneko cat sprite sheet and animation layout from https://github.com/adryd325/oneko.js. The full upstream license is included in `assets/ONEKO-LICENSE.txt`; original cat artwork traces to Masayuki Koba's X11 oneko.

Neko walks across the usable screen in eight directions, pauses, looks around, scratches and sleeps. Playful is the initial behavior, with a first walk soon after startup and short rests between later walks. Android and desktop both get autonomous movement. Calm rests until you interact. Hidden removes the pet. Reduced motion disables roaming and frame animation.

Tap for quick controls, double-tap to pet, long-press for the menu, or drag to move. Keyboard Enter/Space opens controls; Shift + arrows repositions; Alt + Shift + P restores a hidden cat. Preferences include size, roaming, reactions, optional bubbles, position restore and reset. Automatic bubbles are off initially.

Typing, handwriting, dialogs and focus sessions keep the workspace quiet. Walk destinations avoid actionable controls, headers and navigation. The pet pauses when hovered, dragged, scrolled or interrupted, and resumes wandering when the workspace is quiet. Activity stops in hidden tabs. The cat's sprite timer runs only during walking or short reactions, with no permanent render loop.

`companion.js` retains the scoped menu, app-event hooks and safe movement. `cat.js` renders the sprite animation. `bubbles.js` retains the optional bounded speech queue. Styles are scoped to the pet. Preferences use `psychdesk-companion-neko-v1`, separate from study records and previous character settings.

No WebGL, 3D model, external CDN, game engine or paid service is used. Existing study features, Firebase, Drive, data, navigation and the homepage Settings icon are preserved.
