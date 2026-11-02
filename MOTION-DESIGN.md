# PsychDesk calm motion

The user selected directional navigation, upward-sliding dialogs on every device, a light overlay with subtle blur, single-surface content transitions, one-time scroll reveals, and a still study workspace. They reported abrupt speed, stuttering, excessive scaling, and excessive dimming in the previous system.

## Timing and behavior

- Navigation moves the existing main surface 22px on phones and 30px on larger screens, over 420ms. Forward destinations enter from the right; backward destinations enter from the left, following the established section order. Rapid navigation resumes the current offset. Content never fades out, and individual cards do not stagger during navigation.
- Dialogs slide upward 30px over 380ms on all devices. There is no scaling, spring overshoot, or directional note-card morph. Closing moves the outgoing surface down 24px over 220ms while fading its overlay. The editor flushes through its existing close event before this begins. Outgoing DOM is inert, has no IDs, and cannot intercept input; reopening or lifecycle changes remove it immediately.
- Overlay emphasis is black at 28% opacity with a static 3px backdrop blur. The workspace itself is neither faded nor moved. No animated blur, parallax, or depth effects remain.
- Below-fold surfaces reveal once per section with 7px travel and opacity from 0.86 to 1 over 360ms. Initial visible content remains steady; reveals never overlap a section transition or affect handwriting, readers, or drag canvases.
- Buttons press to 98% scale over 110ms. Cards receive a subtle inset edge on hover instead of lifting. Existing successful-save notifications remain responsible for their actual status; task confirmation follows committed state. Charts and progress indicators remain still.
- Central tokens use a monotonic easing curve with a gentle stop and no bounce. WAAPI follows the browser's native refresh rate without a frame cap or perpetual frame loop.

## Accessibility and stability

Reduced motion settles active effects and disables nonessential movement. Pen input and editing/direct manipulation settle a moving surface immediately. Mobile sheet dragging is confined to its dedicated handle, with recent velocity and distance determining dismissal; cancelled gestures return without overshoot. Lifecycle cleanup removes effects and outgoing surfaces when the page hides. Repeated long tasks reduce optional reveals. No scroll listeners, repeated layout polling, new dependency, or business-data migration is introduced.

The associated UI refinement improves text sizing and line height, spacing, card consistency, navigation density, dialog labels, and comfortable touch targets while retaining the true-black background, typography families, and established feature structure.

## Verification

The existing Node suite covers data and study functionality. Chromium and Firefox browser checks cover six viewport widths; motion assertions cover directional single-surface navigation, no fade or scaling, scroll continuity, reduced motion, light overlay and blur, noninteractive close lifecycle, interrupted dialogs, sheet gestures, and stylus settlement. Real-account Firebase/Drive flows, physical pen pressure, and 90/120Hz frame pacing require representative devices and account access.
