# PsychDesk — subject study library

## Ink Notes — stylus handwriting and planner redesign (November 2026)

A dedicated **Ink Notes** workspace is available in the desktop sidebar and mobile bottom navigation. Sticky Notes remain accessible from **Tools** and the existing notebook.

- **Handwriting:** use an ASUS Pen, any browser-recognized pen, a mouse, or optionally a finger. Pointer Events detect pen input and pressure where supported, and coalesced events help render smooth strokes. Pen-first mode is on by default to ignore accidental finger and palm touches. Stylus pressure accuracy and any hardware side-button action depend on device drivers and browser support.
- **Tools:** pressure-sensitive pen, translucent highlighter, per-stroke eraser, undo/redo, and ink colors. The scrollable lined canvas uses a consistent coordinate system, so handwriting can be reopened on different screen sizes. Pen drawings are stored as editable vectors rather than raster screenshots.
- **Data:** handwritten pages use the optional `inkNotes` array in existing local account data and Firestore snapshots. No new login, Firebase product, paid backend, storage bucket, or Google Drive permission is required. Pages include subject, title, timestamps, and strokes; older backups without ink remain valid. No handwritten content is uploaded to a separate third-party AI service.
- **Storage safeguards:** each page is capped at 170 KB of encoded vector JSON, with a 685 KB maximum total local study snapshot. This is intentionally lower than the existing 750 KB Firestore sync limit, leaving some room for other study data; existing notes can still use more space and cause sync to pause. If a page reaches the cap, the final stroke is rejected with a warning; export it and start another page. Ink is not an unlimited, image-heavy cloud notebook. This limit is reviewed during note creation, stroke storage, and metadata edits.
- **Export:** SVG retains vector pen geometry and approximate pressure width, PNG produces a lined snapshot. Export files are saved via browser downloads; they are not automatically uploaded to Google Drive.
- **Design:** phone-sized study-planner subjects now use one comfortable column instead of cramped two-column cards, with no giant decorative psi watermark and consistent monochrome action buttons. Desktop keeps a multi-column layout. The excessive full-height selected mobile navigation background is removed without changing which sections are available.
- **Testing:** `tests/ink-notes.test.cjs` validates SVG escaping, eraser targeting and save limits. The existing persistence suite covers account and backup restore, and the Chromium browser audit tests new handwriting and planner layouts. The automation does not emulate actual ASUS Pen hardware.


## November 2026 functional and responsive audit

A repeatable Chromium browser audit is included at `tests/browser-audit.cjs`, executed by `.github/workflows/browser-audit.yml`. It checks the real GitHub Pages site read-only and serves the PR branch locally for interactive smoke tests at 320, 360, 390, 768 and 1440 px. Reports and viewport screenshots are available as GitHub Actions artifacts. Browsing the live site does not sign in or alter anyone's saved study data.

Audit improvements:
- Mobile topbar controls now stay in a compact row on narrow displays; notebook actions fit without awkward word wrapping, with readable light-theme quick notes and neutral AMOLED accents.
- All pending editor changes flush to existing notes when a note modal closes, not just on the 1.4-second debounce, with a browser test proving immediate close preserves new writing.
- Firebase Google sign-in skips redundant `drive.file` token consent when optional persistent backend authorization is active. A periodic or online backend-restore event no longer resets already-connected Drive access and interrupts ongoing transfers.
- The study-tools dictionary description no longer claims just 64 entries.

Limitations: This audit cannot validate account-specific Drive consent, Firebase project settings, API billing, real private book transfers, or all external publication lookups without owner authorization. On the Spark plan, Drive access is still short-lived; server-managed refresh tokens remain gated behind secure backend deployment. No code change can make browser-only Google OAuth permission permanent.


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

## Persistent Google Drive sign-in — optional Firebase backend

**Status:** The backend source is included, but is **disabled until deployed and configured**. Until then, existing short-lived Google Drive sign-in continues to work normally. Never commit a client secret or refresh token to this public GitHub repository.

### How it works

Google's browser-only access tokens expire and cannot renew without a user gesture. PsychDesk's optional Firebase Cloud Function uses Google's authorization-code flow and holds an encrypted refresh token for each verified Google-signed-in Firebase account. After Google grants offline access, the browser can request a new short-lived Drive token using its automatically renewed Firebase ID token. No cross-site cookies or frontend refresh tokens are necessary. The backend checks Firebase Google authentication, verified account email, exact allowed website origin and matching Google Drive identity before storing a grant. Refresh tokens are encrypted with AES-256-GCM, held separately from study data in Firestore, and never exposed to the browser. Disconnect deletes and revokes the server grant.

