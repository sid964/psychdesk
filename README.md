# PsychDesk Studio 4 — Psychology Study Workspace

A mobile-friendly Progressive Web App for psychology study planning, notes, flashcards, focus sessions, and progress tracking.


## Studio 4 interface upgrade (31 October 2026)
- Responsive, spacious desktop dashboard with a persistent left navigation rail; Android retains compact bottom tabs.
- Softer motion: staggered card entrances, navigation transitions, tactile controls, animated Gemini state and refined modal interactions.
- Subjects now include **Explore resources** linking to subject-specific OpenStax Psychology 2e chapters and verified MIT OpenCourseWare lecture videos. You can add custom HTTP(S) study links while editing subjects; those link records are included in Firestore account sync.
- **Gemini studio is inside the PsychDesk website**, including conversation-style replies, guided study prompts, selectable notes, summaries, quizzes, and flashcard creation. The previous ChatGPT handoff was removed.
- Gemini uses **Firebase AI Logic + App Check**. No Gemini Developer API key is entered, stored or sent by PsychDesk. Public Firebase and reCAPTCHA site configuration ship with the website.
- Existing Google Sign-In, Cloud Firestore sync, user data format, local-first storage, and manual Drive backups are unchanged. The latest design is loaded by `studio-v4.css`.
- External educational sites open in a separate tab, **but Gemini conversations never redirect away from PsychDesk**.
- Academic references linked in the app are independent resources; their textbook content is not automatically imported into Gemini.

## Site and deployment

Live GitHub Pages site: **https://sid964.github.io/psychdesk/**.

The site uses `index.html`, `app.js`, `cloud.js`, `firebase-sync.js`, `firebase-config.js`, `style.css`, `studio-v4.css`, `sw.js`, `manifest.webmanifest`, and `icons/`.

### One-time GitHub Pages setup

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose branch **main** and folder **/(root)**. Tap **Save**.
4. Visit the site URL above when GitHub Pages finishes publishing.

> Publishing the website does not automatically turn on Google login and Firestore.

### One-time Firebase setup

Existing Firebase project: **psystudy-e4854**. The public Firebase Web SDK identifiers are already configured in `firebase-config.js`.

