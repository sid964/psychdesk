# PsychDesk motion system

The primary AMOLED background remains #000000. Motion is confined to interface feedback, finite surface entrances, and existing decorative motifs; no full-screen animated backdrop is introduced.

## Behavior

- Central CSS duration/easing tokens feed the JavaScript controller. Press feedback is 80–120 ms, small responses about 180 ms, sheets/dialogs 300 ms, and navigation surfaces 380 ms with at most 96 ms stagger.
- A sampled damped spring drives navigation icon feedback, task completion and sheet snap-back. WAAPI follows the browser's display cadence; there is no frame-rate cap.
- Each section enters once. Returning restores its document scroll position. Existing tab/filter/editor persistence remains owned by the application.
- Below-fold surfaces reveal once through IntersectionObserver. Content is never hidden while waiting for JavaScript, and long-form text and drawing surfaces do not move.
- Same-section task/note reordering uses bounded transform-based FLIP. Selected note cards provide directional continuity into their editor without duplicating note content in overlays.
- Mobile dialogs expose a dedicated drag handle. Short/cancelled drags spring back; deliberate downward drags dismiss through the existing save/close lifecycle. Scrolling, text selection and stylus events outside that handle remain untouched.
- Existing monochrome motifs shift at most 18 px with scroll. Opening a dialog dims the inactive workspace. Both effects reverse through their current CSS state, with no colored glow or gray page replacement.
- Severe main-thread long tasks reduce optional scroll/depth effects in supporting browsers. Essential controls remain immediate. This is a conservative fallback, not a refresh-rate measurement.
- Reduced motion, page hiding, page restoration, rapid navigation and component replacement cancel or settle transient effects. No persistent animation loop or new dependency is added.

## Validation and boundaries

The existing 119 Node tests protect study functionality. The Chromium/Firefox audit covers six widths and adds motion settling, scroll continuity, rapid navigation, interrupted dialogs, reduced motion, true-black background checks and mobile handle gestures. Screenshots cover arrival, scrolled content and dialogs. Frame samples in the report measure idle headless CI cadence only; they do not establish animation FPS or guarantee 90 FPS on physical displays. Real-device stylus pressure and high-refresh-rate profiling remain device-level checks.

Native select dropdowns, auth popups and other browser/OS surfaces keep their native behavior. The rebuild intentionally avoids gesture interception on content, cosmetic sync success states, and animated overlays containing copies of private notes.
