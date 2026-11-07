# INNOVISION 2026 — Live Type Racer Architecture Documentation
**Faculty of Science & Technology (FST) | The ICFAI University, Sikkim**  
**Event:** Technical Typing Championship (INNOVISION 2026)  
**Database:** Google Cloud Firebase / Cloud Firestore  
**Framework:** React 19, TypeScript, Tailwind CSS, Vite

---

## 1. Project Overview & Key Files

The system is a real-time, synchronized multiplayer and competitive typing arena designed for university IT festivals. It allows hundreds of students across multiple campus computer labs to check in with their roll numbers, synchronize clocks with an organizer dashboard down to the millisecond, and compete in live speed typing sprints without requiring Google OAuth sign-in for participants.

### Key Directory Structure

```
├── public/
│   ├── INNOVISION_2026_Type_Racer_Architecture.md     # Markdown technical report
│   └── INNOVISION_2026_Type_Racer_Architecture.html   # Print-ready styled documentation
├── src/
│   ├── components/
│   │   ├── arena/
│   │   │   ├── CountdownOverlay.tsx   # Full-screen synchronized 10s countdown visualizer
│   │   │   ├── TypingArena.tsx        # Passage character renderer, caret animator, anti-cheat banner
│   │   │   └── ResultCard.tsx         # Post-race scoreboard (WPM, Raw, Accuracy, Punctuation, Rank)
│   │   ├── common/                    # Navbar, Footer, Modal, Animation wrappers
│   │   └── leaderboard/               # Dynamic podium and leaderboard rankings
│   ├── context/
│   │   ├── AuthContext.tsx            # Manages participant badges, localStorage sync, and admin auth
│   │   └── CompetitionContext.tsx     # Central state engine for rounds, attempts, participants, and config
│   ├── data/
│   │   └── passages.ts                # Curated campus and technical typing passages
│   ├── hooks/
│   │   └── useTypingEngine.ts         # High-precision typing engine, keystroke logger, and anti-cheat monitor
│   ├── lib/
│   │   └── firebase.ts                # Firebase App, Auth, and Firestore instance initialization
│   ├── pages/
│   │   ├── RegisterPage.tsx           # Competitor badge registration form (Zero Google OAuth required)
│   │   ├── ArenaPage.tsx              # Official live race arena and lobby
│   │   ├── AdminPage.tsx              # Organizer dashboard (clock HUD, rounds, retries, directory)
│   │   ├── LeaderboardPage.tsx        # Public rankings and tournament statistics
│   │   └── PracticePage.tsx           # Unrestricted solo warm-up arena
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces (Participant, Attempt, Round, Config)
│   └── utils/
│       └── scoring.ts                 # Standard WPM, Raw WPM, Accuracy, and Punctuation algorithms
```

---

## 2. Firebase Database Architecture & Workflow

The platform connects to Google Cloud Firestore with real-time snapshot synchronization (`onSnapshot`), allowing zero-refresh updates between students and event organizers.

### Database Collections & Schema

#### 1. `config/competition` (Document)
- `status`: `'registration_open'` | `'waiting'` | `'live'` | `'finished'`
- `activeRoundId`: String ID of current championship round (e.g. `'round-1-technical-elimination'`)
- `resultsPublished`: Boolean — controls whether ranks and scores are revealed to participants
- `announcement`: String banner message broadcast across the app
- `lastRosterResetAt`: Timestamp ms — signal that forces client browsers to reset stale sessions

#### 2. `participants/{id}` (Collection)
- `id`: Clean unique ID formatted as `part_<cleanRoll>_<timestamp>` (e.g. `part_76567_mw0qsgxv`)
- `name`: Competitor's full name (e.g. `Mohit Kumar`)
- `rollNo`: University student registration / roll number (e.g. `76567` or `23FSTCSE042`)
- `email`: Institutional or personal email address
- `department`: Program / Department (CSE, AI & DS, IT, Mechanical, Civil, or custom Others)
- `year`: Academic year (1st, 2nd, 3rd, or 4th Year)
- `phone`: Mobile contact / WhatsApp number
- `canRetry`: Boolean — set by organizer to allow another attempt if interrupted
- `disqualified`: Boolean — set by organizer for cheating or tab switching
- `registeredAt`: Firestore ServerTimestamp

#### 3. `rounds/{id}` (Collection)
- `id`: Unique identifier (e.g. `'round-1-technical-elimination'`)
- `name`: Human-readable round title (e.g. `Round 1 — Technical Elimination`)
- `passageTitle`: Title of the typing passage
- `passageText`: Exact prompt text string to type
- `difficulty`: `'Easy'` | `'Medium'` | `'Hard'`
- `duration`: Official timer in seconds (e.g. `30`, `60`, `120`)
- `allowBackspaceAfterSpace`: Boolean — tournament rule toggle
- `status`: `'created'` | `'countdown'` | `'in_progress'` | `'completed'` | `'reset'`
- `startAt`: Epoch timestamp in milliseconds when typing unlocks

