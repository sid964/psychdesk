# PsychDesk — subject study library

Live site: https://sid964.github.io/psychdesk/

Subjects, notes, flashcards, focus sessions, Google-account sync, private Drive books, and persistent light/dark themes.

## Study suite (October 2026)

The desktop sidebar provides separate sections for **Book Reader, Research Shelf, Study Board, Mind Maps, Voice Notes and Universal Search**. Android uses a compact bottom bar; open **Tools** for additional sections.

- **PDF and Markdown reading:** Open a book from the Subject Library or select a local PDF. Google Drive books require a valid Drive grant. The browser loads PDF.js 4.10.38 from a public CDN while reading; PDF contents are requested from Drive only for the signed-in user. The built-in reader supports files up to 80 MB; originals can be larger and remain in Drive. Select text on a PDF to save an on-page highlight, create a sticky note, or add a notebook excerpt. Definition-formatted passages can become flashcards. Scanned, image-only pages require external OCR to yield selectable text.
- **Study search:** Ctrl/Cmd + K finds notebook notes, stickies, flashcards, tasks, library metadata, saved PDF highlights and research references. This is metadata/stored-text search; it does not build a searchable index of every uploaded textbook page.
- **Smart recall:** The existing four-rating spaced repetition remains in place. Paste `Term: definition` lines or select a saved note/sticky to generate reviewable, local flashcards; no AI calls or guessed facts.
- **Reference Manager:** The upgraded Research Shelf now supports editable source metadata, DOI lookup, duplicate-safe RIS/BibTeX import and export, and APA-style draft citations.
- **Study Board and Mind Maps:** Drag cards and concept nodes, connect related theories, and keep the layouts inside account-synced study data. The board can pin existing handwritten sticky notes.
- **Voice Notes:** The browser's Web Speech recognition (when available) turns speech into an editable transcript. Speech processing may require internet and use the browser's provider. PsychDesk does not persist raw microphone audio. Review and save transcripts to the Notebook.
- **Focus and analytics:** Optional browser-generated rain/brown noise, a session intention, fullscreen focus, a 12-week activity heatmap, subject study totals and aggregate self-ratings. Figures reflect logged sessions and reviews only.
- **Desktop shortcuts:** Ctrl/Cmd + K for search; Ctrl/Cmd + Alt + N for a new note; Alt + 1–8 for common sections.
- **Android quick capture:** Install PsychDesk as a PWA using Chrome's Add to Home Screen / Install. When supported, the Android Share menu can then send text and links to PsychDesk. A confirmation screen lets the user save to Notebook or Stickies. Other browsers and the separate Android WebView are not guaranteed to support Web Share Target.

New structured data fields: `research`, `boardItems`, `mindMaps` and `pdfHighlights`; all are included in existing local backups and account Firestore snapshots. The 750 KB safe-limit for Firestore snapshots still applies; books themselves remain in Drive. External content and private credentials must never be placed in the public GitHub repository.

The Smart Timetable, Exam Simulator, Offline Study feature and Gemini Study Tutor were deliberately **not** added.

## Simple note capture (November 2026)

Use the **+ Note** button in the top bar from anywhere. Type or paste your thoughts into one writing box. Select **Save to Notebook** or **Make a Sticky**. A title and subject are optional: a title is generated from your first line. Unfinished text stays as a draft in the current tab until saved. No AI, APIs, or additional setup are required. The existing full Notebook editor remains available for longer study notes.

On desktop the sidebar highlights everyday study sections and the three reference tools; advanced extras are grouped under **More study tools**. Android already has a **Tools** button.

## Psychology Dictionary, Reference Manager and History Timeline (November 2026)

These features are available as dedicated desktop sidebar sections and under **Tools** on mobile.

**Psychology Dictionary**
- 64 concise, topic-filtered glossary entries with linked related concepts and reading sources. Built-in definitions live in `psychology-data.js`, not in the user's cloud data.
- Search, bookmark, add/edit/delete personal terms, and turn definitions into ordinary notebook notes, handwritten sticky notes or flashcards.
- Personal entries and bookmarks are saved with the currently selected PsychDesk account; the reference content remains shared across accounts and is not diagnostic advice.

**Psychology Timeline**
- 34 selected milestones spanning 1859–2022, with filters, researchers, a reading-source link and explanations.
- Add and edit personal milestones, bookmark events, and save your own short reflections. Events can be converted into notebook notes or flashcards.
- Dates and interpretations are based on publicly available historical and educational resources; this curated selection is not a complete global history. Starting dates for schools of thought are approximate.