### Owner deployment checklist (required for persistent sign-in)

1. Confirm your Firebase project **psystudy-e4854** allows Cloud Functions deployments (Blaze billing may be required). The backend uses Node 22 and region **asia-south1**.
2. In Google Cloud, locate the OAuth Web Client ID already published in firebase-config.js. Confirm the same Google Cloud project, add **https://sid964.github.io** to Authorized JavaScript origins and enable the Google Drive API. Obtain its client **secret** privately.
3. Install Firebase CLI, sign in as the project owner, and select the project. From the repo root run:
   - npm install -g firebase-tools
   - firebase login
   - firebase use psystudy-e4854
4. Set two private Secret Manager values via CLI, without writing them to source code:
   - firebase functions:secrets:set GOOGLE_DRIVE_CLIENT_SECRET
   - firebase functions:secrets:set DRIVE_TOKEN_KEY
   Generate the second as a random 32-byte key encoded in base64 (for example, use a trusted local execution of openssl rand -base64 32). Do **not** paste either secret into ChatGPT, GitHub, or frontend JavaScript. Rotating the encryption key without re-encrypting stored grants requires users to reconnect.
5. **Deny browser/client reads and writes to Firestore collection psychdeskDriveGrants in your existing Firestore security rules.** Only the Firebase Admin server code should access these documents. Do not overwrite your existing study data rules.
6. Run: firebase deploy --only functions:drive-auth
7. After the function is deployed, in firebase-config.js set the exact public URL:
   window.PSYCHDESK_DRIVE_BACKEND_URL = 'https://asia-south1-psystudy-e4854.cloudfunctions.net/psychdeskDriveAuth';
   Then publish the updated GitHub Pages site. The URL itself is public configuration, not a credential. The client refuses to send Firebase ID tokens to any other backend address.
8. Sign in to PsychDesk and click **Connect Google Drive** once to authorize server-side Drive access. Refresh, close and reopen the site, and test Drive books and backups. The Google consent screen may still be needed if grants are revoked or expired.

**Important Google rule:** OAuth consent screens in External **Testing** mode generally issue seven-day refresh tokens for Google Drive scopes. Move the app to **In production** once Google requirements are met for long-lived authorization. Google's policies can still expire or revoke grants; truly permanent authorization cannot be guaranteed.

The existing hosted GitHub Pages app remains operational without backend setup. Firebase account sync, books, notes, backups and AMOLED styling remain unchanged. No private credentials should enter the public repository. This solution is deliberately staged for secure deployment by the owning Google/Firebase account.

### Tests