#### 4. `attempts/{id}` (Collection)
- `id`: Auto-generated Firestore document ID
- `participantId`: Reference to `participants/{id}`
- `participantName`: Competitor's name
- `rollNo`: Competitor's roll number
- `department`: Competitor's academic department
- `year`: Academic year
- `roundId`: Reference to `rounds/{id}`
- `wpm`: Net Words Per Minute `((correctChars / 5) / (elapsedSeconds / 60))`
- `rawWpm`: Raw typing speed `((totalKeystrokes / 5) / (elapsedSeconds / 60))`
- `accuracy`: Accuracy percentage `((correctChars / totalKeystrokes) * 100)`
- `punctuationAccuracy`: Punctuation match percentage comparing required punctuation marks
- `errors`: Total mismatched characters typed
- `correctChars`: Total matching characters typed
- `totalKeystrokes`: Total raw keystrokes pressed
- `blurCount`: Number of times the participant switched browser tabs or minimized window
- `flagged`: Boolean — automatically marked true if burst rate anomaly or excessive tab switching
- `flagReason`: Diagnostic reason for flag
- `keystrokes`: JSON string containing keystroke timing logs `[{ c: 'a', t: 120, e: false }, ...]`
- `submittedAt`: Firestore ServerTimestamp

---

## 3. Saving & Fetching Typing Stats

| Metric | Computation / Origin | Where Saved in Firestore | Where Fetched & Displayed |
| :--- | :--- | :--- | :--- |
| **Roll No** | `participant.rollNo` from `AuthContext` | `attempts.rollNo` & `participants.rollNo` | Admin Directory (`AdminPage.tsx`), Result Card (`ResultCard.tsx`) |
| **Department** | `participant.department` from `AuthContext` | `attempts.department` & `participants.department` | Admin Directory (`AdminPage.tsx`), Result Card (`ResultCard.tsx`) |
| **Net Speed (WPM)** | `(correctChars / 5) / (elapsedSeconds / 60)` via `calculateNetWpm()` in `scoring.ts` | `attempts.wpm` (Float / Number) | Highlighted in Net Speed column in Admin & Big Badge in Result Card |
| **Raw Speed** | `(totalKeystrokes / 5) / (elapsedSeconds / 60)` via `calculateRawWpm()` in `scoring.ts` | `attempts.rawWpm` | Secondary metric under WPM in Admin Directory & Result Card |
| **Accuracy** | `(correctChars / totalKeystrokes) * 100` via `calculateAccuracy()` in `scoring.ts` | `attempts.accuracy` | Dedicated Accuracy pill column in Admin Table |
| **Punctuation** | Compares expected punctuation characters `[.,!?:;"'—()\-...]` using `calculatePunctuationAccuracy()` in `scoring.ts` | `attempts.punctuationAccuracy` | Dedicated Punctuation column in Admin Table |
| **Status** | Dynamic computed badge: `'Score Logged'`, `'Waiting in Lobby'`, `'Racing Now'`, `'Did Not Participate'`, `'Retry Granted'`, `'Disqualified'` | Inferred in real-time from matching `attempts` doc against `participants.id` | Status column in Admin Table (`AdminPage.tsx`) |

---

## 4. Major Function Mapping

| Function Name | Defined In (File) | Purpose | Where Called |
| :--- | :--- | :--- | :--- |
| `registerParticipant` | `src/context/AuthContext.tsx` | Creates participant record in Firestore `participants` and stores in `localStorage`. | `RegisterPage.tsx` on form submit. |
| `clearParticipantSession` | `src/context/AuthContext.tsx` | Removes participant state from React and clears `localStorage`. | `RegisterPage.tsx` ("Register New Participant" button). |
| `loginWithOrganizerCode` | `src/context/AuthContext.tsx` | Authenticates organizer via secure PIN (`INNOVISION2026`) or email. | `Navbar.tsx` & `AdminPage.tsx`. |
| `useTypingEngine` | `src/hooks/useTypingEngine.ts` | Central engine handling keystrokes, active caret position, auto-scrolling, anti-cheat detection, and timer intervals. | `TypingArena.tsx`. |
| `triggerFinish` | `src/hooks/useTypingEngine.ts` | Finalizes typing scores when duration expires or passage completes (only when unlocked and active). | Internal timer in `useTypingEngine.ts` and character completion. |
| `submitRaceAttempt` | `src/context/CompetitionContext.tsx` | Sanitizes attempt payload (WPM, accuracy, punctuation, keystrokes) and creates document in Firestore `attempts`. | `handleOfficialFinish` in `ArenaPage.tsx`. |
| `startRoundCountdown` | `src/context/CompetitionContext.tsx` | Sets target epoch `Date.now() + 10000` on `rounds/{id}.startAt`, updates status to `'countdown'`, clears old attempts, and schedules transition to `'in_progress'`. | "Start Race" button in `AdminPage.tsx`. |
| `stopRound` | `src/context/CompetitionContext.tsx` | Stops race immediately and sets status to `'completed'`. | "Stop Race" button in `AdminPage.tsx` or auto-timer. |
| `resetRound` | `src/context/CompetitionContext.tsx` | Clears attempts for the round and sets status back to `'created'` with `startAt: null`. | "Reset to Lobby" button in `AdminPage.tsx`. |
| `clearAllParticipants` | `src/context/CompetitionContext.tsx` | Wipes all participant docs, wipes all attempts, resets rounds to `'created'`, and updates `config.lastRosterResetAt`. | "Clear All Students & Reset to Start" in `AdminPage.tsx`. |
| `grantRetry` | `src/context/CompetitionContext.tsx` | Sets `participant.canRetry = true` and deletes previous attempt. | "Grant Retry" button in `AdminPage.tsx`. |
| `disqualifyParticipant` | `src/context/CompetitionContext.tsx` | Sets `participant.disqualified = true` or `false`. | "Disqualify" button in `AdminPage.tsx`. |
| `publishResults` | `src/context/CompetitionContext.tsx` | Toggles `config.resultsPublished` between true/false. | "Results: Published/Hidden" button in `AdminPage.tsx`. |
| `calculateNetWpm` | `src/utils/scoring.ts` | Calculates standard net typing speed deducting errors. | `useTypingEngine.ts`. |
| `calculatePunctuationAccuracy` | `src/utils/scoring.ts` | Calculates strict punctuation character match percentage. | `useTypingEngine.ts`. |
| `detectSpeedBurst` | `src/utils/scoring.ts` | Analyzes keystroke intervals `< 25ms` for copy-paste or bot detection. | `useTypingEngine.ts`. |

