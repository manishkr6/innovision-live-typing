import { Attempt, KeystrokeLogItem } from '../types';

/**
 * Normalizes typographical variants to standard keyboard characters:
 * - Em-dash '—' (\u2014), En-dash '–' (\u2013), Minus '−' (\u2212) -> Hyphen '-' (\u002d)
 * - Smart curly double quotes '“' (\u201c), '”' (\u201d) -> Standard quote '"' (\u0022)
 * - Smart curly single quotes / apostrophes '‘' (\u2018), '’' (\u2019) -> Standard single quote "'" (\u0027)
 * - Non-breaking space '\u00a0' -> Standard space ' ' (\u0020)
 */
export function normalizeChar(c: string): string {
  if (!c) return '';
  if (c === '—' || c === '–' || c === '−') return '-';
  if (c === '“' || c === '”') return '"';
  if (c === '‘' || c === '’') return "'";
  if (c === '\u00A0') return ' ';
  return c;
}

export function isCharMatch(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  return normalizeChar(actual) === normalizeChar(expected);
}

/**
 * Punctuation characters regex for punctuation accuracy calculation
 */
export const PUNCTUATION_REGEX = /[.,\/#!$%\^&\*;:{}=\-_`~()?'"\[\]<>@+\\]/;

/**
 * Calculate net Words Per Minute (WPM).
 * Net WPM = ((correct characters / 5) / time in minutes)
 * Negative values are clamped to 0.
 */
export function calculateNetWpm(correctChars: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  const minutes = elapsedSeconds / 60;
  const wpm = (correctChars / 5) / minutes;
  return Math.max(0, Math.round(wpm * 10) / 10);
}

/**
 * Calculate raw Words Per Minute (all typed keystrokes including errors).
 */
export function calculateRawWpm(totalKeystrokes: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  const minutes = elapsedSeconds / 60;
  const raw = (totalKeystrokes / 5) / minutes;
  return Math.max(0, Math.round(raw * 10) / 10);
}

/**
 * Overall typing accuracy percentage.
 * Accuracy = (correct keystrokes / total keystrokes) * 100
 */
export function calculateAccuracy(correctChars: number, totalKeystrokes: number): number {
  if (totalKeystrokes <= 0) return 100;
  const acc = (correctChars / totalKeystrokes) * 100;
  return Math.min(100, Math.max(0, Math.round(acc * 10) / 10));
}

/**
 * Calculate punctuation-specific accuracy.
 * Evaluates how accurately the participant typed commas, periods, quotes,
 * brackets, dashes, colons, semicolons, etc.
 * Any missed punctuation or erroneously typed punctuation lowers accuracy.
 */
export function calculatePunctuationAccuracy(
  passage: string,
  typedText: string
): number {
  if (!typedText || typedText.length === 0) return 100;

  let totalPunctuationEvaluated = 0;
  let correctPunctuationCount = 0;

  const compareLength = Math.min(passage.length, typedText.length);

  for (let i = 0; i < compareLength; i++) {
    const expectedChar = passage[i];
    const actualChar = typedText[i];

    const isExpectedPunct = PUNCTUATION_REGEX.test(expectedChar);
    const isActualPunct = PUNCTUATION_REGEX.test(actualChar);

    if (isExpectedPunct || isActualPunct) {
      totalPunctuationEvaluated++;
      if (isExpectedPunct && isCharMatch(actualChar, expectedChar)) {
        correctPunctuationCount++;
      }
    }
  }

  if (totalPunctuationEvaluated === 0) {
    return 100;
  }

  const acc = (correctPunctuationCount / totalPunctuationEvaluated) * 100;
  return Math.min(100, Math.max(0, Math.round(acc * 10) / 10));
}

/**
 * Anti-cheat anomaly detection:
 * Checks for impossible typing bursts (> 25 characters/sec within any sliding window)
 * or instant automated paste injections.
 */
export function detectSpeedBurst(
  keystrokes: KeystrokeLogItem[],
  maxCharsPerSecond: number = 25
): { flagged: boolean; reason?: string; maxObservedRate: number } {
  if (keystrokes.length < 5) {
    return { flagged: false, maxObservedRate: 0 };
  }

  // Sliding window of 1000ms (1 second)
  let maxRate = 0;
  for (let i = 0; i < keystrokes.length; i++) {
    const windowStart = keystrokes[i].t;
    let windowCount = 0;
    for (let j = i; j < keystrokes.length; j++) {
      if (keystrokes[j].t - windowStart <= 1000) {
        windowCount++;
      } else {
        break;
      }
    }
    if (windowCount > maxRate) {
      maxRate = windowCount;
    }
  }

  if (maxRate > maxCharsPerSecond) {
    return {
      flagged: true,
      reason: `Abnormal burst speed: ${maxRate} chars/sec exceeds physical limit of ${maxCharsPerSecond} chars/sec`,
      maxObservedRate: maxRate,
    };
  }

  // Check for 0ms delay cluster (clipboard injection)
  let instantChars = 0;
  for (let i = 1; i < keystrokes.length; i++) {
    if (keystrokes[i].t === keystrokes[i - 1].t) {
      instantChars++;
      if (instantChars >= 8) {
        return {
          flagged: true,
          reason: `Automated instant script detected: ${instantChars}+ simultaneous key events`,
          maxObservedRate: maxRate,
        };
      }
    } else {
      instantChars = 0;
    }
  }

  return { flagged: false, maxObservedRate: maxRate };
}

/**
 * Validate that typed text length and time are physically plausible
 */
export function validatePlausibility(
  typedLength: number,
  elapsedSeconds: number,
  wpm: number
): { valid: boolean; reason?: string } {
  if (elapsedSeconds < 3 && typedLength > 15) {
    return { valid: false, reason: 'Test completed improbably fast (< 3 seconds).' };
  }
  if (wpm > 260) {
    return { valid: false, reason: `WPM of ${wpm} flagged for organizer review (world record threshold).` };
  }
  return { valid: true };
}

export interface RankAttemptsOptions {
  deduplicate?: boolean; // When true (default), keeps only the best attempt per unique competitor
}

/**
 * Sort and rank leaderboard attempts using official tie-break hierarchy:
 * 1. Net WPM (descending)
 * 2. Accuracy % (descending)
 * 3. Punctuation Accuracy % (descending)
 * 4. Errors count (ascending)
 * 5. Submission time (ascending)
 *
 * When deduplicate is true (default), each competitor (by rollNo or participantId)
 * appears at most once with their single best performance.
 */
export function rankAttempts(
  attempts: Attempt[],
  options: RankAttemptsOptions = { deduplicate: true }
): Attempt[] {
  const shouldDeduplicate = options.deduplicate !== false;

  const sorted = [...attempts].sort((a, b) => {
    // 1. Net WPM
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;

    // 2. Accuracy
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;

    // 3. Punctuation Accuracy
    if (b.punctuationAccuracy !== a.punctuationAccuracy) {
      return b.punctuationAccuracy - a.punctuationAccuracy;
    }

    // 4. Fewer Errors
    if (a.errors !== b.errors) return a.errors - b.errors;

    // 5. Earlier submission timestamp
    const timeA = typeof a.submittedAt === 'number' ? a.submittedAt : (a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0);
    const timeB = typeof b.submittedAt === 'number' ? b.submittedAt : (b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0);
    return timeA - timeB;
  });

  let rankedList = sorted;

  if (shouldDeduplicate) {
    const seenCompetitors = new Set<string>();
    rankedList = sorted.filter(att => {
      // Primary key: Roll No (case-insensitive)
      let key = att.rollNo && att.rollNo.trim() && att.rollNo !== 'N/A'
        ? `roll_${att.rollNo.trim().toLowerCase()}`
        : '';

      // Secondary key: participantId
      if (!key && att.participantId && att.participantId.trim()) {
        key = `id_${att.participantId.trim().toLowerCase()}`;
      }

      // Tertiary fallback: participantName + department
      if (!key) {
        key = `name_${(att.participantName || '').trim().toLowerCase()}_${(att.department || '').trim().toLowerCase()}`;
      }

      if (seenCompetitors.has(key)) {
        return false;
      }
      seenCompetitors.add(key);
      return true;
    });
  }

  return rankedList.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * Format elapsed time into mm:ss
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert attempts data to downloadable CSV string
 */
export function generateResultsCSV(attempts: Attempt[]): string {
  const headers = [
    'Rank',
    'Name',
    'Department',
    'Year',
    'Roll No',
    'Net WPM',
    'Raw WPM',
    'Accuracy (%)',
    'Punctuation Accuracy (%)',
    'Errors',
    'Blur Count',
    'Flagged',
    'Flag Reason',
    'Submitted At',
  ];

  const rows = attempts.map(att => [
    att.rank || '',
    `"${(att.participantName || '').replace(/"/g, '""')}"`,
    `"${(att.department || '').replace(/"/g, '""')}"`,
    `"${(att.year || '').replace(/"/g, '""')}"`,
    `"${(att.rollNo || '').replace(/"/g, '""')}"`,
    att.wpm,
    att.rawWpm,
    att.accuracy,
    att.punctuationAccuracy,
    att.errors,
    att.blurCount,
    att.flagged ? 'YES' : 'NO',
    `"${(att.flagReason || '').replace(/"/g, '""')}"`,
    att.submittedAt?.toDate ? att.submittedAt.toDate().toISOString() : new Date().toISOString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