- Backend implementation: functions/index.js and functions/lib/oauth.js; tests: functions/tests/oauth.test.cjs.
- Browser bridge: drive-persistence.js; tests: tests/drive-persistence.test.cjs.
- Run node --test functions/tests/oauth.test.cjs tests/drive-persistence.test.cjs for targeted checks, and node --test tests/*.test.mjs for existing persistence checks.


## Connected studying, autosave, academic research and Drive refresh (November 2026)

These are upgrades to the existing PsychDesk workspace; they do **not** modify the study data schema or replace existing saved material.

- **Google Drive refresh recovery:** when Firebase confirms the signed-in Google identity, PsychDesk attempts to restore a still-valid, account-matched short-lived Drive token from sessionStorage for that *same browser tab*. A read-only Drive identity check must succeed before the chip reports connected. Invalid, expired, revoked or mismatched tokens are cleared. Firestore initialization delays or errors no longer block restoration. Tokens never enter localStorage, Firestore or the public repository. Google Identity Services does not permit indefinite silent renewal of expired browser tokens; when Google requires fresh authorization, the Drive chip asks the user to reconnect.
- **Notebook autosave:** the existing full note editor now saves to the same `notes` collection after a short pause (or immediately with Save), including optional titles generated from the note text. An account-scoped device-local crash draft is written during typing, allowing recovery after a sudden refresh. Prior versions are accessible through **Previous versions** in the editor and can be restored; snapshots are bounded to eight versions per note and kept in localStorage only. If local storage is exhausted, the interface warns about unavailable draft protection. Account-synced current notes are unchanged in format. Existing quick notes and other study data retain their previous behavior.
- **Automatic concept connections:** dictionary definitions show links inferred from mentions in your existing notebook notes, reference titles/notes, historical timeline, and mind-map labels. While editing a full note, matching built-in or personal dictionary concepts appear beneath the text. Relationships are based on matching written concepts, not inferred clinical advice or AI-generated claims, and no new account fields or external requests are required.
- **Academic research search:** in the dictionary, type a concept then press **Find research**. PsychDesk requests up to five papers each from Europe PMC (including PubMed-indexed records and MeSH headings when available) and OpenAlex. The results show the source, year, title, authors, a short abstract preview where supplied, and an original paper link. **Save to Reference Manager** adds metadata (not a bulk imported abstract) to your existing `research` collection with duplicate checks. Public APIs may enforce rate limits or block requests; results are not guaranteed and are not themselves psychology glossary definitions. The query goes to those public providers only when the button is pressed. No tokens, study notes, books, or user profiles are sent.
- All four upgrades use the existing light and AMOLED themes and maintain Firebase account separation, Google Drive books, Timeline, and the intentionally excluded Smart Timetable, Exam Simulator, Offline Study feature, and Gemini Study Tutor.

## Psychology Dictionary, Reference Manager and History Timeline (November 2026)

These features are available as dedicated desktop sidebar sections and under **Tools** on mobile.

**Psychology Dictionary**
- **322 built-in, distinct reference entries** (64 original + 258 new original concise summaries), with reading links and topic filters. The data lives in `psychology-data.js` and `psychology-expanded-data.js`, not in user cloud snapshots.
- Search, bookmark, add/edit/delete personal terms, and turn definitions into ordinary notebook notes, handwritten sticky notes or flashcards.
- Personal entries and bookmarks are saved with the currently selected PsychDesk account; the reference content remains shared across accounts and is not diagnostic advice.


**Extended dictionary packs (2026):**
- Import a `.jsonl`, `.ndjson`, or `.csv` collection from the dictionary screen. Required columns/keys: `term` and `definition`; optional: `category`, `example`, `source`. CSV supports single-line quoted values; JSONL supports one JSON object per line.
- Imported entries use an IndexedDB index on term prefixes. Results are capped at 40 visible rows per search; continue typing for more specific terms. Empty searches show the first 40 imported entries as a preview alongside the smaller curated collection.
- The counter is an **actual count of unique imported terms**, not a claimed corpus size. Duplicate normalized terms replace previous imports, and terms already in the built-in collection are excluded from imports. A million-plus real entries could theoretically be indexed when suitable sourced data and device storage are available; **this repository does not yet ship or claim one million psychology terms**.
- Imports are **local to the browser/device**, remain across page refreshes, and do **not** enter Firebase/Firestore/Google Drive backups; that avoids exceeding the 750 KB account-sync limit. Native bookmarks, notes, and flashcards created from imported entries continue to use normal account sync. An imported entry cannot be opened on another device unless that device also imports the corresponding pack.
- Source attribution matters. Do not upload or redistribute proprietary dictionary datasets or textbook definitions without permission. Textbook-aligned packs may be created from user-owned books as newly written summaries; the textbook itself is not copied into the reference database. The supplemental summaries link to OpenStax *Psychology 2e* for further reading and are newly authored, not verbatim dictionary excerpts.
- Large imports depend on browser storage quota and device performance. A partially interrupted import retains completed batches; import the same pack again to resume or refresh entries safely.


**On-demand online dictionary lookup (November 2026)**

- The **same search box** now shows the existing curated/personal results immediately and, after a brief pause, asks Wikipedia for matching public articles. There is **no account setup, API key, hosted backend, bulk download or need to attach a textbook**.
- Each online result shows a short excerpt, a direct source link and an attribution notice. Wikipedia is a general encyclopedia rather than a vetted psychology/clinical dictionary, so check important information against textbooks or primary research.
- Opening an online result offers **Save to dictionary** (local IndexedDB, survives refresh but does not sync as bulk data), **Save as note**, or **Make flashcard** (these use the existing account-data sync). Wikipedia wording must retain attribution to Wikipedia contributors and its CC BY-SA 4.0 license.
- Only the entered search phrase is sent to Wikipedia; the app does not send notebooks, credentials, books, personal entries, or uploaded PDFs. Search requests are debounced, aborted on new queries, capped at eight results, and retried via a button when unavailable. Earlier results are cached in memory briefly to reduce repeated requests.
- Online lookups require internet. Offline/local terminology, bookmarks, Timeline, Reference Manager, Google Drive and Firebase continue working as before. The number of available online results is never represented as one million verified psychology concepts.

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
