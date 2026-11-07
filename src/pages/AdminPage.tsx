import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Play,
  Square,
  RotateCcw,
  Plus,
  Users,
  Trophy,
  AlertTriangle,
  Download,
  Search,
  CheckCircle2,
  Trash2,
  UserCheck,
  UserX,
  Maximize2,
  Lock,
  Eye,
  EyeOff,
  Flame,
  Clock,
  Zap,
  Activity,
  Timer,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import { PASSAGES, getRandomPassage } from '../data/passages';
import { generateResultsCSV, rankAttempts, formatTime } from '../utils/scoring';
import { DifficultyLevel, Round, Participant } from '../types';

export const AdminPage: React.FC = () => {
  const { user, isAdmin, signInGoogle, signOut, loginWithOrganizerCode } = useAuth();
  const [organizerPin, setOrganizerPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const {
    config,
    activeRound,
    rounds,
    participants,
    attempts,
    updateConfig,
    createRound,
    activateRound,
    startRoundCountdown,
    stopRound,
    resetRound,
    deleteRound,
    clearActiveRoundData,
    refreshAllData,
    grantRetry,
    disqualifyParticipant,
    deleteParticipantRecord,
    publishResults,
    finalizeUnsubmittedParticipants,
    clearRoundAttempts,
    clearAllAttempts,
    clearAllParticipants,
  } = useCompetition();

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');

  // Round creation modal / panel state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activatingError, setActivatingError] = useState<string | null>(null);
  const [newRoundName, setNewRoundName] = useState('Round 1 — Technical Elimination');
  const [newRoundDifficulty, setNewRoundDifficulty] = useState<DifficultyLevel>('Medium');
  const [selectedPassageId, setSelectedPassageId] = useState(PASSAGES[0].id);
  const [newRoundDuration, setNewRoundDuration] = useState<number>(60);
  const [allowBackspaceAfterSpace, setAllowBackspaceAfterSpace] = useState<boolean>(true);

  // High-frequency clock tick (100ms) for ultra-accurate digital clock
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const roundStartAt = activeRound?.startAt ? Number(activeRound.startAt) : null;
  const roundDurationMs = (activeRound?.duration || 60) * 1000;
  const roundEndAt = roundStartAt ? roundStartAt + roundDurationMs : null;

  const isCountdownPhase = Boolean(roundStartAt && currentTime < roundStartAt);
  const isDurationExpired = Boolean(roundEndAt && currentTime >= roundEndAt);
  const isRaceCurrentlyLive = Boolean(
    activeRound &&
    (activeRound.status === 'in_progress' || (activeRound.status === 'countdown' && !isCountdownPhase)) &&
    !isDurationExpired
  );

  const isRoundEnded = Boolean(
    isDurationExpired ||
    activeRound?.status === 'completed' ||
    config.status === 'finished'
  );

  // 20-second grace window immediately following race timeout to allow concurrent in-flight network writes from all competitors to land safely
  const isPostRaceSyncGracePeriod = Boolean(
    roundEndAt &&
    currentTime >= roundEndAt &&
    currentTime < (roundEndAt + 20000) &&
    activeRound?.status !== 'created' &&
    activeRound?.status !== 'reset'
  );

  const countdownRemainingSeconds = roundStartAt ? Math.max(0, Math.ceil((roundStartAt - currentTime) / 1000)) : 0;
  const raceRemainingSeconds = roundEndAt ? Math.max(0, Math.ceil((roundEndAt - currentTime) / 1000)) : 0;
  const raceElapsedSeconds = roundStartAt
    ? Math.max(0, Math.min(activeRound?.duration || 60, Math.floor((currentTime - roundStartAt) / 1000)))
    : 0;
  const raceProgressPercent = activeRound?.duration
    ? Math.min(100, Math.round((raceElapsedSeconds / activeRound.duration) * 100))
    : 0;

  // Calculate live statistics
  const currentRoundAttempts = activeRound
    ? attempts.filter(a => a.roundId === activeRound.id)
    : attempts;
  const rankedAttempts = rankAttempts(currentRoundAttempts);
  const flaggedAttempts = attempts.filter(a => a.flagged);
  const completedParticipantIds = new Set(currentRoundAttempts.map(a => a.participantId));
  const finishedCount = completedParticipantIds.size;
  const waitingCount = Math.max(0, participants.length - finishedCount);

  // AUTOMATIC STOP ON TIME REACHED:
  // In Approach A, allow competitors who started slightly late to finish their full duration.
  // Conclude the round when:
  // (a) All registered competitors have finished their submission
  // (b) OR the round duration plus a 20-second grace window expires
  useEffect(() => {
    if (!activeRound?.id || !roundEndAt || !roundStartAt) return;
    // CRITICAL: Stop timer should ONLY trigger when race is genuinely 'in_progress' - NEVER during countdown!
    if (activeRound.status !== 'in_progress') return;

    const allFinished = participants.length > 0 && finishedCount >= participants.length;
    const graceExpired = currentTime >= (roundEndAt + 20000);

    if (currentTime >= roundEndAt && (allFinished || graceExpired)) {
      stopRound(activeRound.id);
    }
  }, [currentTime, roundEndAt, roundStartAt, activeRound?.status, activeRound?.id, finishedCount, participants.length]);

  // Handle CSV export
  const handleExportCSV = () => {
    const csvContent = generateResultsCSV(rankedAttempts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `INNOVISION_2026_Typing_Results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe In-App Confirmation Modal (immune to iframe window.confirm suppression)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    warningNote?: string;
    confirmButtonText: string;
    isDanger?: boolean;
    requireTypeConfirm?: boolean;
    typeConfirmKeyword?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmButtonText: 'Confirm',
    onConfirm: () => {},
  });
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  // Safe prompt openers for Admin actions
  const handlePromptClearAllParticipants = () => {
    setTypedConfirmation('');
    setConfirmModal({
      isOpen: true,
      title: 'Clear Database of All Registered Students',
      description: `Are you sure you want to clear the database of all registered students (${participants.length} currently registered), wipe all score attempts, and reset the competition to begin completely fresh from the starting point?`,
      warningNote: 'All student profiles will be wiped from the database, their devices will automatically reset back to the registration screen, and Round 1 will be ready in the lobby.',
      confirmButtonText: 'Yes, Clear Database & Reset to Start',
      isDanger: true,
      requireTypeConfirm: false,
      onConfirm: async () => {
        setIsConfirmingAction(true);
        try {
          const count = participants.length;
          await clearAllParticipants();
          showToast(`Database cleared successfully! ${count} registered students removed. Competition is reset and ready from the starting point.`);
        } catch (err: any) {
          console.error('Error clearing participants:', err);
        } finally {
          setIsConfirmingAction(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handlePromptClearActiveRound = () => {
    if (!activeRound) return;
    setTypedConfirmation('');
    setConfirmModal({
      isOpen: true,
      title: `Clear "${activeRound.name}"`,
      description: 'This will wipe all submitted scores and attempts recorded for this round, and reset the clock back to the lobby state.',
      warningNote: 'Registered participants remain checked in and can take part in this round when launched.',
      confirmButtonText: 'Reset Round & Clear Scores',
      isDanger: true,
      onConfirm: async () => {
        setIsConfirmingAction(true);
        try {
          await clearActiveRoundData(activeRound.id);
          showToast(`Round "${activeRound.name}" scores cleared and reset to lobby!`);
        } catch (err) {
          console.error(err);
        } finally {
          setIsConfirmingAction(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handlePromptDeleteRound = () => {
    if (!activeRound) return;
    setTypedConfirmation('');
    setConfirmModal({
      isOpen: true,
      title: `Delete Round "${activeRound.name}"`,
      description: 'Are you sure you want to completely delete this round from the tournament?',
      warningNote: 'All scores for this round will be purged and competitors will switch to the next available round.',
      confirmButtonText: 'Delete Round Completely',
      isDanger: true,
      onConfirm: async () => {
        setIsConfirmingAction(true);
        try {
          await deleteRound(activeRound.id);
          showToast(`Round "${activeRound.name}" was deleted successfully.`);
        } catch (err) {
          console.error(err);
        } finally {
          setIsConfirmingAction(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handlePromptClearRoundAttempts = () => {
    if (!activeRound) return;
    setTypedConfirmation('');
    setConfirmModal({
      isOpen: true,
      title: `Clear Scores for "${activeRound.name}"`,
      description: `Wipe all ${currentRoundAttempts.length} scores recorded for this round?`,
      warningNote: 'Leaderboard for this round will be reset and participants can re-race fresh.',
      confirmButtonText: `Clear ${currentRoundAttempts.length} Scores`,
      isDanger: true,
      onConfirm: async () => {
        setIsConfirmingAction(true);
        try {
          await clearRoundAttempts(activeRound.id);
          showToast(`Cleared ${currentRoundAttempts.length} scores for "${activeRound.name}".`);
        } catch (err) {
          console.error(err);
        } finally {
          setIsConfirmingAction(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handlePromptClearAllAttempts = () => {
    setTypedConfirmation('');
    setConfirmModal({
      isOpen: true,
      title: 'Purge All Tournament Submissions',
      description: `Purge all ${attempts.length} race submissions recorded across all rounds?`,
      warningNote: 'This resets the entire global leaderboard while keeping participant registrations intact.',
      confirmButtonText: `Purge All ${attempts.length} Submissions`,
      isDanger: true,
      onConfirm: async () => {
        setIsConfirmingAction(true);
        try {
          await clearAllAttempts();
          showToast(`Purged all ${attempts.length} attempts across all rounds.`);
        } catch (err) {
          console.error(err);
        } finally {
          setIsConfirmingAction(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handlePromptDeleteParticipant = (p: Participant) => {
    setTypedConfirmation('');
    setConfirmModal({
      isOpen: true,
      title: `Remove Competitor "${p.name}"`,
      description: `Remove competitor ${p.name} (Roll: ${p.rollNo}) from the tournament roster?`,
      warningNote: 'This will delete their profile and any recorded race score.',
      confirmButtonText: 'Remove Competitor',
      isDanger: true,
      onConfirm: async () => {
        setIsConfirmingAction(true);
        try {
          await deleteParticipantRecord(p.id);
          showToast(`Removed competitor ${p.name}.`);
        } catch (err) {
          console.error(err);
        } finally {
          setIsConfirmingAction(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Crash-safe filter and deduplicate participants by roll number
  const seenRolls = new Set<string>();
  const filteredParticipants = participants
    .filter(p => {
      if (!p) return false;
      const search = searchTerm.trim().toLowerCase();
      const name = String(p.name || '').toLowerCase();
      const roll = String(p.rollNo || '').toLowerCase();
      const email = String(p.email || '').toLowerCase();
      const dept = String(p.department || '');

      const matchesSearch = !search || name.includes(search) || roll.includes(search) || email.includes(search);
      const matchesDept = filterDepartment === 'All' || dept.toLowerCase().includes(filterDepartment.toLowerCase());
      return matchesSearch && matchesDept;
    })
    .filter(p => {
      const rollKey = p.rollNo && p.rollNo.trim() && p.rollNo !== 'N/A'
        ? p.rollNo.trim().toLowerCase()
        : p.id;
      if (seenRolls.has(rollKey)) return false;
      seenRolls.add(rollKey);
      return true;
    });

  // Handle round creation
  const handleCreateRoundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActivating(true);
    setActivatingError(null);

    try {
      const passage = PASSAGES.find(p => p.id === selectedPassageId) || PASSAGES[0];
      await createRound({
        name: newRoundName.trim() || 'Round 1 — Technical Elimination',
        passageId: passage.id,
        passageTitle: passage.title,
        passageText: passage.text,
        difficulty: newRoundDifficulty,
        duration: Number(newRoundDuration) || 60,
        allowBackspaceAfterSpace,
      });
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Failed to create and activate round:', err);
      let errMsg = 'Could not activate round. Please verify database connectivity.';
      try {
        if (err?.message) {
          const parsed = JSON.parse(err.message);
          if (parsed?.error) errMsg = parsed.error;
        }
      } catch (_) {
        if (err?.message) errMsg = err.message;
      }
      setActivatingError(errMsg);
    } finally {
      setIsActivating(false);
    }
  };

  // 1. Organizer Login Guard
  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] bg-[#FBF8F3] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2D9CC] p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF4EC] text-[#C2410C] flex items-center justify-center mx-auto mb-4 border border-[#FDE3D0]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[#1C1917] mb-2">
            Organizer Portal Access
          </h2>
          <p className="text-sm text-[#5F5852] mb-6">
            Restricted to authorized faculty coordinators & IIC administrators for INNOVISION 2026.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => signInGoogle()}
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-[#1C1917] hover:bg-[#3F3A36] text-white font-semibold text-sm transition-all cursor-pointer shadow-sm"
            >
              <Shield className="w-4 h-4 text-[#FB923C]" />
              <span>Sign In with Organizer Google Account</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="flex-shrink mx-3 text-[11px] text-[#5F5852] uppercase font-mono">Or Organizer Passcode</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ok = loginWithOrganizerCode(organizerPin);
                if (!ok) {
                  setPinError('Invalid passcode. Please enter the authorized organizer passcode.');
                }
              }}
              className="space-y-2 text-left"
            >
              <div className="flex gap-2">
                <input
                  type="password"
                  value={organizerPin}
                  onChange={(e) => {
                    setOrganizerPin(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="Organizer PIN"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Unlock
                </button>
              </div>
              {pinError && (
                <p className="text-xs text-rose-600 font-mono">{pinError}</p>
              )}
            </form>

            <p className="text-[11px] text-[#5F5852]">
              Configured admin email:{' '}
              <strong>{import.meta.env.VITE_ADMIN_EMAIL || 'Configured via .env'}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#FBF8F3] text-[#1C1917] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {actionSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccessMessage}</span>
            </div>
            <button
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2D9CC] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C2410C]/15 text-[#9A3412] border border-[#C2410C]/30 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Organizer Control Center
              </span>
              <span className="text-xs text-[#5F5852] font-mono">
                Admin: <strong>{user?.email}</strong>
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-['Bricolage_Grotesque',sans-serif] text-[#1C1917]">
              INNOVISION 2026 Race Management
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={async () => {
                setIsManualSyncing(true);
                await refreshAllData();
                setTimeout(() => setIsManualSyncing(false), 500);
              }}
              disabled={isManualSyncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#F3EDE3] text-[#1C1917] text-xs sm:text-sm font-semibold border border-[#E2D9CC] transition-colors cursor-pointer shadow-xs disabled:opacity-75"
              title="Force instant sync with Firestore database"
            >
              <RefreshCw className={`w-4 h-4 text-[#C2410C] ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'Syncing...' : 'Sync Database'}</span>
            </button>

            <Link
              to="/leaderboard?projector=true"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#17151F] hover:bg-[#0D111C] text-[#38BDF8] text-xs sm:text-sm font-semibold transition-all shadow-sm"
              title="Launch Stage Projector Screen"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Launch Projector Screen</span>
            </Link>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#F3EDE3] text-[#1C1917] text-xs sm:text-sm font-semibold border border-[#E2D9CC] transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-[#C2410C]" />
              <span>Export CSV</span>
            </button>

            <a
              href="/INNOVISION_2026_Type_Racer_Architecture.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#F3EDE3] text-[#1C1917] text-xs sm:text-sm font-semibold border border-[#E2D9CC] transition-colors shadow-xs"
              title="Open print-ready architecture documentation in browser to view or save as PDF"
            >
              <FileText className="w-4 h-4 text-[#2F7D4F]" />
              <span>Docs (HTML/PDF)</span>
            </a>

            <a
              href="/INNOVISION_2026_Type_Racer_Architecture.md"
              download="INNOVISION_2026_Type_Racer_Architecture.md"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#F3EDE3] text-[#1C1917] text-xs sm:text-sm font-semibold border border-[#E2D9CC] transition-colors shadow-xs"
              title="Download Markdown (.md) documentation file"
            >
              <Download className="w-4 h-4 text-[#38BDF8]" />
              <span>Download .MD</span>
            </a>
          </div>
        </div>

        {/* Real-time Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl bg-white border border-[#E2D9CC] p-5 shadow-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#5F5852] block">
              TOTAL REGISTERED
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black font-['Bebas_Neue',sans-serif] text-[#1C1917]">
                {participants.length}
              </span>
              <span className="text-xs text-[#5F5852]">competitors</span>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[#E2D9CC] p-5 shadow-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#5F5852] block">
              SUBMISSIONS RECORDED
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black font-['Bebas_Neue',sans-serif] text-[#2F7D4F]">
                {attempts.length}
              </span>
              <span className="text-xs text-[#5F5852]">completed</span>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[#E2D9CC] p-5 shadow-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#5F5852] block">
              WAITING IN LOBBY
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black font-['Bebas_Neue',sans-serif] text-[#D99A0B]">
                {waitingCount}
              </span>
              <span className="text-xs text-[#5F5852]">typing queue</span>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[#E2D9CC] p-5 shadow-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#5F5852] block">
              FLAGGED FOR AUDIT
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black font-['Bebas_Neue',sans-serif] text-[#C2412D]">
                {flaggedAttempts.length}
              </span>
              <span className="text-xs text-[#5F5852]">anomalies</span>
            </div>
          </div>
        </div>

        {/* Live Race Controller Panel */}
        <div className="rounded-3xl bg-white border border-[#E2D9CC] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2D9CC] pb-5 mb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9A3412]">
                ACTIVE ROUND CONTROLLER
              </span>
              <h2 className="text-2xl font-black font-['Bricolage_Grotesque',sans-serif] text-[#1C1917] mt-1">
                {activeRound?.name || 'No Active Round Configured'}
              </h2>
              {activeRound ? (
                <p className="text-xs text-[#5F5852] font-mono mt-1">
                  Passage: "{activeRound.passageTitle}" • Difficulty: {activeRound.difficulty} • Duration: {activeRound.duration}s
                </p>
              ) : (
                <p className="text-xs text-[#5F5852] font-mono mt-1">
                  Create a new competition round or select an existing one below to begin.
                </p>
              )}

              {/* Quick Round Switcher if multiple rounds exist */}
              {rounds.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-500 font-bold uppercase tracking-wider">
                    Switch Round:
                  </span>
                  <select
                    value={activeRound?.id || ''}
                    onChange={e => e.target.value && activateRound(e.target.value)}
                    className="rounded-lg bg-[#F3EDE3] border border-[#E2D9CC] px-2.5 py-1 text-xs text-[#1C1917] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Choose a round to activate --
                    </option>
                    {rounds.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.difficulty} • {r.duration}s)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setActivatingError(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#1C1917] hover:bg-[#3F3A36] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Round</span>
              </button>
            </div>
          </div>

          {/* Prominent Live Race Clock & Countdown HUD */}
          <div className="mb-6">
            {isCountdownPhase && roundStartAt ? (
              <div className="p-6 rounded-3xl bg-[#FFF4EC] border-2 border-[#C2410C]/40 text-[#7C2D12] shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#C2410C] text-white flex items-center justify-center font-['Bebas_Neue',sans-serif] text-4xl shadow-md animate-pulse">
                    {countdownRemainingSeconds}
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#C2410C] text-white">
                      10s Synchronized Countdown Active
                    </span>
                    <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[#1C1917] mt-1">
                      Competitor Arenas Synchronizing
                    </h3>
                    <p className="text-xs text-[#5F5852] mt-0.5">
                      Keyboards unlock automatically in <strong>{countdownRemainingSeconds} second{countdownRemainingSeconds === 1 ? '' : 's'}</strong>. All competitors start at the exact same moment.
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs uppercase tracking-wider text-[#9A3412] block">Synchronized Clock</span>
                  <span className="text-3xl font-black text-[#C2410C]">
                    00:0{countdownRemainingSeconds}
                  </span>
                </div>
              </div>
            ) : isRaceCurrentlyLive && roundEndAt ? (
              <div className="p-6 rounded-3xl bg-[#17151F] border-2 border-[#38BDF8]/40 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-[#38BDF8]/15 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#0D111C] border border-[#38BDF8]/40 text-[#38BDF8] flex items-center justify-center shadow-lg">
                      <Timer className="w-8 h-8 animate-pulse text-[#FB923C]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Official Race Live
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {activeRound?.duration || 60}s Sprint
                        </span>
                      </div>
                      <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-white">
                        Clock Ticking Automatically Across All Devices
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Typing inputs are live. Scores finalize automatically when the timer reaches 00:00.
                      </p>
                    </div>
                  </div>

                  {/* Big Digital Monospace Clock */}
                  <div className="text-right font-mono">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-[#38BDF8]" /> Time Remaining
                    </span>
                    <div className="text-5xl sm:text-6xl font-black font-['Bebas_Neue',sans-serif] tracking-widest text-[#FB923C] drop-shadow-[0_0_12px_rgba(251,146,60,0.4)]">
                      {formatTime(raceRemainingSeconds)}
                    </div>
                    <span className="text-xs text-gray-400 block -mt-1 font-mono">
                      {raceRemainingSeconds}s remaining
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs font-mono text-gray-400 mb-2">
                    <span>
                      Elapsed: {raceElapsedSeconds}s / {activeRound?.duration || 60}s
                      {currentTime >= (roundEndAt || 0) && (
                        <span className="ml-2 text-amber-400 font-bold animate-pulse">
                          (Waiting for in-flight competitors)
                        </span>
                      )}
                    </span>
                    <span className="text-[#38BDF8] font-bold">{finishedCount} / {participants.length} finished</span>
                  </div>
                  <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FB923C] via-[#F59E0B] to-[#38BDF8] transition-all duration-150 ease-out"
                      style={{ width: `${raceProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : isRoundEnded ? (
              <div className="p-6 rounded-3xl bg-[#0D111C] border-2 border-amber-500/40 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Official Duration Finished
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {activeRound?.duration || 60}s Round Complete
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-white">
                      Race Concluded — Scores Finalized
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      All competitor clocks stopped. Submissions are finalized and displayed in the directory below.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right font-mono mr-2">
                    <span className="text-[10px] uppercase text-gray-400 block">Final Status</span>
                    <span className="text-2xl font-black font-['Bebas_Neue',sans-serif] text-amber-400">
                      00:00 FINISHED
                    </span>
                    <span className="text-[10px] text-amber-300/80 block">
                      {finishedCount} of {participants.length} scored
                    </span>
                  </div>
                </div>
              </div>
            ) : !activeRound ? (
              <div className="p-5 rounded-2xl bg-[#FBF8F3] border border-[#E2D9CC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E2D9CC] flex items-center justify-center text-[#5F5852]">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase text-[#5F5852]">
                      No Round Configured
                    </span>
                    <h4 className="text-sm font-bold text-[#1C1917]">
                      {participants.length} Competitors Checked In to Lobby
                    </h4>
                    <p className="text-xs text-[#5F5852]">
                      Click "Create New Round" above or select an existing round to configure the active competition round.
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-[#5F5852]">Clock Pre-set:</span>
                  <span className="text-xl font-black block text-gray-400 font-['Bebas_Neue',sans-serif]">
                    --:--
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#FBF8F3] border border-[#E2D9CC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E2D9CC] flex items-center justify-center text-[#C2410C]">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase text-[#9A3412]">
                      Round Ready to Launch
                    </span>
                    <h4 className="text-sm font-bold text-[#1C1917]">
                      Duration: {activeRound?.duration || 60}s • {participants.length} Competitors Registered
                    </h4>
                    <p className="text-xs text-[#5F5852]">
                      Click "Start Race" below to trigger the 10-second synchronized countdown.
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-[#5F5852]">Clock Pre-set:</span>
                  <span className="text-xl font-black block text-[#1C1917] font-['Bebas_Neue',sans-serif]">
                    {formatTime(activeRound?.duration || 60)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Triggers */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Start Race with 10s Countdown */}
              <button
                onClick={() => activeRound && startRoundCountdown(activeRound.id)}
                disabled={!activeRound || isRaceCurrentlyLive || isCountdownPhase}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed btn-shimmer-sweep"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {isCountdownPhase
                    ? `Countdown In Progress (${countdownRemainingSeconds}s)...`
                    : isRaceCurrentlyLive
                    ? `Race Live (${formatTime(raceRemainingSeconds)})`
                    : isRoundEnded
                    ? 'Start New Race Sprint (10s Countdown)'
                    : 'Start Race (10s Synchronized Countdown)'}
                </span>
              </button>

              {/* Stop Race */}
              <button
                onClick={() => activeRound && stopRound(activeRound.id)}
                disabled={!activeRound || activeRound.status === 'completed'}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-rose-50 text-[#C2412D] border border-rose-200 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                <span>Stop Race</span>
              </button>

              {/* Reset Round */}
              <button
                onClick={() => activeRound && resetRound(activeRound.id)}
                disabled={!activeRound}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-[#F3EDE3] text-[#3F3A36] border border-[#E2D9CC] text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Lobby</span>
              </button>

              {/* Clear Active Round Data - Wipes Round & Resets Registered Users directly */}
              <button
                onClick={handlePromptClearActiveRound}
                disabled={!activeRound || isRaceCurrentlyLive}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-amber-50 text-[#C2410C] border border-[#FB923C]/50 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Wipe scores for this round and reset registered users to lobby"
              >
                <RotateCcw className="w-4 h-4 text-[#C2410C]" />
                <span>Clear Round (Reset Users)</span>
              </button>

              {/* Delete Round Completely */}
              <button
                onClick={handlePromptDeleteRound}
                disabled={!activeRound || isRaceCurrentlyLive}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Delete this round from tournament"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Delete Round</span>
              </button>

              {/* Publish Results Toggle */}
              <button
                onClick={() => publishResults(!config.resultsPublished)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer border ${
                  config.resultsPublished
                    ? 'bg-[#2F7D4F]/15 text-[#24603D] border-[#2F7D4F]/30 hover:bg-[#2F7D4F]/25'
                    : 'bg-gray-100 text-[#5F5852] border-gray-300 hover:bg-gray-200'
                }`}
              >
                {config.resultsPublished ? (
                  <>
                    <Eye className="w-4 h-4 text-[#2F7D4F]" />
                    <span>Results: Published to Participants</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-gray-500" />
                    <span>Results: Hidden from Participants</span>
                  </>
                )}
              </button>

              {/* Clear Recorded Round Attempts */}
              {currentRoundAttempts.length > 0 && (
                <button
                  onClick={handlePromptClearRoundAttempts}
                  disabled={!activeRound || isRaceCurrentlyLive}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Purge recorded test scores for this round to start fresh"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Clear Round Scores ({currentRoundAttempts.length})</span>
                </button>
              )}

              {/* Clear All Submissions across all rounds */}
              {attempts.length > 0 && (
                <button
                  onClick={handlePromptClearAllAttempts}
                  disabled={isRaceCurrentlyLive}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Wipe all attempt submissions"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Purge All Submissions ({attempts.length})</span>
                </button>
              )}

              {/* Clear Database of Registered Students (Reset to Start) */}
              <button
                onClick={handlePromptClearAllParticipants}
                disabled={isRaceCurrentlyLive}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                title="Clear database of all registered students, wipe attempts, and reset tournament to starting point"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Clear All Students & Reset to Start ({participants.length})</span>
              </button>
            </div>
          </div>
      </div>

        {/* Flagged Attempts Inspection Section */}
        {flaggedAttempts.length > 0 && (
          <div className="rounded-3xl bg-rose-50 border border-rose-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-lg font-bold font-['Bricolage_Grotesque',sans-serif] text-rose-900">
                Anti-Cheat Flagged Submissions ({flaggedAttempts.length})
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {flaggedAttempts.map(fa => (
                <div key={fa.id} className="bg-white p-4 rounded-2xl border border-rose-200 text-xs">
                  <div className="flex justify-between items-start mb-1">
                    <strong className="text-sm font-bold text-gray-900">{fa.participantName}</strong>
                    <span className="font-mono font-bold text-rose-600">{fa.wpm} WPM</span>
                  </div>
                  <p className="text-gray-600">
                    Dept: {fa.department} • Accuracy: {fa.accuracy}% • Blurs: {fa.blurCount}
                  </p>
                  <p className="mt-1 text-rose-700 bg-rose-50 p-1.5 rounded-lg font-mono">
                    <strong>Reason:</strong> {fa.flagReason || 'Excessive tab switches / burst rate anomaly'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => grantRetry(fa.participantId)}
                      className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold transition-colors"
                    >
                      Clear & Grant Retry
                    </button>
                    <button
                      onClick={() => disqualifyParticipant(fa.participantId, true)}
                      className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors"
                    >
                      Disqualify Competitor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants Table */}
        <div className="rounded-3xl bg-white border border-[#E2D9CC] overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 border-b border-[#E2D9CC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Bricolage_Grotesque',sans-serif] font-bold text-xl text-[#1C1917]">
                  Participant Directory & Race Results
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F3EDE3] text-[#9A3412] border border-[#E2D9CC]">
                  {participants.length} Registered
                </span>
              </div>
              <p className="text-xs text-[#5F5852] mt-0.5">
                Manage competitor retries, disqualifications, and score records.
              </p>
            </div>

            {/* Search and sync input */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Clear All Registered Students CTA */}
              <button
                onClick={handlePromptClearAllParticipants}
                disabled={isRaceCurrentlyLive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Clear database of all registered students, wipe attempts, and reset tournament to starting point"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Clear All Students ({participants.length})</span>
              </button>


              <button
                onClick={async () => {
                  setIsManualSyncing(true);
                  await refreshAllData();
                  setTimeout(() => setIsManualSyncing(false), 500);
                }}
                disabled={isManualSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3EDE3] hover:bg-[#E2D9CC] text-xs font-mono text-[#1C1917] transition-colors cursor-pointer"
                title="Sync competitor roster with database"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C2410C] ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Roster</span>
              </button>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name or roll no..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="rounded-full bg-[#F3EDE3] border border-transparent pl-9 pr-4 py-2 text-xs text-[#1C1917] placeholder:text-gray-400 focus:outline-none focus:border-[#1C1917]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2D9CC] bg-[#FBF8F3] font-mono uppercase tracking-wider text-[#5F5852]">
                  <th className="py-3 px-4 sm:px-5">Competitor</th>
                  <th className="py-3 px-3 sm:px-4">Roll No</th>
                  <th className="py-3 px-3 sm:px-4">Department</th>
                  <th className="py-3 px-3 sm:px-4">Net Speed</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Accuracy</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Punctuation</th>
                  <th className="py-3 px-3 sm:px-4">Status</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D9CC]">
                {filteredParticipants.map(p => {
                  const pAttempt =
                    attempts
                      .filter(
                        a =>
                          (a.participantId === p.id || (p.rollNo && a.rollNo === p.rollNo)) &&
                          (!activeRound?.id || a.roundId === activeRound.id)
                      )
                      .sort((a, b) => b.wpm - a.wpm)[0] ||
                    attempts
                      .filter(a => a.participantId === p.id || (p.rollNo && a.rollNo === p.rollNo))
                      .sort((a, b) => b.wpm - a.wpm)[0] ||
                    null;
                  return (
                    <tr key={p.id} className="hover:bg-[#FBF8F3] transition-colors">
                      <td className="py-3.5 px-4 sm:px-5 font-medium text-[#1C1917]">
                        <span className="font-bold block text-sm">{p.name}</span>
                        <span className="text-[11px] text-[#5F5852]">{p.email}</span>
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 font-mono font-bold text-[#3F3A36]">
                        {p.rollNo}
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 text-[#3F3A36]">
                        {p.department} ({p.year})
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 font-mono">
                        {pAttempt ? (
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-bold text-base text-[#C2410C] font-mono">{pAttempt.wpm}</span>
                              <span className="text-[11px] text-gray-500 font-normal">WPM</span>
                            </div>
                            <span className="text-[10px] text-gray-500 block font-mono">
                              Raw: {pAttempt.rawWpm} • Err: {pAttempt.errors}
                            </span>
                          </div>
                        ) : isPostRaceSyncGracePeriod ? (
                          <span className="text-amber-500 font-medium font-mono animate-pulse">
                            ● Syncing score...
                          </span>
                        ) : isRoundEnded ? (
                          <div>
                            <span className="font-bold text-xs text-gray-400 font-mono">Did Not Participate</span>
                            <span className="text-[10px] text-gray-400 block font-mono">No keystrokes</span>
                          </div>
                        ) : isRaceCurrentlyLive ? (
                          <span className="text-emerald-600 font-medium font-mono animate-pulse">
                            ● Racing...
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">In lobby</span>
                        )}
                      </td>

                      {/* Accuracy Dedicated Column */}
                      <td className="py-3.5 px-3 sm:px-4 text-center font-mono">
                        {pAttempt ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            pAttempt.accuracy >= 95
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : pAttempt.accuracy >= 85
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {pAttempt.accuracy}%
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Punctuation Dedicated Column */}
                      <td className="py-3.5 px-3 sm:px-4 text-center font-mono">
                        {pAttempt ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            pAttempt.punctuationAccuracy >= 95
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : pAttempt.punctuationAccuracy >= 85
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {pAttempt.punctuationAccuracy}%
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 sm:px-4">
                        {p.disqualified ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            Disqualified
                          </span>
                        ) : pAttempt ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Score Logged
                          </span>
                        ) : p.canRetry ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            Retry Granted
                          </span>
                        ) : isPostRaceSyncGracePeriod ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            Syncing In-Flight...
                          </span>
                        ) : isRoundEnded ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                            Did Not Participate
                          </span>
                        ) : isRaceCurrentlyLive ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                            Racing Now
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                            Waiting in Lobby
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap space-x-2">
                        {/* Grant retry */}
                        <button
                          onClick={() => grantRetry(p.id)}
                          className="px-2.5 py-1 rounded-md bg-[#F3EDE3] hover:bg-[#E2D9CC] text-[#1C1917] font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Grant an additional race attempt"
                        >
                          Grant Retry
                        </button>

                        {/* Disqualify / Restore */}
                        <button
                          onClick={() => disqualifyParticipant(p.id, !p.disqualified)}
                          className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                            p.disqualified
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {p.disqualified ? 'Restore' : 'Disqualify'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handlePromptDeleteParticipant(p)}
                          className="p-1 rounded-md text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete participant record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredParticipants.length === 0 && (
              <div className="py-12 text-center text-[#5F5852] font-mono text-sm">
                {participants.length === 0 ? (
                  <div>
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-bold text-[#1C1917]">No participants registered yet</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Participants who register via the registration page will automatically appear here in real time. Click "Sync Roster" anytime to refresh.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p>No participants match "{searchTerm}".</p>
                    <p className="text-xs text-gray-500 mt-1">({participants.length} competitors registered total)</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create Championship Round */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E2D9CC]">
              <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[#1C1917] mb-4">
                Create Competition Round
              </h3>

              <form onSubmit={handleCreateRoundSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                    Round Title *
                  </label>
                  <input
                    type="text"
                    value={newRoundName}
                    onChange={e => setNewRoundName(e.target.value)}
                    className="w-full rounded-xl bg-white border border-gray-200 px-3.5 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={newRoundDifficulty}
                      onChange={e => setNewRoundDifficulty(e.target.value as DifficultyLevel)}
                      className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-[#1C1917]"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                      Duration (Seconds)
                    </label>
                    <select
                      value={newRoundDuration}
                      onChange={e => setNewRoundDuration(Number(e.target.value))}
                      className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-[#1C1917]"
                    >
                      <option value={30}>30 Seconds (Sprint)</option>
                      <option value={60}>60 Seconds (Standard)</option>
                      <option value={120}>120 Seconds (Endurance)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                    Select Official Passage (Fair to All Competitors)
                  </label>
                  <select
                    value={selectedPassageId}
                    onChange={e => setSelectedPassageId(e.target.value)}
                    className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-[#1C1917]"
                  >
                    {PASSAGES.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.difficulty}] {p.title} ({p.wordCount} words)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="backspaceRule"
                    checked={allowBackspaceAfterSpace}
                    onChange={e => setAllowBackspaceAfterSpace(e.target.checked)}
                    className="rounded text-[#C2410C] focus:ring-[#C2410C]"
                  />
                  <label htmlFor="backspaceRule" className="text-xs text-[#3F3A36]">
                    Allow backspacing after a space has been finalized
                  </label>
                </div>

                {activatingError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                    <strong>Error:</strong> {activatingError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isActivating}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActivating}
                    className="px-6 py-2.5 rounded-full bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isActivating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Activating Round...</span>
                      </>
                    ) : (
                      <span>Activate Round</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* In-App Confirmation Modal (100% immune to iframe popup suppression) */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E2D9CC]">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmModal.isDanger
                      ? 'bg-rose-50 border border-rose-200 text-rose-600'
                      : 'bg-amber-50 border border-amber-200 text-amber-600'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-['Bricolage_Grotesque',sans-serif] text-[#1C1917]">
                    {confirmModal.title}
                  </h3>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#9A3412]">
                    Organizer Action Required
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#5F5852] mb-3 leading-relaxed">
                {confirmModal.description}
              </p>

              {confirmModal.warningNote && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mb-4 leading-normal">
                  <strong className="font-semibold block mb-0.5">Please Note:</strong>
                  {confirmModal.warningNote}
                </div>
              )}

              {confirmModal.requireTypeConfirm && (
                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                    Type <span className="font-mono text-rose-600 font-black">{confirmModal.typeConfirmKeyword}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={typedConfirmation}
                    onChange={e => setTypedConfirmation(e.target.value)}
                    placeholder={`Type ${confirmModal.typeConfirmKeyword} here...`}
                    className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={isConfirmingAction}
                  className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[#1C1917] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmModal.onConfirm()}
                  disabled={
                    isConfirmingAction ||
                    (confirmModal.requireTypeConfirm && typedConfirmation.trim().toUpperCase() !== confirmModal.typeConfirmKeyword)
                  }
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    confirmModal.isDanger
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#C2410C] hover:bg-[#9A3412]'
                  }`}
                >
                  {isConfirmingAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{confirmModal.confirmButtonText}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
