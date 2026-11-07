import {
  calculateNetWpm,
  calculateRawWpm,
  calculateAccuracy,
  calculatePunctuationAccuracy,
  detectSpeedBurst,
  rankAttempts,
  isCharMatch,
} from './scoring';
import { Attempt } from '../types';

/**
 * Basic suite of verification test cases for typing scoring & anti-cheat engine.
 */
export function runScoringTests() {
  const results: { test: string; passed: boolean; message?: string }[] = [];

  // Test 1: Net WPM Calculation
  // 250 correct chars in 60s (1 min) = 50 WPM
  const wpm1 = calculateNetWpm(250, 60);
  results.push({
    test: 'Net WPM calculation (250 chars / 60s)',
    passed: wpm1 === 50,
    message: `Expected 50, got ${wpm1}`,
  });

  // Test 2: Accuracy calculation
  const acc1 = calculateAccuracy(95, 100);
  results.push({
    test: 'Accuracy calculation (95/100)',
    passed: acc1 === 95,
    message: `Expected 95, got ${acc1}`,
  });

  // Test 3: Punctuation Accuracy
  const passage = 'Hello, world! Are you ready? (Yes/No).';
  const typedCorrect = 'Hello, world! Are you ready? (Yes/No).';
  const pAcc1 = calculatePunctuationAccuracy(passage, typedCorrect);
  results.push({
    test: 'Punctuation Accuracy - Perfect',
    passed: pAcc1 === 100,
    message: `Expected 100, got ${pAcc1}`,
  });

  const typedPuncError = 'Hello. world? Are you ready! (Yes-No).';
  const pAcc2 = calculatePunctuationAccuracy(passage, typedPuncError);
  results.push({
    test: 'Punctuation Accuracy - Errors detected',
    passed: pAcc2 < 100 && pAcc2 > 0,
    message: `Expected < 100, got ${pAcc2}`,
  });

  // Test 4: Speed Burst Anti-Cheat Detection
  const normalKeystrokes = Array.from({ length: 20 }, (_, i) => ({
    c: 'a',
    t: i * 150, // 6.6 chars/sec
    e: false,
  }));
  const burstCheckNormal = detectSpeedBurst(normalKeystrokes, 25);
  results.push({
    test: 'Anti-cheat allows normal human typing (< 25 cps)',
    passed: !burstCheckNormal.flagged,
    message: burstCheckNormal.reason,
  });

  const botKeystrokes = Array.from({ length: 40 }, (_, i) => ({
    c: 'a',
    t: i * 10, // 100 chars/sec burst
    e: false,
  }));
  const burstCheckBot = detectSpeedBurst(botKeystrokes, 25);
  results.push({
    test: 'Anti-cheat catches bot burst (> 25 cps)',
    passed: burstCheckBot.flagged,
    message: `Flagged: ${burstCheckBot.flagged}, reason: ${burstCheckBot.reason}`,
  });

  // Test 5: Leaderboard Tie-breaker
  const mockAttempts: Attempt[] = [
    {
      id: '1',
      participantId: 'p1',
      participantName: 'Alice',
      department: 'CSE',
      year: '3rd',
      roundId: 'r1',
      wpm: 80,
      rawWpm: 85,
      accuracy: 98,
      punctuationAccuracy: 95,
      errors: 2,
      correctChars: 400,
      totalKeystrokes: 420,
      blurCount: 0,
      flagged: false,
      keystrokes: '[]',
      submittedAt: 1000,
    },
    {
      id: '2',
      participantId: 'p2',
      participantName: 'Bob',
      department: 'AI & ML',
      year: '2nd',
      roundId: 'r1',
      wpm: 80, // Same WPM as Alice
      rawWpm: 85,
      accuracy: 98, // Same Accuracy
      punctuationAccuracy: 99, // Better punctuation!
      errors: 2,
      correctChars: 400,
      totalKeystrokes: 420,
      blurCount: 0,
      flagged: false,
      keystrokes: '[]',
      submittedAt: 1500,
    },
  ];

  const ranked = rankAttempts(mockAttempts);
  results.push({
    test: 'Tie-break by Punctuation Accuracy ranks Bob over Alice',
    passed: ranked[0].participantName === 'Bob' && ranked[0].rank === 1,
    message: `First place: ${ranked[0].participantName}`,
  });

  // Test 6: Dash & Quote Normalization
  const dashMatch = isCharMatch('-', '—') && isCharMatch('-', '–') && isCharMatch("'", '’') && isCharMatch('"', '“');
  results.push({
    test: 'Keyboard hyphen/quotes match typographic em-dash and curly quotes',
    passed: dashMatch,
    message: `dashMatch: ${dashMatch}`,
  });

  // Test 7: Deduplication of Multiple Attempts per Student (Best Score Preserved)
  const duplicateAttempts: Attempt[] = [
    {
      id: 'att_1',
      participantId: 'p1',
      participantName: 'Manish',
      rollNo: '786567',
      department: 'CSE',
      year: '3rd Year',
      roundId: 'r1',
      wpm: 14.4,
      rawWpm: 20,
      accuracy: 80,
      punctuationAccuracy: 80,
      errors: 5,
      correctChars: 200,
      totalKeystrokes: 220,
      blurCount: 0,
      flagged: false,
      keystrokes: '[]',
      submittedAt: 1000,
    },
    {
      id: 'att_2',
      participantId: 'p1_retry',
      participantName: 'Manish',
      rollNo: '786567',
      department: 'CSE',
      year: '3rd Year',
      roundId: 'r1',
      wpm: 16.9, // Higher score
      rawWpm: 25,
      accuracy: 93.3,
      punctuationAccuracy: 90,
      errors: 2,
      correctChars: 300,
      totalKeystrokes: 310,
      blurCount: 0,
      flagged: false,
      keystrokes: '[]',
      submittedAt: 2000,
    },
    {
      id: 'att_3',
      participantId: 'p2',
      participantName: 'Rahul',
      rollNo: '786599',
      department: 'CSE',
      year: '3rd Year',
      roundId: 'r1',
      wpm: 12.0,
      rawWpm: 15,
      accuracy: 90,
      punctuationAccuracy: 85,
      errors: 1,
      correctChars: 180,
      totalKeystrokes: 190,
      blurCount: 0,
      flagged: false,
      keystrokes: '[]',
      submittedAt: 1500,
    },
  ];

  const dedupRanked = rankAttempts(duplicateAttempts);
  const manishEntries = dedupRanked.filter(a => a.rollNo === '786567');
  const isDedupPassed =
    dedupRanked.length === 2 &&
    manishEntries.length === 1 &&
    manishEntries[0].wpm === 16.9 &&
    dedupRanked[0].participantName === 'Manish' &&
    dedupRanked[1].participantName === 'Rahul';

  results.push({
    test: 'Deduplicates multiple student runs to single best Net WPM score',
    passed: isDedupPassed,
    message: `Total ranked: ${dedupRanked.length}, Manish WPM: ${manishEntries[0]?.wpm}, Rahul Rank: ${dedupRanked[1]?.rank}`,
  });

  return results;
}