**Reference Manager**
- Upgrades the existing `research` collection in place; old references are displayed without destructive migration.
- Enter or edit journal articles, books, book chapters, conference contributions, theses, reports, and online pages, including journal, volume, issue, pages, DOI, URL, keywords and notes.
- Look up metadata from Crossref when online; always review imported publication data.
- Import **RIS** and **BibTeX** via a confirmation preview. Existing DOI or normalized title/year matches are skipped; imports are capped at 1 MB, 250 parsed entries and the existing Firestore safety limit. Export all references to RIS or BibTeX for Zotero and similar apps.
- Copy an **APA-style citation draft** for review. This is not a fully certified APA 7 implementation: verify capitalization, author formatting, edition and publisher details. Interchange formats do not transfer PDF attachments or app collections.

**Sync and privacy:** the only new account fields are `dictionaryEntries`, `dictionaryBookmarks`, `timelineEvents`, `timelineBookmarks`, and `timelineAnnotations`. They are optional arrays and migrate non-destructively with old JSON backups and Firebase snapshots. Nothing changes the existing Drive OAuth configuration or uploads books automatically.

The four deliberately excluded features remain unimplemented: Smart Timetable, Exam Simulator, Offline Study, and Gemini Study Tutor.

## Departments

Biological Psychology & Biopsychology; Cognitive Psychology; Social Psychology; Counseling & Psychotherapy; Tests, Measurement & Research Methods; Abnormal Psychology & Psychopathology; Psychiatry; DSM & ICD Classification; General Psychology.

The first account load adds missing departments without deleting existing courses or work. This migration runs once per dataset; subsequent user edits are preserved.

## Books, notes and saving

Use **Study materials** on a subject or the **Library** navigation item. Each department contains books/PDFs, Markdown files, subject notes and study links.

- PDF and Markdown files up to **512 MB** upload directly to private Google Drive folders: **PsychDesk / Study Materials / Subject name [ID]**.
- Uploads use the resumable protocol with **8 MiB chunks**. Retry the same selected file after interruption; the app asks Drive for the confirmed offset. Keep the tab open.
- Upload session URLs remain memory-only. Interrupted uploads may require selecting the file again. A verified, short-lived Drive access token may be held in this browser tab's sessionStorage to survive refreshes, scoped to the signed-in Google account; it expires and is removed on sign-out. Cancel stops the transfer and disconnects local Drive access.
- Notes and catalogue metadata sync through the existing account Firestore record. Wait for **✓ Synced** before changing devices.
- Backups include the catalogue and notes, **not book binaries**. Keep originals in Drive or another backup. The 750 KB Firestore workspace safeguard remains; upload large Markdown books as files instead of pasting them into notes.
- Add existing Drive or web links without changing their sharing permissions. Open private Drive files with the account that owns or can access them.
- Removing a catalogue entry leaves its original file in Drive. Subject deletion is blocked while associated study work/materials remain.
- No books are bundled or automatically downloaded. Choose your own local files to upload.

## Google setup

Public Firebase configuration is in firebase-config.js. Enable Google Authentication, authorize **sid964.github.io**, and publish firestore.rules in project **psystudy-e4854**.

Drive permission is separate from Firebase login:
1. Enable Google Drive API in the OAuth client's project.
2. Configure a Web application OAuth client and consent-screen/test-user settings.
3. Add **https://sid964.github.io** under **Authorized JavaScript origins**, without a path or trailing slash.
4. PsychDesk's public Drive OAuth Client ID is preconfigured centrally. Google sign-in requests the limited Drive permission; if the token expires, use **Reconnect Google Drive** in Settings.

An origin_mismatch error requires correcting that exact client in Google Cloud. Firebase's authorized-domain list is separate. The app requests only **drive.file** permission. Public Client IDs persist locally and follow account sync. No Drive access token or upload URL is saved in localStorage, Firestore or study backups. Verified short-lived tokens may stay in sessionStorage within the same browser tab until expiry; closing a tab, signing out, changing accounts, or token expiry can require a fresh Google authorization. Firebase SDK manages its separate persisted sign-in.

Gemini, Firebase AI Logic and reCAPTCHA App Check integration are removed from the website. Previously saved notes remain ordinary notes. Google Cloud products and billing settings are unchanged.

## Dark mode

The sun/moon button remembers the choice in this browser. The default is a pure-black AMOLED theme, and users can switch to light mode. Theme applies before body rendering and synchronizes across tabs.

## Deployment and validation

GitHub Pages publishes the root of main. Refresh after deployment. The new service-worker cache includes the library and theme assets, removes older PsychDesk caches and does not cache Google API responses.

Run **node --test tests/*.test.mjs** with Node.js 24. Tests cover persistent public setup, account isolation, subject migration, material restore, chunked uploads, interrupted-upload recovery, file validation, unsafe-link rejection, dark mode and removal of AI entry points. Google services are mocked; live consent and transfers depend on the configured project and network.

Never commit private keys, tokens, study exports or confidential client records to this public repository.
