# INNOVISION 2026 Live Typing Arena — Firestore Security Specification

## 1. Data Invariants
1. **Admins Collection (`/admins/{adminId}`)**:
   - Only users with verified emails listed in the admin roster or runtime admin configured in `VITE_ADMIN_EMAIL` can perform organizer mutations.
   - Admin documents are immutable by normal participants.

2. **Participants Collection (`/participants/{participantId}`)**:
   - Participants can register their own record.
   - Roll numbers, emails, and names must be string format within length limits.
   - Participants cannot modify `disqualified` or `canRetry` on their own profile (only admins can grant retry or disqualify).

3. **Rounds Collection (`/rounds/{roundId}`)**:
   - Read is public or signed in so all clients can synchronize.
   - Write is strictly reserved for verified admins.
   - Status transitions strictly match enum: `created`, `countdown`, `in_progress`, `completed`, `reset`.

4. **Attempts Collection (`/attempts/{attemptId}`)**:
   - Only an authenticated participant can submit an attempt for themselves (`incoming().participantId == request.auth.uid`).
   - One attempt per round unless granted retry by admin.
   - Scores (wpm, accuracy, punctuationAccuracy, errors) must be valid numbers within realistic physical typing boundaries (e.g., wpm <= 350, accuracy <= 100).
   - Attempts cannot be updated once submitted (Terminal state lock) except by admins.

5. **Config Collection (`/config/{configId}`)**:
   - Read is public/participant accessible so everyone sees `status` (registration_open, waiting, live, finished) and `activeRoundId`.
   - Write is restricted to admins only.

---

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Attempt Submission**: Anonymous client submitting an attempt without `request.auth.uid`. (Blocked)
2. **Identity Spoofing Attempt**: Participant A submitting an attempt with `participantId = "user_b_id"`. (Blocked)
3. **Ghost Role Injection in Registration**: Participant setting `role: "superadmin"` or `isAdmin: true` during participant document creation. (Blocked)
4. **Self-Granting Retry**: Participant updating their own participant doc to set `canRetry: true` or `disqualified: false`. (Blocked)
5. **Score Poisoning**: Malicious client submitting `wpm: 99999` or non-numeric string `wpm: "hacked"`. (Blocked)
6. **Round Hijack**: Participant modifying `rounds/{roundId}` to start the race prematurely or alter `passageText`. (Blocked)
7. **Config Hijack**: Participant modifying `/config/competition` to change `status: "finished"`. (Blocked)
8. **Shadow Field Injection**: Attempt payload injecting `bypassCheck: true`. (Blocked by validation helper).
9. **Post-Submission Score Tampering**: Attempting to update a submitted attempt to inflate WPM after the round ends. (Blocked by terminal write lock).
10. **Huge Buffer Overflow (Denial of Wallet)**: Submitting a 5MB payload for `keystrokes` string to bloat Firestore read/write costs. (Blocked by `maxLength` 20,000 chars).
11. **Admin Promotion**: Regular user creating `/admins/{request.auth.uid}` to grant themselves admin privileges. (Blocked).
12. **Blind Query Scraping**: Unauthorized queries traversing sensitive logs without appropriate filters. (Blocked).