1. [Firebase Authentication](https://console.firebase.google.com/project/psystudy-e4854/authentication/providers) → **Sign-in method** → **Google** → Enable (select support email).
2. Authentication → **Settings → Authorized domains** → add **sid964.github.io** (the *domain*, without https:// or /psychdesk).
3. [Firestore Database](https://console.firebase.google.com/project/psystudy-e4854/firestore) → **Create database** in production mode if one does not already exist.
4. Publish the contents of [firestore.rules](./firestore.rules) in Firestore Database → **Rules**. These rules limit `users/{uid}/psychdesk/state` to that signed-in account and deny other reads/writes.
5. Open PsychDesk site in Android Chrome, tap **Sign in**, and verify the badge reads **✓ Synced** after a change. Check your progress on a second device before removing old backups.

## Data and safety

- Study data is stored locally while offline; signed-in progress is synchronized to per-user Firestore records when connected. Simultaneous conflicting changes require manual resolution.
- Google Drive backup is optional and separate from Google sign-in. It needs an OAuth Web Client ID, Google Drive API access, and separate user consent.
- Gemini uses Firebase AI Logic and App Check. Never add a Gemini Developer API key, OAuth client secret, reCAPTCHA secret or service account private key to website files, browser settings, Firestore or backups. Legacy unsupported fields in `psychdesk-cloud-v2` are removed when this build loads.
- The Firebase Web API key in `firebase-config.js` is public application configuration and not a Google service-account secret. Do not upload private keys, OAuth client secrets, access tokens, personal notes, or JSON study exports into this public repository.
- The account data is not end-to-end encrypted; it is protected by Firebase Authentication and Firestore security rules.
- Automated regression tests cover public-setting persistence and account changes with mocked Google/Firebase services. Live Google sign-in, Drive consent and Gemini responses still require validation against the configured Google project.

## App features

- Editable subjects, tasks, scheduled sessions, study goals, and progress dashboard
- Notes organized by subjects, searchable notes
- Flashcards and review scheduling
- Focus timer
- Google account cloud sync with conflict detection
- Optional Drive manual backups and Gemini via Firebase AI Logic + App Check

No GitHub repository content should contain identifiable counselling client information.


## Firebase AI Logic + App Check setup (Gemini inside PsychDesk)

**Status:** Firebase public configuration and the public reCAPTCHA Enterprise site key are already committed. The browser does not ask for a Gemini API key. Console registration, AI Logic availability and enforcement remain Google-project settings.

1. [Firebase AI Logic — Psystudy](https://console.firebase.google.com/project/psystudy-e4854/ailogic) → Get started → choose **Gemini Developer API**. Finish the guided API setup. The wizard may automatically enforce App Check for AI Logic.
2. [Google Cloud reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha?project=psystudy-e4854) (sometimes under Fraud Defense) → Create key → **Website / Web** → **score-based**, not a checkbox challenge. Allowed domain: **sid964.github.io** (no https:// or /psychdesk). Do not add localhost to a production key.
3. [Firebase App Check](https://console.firebase.google.com/project/psystudy-e4854/appcheck) → **Apps** → register existing Web app **Study plan site**, with **reCAPTCHA Enterprise** and the same public site key.
4. **app-check-config.js** already contains the public **site key** for this deployment. Only change it when changing the registered Web key. The site key is public; Gemini API keys, service account secrets, and reCAPTCHA secret keys are not.
5. In Firebase App Check → **APIs**, verify Firebase **AI Logic** is **Enforced**. Do not enable enforcement for Authentication or Firestore during this initial AI setup unless those services have also been tested with valid App Check tokens.
6. Reload PsychDesk in Chrome, sign in with Google, open **Gemini** and try a harmless question such as “Explain classical conditioning.” Confirm a response appears **inside PsychDesk**. Do not enter identifiable counselling-client information.

Note: App Check confirms requests originate from an approved application; it is not a per-person access control. The client also requires Google sign-in for Gemini, but a strict single-user AI allowance would require additional server-side authorization. Gemini API use is billed/limited separately from Google AI Pro.

Check Google's current Firebase AI Logic documentation for enforcement requirements.

Relevant docs:
- https://firebase.google.com/docs/ai-logic/get-started?platform=web
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://firebase.google.com/docs/ai-logic/app-check


## Settings, sessions and sign-out

| Item | Sign out of PsychDesk | Reload or reopen this browser | Another device |
| --- | --- | --- | --- |
| Firebase public Web config | Remains in `firebase-config.js` | Loaded from the website/cache | Same website config |
| App Check public site key | Remains in `app-check-config.js` | SDK obtains/refreshes attestation as needed | Same public site key; new attestation |
| Drive OAuth Web Client ID | Remains in browser settings | Remains unless site storage is cleared | Follows the same signed-in account after Firestore sync |
| Drive access token | Cleared from this tab on Firebase account change | Lost on reload; reconnect Drive | Connect Drive separately |
| Gemini developer credentials | None entered or stored by PsychDesk | No key to re-enter | No key to copy |
| Gemini model choice | Remains in browser settings | Remains in this browser | Browser-local preference |
| Gemini chat | Cleared on account change | Memory-only; lost on reload | Not synchronized |
| Study work and public Drive ID | Account data remains in Firestore and the local account cache | Cached locally; synchronized after login | Only successfully synced work is available |

The public Drive ID is saved in `psychdesk-cloud-v2` and, while signed in, in `preferences.driveClientId` within the existing per-user Firestore study record. Existing browser-only IDs migrate on the next successful account load. Wait for **✓ Synced** before changing devices. A blank saved ID clears the account setting. Imports and Drive restores preserve this public setting and allow only known preference fields. Public setup is configuration, not permission to access Drive.

Drive uses Google Identity Services with `drive.file` and keeps access tokens only in JavaScript memory. Reconnect after reload, PsychDesk sign-out, expiry or revocation. Previously granted consent can be reused; Google may still show an account chooser or consent dialog. Disconnect explicitly revokes the current Drive grant; ordinary PsychDesk sign-out drops local authority without revoking the Google grant. Changing the public ID invalidates the current Drive connection. Pending OAuth callbacks and AI/Drive replies cannot restore an old session after an account change.

Firebase Authentication manages its own persisted login state through the SDK. On this web app it normally survives closing the browser until explicit sign-out, subject to browser privacy/storage settings. This is separate from the memory-only Drive token. Signing out on a Google website alone does not reliably sign out of PsychDesk; use **Account → Sign out of PsychDesk**. Account sign-out switches to the guest planner; it does not erase locally cached account study data or unsynced work. Only synced changes are on other devices.

## Fixing `Error 400: origin_mismatch`

This error is a Google OAuth console configuration issue and cannot be repaired by changing browser storage or a GitHub file.

1. Open [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients?project=psystudy-e4854) (or APIs & Services → Credentials).
2. Open the **Web application** OAuth client whose **Client ID exactly matches** the one saved in PsychDesk → AI & Drive. If the client belongs to a different Google project, select that project.
3. Under **Authorized JavaScript origins**, add **`https://sid964.github.io`**. Do not include `/psychdesk`, a trailing slash, a query or a wildcard. Save.
4. Return to [PsychDesk](https://sid964.github.io/psychdesk/) and reconnect Drive after the console change takes effect.

Firebase Google login uses its Firebase-managed OAuth client, separate from the optional Drive client. If the error occurs during Firebase login, inspect that client instead. Firebase Authentication must also list `sid964.github.io` in Authorized domains; this domain list does not replace the OAuth JavaScript-origin setting. Do not change redirect URIs for an `origin_mismatch` error. See [Google OAuth errors](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#origin-mismatch), [Drive token lifecycle](https://developers.google.com/identity/oauth2/web/guides/use-token-model), and [Firebase login persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence).

## Regression checks

Run `node --test tests/*.test.mjs` with Node.js 24. No real credentials or Google API calls are needed. The tests exercise the application scripts with isolated browser storage and controlled SDK responses. GitHub Actions runs them for pushes and pull requests.
