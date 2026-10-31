# PsychDesk — subject study library

Live site: https://sid964.github.io/psychdesk/

Subjects, notes, flashcards, focus sessions, Google-account sync, private Drive books, and persistent light/dark themes.

## Departments

Biological Psychology & Biopsychology; Cognitive Psychology; Social Psychology; Counseling & Psychotherapy; Tests, Measurement & Research Methods; Abnormal Psychology & Psychopathology; Psychiatry; DSM & ICD Classification; General Psychology.

The first account load adds missing departments without deleting existing courses or work. This migration runs once per dataset; subsequent user edits are preserved.

## Books, notes and saving

Use **Study materials** on a subject or the **Library** navigation item. Each department contains books/PDFs, Markdown files, subject notes and study links.

- PDF and Markdown files up to **512 MB** upload directly to private Google Drive folders: **PsychDesk / Study Materials / Subject name [ID]**.
- Uploads use the resumable protocol with **8 MiB chunks**. Retry the same selected file after interruption; the app asks Drive for the confirmed offset. Keep the tab open.
- Upload session URLs and tokens are memory-only. Reload, sign-out or reconnect discards the session; select the file again. Cancel stops the transfer and disconnects local Drive access.
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
4. Save the public Client ID in Settings → Google Drive & files, then select **Connect / reconnect Drive**.

An origin_mismatch error requires correcting that exact client in Google Cloud. Firebase's authorized-domain list is separate. The app requests only **drive.file** permission. Public Client IDs persist locally and follow account sync. Tokens and upload URLs never go into browser settings, Firestore or backups. Reconnect after reload, logout or expiry; Firebase SDK separately manages its own persisted login state.

Gemini, Firebase AI Logic and reCAPTCHA App Check integration are removed from the website. Previously saved notes remain ordinary notes. Google Cloud products and billing settings are unchanged.

## Dark mode

The sun/moon button remembers the choice in this browser. Before the first explicit choice, the site follows the device preference. Theme applies before body rendering and synchronizes across tabs.

## Deployment and validation

GitHub Pages publishes the root of main. Refresh after deployment. The new service-worker cache includes the library and theme assets, removes older PsychDesk caches and does not cache Google API responses.

Run **node --test tests/*.test.mjs** with Node.js 24. Tests cover persistent public setup, account isolation, subject migration, material restore, chunked uploads, interrupted-upload recovery, file validation, unsafe-link rejection, dark mode and removal of AI entry points. Google services are mocked; live consent and transfers depend on the configured project and network.

Never commit private keys, tokens, study exports or confidential client records to this public repository.
