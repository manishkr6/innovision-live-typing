# INNOVISION 2026 — Live Typing Competition Web App

**Faculty of Science & Technology (FST), The ICFAI University, Sikkim**  
*In association with the Institution’s Innovation Council (IIC), Ministry of Education, Govt. of India.*

---

## 1. Overview
INNOVISION 2026 Live Typing Arena is an official, real-time typing championship application. Unlike passive marketing websites, this is a synchronized live competition tool where students authenticate, wait in the lobby, take a synchronized race round on identical case-sensitive prose, and see dynamic leaderboard standings updated in real time.

### Event Placeholders
- **Event Date:** `[PLACEHOLDER: March 14, 2026]`
- **Venue:** `[PLACEHOLDER: Computer Lab 3 & Central Auditorium, ICFAI University Sikkim, Gangtok Campus]`
- **Faculty Coordinator:** `[PLACEHOLDER: Dr. S. Sharma / FST Event Committee]`
- **Student Leads:** `[PLACEHOLDER: Technical Club Leads, IIC Student Ambassadors]`

---

## 2. Tech Stack & Design System
- **Frontend:** React 19, Vite, React Router DOM, Tailwind CSS (Tailwind v4 tokens).
- **Design Tokens:** Strict implementation of `DESIGN.md`:
  - **Paper & Ink Light Mode** (`#FBF8F3`, `#1C1917`, saffron accents `#C2410C`–`#FB923C`, `#E2D9CC` borders) for forms, admin controls, and landing cards.
  - **Night Arena Dark Mode** (`#17151F`, `#0D111C`, `#FB923C`, `#38BDF8`) for the race arena, synchronized countdown, and live projector leaderboard.
  - **Himalayan Prayer-Flag Accents** (`flag-blue: #2456A6`, `flag-red: #C2412D`, `flag-green: #2F7D4F`, `flag-yellow: #D99A0B`).
  - **Micro-Interactions:** Lenis-style smooth scrolling, 3D `TiltCard` with specular cursor glare, `MagneticButton`, and Canvas Confetti in prayer-flag colors.
- **Backend & Realtime:** Firebase Firestore (`onSnapshot` synchronized listeners) and Firebase Authentication.
- **Typing Engine:** Monospace (`JetBrains Mono`), character-by-character validation, active glowing marigold caret, incorrect characters with flag-red + underline (never color alone), auto line-scroll, and anti-cheat telemetry.

---

## 3. Step-by-Step Organizer Guide

### Step 1: Accessing the Organizer Dashboard (`/admin`)
1. Navigate to `/admin`.
2. Sign in with the whitelisted organizer Google account (configured via `VITE_ADMIN_EMAIL` in `.env`).
3. If using Firebase Auth with custom credentials, verify your UID is added to the `admins` collection in Firestore.

### Step 2: Configuring a Competition Round
1. In the **Active Round Controller**, click **"Create New Round"**.
2. Set the Round Name (e.g. *Round 1 — Technical Qualifier*).
3. Select Difficulty:
   - **Easy:** Warmup passages with gentle punctuation and numbers.
   - **Medium:** Tech, AI, and Himalayan Sikkim cultural narratives.
   - **Hard:** Low-level OS kernels, cryptographic nonces, and bioinformatic DNA sequencing.
4. Set Race Duration (30s, 60s, or 120s).
5. Toggle the Backspace rule (whether participants can delete backward across completed spaces).
6. Click **Activate Round**.

### Step 3: Opening Registration & Lobby
1. Announce the landing URL to participants.
2. Participants log in via Google, fill in their Department, Roll Number, Academic Year, and WhatsApp contact.
3. Participants enter the **Race Lobby**, where they can warm up using the practice drill (practice drills do NOT affect the leaderboard).
4. Organizers monitor the live check-in count on the dashboard.

### Step 4: Starting the Synchronized Race
1. When all participants are checked in, click **"Start Race (10s Synchronized Countdown)"**.
2. All connected participant screens immediately display a synchronized 3-2-1 countdown overlay driven by the server timestamp `startAt`.
3. At 00:00, all clients unlock simultaneously and begin typing.
4. Live HUD monitors Net WPM, Raw WPM, Accuracy, Punctuation Accuracy, and Errors.
5. In case of page refresh, the app calculates elapsed time from `startAt` and seamlessly rejoins the live attempt.

### Step 5: Live Projector Mode & Stage Display
1. In the admin dashboard or at `/leaderboard`, click **"Launch Projector Screen"** (or append `?projector=true`).
2. Project this screen onto the auditorium display.
3. Top 3 competitors are highlighted with Gold, Silver, and Bronze medal podiums.
4. Rows animate smoothly as new attempts are finalized.

### Step 6: Reviewing Flags & Publishing Results
1. The anti-cheat system monitors tab switches (`blurCount`) and impossible burst speeds (> 25 characters/sec).
2. Flagged submissions appear in the Organizer Review box.
3. Organizers can **"Grant Retry"** (clears prior attempt) or **"Disqualify"** irregular entries.
4. Toggle **"Publish Results to Participants"** to reveal official standing ranks on competitor result cards.
5. Click **"Export CSV"** to download the complete spreadsheet of results.

---

## 4. Anti-Cheat Architecture & Server Validation

### Client-Side Anti-Cheat Measures
- Clipboard pasting, cut, copy, drop, and right-click context menu are disabled inside the arena.
- Browser autocomplete, autocorrect, and spellcheck are disabled.
- Window blur and tab visibility changes trigger immediate warning alerts and are logged (`blurCount`).
- Each attempt records a compact keystroke audit log `[{ c: char, t: ms_offset, e: isError }]`.

### Optional Server-Side Validation (Cloud Functions)
In production high-stakes events, an optional Cloud Function (`docs/cloud-functions-anti-cheat.js`) automatically validates each attempt by replaying the keystrokes against the original passage, re-computing Net WPM, and flagging discrepancies exceeding 2.5 WPM.

---

## 5. Local Emulator Testing

To run Firebase emulators locally without touching production cloud data:

1. Install the Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Initialize emulators in your terminal:
```bash
firebase init emulators
```
Select **Firestore** and **Authentication**.

3. Run the local emulator suite:
```bash
firebase emulators:start --only firestore,auth
```

4. Connect your React app by enabling emulator hosts in `src/lib/firebase.ts`:
```typescript
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';

if (location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

---

## 6. Production Deployment

### Option A: Vercel / Netlify
1. Connect your GitHub repository.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables if customized (`VITE_...`).

### Option B: Cloud Run / Docker
1. The application is pre-configured with `vite build`.
2. The preview runs directly on Node.js port 3000.
