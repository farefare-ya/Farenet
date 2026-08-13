# Farenet

Farenet is a real-time messaging web app: private chats, group chats, and everything around them (contacts, blocking, discovery, and moderation). It's built with React, Vite, and Firebase.

## Features

- **Authentication** — email/password sign up and login via Firebase Auth
- **Private messaging** — real-time 1:1 chats
- **Group chats** — create groups, add/kick members, promote structure via admins
- **Group management** — rename group, group photo, wallpaper, pinned announcement
- **Message tools** — reply to a message, delete your own messages, pin a message, typing indicators
- **Attachments** — send images (auto-compressed under 100KB) and GIFs; video attachments are intentionally not supported
- **Contacts** — add/remove people as contacts, independent of any chat
- **Blocking** — block/unblock a user; blocking is enforced on both sides of a conversation
- **Explore** — discover public groups and active users you haven't talked to yet
- **Public groups with optional password** — a group can be made discoverable in Explore, optionally gated by a password
- **Profile** — change display name and profile photo
- **Online status** — presence (`online` / `lastSeen`) tracked while the app is open
- **Terms of Service** — shown as a modal from the login screen

## Tech stack

- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/) — Authentication and Firestore (no Firebase Storage; images are compressed client-side and stored as base64 directly in Firestore documents)

## Project structure

```
src/
  App.tsx                Top-level layout and routing between auth/chat views
  AuthContext.tsx         Firebase Auth state, login/register/logout, presence heartbeat
  firebase.ts              Firebase app initialization
  hooks.ts                  Shared data hooks (live users map, click-outside)
  imageUtils.ts             Client-side image compression
  passwordUtils.ts          SHA-256 hashing for group passwords
  types.ts                  Shared TypeScript types
  utils.ts                  Formatting helpers (dates, times)
  components/
    AuthPage.tsx             Login / register screen
    Sidebar.tsx               Chat list, contacts, Explore, search
    ChatArea.tsx               Message thread, composer, reply/pin/delete
    GroupInfoModal.tsx          Group settings: photo, name, members, wallpaper, password
    UserInfoModal.tsx            1:1 profile view: contact/block actions
    CreateGroupModal.tsx          New group creation flow
    ProfileModal.tsx               Own profile: photo and display name
    PasswordPromptModal.tsx         Password entry when joining a locked group
    TermsModal.tsx                   Terms of Service content
    SetupScreen.tsx / FirebaseSetupBanner.tsx   Shown if Firebase isn't configured yet
scripts/
  cleanup-inactive-users.mjs   Admin script: deletes accounts inactive for 30+ days
firestore.rules               Firestore Security Rules for this app's data model
```

## Getting started

### Prerequisites

- Node.js 22
- [pnpm](https://pnpm.io/) 10.x (`npm install -g pnpm`)
- A Firebase project with **Authentication** (Email/Password provider) and **Firestore Database** enabled

### Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Create a `.env` file in the project root with your Firebase Web app config:

   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

   These values come from Firebase Console → Project Settings → Your apps → Web app.

3. Apply the Firestore Security Rules: open `firestore.rules` in this repo, copy its full contents, and paste them into Firebase Console → Firestore Database → Rules, then Publish. This is required — without it, Firestore runs in whatever mode it was left in (often fully open), which defeats blocking, group passwords, and kick/admin permissions.

4. Firestore also needs one composite index for the chat list query (`members` array-contains + `lastMessageTime` order). If it's missing, the first run will print a link in the browser console that creates it automatically — click it.

5. Start the dev server:

   ```
   pnpm dev
   ```

## Building for production

```
pnpm build
```

Output goes to `dist/`.

## Deploying to GitHub Pages

A workflow is already set up at `.github/workflows/deploy.yml`. To use it:

1. Push this repository to GitHub.
2. Add the six `VITE_FIREBASE_*` values above as **Repository secrets** (Settings → Secrets and variables → Actions), one secret per value, using the same names shown in step 2 above.
3. In Settings → Pages, set Source to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the Actions tab). The site is built and published automatically.
5. Add the resulting `*.github.io` domain to Firebase Console → Authentication → Settings → Authorized domains, or login/register will fail on the live site.

GitHub Pages requires the repository to be public on GitHub's free plan.

## Inactive account cleanup

`scripts/cleanup-inactive-users.mjs` is a standalone Node.js script (using the Firebase Admin SDK) that deletes any account inactive for 30+ days. It's intentionally separate from the client app — deleting other users' accounts is not something the browser app is allowed to do. See the comments at the top of that file for setup and usage, including how to schedule it to run automatically.

## Security notes

- Images and GIFs are stored as base64 directly in Firestore documents (no Firebase Storage), kept under Firestore's 1MB document size limit by compression.
- Group passwords are hashed (SHA-256) client-side before being stored; this keeps out casual guessing but is not a substitute for a real authentication system.
- Firebase Web config values (API key, project ID, etc.) are not secret — they're safe to expose in the built app. Actual access control is enforced by `firestore.rules`, not by hiding these values.
