import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Trophy, Zap, Target, AlertTriangle, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';
import { TiltCard } from '../common/TiltCard';
import { MagneticButton } from '../common/MagneticButton';
import { Attempt } from '../../types';

interface ResultCardProps {
  attempt: Attempt;
  resultsPublished: boolean;
  rank?: number;
  totalParticipants?: number;
  onRetry?: () => void;
  canRetry?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  attempt,
  resultsPublished,
  rank,
  totalParticipants,
  onRetry,
  canRetry,
}) => {
  const effectiveRank = rank || attempt.rank;

  // Fire confetti burst in DESIGN.md palette upon mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C2410C', '#2456A6', '#2F7D4F', '#D99A0B', '#FB923C'],
      });
    } catch (e) {
      // safe fallback if confetti blocked
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto my-6 px-4">
      {/* Prominent Results Published Announcement Banner */}
      {resultsPublished && (
        <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-[#D99A0B]/20 via-[#FB923C]/20 to-[#C2410C]/20 border-2 border-[#D99A0B] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D99A0B] text-black flex items-center justify-center font-black text-2xl shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#D99A0B] font-bold block">
                ORGANIZER ANNOUNCEMENT
              </span>
              <h3 className="text-lg font-bold text-white font-['Bricolage_Grotesque',sans-serif]">
                Official Competition Results Published!
              </h3>
              <p className="text-xs text-gray-300">
                {effectiveRank
                  ? `You achieved Rank #${effectiveRank}${totalParticipants ? ` out of ${totalParticipants} competitors` : ''}!`
                  : 'Final scores and tournament rankings are live on the leaderboard.'}
              </p>
            </div>
          </div>
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D99A0B] hover:bg-[#F59E0B] text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
          >
            <span>View Full Leaderboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <TiltCard className="rounded-3xl bg-[#0D111C] border border-white/10 p-6 sm:p-10 shadow-2xl text-white">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/30">
                Official Attempt Logged
              </span>
              {attempt.flagged ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C2412D]/20 text-[#FB923C] border border-[#C2412D]/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-[#C2412D]" /> Review Flag
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2F7D4F]/20 text-[#38BDF8] border border-[#2F7D4F]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#2F7D4F]" /> Verified
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-['Bricolage_Grotesque',sans-serif] text-white">
              Race Completed, {attempt.participantName}!
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Department of {attempt.department} • {attempt.year} Year
            </p>
          </div>

          {/* Hero Net WPM Pill */}
          <div className="flex flex-col items-center justify-center bg-[#17151F] border border-[#FB923C]/30 rounded-2xl px-6 py-4 shadow-lg shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#FB923C] font-mono">
              NET WPM
            </span>
            <span className="text-4xl sm:text-5xl font-black font-['Bebas_Neue',sans-serif] text-white">
              {attempt.wpm}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Accuracy */}
          <div className="bg-[#111726] border border-white/5 rounded-2xl p-4 text-center">
            <Target className="w-4 h-4 text-[#38BDF8] mx-auto mb-1" />
            <span className="text-[10px] uppercase font-mono text-gray-400">Accuracy</span>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
              {attempt.accuracy}%
            </p>
          </div>

          {/* Punctuation Accuracy */}
          <div className="bg-[#111726] border border-white/5 rounded-2xl p-4 text-center">
            <Zap className="w-4 h-4 text-[#D99A0B] mx-auto mb-1" />
            <span className="text-[10px] uppercase font-mono text-gray-400">Punctuation</span>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
              {attempt.punctuationAccuracy}%
            </p>
          </div>

          {/* Raw WPM */}
          <div className="bg-[#111726] border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-[10px] uppercase font-mono text-gray-400">Raw Speed</span>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {attempt.rawWpm}
            </p>
            <span className="text-[9px] text-gray-500 font-mono">wpm</span>
          </div>

          {/* Errors */}
          <div className="bg-[#111726] border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-[10px] uppercase font-mono text-gray-400">Errors</span>
            <p className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${attempt.errors > 0 ? 'text-[#FB923C]' : 'text-emerald-400'}`}>
              {attempt.errors}
            </p>
            <span className="text-[9px] text-gray-500 font-mono">keystrokes</span>
          </div>
        </div>

        {/* Rank State Banner */}
        <div className="bg-[#17151F] border border-white/10 rounded-2xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-[#D99A0B] shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">
                {resultsPublished
                  ? effectiveRank
                    ? `Official Standing: Rank #${effectiveRank}${totalParticipants ? ` of ${totalParticipants}` : ''}`
                    : 'Official Results Published • View on Leaderboard'
                  : 'Official Rankings Pending Organizer Publication'}
              </p>
              <p className="text-xs text-gray-400">
                {resultsPublished
                  ? 'Leaderboard positions are finalized for this round.'
                  : 'Scores are recorded. Organizers will publish final rankings shortly.'}
              </p>
            </div>
          </div>
          {effectiveRank && resultsPublished && (
            <div className="w-10 h-10 rounded-full bg-[#D99A0B]/20 text-[#D99A0B] border border-[#D99A0B]/40 flex items-center justify-center font-bold text-lg font-['Bebas_Neue',sans-serif]">
              #{effectiveRank}
            </div>
          )}
        </div>

        {/* Flag warning if any */}
        {attempt.flagged && (
          <div className="mb-6 p-3 rounded-xl bg-[#C2412D]/10 border border-[#C2412D]/30 text-xs text-[#FB923C] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#C2412D]" />
            <span>
              <strong>Organizer Review:</strong> {attempt.flagReason || 'Attempt flagged for speed burst or tab switching anomalies.'} Your score has been submitted for verification.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#1C1917] hover:bg-[#3F3A36] text-white text-sm font-semibold border border-white/20 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#FB923C]" />
              <span>Retry Race (Granted)</span>
            </button>
          )}

          <Link
            to="/leaderboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-bold shadow-lg shadow-black/30 transition-all cursor-pointer"
          >
            <span>View Live Leaderboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </TiltCard>
    </div>
  );
};
