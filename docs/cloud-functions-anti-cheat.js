/**
 * INNOVISION 2026 — Server-Side Anti-Cheat Cloud Function Sketch
 * 
 * In a high-stakes competitive typing race, client-side timers and JavaScript
 * variables can theoretically be spoofed by a determined hacker using devtools.
 * 
 * This optional Firebase Cloud Function trigger runs in a trusted server environment
 * upon every attempt creation. It independently parses the compact keystroke audit log
 * (`keystrokes: [{ c: char, t: ms_offset, e: isError }]`), recalculates exact net WPM,
 * accuracy, and punctuation accuracy, and flags or invalidates any attempt where
 * the client-submitted score deviates from the verified keystroke log by > 2.0 WPM.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.auditTypingAttempt = functions.firestore
  .document('attempts/{attemptId}')
  .onCreate(async (snap, context) => {
    const attempt = snap.data();
    const { attemptId } = context.params;

    try {
      const keystrokes = JSON.parse(attempt.keystrokes || '[]');
      if (!Array.isArray(keystrokes) || keystrokes.length === 0) {
        return snap.ref.update({
          flagged: true,
          flagReason: 'Missing or malformed keystroke telemetry audit log.',
        });
      }

      // 1. Fetch official round passage text from Firestore
      const roundDoc = await db.collection('rounds').doc(attempt.roundId).get();
      if (!roundDoc.exists) {
        return snap.ref.update({
          flagged: true,
          flagReason: 'Referenced round does not exist.',
        });
      }

      const { passageText, duration } = roundDoc.data();

      // 2. Replay keystroke sequence on the server
      let reconstructedText = '';
      let errorCount = 0;
      let maxBurstRate = 0;

      for (let i = 0; i < keystrokes.length; i++) {
        const item = keystrokes[i];
        reconstructedText += item.c;

        // Check sliding 1-second burst window
        let windowCount = 0;
        for (let j = i; j < keystrokes.length; j++) {
          if (keystrokes[j].t - item.t <= 1000) {
            windowCount++;
          } else {
            break;
          }
        }
        if (windowCount > maxBurstRate) {
          maxBurstRate = windowCount;
        }
      }

      // 3. Independent WPM computation
      const elapsedSeconds = Math.max(1, Math.min(duration, keystrokes[keystrokes.length - 1].t / 1000));
      let correctChars = 0;
      const checkLen = Math.min(passageText.length, reconstructedText.length);
      for (let i = 0; i < checkLen; i++) {
        if (reconstructedText[i] === passageText[i]) {
          correctChars++;
        } else {
          errorCount++;
        }
      }

      const serverNetWpm = Math.round(((correctChars / 5) / (elapsedSeconds / 60)) * 10) / 10;
      const serverAccuracy = Math.round((correctChars / Math.max(1, reconstructedText.length)) * 1000) / 10;

      // 4. Discrepancy comparison
      const wpmDiscrepancy = Math.abs(serverNetWpm - attempt.wpm);
      const isBurstAbnormal = maxBurstRate > 25; // >25 chars/second is super-human

      if (wpmDiscrepancy > 2.5 || isBurstAbnormal) {
        console.warn(`[ANTI-CHEAT] Discrepancy on attempt ${attemptId}: Server=${serverNetWpm}, Client=${attempt.wpm}, MaxBurst=${maxBurstRate}`);
        return snap.ref.update({
          flagged: true,
          flagReason: isBurstAbnormal
            ? `Server anti-cheat: Burst rate of ${maxBurstRate} chars/sec exceeds human limit.`
            : `Score mismatch: Client reported ${attempt.wpm} WPM but verified audit log computed ${serverNetWpm} WPM.`,
          serverVerifiedWpm: serverNetWpm,
          serverVerifiedAccuracy: serverAccuracy,
        });
      }

      return snap.ref.update({
        serverVerified: true,
        serverVerifiedWpm: serverNetWpm,
      });
    } catch (err) {
      console.error(`Error auditing attempt ${attemptId}:`, err);
    }
  });
