# PsychDesk — Psychology Study Planner

A mobile-friendly Progressive Web App for psychology study planning, notes, flashcards, focus sessions, and progress tracking.

## Site and deployment

GitHub Pages project site: **https://sid964.github.io/psychdesk/** (available **after** enabling Pages).

The actual app is in `index.html`, `app.js`, `cloud.js`, `firebase-sync.js`, `firebase-config.js`, `style.css`, `sw.js`, `manifest.webmanifest`, and `icons/`.

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
- Optional Drive manual backups and Gemini experimental study tools

No GitHub repository content should contain identifiable counselling client information.
