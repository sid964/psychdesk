# PsychDesk — motion reliability and human study review
Date: 4 November 2026

## Scope and decisions
This change improves the existing site. It does not replace the study-data schema,
Firebase Authentication, Firestore sync, Drive integration, handwriting editor,
planner, flashcards, service-worker strategy, or the Settings icon.

### Animation audit
- The app already had `motion.js`, `motion.css`, several page-level CSS
  animation rules, and a separate garden animation/pause mechanism.
- Previous motion was played directly inside the interaction adapter. The new
  `motion-runtime.js` owns playback and cancellation, applies user preference
  and operating-system reduced-motion settings, and handles page visibility.
- `motion.js` now requests effects through the runtime, rather than opening
  additional animations independently. Navigation, modal and reveal durations
  have been tightened to finish predictably.
- The animated SVG garden remains CSS-driven for efficient compositor scheduling.
  The central runtime pauses its ambient motion in Quiet Room, Focus, reduced-motion
  or explicit Quiet/Off settings. Its existing viewport observer still pauses it
  while out of view.
- No extra per-frame JavaScript loop, external CDN dependency, or fixed FPS target.
  Smoothness at 60/90/120 Hz depends on browser, hardware, and real-device conditions.
- A Motion choice in existing Settings offers Gentle, Only interactions and Off.
  This preference is local to the device and never enters the user study-data sync.
- CSS motion-off overrides are intentionally opt-in; they do not change content
  or storage.

### Psychology-based design review
1. **Reduce extraneous cognitive load:** one primary homepage action now opens the
   most recent note if available, otherwise starts a quick note. A single
   secondary Focus action stays visible. Further tools remain discoverable
   in the existing drawer rather than appearing as a new dashboard.
2. **Continuation over novelty:** the notebook card now precedes the daily concept
   card in reading and tab order. It is easier to resume actual work.
3. **Support retrieval and distributed practice without pressure:** a source-linked
   psychology concept and existing saved-concept/flashcard paths remain available,
   but we avoid compulsory reminders, points, competitive streaks or fabricated
   learning metrics. Existing study features remain untouched.
4. **Design for attention:** shortened hero/card proportions mean less scrolling
   to reach study content, especially on Android. The illustration is
   decoration; no required action depends on its animation.
5. **Human voice:** headings and buttons use specific, unforced language that
   describes study actions. Avoid anthropomorphic AI claims, productivity slogans,
   fake encouragement, and repeated 'grow your space' metaphors.
6. **Nature with scientific caution:** the illustration is an aesthetic option,
   not a scientifically validated attention treatment.

## Research reviewed
- Dunlosky et al. (2013), review of practice testing and distributed practice:
  https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html
- Roediger & Karpicke (2006), test-enhanced learning:
  https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Forsey et al. (2025), progressive disclosure and interface learnability:
  https://doi.org/10.1177/10648046241273291
- Mobile-learning UI and extraneous cognitive load (2024):
  https://pmc.ncbi.nlm.nih.gov/articles/PMC11422584/
- Bell et al. (2025), nature exposure and attention restoration:
  https://doi.org/10.1016/j.jenvp.2025.102632
- W3C WCAG 2.2 SC 2.3.3, animation from interactions:
  https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions
- MDN, native Web Animations API:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API

These studies support design principles, not a claim that this particular
website has been shown to improve attention, grades, or study frequency.
That would require a user study with actual outcomes.

## Verification and limits
- Syntax checked on modified JavaScript and the service worker.
- Checked that the HTML loads the motion runtime before the adapter and that
  the service worker includes the new assets in its updated cache generation.
- No real-account Firebase/Drive test, physical stylus validation, actual FPS
  profiling, or live user study was performed.
- Existing offline data and private records were not accessed or modified.
