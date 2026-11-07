import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Play, AlertTriangle, Trophy, RefreshCw, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import { TypingArena } from '../components/arena/TypingArena';
import { CountdownOverlay } from '../components/arena/CountdownOverlay';
import { ResultCard } from '../components/arena/ResultCard';
import { rankAttempts } from '../utils/scoring';
import { Attempt } from '../types';

export const ArenaPage: React.FC = () => {
  const { user, participant } = useAuth();
  const { config, activeRound, userAttempt, submitRaceAttempt, participants, refreshAllData, attempts } = useCompetition();

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [justSubmittedAttempt, setJustSubmittedAttempt] = useState<Attempt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ensure viewport always opens at the top of the race arena
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
  }, []);

  // When round resets, is deleted, or enters countdown, clear any locally cached attempt
  useEffect(() => {
    if (!activeRound || activeRound.status === 'countdown' || activeRound.status === 'created' || activeRound.status === 'reset') {
      setJustSubmittedAttempt(null);
      if (participant?.id && activeRound?.id) {
        try {
          localStorage.removeItem(`innovision_cached_attempt_${activeRound.id}_${participant.id}`);
        } catch {}
      }
    }
  }, [activeRound?.status, activeRound?.id, participant?.id]);

  // High-frequency clock to detect countdown ending at exact millisecond
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Synchronized clock calibration to eliminate device clock skew across 20+ student computers
  const clockOffsetRef = useRef<number>(0);
  useEffect(() => {
    if (activeRound?.countdownStartedAt && activeRound.status === 'countdown') {
      const offset = Date.now() - Number(activeRound.countdownStartedAt);
      if (Math.abs(offset) < 86400000) {
        clockOffsetRef.current = offset;
      }
    } else if (activeRound?.status === 'created' || activeRound?.status === 'reset') {
      clockOffsetRef.current = 0;
    }
  }, [activeRound?.countdownStartedAt, activeRound?.status]);

  // Compute live race and countdown states calibrated to the organizer's clock
  const startAt = activeRound?.startAt ? Number(activeRound.startAt) : null;
  const localStartAt = startAt ? startAt + clockOffsetRef.current : null;

  const isCountdownActive = Boolean(
    activeRound &&
    activeRound.status === 'countdown' &&
    localStartAt &&
    currentTime < localStartAt
  );

  const isRoundTimeExpired = Boolean(
    localStartAt &&
    activeRound?.duration &&
    currentTime >= (localStartAt + activeRound.duration * 1000)
  );

  const isRaceRunning = Boolean(
    activeRound &&
    !isRoundTimeExpired &&
    activeRound.status !== 'completed' &&
    activeRound.status !== 'reset' &&
    (activeRound.status === 'in_progress' || (activeRound.status === 'countdown' && localStartAt && currentTime >= localStartAt))
  );

  // If admin has not started the competition
  const isCompetitionLocked = !isRaceRunning;

  // Load cached attempt on mount if available (guarantees result card recovery across reloads or slow networks)
  useEffect(() => {
    if (participant?.id && activeRound?.id && !userAttempt && !justSubmittedAttempt) {
      if (activeRound.status === 'created' || activeRound.status === 'countdown' || activeRound.status === 'reset') {
        return;
      }
      const cached = localStorage.getItem(`innovision_cached_attempt_${activeRound.id}_${participant.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (startAt && parsed.submittedAt && parsed.submittedAt < (startAt - 2000)) {
            // Stale attempt from a previous sprint: remove it
            localStorage.removeItem(`innovision_cached_attempt_${activeRound.id}_${participant.id}`);
          } else {
            setJustSubmittedAttempt(parsed);
          }
        } catch {}
      }
    }
  }, [participant?.id, activeRound?.id, activeRound?.status, userAttempt, justSubmittedAttempt, startAt]);

  // Handle Race Finish & Official Submission
  const handleOfficialFinish = async (results: any) => {
    if (!participant || !activeRound) return;
    if (submitting) return;

    setSubmitting(true);
    const attemptDocId = `att_${activeRound.id}_${participant.id}`;
    const newAttempt: Omit<Attempt, 'id' | 'submittedAt'> = {
      participantId: participant.id,
      participantName: participant.name,
      department: participant.department,
      year: participant.year,
      rollNo: participant.rollNo || '',
      roundId: activeRound.id,
      wpm: typeof results.wpm === 'number' && !isNaN(results.wpm) ? results.wpm : 0,
      rawWpm: typeof results.rawWpm === 'number' && !isNaN(results.rawWpm) ? results.rawWpm : 0,
      accuracy: typeof results.accuracy === 'number' && !isNaN(results.accuracy) ? results.accuracy : 0,
      punctuationAccuracy: typeof results.punctuationAccuracy === 'number' && !isNaN(results.punctuationAccuracy) ? results.punctuationAccuracy : 0,
      errors: Number(results.errors) || 0,
      correctChars: Number(results.correctChars) || 0,
      totalKeystrokes: Number(results.totalKeystrokes) || 0,
      blurCount: Number(results.blurCount) || 0,
      flagged: Boolean(results.flagged),
      flagReason: String(results.flagReason || ''),
      keystrokes: typeof results.keystrokes === 'string' ? results.keystrokes : JSON.stringify(results.keystrokes || []),
    };

    const fullAttempt: Attempt = {
      id: attemptDocId,
      submittedAt: Date.now(),
      ...newAttempt,
    };

    // 1. Instantly cache in localStorage so user data is NEVER lost
    try {
      localStorage.setItem(`innovision_cached_attempt_${activeRound.id}_${participant.id}`, JSON.stringify(fullAttempt));
    } catch {}

    // 2. Instantly show ResultCard to competitor without waiting on network latency
    setJustSubmittedAttempt(fullAttempt);

    // 3. Dispatch to Firebase with built-in retry and background queue
    try {
      await submitRaceAttempt(newAttempt);
    } catch (err) {
      console.warn('Attempt queued for offline background sync:', err);
    } finally {
      setSubmitting(false);
    }
  };


  // 1. Not registered as participant
  if (!participant) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] bg-[#FBF8F3] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2D9CC] p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF4EC] text-[#C2410C] flex items-center justify-center mx-auto mb-4 border border-[#FDE3D0]">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[#1C1917] mb-2">
            Competitor Badge Required
          </h2>
          <p className="text-sm text-[#5F5852] mb-6">
            Please register your participant profile to receive an official competitor badge before entering the Live Typing Arena.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-sm shadow-md transition-all"
          >
            <span>Register Now</span>
            <Play className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 2. Disqualified
  if (participant.disqualified) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] bg-[#FBF8F3] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-300 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[#1C1917] mb-2">
            Disqualification Notice
          </h2>
          <p className="text-sm text-[#5F5852] mb-6">
            Your competitor profile has been marked disqualified by the event organizers. Please contact the FST faculty coordinator for review.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#1C1917] text-white text-sm font-semibold"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Compute dynamic rank among official submissions
  const currentAttempt = justSubmittedAttempt || userAttempt;
  const roundAttempts = attempts.filter(
    a => a.roundId === (currentAttempt?.roundId || activeRound?.id)
  );
  const ranked = rankAttempts(roundAttempts);
  const myRankIndex = currentAttempt
    ? ranked.findIndex(a => a.participantId === currentAttempt.participantId || a.id === currentAttempt.id)
    : -1;
  const dynamicRank = myRankIndex !== -1 ? myRankIndex + 1 : undefined;

  // 3. Already Submitted Attempt:
  // An attempt is only valid for the current race sprint if it was submitted during or after localStartAt
  const isCurrentAttemptFresh = currentAttempt && localStartAt && currentAttempt.submittedAt
    ? currentAttempt.submittedAt >= (localStartAt - 2000)
    : Boolean(currentAttempt && !localStartAt);

  // Show Result Card ONLY IF:
  // (a) Competitor explicitly finished in this session (justSubmittedAttempt exists and is fresh)
  // (b) OR the round time has expired / round completed AND competitor has a submitted attempt
  const isRoundInPreparation = activeRound?.status === 'created' || activeRound?.status === 'countdown' || activeRound?.status === 'reset';
  const shouldShowResult = !isRoundInPreparation && (
    (justSubmittedAttempt && isCurrentAttemptFresh) ||
    (isCurrentAttemptFresh && !participant.canRetry && (isRoundTimeExpired || activeRound?.status === 'completed'))
  );

  if (shouldShowResult && currentAttempt) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] bg-[#17151F] py-8 px-4 sm:px-6 lg:px-8 text-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-2">
            <span className="text-xs uppercase font-mono tracking-widest text-[#FB923C] font-bold">
              INNOVISION 2026 OFFICIAL SUBMISSION
            </span>
          </div>

          <ResultCard
            attempt={currentAttempt!}
            resultsPublished={config.resultsPublished}
            rank={dynamicRank}
            totalParticipants={participants.length}
            canRetry={participant.canRetry}
            onRetry={() => setJustSubmittedAttempt(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#17151F] text-white py-8 px-4 sm:px-6 lg:px-8">
      {/* Synchronized 10-Second Countdown Overlay */}
      {isCountdownActive && localStartAt && (
        <CountdownOverlay
          startAt={localStartAt}
          onCountdownComplete={() => {
            setCurrentTime(Date.now());
          }}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Arena Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isRaceRunning
                  ? 'bg-[#2F7D4F]/20 text-emerald-400 border-[#2F7D4F]/40 animate-pulse'
                  : isCountdownActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-[#FB923C]/20 text-[#FB923C] border-[#FB923C]/30'
              }`}>
                {isRaceRunning ? '⚡ RACE LIVE IN PROGRESS' : isCountdownActive ? '⏳ 10S COUNTDOWN ACTIVE' : '🔒 OFFICIAL ARENA LOCKED'}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Competitor: <strong className="text-white">{participant.name}</strong> ({participant.rollNo})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Bricolage_Grotesque',sans-serif] text-white">
              {activeRound?.name || 'Awaiting Next Championship Round'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D111C] hover:bg-[#131B2E] text-xs font-mono text-[#38BDF8] border border-white/10 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-[#D99A0B]" />
              <span>Leaderboard</span>
            </Link>
          </div>
        </div>

        {/* Official Race Arena - STABLE KEY so React never unmounts during countdown or race transitions */}
        {activeRound ? (
          <div>
            <TypingArena
              key={`official-${activeRound.id}`}
              passageText={activeRound.passageText}
              passageTitle={activeRound.passageTitle}
              difficulty={activeRound.difficulty}
              durationSeconds={activeRound.duration}
              allowBackspaceAfterSpace={activeRound.allowBackspaceAfterSpace}
              isRaceActive={isRaceRunning}
              isLocked={isCompetitionLocked}
              roundStatus={activeRound.status}
              lockMessage={
                isCountdownActive
                  ? `Countdown in progress! Race unlocks in ${Math.max(0, Math.ceil(((localStartAt || 0) - currentTime) / 1000))}s. All competitors will start simultaneously.`
                  : isRoundTimeExpired || activeRound.status === 'completed'
                  ? 'Official round time has expired. Submissions are finalized. Please await next round from organizer.'
                  : '⚠️ Race Not Started by Admin. The typing arena is locked. When the organizer clicks "Start Race", a 10-second synchronized countdown will unlock all competitors simultaneously.'
              }
              synchronizedStartTime={localStartAt}
              onFinish={handleOfficialFinish}
            />
          </div>
        ) : (
          <div className="rounded-3xl bg-[#0D111C] border border-white/10 p-8 text-center">
            <Clock className="w-10 h-10 text-[#FB923C] mx-auto mb-3" />
            <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-white">
              Awaiting Organizer Round Activation
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Please wait for the organizer to activate an official round in the dashboard. The arena synchronizes automatically in real-time.
            </p>
            <button
              onClick={() => refreshAllData()}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#17151F] hover:bg-[#1E1C2B] text-xs font-mono text-[#38BDF8] border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check for Active Round</span>
            </button>
          </div>
        )}

        {/* Lobby Waiting Status:
            Visible when race has NOT started and countdown is NOT active */}
        {!isRaceRunning && !isCountdownActive && (
          <div className="pt-4 border-t border-white/10">
            {/* Live lobby stats */}
            <div className="rounded-2xl bg-[#0D111C] border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <span className="flex items-center gap-2 text-gray-300">
                <Users className="w-4 h-4 text-[#38BDF8]" />
                <span><strong className="text-white">{participants.length}</strong> competitors checked in</span>
              </span>
              <span className="text-[#FB923C]">
                Official Duration: {activeRound?.duration || 60}s
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Input unlocks automatically after 10s countdown
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
