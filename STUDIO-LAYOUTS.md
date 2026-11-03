# Interactive study layouts

The existing palette, fonts, navigation and account data are retained. These are
layout and interaction changes, rather than a new theme or points system.

| Section | Change |
| --- | --- |
| Study desk | Rotate the existing course question with “Another question”. |
| University preparation | Optional practice prompts for answer writing and revisiting difficult topics. |
| Overall psychology | Explanation and comparison prompts to use with existing tools. |
| Planner | Small, optional prompts for making a realistic study plan. |
| Notebook | Writing sparks alongside the writing-first notebook workflow. |
| Ink Notes | Optional page metadata and export controls; drawing tools stay visible. |
| Sticky notes | Write first; title and subject come later. Color choices and live preview remain. |
| Flashcards | Review first; deck management and card generation are expandable. |
| Focus | Session intention and optional sounds move beside the timer rather than below the activity log. |
| Subject library | Upload and file-management explanations become expandable. Books and notes stay accessible. |
| Book reader | Optional reading experiments such as explaining a paragraph before rereading. |
| Reference manager | Search stays visible; filter/sort and collection counts are optional. |
| Dictionary | “Surprise me” opens a real concept, with prompts to guess and compare. |
| Timeline | Discover a real milestone without having to choose a year first. |
| Search | A horizontally scrollable category strip reduces wrapping on small screens. |
| Voice notes | Transcript first; title and subject are optional. Microphone/privacy information remains visible. |
| Study board | A proper multiline idea editor replaces browser prompts. |
| Mind maps | In-page forms for map names, new concepts and renaming. |
| Tools | Jump directly to a group by purpose. |
| Insights | Optional numbers and a direct next-step link to planning. |

Practice prompts are fixed suggestions, not AI-generated lessons or assessed
answers. They do not mark work complete or invent progress. Collection discovery
uses the existing dictionary and timeline entries. Prompt rotation and exploration
do not write to account data. Existing note, ink, review, upload and backup formats
are unchanged.

Board/map editors retain text after a failed save and reject saving into a changed
workspace. Retry callbacks re-resolve the current record after rollback. Deletion
confirmations remain separate from creating or editing ideas.

## Checks

The existing Node suite and full local browser audit cover persistence, study flows,
responsive navigation and recovery. Additional checks use the local server on 8765
and the external Playwright/axe tool installation:

```
NODE_PATH=/workspace/psychdesk-tools/node_modules CHROMIUM_PATH=/usr/bin/chromium node tests/studio-interaction-browser.cjs
NODE_PATH=/workspace/psychdesk-tools/node_modules CHROMIUM_PATH=/usr/bin/chromium node tests/studio-expanded-browser.cjs
```

The interaction check visits all 20 sections at four widths. It checks prompt
rotation, collection discovery without data changes, field visibility, and real
storage-failure/retry behavior for board and map creation. The expanded-controls
check covers seven affected sections in both themes. The existing accessibility
check separately covers 20 screens in both themes. Automated accessibility checks
are bounded by their rendered states and do not establish complete WCAG compliance.

Live Google consent, Firestore sync, private Drive transfers, and production
Functions authorization require separate real-account checks. No private study
records are accessed by these local checks.