---

## 5. End-to-End Data Flow

```
[1. Registration]
User enters Name, Roll No, Department in RegisterPage
       │
       ▼
`registerParticipant()` writes document to Firestore `participants/{id}`
       │
       ▼
[2. Live Lobby]
Competitor redirected to `/arena`
Firestore onSnapshot detects Round 1 (`status: 'created'`, `startAt: null`)
Input is LOCKED: "⚠️ Race Not Started by Admin"
       │
       ▼
[3. Admin Starts Race]
Admin clicks "Start Race (10s Synchronized Countdown)"
`startRoundCountdown()` sets `startAt = Date.now() + 10000` and `status = 'countdown'`
       │
       ▼
[4. Synchronized 10s Countdown]
Both Admin HUD and Competitor screen render <CountdownOverlay />
Countdown ticks: 10, 9, 8... 3, 2, 1, GO!
       │
       ▼
[5. Typing Execution]
At exact millisecond (now >= startAt):
Keyboard UNLOCKS across all devices simultaneously
`useTypingEngine` monitors keystrokes, calculates live speed, detects tab blur
       │
       ▼
[6. Timer Expiration / Finish]
Remaining duration hits 00:00 (or user reaches end of text)
`triggerFinish()` computes final Net WPM, Accuracy %, Punctuation %, and Errors
       │
       ▼
[7. Score Submission]
`submitRaceAttempt()` adds document to Firestore `attempts`
Competitor screen switches to <ResultCard />
       │
       ▼
[8. Live Admin Directory]
Admin `onSnapshot` listens to `attempts`
Mohit Kumar changes from "Waiting in Lobby" to:
Net Speed: 58.4 WPM | Accuracy: 98% | Punctuation: 100% | Status: "SCORE LOGGED"
```

---

## 6. Anti-Cheat & Tournament Integrity System

1. **Tab Switch & Window Blur Detection**:
   - `useTypingEngine.ts` attaches window event listeners to `visibilitychange` and `blur`.
   - Every time a competitor leaves the browser tab (e.g. to open an external cheat tool or search), `blurCount` increments by 1.
   - If `blurCount >= 3`, the attempt is automatically marked `flagged = true` with reason: *"Frequent tab switches detected (X blurs)"*.

2. **Keystroke Cadence Burst Detection**:
   - Every keypress logs its character, millisecond timestamp from race start, and error boolean.
   - `detectSpeedBurst()` analyzes inter-keystroke intervals. If multiple characters are entered in $< 25\text{ ms}$ intervals, the submission is flagged for bot injection or script simulation.

3. **Synchronized Lockstep Clock**:
   - By anchoring the timer to an absolute epoch millisecond (`startAt`), no local device clock manipulations can gain an unfair head start. The countdown finishes at the exact same instant across all machines in the computer lab.

4. **High-Concurrency Real-Time Protection**:
   - **Deterministic Document Keys**: Each attempt uses a composite key `att_${roundId}_${participantId}` with `setDoc(..., { merge: true })`, ensuring idempotent atomic writes when 10+ students finish simultaneously.
   - **Safe Snapshot Map Merging**: Eliminates state stomping between WebSocket `onSnapshot` streams and cold `getDocs` queries.
   - **In-Flight Network Transit Grace Period**: Grants an 8-second post-race sync buffer (`isPostRaceSyncGracePeriod`) so packets arriving over mobile/WiFi networks are seamlessly mapped without false "Did Not Participate" labels.
