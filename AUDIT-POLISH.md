# PsychDesk reliability and interface polish

This follow-up audit builds on the earlier data-recovery work. It retains the existing application, Google account/Drive setup, AMOLED theme, and study records.

## Corrected behavior

| Area | Problem | Result |
| --- | --- | --- |
| Notebook deletion | Closing a deleted note ran its autosave and recreated it | Successful deletion suppresses that editor's final autosave and clears its draft |
| Planner, subjects, flashcards, review ratings, goals and focus logs | A failed storage write could dismiss the form, advance the queue or claim success | Mutations roll back; inputs and the current session remain available |
| Sticky notes, references, dictionary, timeline, shared capture and annotations | Several copy, bookmark, edit and delete actions did not handle storage failure | Failed actions retain the original collection and avoid success messages |
| Focus timer | Firebase account restoration reset the countdown, and Finish remained disabled after starting | Each account has its own recoverable timer; Finish updates during the session |
| Old timer migration | Existing countdowns used one shared storage key | The existing timer migrates once to the workspace that owned it |
| Cloud initialization/reload | A delayed server response could overwrite edits made during the request | New edits are preserved and the account asks the user to resolve the versions |
| Local recovery | Denied localStorage access could crash before recovery initialized | The app loads a visible recovery state |
| Backup/cloud input | Invalid individual rows could enter collections and crash renderers | Structural validation rejects malformed records before replacing the workspace |
| Note history | Valid JSON with the wrong shape could break autosave | Invalid history collections are ignored safely |
| PDF/Markdown reader | Old document loads/searches could complete after a different book or account was selected | Request generations isolate documents; stale results are discarded and old documents released |
| Dictionary import | Quoted multiline CSV fields were split into unrelated rows; invalid headers could silently skip everything | CSV record boundaries respect quotes, escaped quotes and line breaks; invalid headers report an error |
| Study boards and mind maps | Percentage positions clipped real cards on narrow screens; edges used hard-coded centers | Positions are bounded by actual card size; edges follow rendered centers; failed/cancelled drags restore positions |
| Dialogs | Hidden ID fields received initial focus; keyboard navigation escaped into the page | Visible initial focus, label associations, focus containment, inert background and scroll locking |
| Notebook feedback | Closing a saved note or quick capture left an outdated list on screen | The visible notebook refreshes immediately |
| AMOLED/navigation | A pseudo-element selector left green metric accents; A–Z wrapped in the sidebar | Explicit neutral accents, stable icon sizing and a consistent desktop action cluster |
| Initial view | Closing a nonexistent dialog could focus/scroll the page during auth restoration | Focus returns only when a real dialog was open |
| Handwriting input | Canvas handlers attached a frame late, and tool changes/erasing replaced the editor | Input attaches immediately; tool selection and erase retain the mounted canvas and its scroll state |

## Validation

- 119 Node tests pass locally, including 16 additional behavior regressions.
- The complete Node suite and syntax checks run in GitHub Actions for every push and pull request.
- The browser workflow runs Chromium and Firefox at 320, 360, 390, 768, 1024 and 1440 CSS pixels. It navigates all primary areas, exercises real study CRUD, failed writes, notebook deletion, keyboard dialogs, timer refresh/recovery, handwriting undo/redo/erase, and corruption recovery.
- Populated boards are checked against their visible bounds. Browser runtime errors, header overlap, unwanted initial scrolling, wrong AMOLED metric accents, and document-wide horizontal overflow fail the audit.
- GitHub Actions preserves screenshots and JSON reports. The read-only live pass uses a fresh test profile and does not touch a signed-in user's records.
- Review the final results on [pull request #15](https://github.com/sid964/psychdesk/pull/15) and the [browser workflow](https://github.com/sid964/psychdesk/actions/workflows/browser-audit.yml).

The development environment's interactive browser could not start. Browser verification therefore runs in the repository's CI runners; their screenshots are inspected separately.

## Boundaries

Automated browser tests do not prove real Google consent, production Firestore permissions/App Check, authenticated Drive uploads, physical stylus pressure, or Android background eviction. The existing optional persistent Drive backend is still disabled; this audit does not claim permanent browser OAuth tokens. It does not alter credentials, private data, or backend billing. Third-party reference and PDF services still depend on the user's network.

No finite audit can establish zero defects across all devices and third-party services. This report describes the implemented fixes and reproducible checks.
