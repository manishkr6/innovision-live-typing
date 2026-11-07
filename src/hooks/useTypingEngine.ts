import { useState, useEffect, useRef, useCallback } from 'react';
import { KeystrokeLogItem } from '../types';
import {
  calculateNetWpm,
  calculateRawWpm,
  calculateAccuracy,
  calculatePunctuationAccuracy,
  detectSpeedBurst,
  isCharMatch,
} from '../utils/scoring';

interface TypingEngineOptions {
  passageText: string;
  durationSeconds: number;
  allowBackspaceAfterSpace?: boolean;
  isPractice?: boolean;
  isRaceActive?: boolean;
  isLocked?: boolean; // When true, typing is blocked (e.g. before competition starts)
  roundStatus?: string; // Round status from competition ('created', 'countdown', 'in_progress', 'completed', 'reset')
  synchronizedStartTime?: number | null; // Exact epoch ms when official race clock began
  onFinish?: (results: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
    punctuationAccuracy: number;
    errors: number;
    correctChars: number;
    totalKeystrokes: number;
    blurCount: number;
    flagged: boolean;
    flagReason?: string;
    keystrokes: KeystrokeLogItem[];
    elapsedSeconds: number;
  }) => void;
}

export function useTypingEngine({
  passageText,
  durationSeconds,
  allowBackspaceAfterSpace = true,
  isPractice = false,
  isRaceActive = true,
  isLocked = false,
  roundStatus,
  synchronizedStartTime = null,
  onFinish,
}: TypingEngineOptions) {
  const [typedText, setTypedText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isFinished, setIsFinished] = useState(false);
  const [blurCount, setBlurCount] = useState(0);
  const [blurWarning, setBlurWarning] = useState(false);
  const [keystrokes, setKeystrokes] = useState<KeystrokeLogItem[]>([]);
  const [flagged, setFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState<string | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeCharRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<any>(null);
  const finishTriggered = useRef(false);

  // Synchronous refs to prevent stale closure bugs when timer expires
  const typedTextRef = useRef(typedText);
  typedTextRef.current = typedText;

  const keystrokesRef = useRef(keystrokes);
  keystrokesRef.current = keystrokes;

  const passageTextRef = useRef(passageText);
  passageTextRef.current = passageText;

  const durationSecondsRef = useRef(durationSeconds);
  durationSecondsRef.current = durationSeconds;

  const synchronizedStartTimeRef = useRef(synchronizedStartTime);
  synchronizedStartTimeRef.current = synchronizedStartTime;

  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const blurCountRef = useRef(blurCount);
  blurCountRef.current = blurCount;

  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  const isRaceActiveRef = useRef(isRaceActive);
  isRaceActiveRef.current = isRaceActive;

  const flaggedRef = useRef(flagged);
  flaggedRef.current = flagged;

  const flagReasonRef = useRef(flagReason);
  flagReasonRef.current = flagReason;

  const hasStartedRef = useRef(false);
  hasStartedRef.current = Boolean(
    (synchronizedStartTime && Date.now() >= synchronizedStartTime) ||
    startTime !== null ||
    typedText.length > 0
  );

  // Reset state when passage changes or round restarts
  useEffect(() => {
    setTypedText('');
    setStartTime(null);
    setTimeLeft(durationSeconds);
    setIsFinished(false);
    setBlurCount(0);
    setBlurWarning(false);
    setKeystrokes([]);
    setFlagged(false);
    setFlagReason(undefined);
    finishTriggered.current = false;
  }, [passageText, durationSeconds]);

  // Anti-cheat window blur & tab switch detection
  useEffect(() => {
    if (isFinished || isLocked || (!isPractice && !isRaceActive)) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setBlurCount(prev => prev + 1);
        setBlurWarning(true);
      }
    };

    const handleWindowBlur = () => {
      setBlurCount(prev => prev + 1);
      setBlurWarning(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isFinished, isLocked, isPractice, isRaceActive]);

  // Auto-scroll passage to keep the active character at comfortable eye-level
  useEffect(() => {
    if (activeCharRef.current && containerRef.current) {
      const charEl = activeCharRef.current;
      const containerEl = containerRef.current;

      const charTop = charEl.offsetTop;
      const containerHeight = containerEl.clientHeight;
      const targetScroll = charTop - containerHeight / 2 + 30;

      containerEl.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [typedText]);

  // Complete attempt - guaranteed to use latest synchronous values
  const triggerFinish = useCallback(() => {
    if (finishTriggered.current) return;

    const hasTyped = typedTextRef.current.length > 0;
    const syncStart = synchronizedStartTimeRef.current;

    // In practice mode, only finish if something was typed
    if (isPractice && !hasTyped) {
      return;
    }

    // In official race arena: do NOT trigger finish before the race officially starts (e.g. during countdown)
    if (!isPractice && syncStart && Date.now() < syncStart) {
      return;
    }

    finishTriggered.current = true;
    setIsFinished(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const currentTyped = typedTextRef.current;
    const currentPassage = passageTextRef.current;
    const currentKeystrokes = keystrokesRef.current;
    const currentDuration = durationSecondsRef.current;
    const currentStart = startTimeRef.current;

    // Accurate elapsed time calculation:
    // If synchronizedStartTime exists, duration is bounded between 1 and durationSeconds
    let effectiveElapsed = currentDuration;
    if (syncStart) {
      const actualElapsed = (Date.now() - syncStart) / 1000;
      effectiveElapsed = Math.min(currentDuration, Math.max(1, actualElapsed));
    } else if (currentStart) {
      const actualElapsed = (Date.now() - currentStart) / 1000;
      effectiveElapsed = Math.min(currentDuration, Math.max(1, actualElapsed));
    }

    let correctChars = 0;
    let errors = 0;
    const checkLen = Math.min(currentPassage.length, currentTyped.length);

    for (let i = 0; i < checkLen; i++) {
      if (isCharMatch(currentTyped[i], currentPassage[i])) {
        correctChars++;
      } else {
        errors++;
      }
    }
    const totalKeystrokes = Math.max(currentTyped.length, currentKeystrokes.length);

    const wpm = totalKeystrokes > 0 ? calculateNetWpm(correctChars, effectiveElapsed) : 0;
    const rawWpm = totalKeystrokes > 0 ? calculateRawWpm(totalKeystrokes, effectiveElapsed) : 0;
    const accuracy = totalKeystrokes > 0 ? calculateAccuracy(correctChars, totalKeystrokes) : 0;
    const punctuationAccuracy = totalKeystrokes > 0 ? calculatePunctuationAccuracy(currentPassage, currentTyped) : 0;

    // Anti-cheat burst check
    const burstCheck = detectSpeedBurst(currentKeystrokes);
    let isAttemptFlagged = flaggedRef.current || burstCheck.flagged || blurCountRef.current >= 3;
    let finalReason = flagReasonRef.current;
    if (burstCheck.flagged) {
      finalReason = burstCheck.reason;
    } else if (blurCountRef.current >= 3) {
      finalReason = `Frequent tab switches detected (${blurCountRef.current} blurs).`;
    }

    if (onFinishRef.current) {
      onFinishRef.current({
        wpm,
        rawWpm,
        accuracy,
        punctuationAccuracy,
        errors,
        correctChars,
        totalKeystrokes,
        blurCount: blurCountRef.current,
        flagged: isAttemptFlagged,
        flagReason: finalReason,
        keystrokes: currentKeystrokes,
        elapsedSeconds: Math.round(effectiveElapsed),
      });
    }
  }, [isPractice]);

  // Synchronized Auto-Starting Clock (when synchronizedStartTime is provided)
  // Time counts down in lockstep across all competitors
  useEffect(() => {
    if (isFinished) return;

    if (synchronizedStartTime) {
      const checkClock = () => {
        const now = Date.now();
        if (now < synchronizedStartTime) {
          setTimeLeft(durationSeconds);
          return;
        }

        const elapsed = (now - synchronizedStartTime) / 1000;
        const remaining = Math.max(0, durationSeconds - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          triggerFinish();
        }
      };

      checkClock();
      timerRef.current = setInterval(checkClock, 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else if (startTime) {
      const checkClock = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, durationSeconds - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          triggerFinish();
        }
      };

      checkClock();
      timerRef.current = setInterval(checkClock, 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setTimeLeft(durationSeconds);
    }
  }, [synchronizedStartTime, startTime, isFinished, durationSeconds, triggerFinish]);

  // Organizer manual conclusion trigger (e.g. Stop Race clicked)
  useEffect(() => {
    if (roundStatus === 'completed' && !isFinished && !isPractice) {
      if (synchronizedStartTime && Date.now() >= synchronizedStartTime) {
        triggerFinish();
      }
    }
  }, [roundStatus, isFinished, isPractice, synchronizedStartTime, triggerFinish]);

  // Handle keyboard inputs
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (isFinished) return;

      // Rule: If competition is locked by admin, CANNOT TYPE!
      if (isLocked) {
        e.preventDefault();
        return;
      }

      // Rule: In official synchronized race, if startAt has not arrived yet, CANNOT TYPE!
      if (synchronizedStartTime && Date.now() < synchronizedStartTime) {
        e.preventDefault();
        return;
      }

      if (!isRaceActive && !isPractice) {
        e.preventDefault();
        return;
      }

      // For practice mode, record first keystroke as start time
      if (!synchronizedStartTime && !startTime) {
        setStartTime(Date.now());
      }

      const key = e.key;

      // Prevent defaults on browser navigation shortcuts during competitive typing
      if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(key)) {
        e.preventDefault();
        return;
      }

      // Handle Backspace
      if (key === 'Backspace') {
        e.preventDefault();
        if (typedText.length === 0) return;

        // Check if backspace is restricted after a space has been finalized
        if (!allowBackspaceAfterSpace) {
          const lastChar = typedText[typedText.length - 1];
          if (lastChar === ' ') {
            return;
          }
        }

        setTypedText(prev => prev.slice(0, -1));
        return;
      }

      // Disallow non-printable multi-char keys (e.g., 'Shift', 'CapsLock', 'Meta')
      if (key.length > 1) return;

      e.preventDefault();

      // Check if participant reached passage end
      if (typedText.length >= passageText.length) {
        return;
      }

      const nextIndex = typedText.length;
      const expectedChar = passageText[nextIndex];
      const isMatch = isCharMatch(key, expectedChar);
      const isError = !isMatch;

      const effectiveStartTime = synchronizedStartTime || startTime || Date.now();
      const nowOffset = Math.max(0, Date.now() - effectiveStartTime);

      const logItem: KeystrokeLogItem = {
        c: key,
        t: Math.round(nowOffset),
        e: isError,
      };

      setKeystrokes(prev => [...prev.slice(-400), logItem]);
      // If key matches expected via normalization (e.g. '-' typed for '—'), append expectedChar so typedText matches passage
      const charToAppend = isMatch ? expectedChar : key;
      const newTyped = typedText + charToAppend;
      setTypedText(newTyped);

      // If user typed the entire passage, finish
      if (newTyped.length >= passageText.length) {
        setTimeout(triggerFinish, 50);
      }
    },
    [
      isFinished,
      isLocked,
      synchronizedStartTime,
      isRaceActive,
      isPractice,
      startTime,
      typedText,
      passageText,
      allowBackspaceAfterSpace,
      triggerFinish,
    ]
  );

  // Live metrics
  const effectiveStart = synchronizedStartTime || startTime;
  const elapsedSecs = effectiveStart && Date.now() >= effectiveStart
    ? Math.max(1, (Date.now() - effectiveStart) / 1000)
    : 1;

  let liveCorrect = 0;
  let liveErrors = 0;
  for (let i = 0; i < typedText.length; i++) {
    if (isCharMatch(typedText[i], passageText[i])) {
      liveCorrect++;
    } else {
      liveErrors++;
    }
  }

  const liveWpm = calculateNetWpm(liveCorrect, elapsedSecs);
  const liveRawWpm = calculateRawWpm(typedText.length, elapsedSecs);
  const liveAccuracy = typedText.length > 0 ? calculateAccuracy(liveCorrect, typedText.length) : 100;
  const livePunctuationAccuracy = calculatePunctuationAccuracy(passageText, typedText);
  const progressPercent = Math.min(100, Math.round((typedText.length / passageText.length) * 100));

  const hasStarted = synchronizedStartTime
    ? Date.now() >= synchronizedStartTime
    : startTime !== null;

  return {
    typedText,
    timeLeft,
    isFinished,
    liveWpm,
    liveRawWpm,
    liveAccuracy,
    livePunctuationAccuracy,
    liveErrors,
    liveCorrect,
    progressPercent,
    blurCount,
    blurWarning,
    setBlurWarning,
    containerRef,
    activeCharRef,
    handleKeyDown,
    hasStarted,
    restart: () => {
      setTypedText('');
      setStartTime(null);
      setTimeLeft(durationSeconds);
      setIsFinished(false);
      setBlurCount(0);
      setBlurWarning(false);
      setKeystrokes([]);
      finishTriggered.current = false;
    },
  };
}
