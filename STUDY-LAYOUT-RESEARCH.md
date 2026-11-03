# Study layout refinement — 3 November 2026

The current preparation layouts were retained. This pass reviewed the following
public sources successfully over HTTPS:

- [Retrieval practice, Learning Scientists, 23 June 2016](https://www.learningscientists.org/blog/2016/6/23-1): attempt recall before looking at notes, check the attempt afterwards, and practice links/comparisons as well as definitions.
- [Spaced practice, Learning Scientists, 21 July 2016](https://www.learningscientists.org/blog/2016/7/21-1): distribute practice across days instead of concentrating it just before the exam.
- [Interleaving, Learning Scientists, 11 August 2016](https://www.learningscientists.org/blog/2016/8/11-1): compare related ideas or problem types; work through each sufficiently before switching. Rapid task switching is not the goal.

These sources describe learning methods, not an experimentally proven ideal
website layout. The layout decisions below are design judgments intended to make
those methods easier to use, without claiming a measured improvement in grades.

## Changes from the published workspace

- Put the revision queue and study sequence ahead of the collapsible syllabus,
  so the daily action is visible before the full course catalogue.
- Provide concrete comparison/application prompts for both preparation modes.
  University examples use the supplied Cognitive Processes and Statistics courses.
- Make feedback, later-day scheduling, and memory-first concept mapping explicit.
- Link directly to the reviewed guides inside “Why this study sequence?”.
- Offer access to all unfinished topics when more than six exist.
- Refresh the service-worker cache version for the updated app.

The existing course data, planner storage, account separation, flashcard schedule,
visual tokens, typography, and navigation remain in use. No exam timetable or
mark weighting is invented. Scheduling another topic attempt remains a deliberate
user action, rather than an automatic timetable or exam simulator.

## Validation scope

Run the existing Node suite, the preparation browser regression, and the full
local browser audit. The preparation regression exercises adding a syllabus topic,
reload persistence, scheduling, completion, and responsive overflow. The full
browser audit covers navigation, study flows, theme/layout behavior, and recovery.

Local tests do not establish that real Google consent, account sync, private Drive
transfers, production OAuth origin settings, or deployed Functions work. Those
require an authorized real-account check. No production changes are published by
this work.
