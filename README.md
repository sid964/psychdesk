# PsychDesk Studio 4 — Psychology Study Workspace

A mobile-friendly Progressive Web App for psychology study planning, notes, flashcards, focus sessions, and progress tracking.


## Studio 4 interface upgrade (31 October 2026)
- Responsive, spacious desktop dashboard with a persistent left navigation rail; Android retains compact bottom tabs.
- Softer motion: staggered card entrances, navigation transitions, tactile controls, animated Gemini state and refined modal interactions.
- Subjects now include **Explore resources** linking to subject-specific OpenStax Psychology 2e chapters and verified MIT OpenCourseWare lecture videos. You can add custom HTTP(S) study links while editing subjects; those link records are included in Firestore account sync.
- **Gemini studio is inside the PsychDesk website**, including conversation-style replies, guided study prompts, selectable notes, summaries, quizzes, and flashcard creation. The previous ChatGPT handoff was removed.
- Gemini currently requires you to enter your own Gemini API key into the app’s Settings during the browser session. It is not stored in GitHub, Firestore, or local backups. For stronger security before broader use, migrate to **Firebase AI Logic + App Check**; the current browser-key option is for personal testing, not a production-grade secret-management system.
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
- The Gemini prototype requests an API key in the browser session. **Do not paste personal/client records into it, do not commit a Gemini API key to this public repository, and do not treat the current Gemini integration as production-secure.** A safer production implementation would use Firebase AI Logic plus App Check, or an authenticated backend.
- The Firebase Web API key in `firebase-config.js` is public application configuration and not a Google service-account secret. Do not upload private keys, OAuth client secrets, access tokens, personal notes, or JSON study exports into this public repository.
- The account data is not end-to-end encrypted; it is protected by Firebase Authentication and Firestore security rules.
- This project has not yet been tested with a live signed-in Firebase session. Google sign-in and Firestore sync need the one-time Firebase setup above.

## App features

- Editable subjects, tasks, scheduled sessions, study goals, and progress dashboard
- Notes organized by subjects, searchable notes
- Flashcards and review scheduling
- Focus timer
- Google account cloud sync with conflict detection
- Optional Drive manual backups and Gemini via Firebase AI Logic + App Check

No GitHub repository content should contain identifiable counselling client information.


## Firebase AI Logic + App Check setup (Gemini inside PsychDesk)

**Status:** Code integrated. Gemini stays disabled until the public Web reCAPTCHA Enterprise site key is configured and the AI Logic console wizard is completed. The browser no longer asks for or sends a Gemini API key.

1. [Firebase AI Logic — Psystudy](https://console.firebase.google.com/project/psystudy-e4854/ailogic) → Get started → choose **Gemini Developer API**. Finish the guided API setup. The wizard may automatically enforce App Check for AI Logic.
2. [Google Cloud reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha?project=psystudy-e4854) (sometimes under Fraud Defense) → Create key → **Website / Web** → **score-based**, not a checkbox challenge. Allowed domain: **sid964.github.io** (no https:// or /psychdesk). Do not add localhost to a production key.
3. [Firebase App Check](https://console.firebase.google.com/project/psystudy-e4854/appcheck) → **Apps** → register existing Web app **Study plan site**, with **reCAPTCHA Enterprise** and the same public site key.
4. In **app-check-config.js**, replace the empty string in `window.PSYCHDESK_APP_CHECK_SITE_KEY = "";` with the public **site key** (not an API secret), and commit that one file. The public site key is safe for a browser; Gemini API keys, service account secrets, and reCAPTCHA secret keys are not.
5. In Firebase App Check → **APIs**, verify Firebase **AI Logic** is **Enforced**. Do not enable enforcement for Authentication or Firestore during this initial AI setup unless those services have also been tested with valid App Check tokens.
6. Reload PsychDesk in Chrome, sign in with Google, open **Gemini** and try a harmless question such as “Explain classical conditioning.” Confirm a response appears **inside PsychDesk**. Do not enter identifiable counselling-client information.

Note: App Check confirms requests originate from an approved application; it is not a per-person access control. The client also requires Google sign-in for Gemini, but a strict single-user AI allowance would require additional server-side authorization. Gemini API use is billed/limited separately from Google AI Pro.

On November 2, 2026, App Check enforcement becomes mandatory for Firebase AI Logic. Check Google's Firebase AI Logic documentation for subsequent updates.

Relevant docs:
- https://firebase.google.com/docs/ai-logic/get-started?platform=web
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://firebase.google.com/docs/ai-logic/app-check

