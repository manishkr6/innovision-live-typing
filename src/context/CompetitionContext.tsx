import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CompetitionConfig, Round, Attempt, Participant } from '../types';
import { useAuth } from './AuthContext';
import { getRandomPassage } from '../data/passages';
import { appCache, savePendingAttempt, getPendingAttempts, removePendingAttempt } from '../utils/cache';

interface CompetitionContextType {
  config: CompetitionConfig;
  activeRound: Round | null;
  rounds: Round[];
  userAttempt: Attempt | null;
  attempts: Attempt[];
  participants: Participant[];
  loadingConfig: boolean;
  serverTimeOffset: number;
  syncNow: () => number;
  refreshAllData: (force?: boolean) => Promise<void>;

  // Admin controls
  updateConfig: (data: Partial<CompetitionConfig>) => Promise<void>;
  createRound: (roundData: Partial<Round>) => Promise<string>;
  activateRound: (roundId: string) => Promise<void>;
  startRoundCountdown: (roundId: string) => Promise<void>;
  stopRound: (roundId: string) => Promise<void>;
  resetRound: (roundId: string) => Promise<void>;
  deleteRound: (roundId: string) => Promise<void>;
  clearActiveRoundData: (roundId: string) => Promise<void>;
  submitRaceAttempt: (attemptData: Omit<Attempt, 'id' | 'submittedAt'>) => Promise<string>;
  grantRetry: (participantId: string) => Promise<void>;
  disqualifyParticipant: (participantId: string, disqualified: boolean) => Promise<void>;
  deleteParticipantRecord: (participantId: string) => Promise<void>;
  publishResults: (published: boolean) => Promise<void>;
  finalizeUnsubmittedParticipants: (roundId?: string) => Promise<void>;
  clearRoundAttempts: (roundId?: string) => Promise<void>;
  clearAllAttempts: () => Promise<void>;
  clearAllParticipants: () => Promise<void>;
  seedRealParticipants: () => Promise<void>;
  addParticipantOptimistic: (participant: Participant) => void;
}

const DEFAULT_CONFIG: CompetitionConfig = {
  status: 'registration_open',
  activeRoundId: null,
  resultsPublished: false,
  announcement: 'Welcome to INNOVISION 2026 Live Typing Arena! Registration is currently open.',
};

export const parseTime = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  }
  return 0;
};

export const mapParticipantDoc = (id: string, data: any): Participant => ({
  id,
  name: String(data?.name || '').trim(),
  email: String(data?.email || '').trim(),
  rollNo: String(data?.rollNo || '').trim(),
  department: String(data?.department || 'General').trim(),
  year: String(data?.year || '1st Year').trim(),
  phone: String(data?.phone || '').trim(),
  canRetry: Boolean(data?.canRetry),
  disqualified: Boolean(data?.disqualified),
  createdAt: data?.createdAt || (data?.registeredAt?.toDate?.() ? data.registeredAt.toDate().toISOString() : new Date().toISOString()),
});

const CompetitionContext = createContext<CompetitionContextType | undefined>(undefined);

export const CompetitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, participant } = useAuth();
  const [config, setConfig] = useState<CompetitionConfig>(DEFAULT_CONFIG);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [userAttempt, setUserAttempt] = useState<Attempt | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>(() => {
    try {
      const cached = localStorage.getItem('innovision_cached_attempts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [participants, setParticipants] = useState<Participant[]>(() => {
    try {
      const cached = localStorage.getItem('innovision_cached_participants');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [serverTimeOffset] = useState<number>(0);

  // Sync current client timestamp
  const syncNow = () => Date.now() + serverTimeOffset;

  const isRefreshingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);

  // Helper to fetch all fresh data from Firestore directly (initial load / re-focus / manual sync)
  const refreshAllData = async (force: boolean = true) => {
    // Prevent duplicate concurrent requests (Request Deduplication)
    if (isRefreshingRef.current) return;

    // Sensible TTL throttle for background/window-focus syncs (45 seconds)
    // Forced syncs (e.g., initial load or manual admin "Sync Roster") bypass this throttle
    const now = Date.now();
    if (!force && lastSyncTimeRef.current && (now - lastSyncTimeRef.current < 45000)) {
      return;
    }

    isRefreshingRef.current = true;
    lastSyncTimeRef.current = now;

    try {
      // 1. Fetch config
      const configDocRef = doc(db, 'config', 'competition');
      const cfgSnap = await getDoc(configDocRef);
      let currentActiveId: string | null = config.activeRoundId;
      if (cfgSnap.exists()) {
        const remoteConfig = cfgSnap.data() as CompetitionConfig;
        setConfig(remoteConfig);
        currentActiveId = remoteConfig.activeRoundId || null;
      }

      // 2. Fetch rounds
      const roundsCol = collection(db, 'rounds');
      const roundsSnap = await getDocs(roundsCol);
      const roundList: Round[] = [];
      roundsSnap.forEach(d => {
        roundList.push({ id: d.id, ...(d.data() as any) });
      });
      setRounds(roundList);

      // 3. Resolve active round intelligently
      // Priority: (a) Live round in countdown/in_progress, (b) Configured round from admin config
      const liveRound = roundList.find(r => r.status === 'countdown' || r.status === 'in_progress');
      const configuredRound = currentActiveId ? roundList.find(r => r.id === currentActiveId) : null;
      const targetRound = liveRound || configuredRound || null;

      setActiveRound(targetRound);
      if (!targetRound) {
        setUserAttempt(null);
      } else {
        if (liveRound && currentActiveId !== targetRound.id) {
          setDoc(configDocRef, { activeRoundId: targetRound.id, status: 'live' }, { merge: true }).catch(() => {});
        }
      }

      // 4. Fetch registered participants
      const partsSnap = await getDocs(collection(db, 'participants'));
      const partsList: Participant[] = [];
      partsSnap.forEach(d => {
        partsList.push(mapParticipantDoc(d.id, d.data()));
      });
      partsList.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
      setParticipants(partsList);
      try {
        localStorage.setItem('innovision_cached_participants', JSON.stringify(partsList));
      } catch {}

      // 5. Fetch attempts with safe Map merge to prevent clobbering real-time WebSocket updates
      const attsSnap = await getDocs(collection(db, 'attempts'));
      const attsList: Attempt[] = [];
      attsSnap.forEach(d => {
        attsList.push({ id: d.id, ...(d.data() as any) });
      });
      setAttempts(prev => {
        const map = new Map<string, Attempt>();
        // Add existing in-flight / optimistic attempts first
        prev.forEach(a => map.set(a.id, a));
        // Add fresh server attempts
        attsList.forEach(a => map.set(a.id, a));
        const merged = Array.from(map.values());
        try {
          localStorage.setItem('innovision_cached_attempts', JSON.stringify(merged));
        } catch {}
        return merged;
      });

      // Sync user attempt
      const currentCompetitorId = participant?.id || user?.uid;
      const effectiveRoundId = targetRound?.id || currentActiveId;
      if (currentCompetitorId && effectiveRoundId) {
        const myAttempt = attsList.find(
          a => a.participantId === currentCompetitorId && a.roundId === effectiveRoundId
        );
        setUserAttempt(myAttempt || null);
      } else {
        setUserAttempt(null);
      }
    } catch (err) {
      console.warn('refreshAllData notice:', err);
    } finally {
      isRefreshingRef.current = false;
      setLoadingConfig(false);
    }
  };

  // Perform initial fetch on mount and throttled re-sync on window focus/visibility change.
  // Note: Continuous real-time updates are handled seamlessly via onSnapshot listeners below,
  // completely eliminating expensive polling intervals.
  useEffect(() => {
    refreshAllData(true);

    const handleFocus = () => {
      refreshAllData(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [participant?.id, user?.uid]);

  // Real-time listener: Competition config
  useEffect(() => {
    const configDocRef = doc(db, 'config', 'competition');
    const unsub = onSnapshot(
      configDocRef,
      snap => {
        if (snap.exists()) {
          const cfg = snap.data() as CompetitionConfig;
          setConfig(cfg);
          // If active round was unselected or deleted by organizer, clear active round
          if (!cfg.activeRoundId) {
            setActiveRound(null);
            setUserAttempt(null);
          }
        }
      },
      err => console.warn('Config onSnapshot notice:', err.message)
    );
    return () => unsub();
  }, []);

  // Real-time listener: Rounds collection
  useEffect(() => {
    const roundsCol = collection(db, 'rounds');
    const unsub = onSnapshot(
      roundsCol,
      snap => {
        const list: Round[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        setRounds(list);

        // If no rounds exist in tournament database, immediately clear active state
        if (list.length === 0) {
          setActiveRound(null);
          setUserAttempt(null);
          return;
        }

        const configuredRound = config.activeRoundId ? list.find(r => r.id === config.activeRoundId) : null;
        const liveRound = list.find(r => (r.status === 'countdown' || r.status === 'in_progress') && (!config.activeRoundId || r.id === config.activeRoundId));
        const matching = liveRound || configuredRound || null;
        setActiveRound(matching);
        if (!matching) {
          setUserAttempt(null);
        }
      },
      err => console.warn('Rounds onSnapshot notice:', err.message)
    );
    return () => unsub();
  }, [config.activeRoundId]);

  // Real-time listener: Single active round doc for instant millisecond countdown trigger
  useEffect(() => {
    const targetId = activeRound?.id || config.activeRoundId;
    if (!targetId) return;

    const roundRef = doc(db, 'rounds', targetId);
    const unsub = onSnapshot(
      roundRef,
      snap => {
        if (snap.exists()) {
          const rData = { id: snap.id, ...(snap.data() as any) } as Round;
          setActiveRound(rData);
        } else {
          // Active round document was deleted from Firestore!
          setActiveRound(null);
          setUserAttempt(null);
        }
      },
      err => console.warn('Active round onSnapshot notice:', err.message)
    );
    return () => unsub();
  }, [activeRound?.id, config.activeRoundId]);

  // Real-time listener: Registered participants roster
  useEffect(() => {
    const participantsCol = collection(db, 'participants');
    const unsub = onSnapshot(
      participantsCol,
      { includeMetadataChanges: true },
      snap => {
        const list: Participant[] = [];
        snap.forEach(d => {
          list.push(mapParticipantDoc(d.id, d.data()));
        });
        list.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
        setParticipants(list);
        try {
          localStorage.setItem('innovision_cached_participants', JSON.stringify(list));
        } catch {}
      },
      err => console.warn('Participants onSnapshot notice:', err.message)
    );
    return () => unsub();
  }, []);

  // Real-time listener: Attempts with offline caching and deduplication
  useEffect(() => {
    const attemptsCol = collection(db, 'attempts');
    const unsub = onSnapshot(
      attemptsCol,
      { includeMetadataChanges: true },
      snap => {
        const items: Attempt[] = [];
        snap.forEach(d => {
          items.push({ id: d.id, ...(d.data() as any) });
        });

        // Safely merge incoming attempts with optimistic local attempts
        setAttempts(prev => {
          const map = new Map<string, Attempt>();
          // 1. Keep optimistic local attempts
          prev.forEach(a => map.set(a.id, a));
          // 2. Add / overwrite with authoritative server documents
          items.forEach(a => map.set(a.id, a));
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('innovision_cached_attempts', JSON.stringify(merged));
          } catch {}
          return merged;
        });

        const currentCompetitorId = participant?.id || user?.uid;
        const roundId = activeRound?.id || config.activeRoundId;
        if (currentCompetitorId && roundId) {
          const myAttempt = items.find(
            a => a.participantId === currentCompetitorId && a.roundId === roundId
          );
          setUserAttempt(myAttempt || null);
        } else {
          setUserAttempt(null);
        }
      },
      err => console.warn('Attempts onSnapshot notice:', err.message)
    );
    return () => unsub();
  }, [participant?.id, user?.uid, activeRound?.id, config.activeRoundId]);

  // Background offline attempt sync worker:
  // Automatically flushes any locally cached pending attempts to Firestore when online or periodically
  useEffect(() => {
    const flushQueue = async () => {
      const pending = getPendingAttempts();
      if (pending.length === 0) return;

      for (const a of pending) {
        try {
          const docId = a.id || `att_${a.roundId}_${a.participantId}`;
          await setDoc(doc(db, 'attempts', docId), {
            ...a,
            submittedAt: serverTimestamp(),
          }, { merge: true });
          removePendingAttempt(a.participantId, a.roundId);
        } catch (e) {
          // Still offline or network congested; attempt remains in queue for next cycle
        }
      }
    };

    window.addEventListener('online', flushQueue);
    const interval = setInterval(flushQueue, 5000);

    return () => {
      window.removeEventListener('online', flushQueue);
      clearInterval(interval);
    };
  }, []);

  // Admin action: Update configuration (using setDoc with merge so it creates config if missing)
  const updateConfig = async (data: Partial<CompetitionConfig>) => {
    // 1. Optimistic local state update first
    setConfig(prev => ({
      ...prev,
      ...data,
    }));

    try {
      const configRef = doc(db, 'config', 'competition');
      await Promise.race([
        setDoc(
          configRef,
          {
            ...data,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Config write timed out')), 6000)),
      ]);
    } catch (err) {
      console.warn('Config write firestore notice:', err);
    }
  };

  // Admin action: Create new round and activate it
  const createRound = async (roundData: Partial<Round>): Promise<string> => {
    const newRoundRef = doc(collection(db, 'rounds'));
    const fullRound: Round = {
      id: newRoundRef.id,
      name: String(roundData.name || 'New Championship Round').trim(),
      passageId: String(roundData.passageId || 'easy-1'),
      passageTitle: String(roundData.passageTitle || 'Default Passage'),
      passageText: String(roundData.passageText || 'The quick brown fox jumps over the lazy dog.'),
      difficulty: (roundData.difficulty as any) || 'Medium',
      duration: Number(roundData.duration) || 60,
      allowBackspaceAfterSpace: roundData.allowBackspaceAfterSpace ?? true,
      status: 'created',
      createdAt: serverTimestamp(),
    };

    // 1. Instantly update local state so the UI transitions without any lag
    setActiveRound(fullRound);
    setRounds(prev => [fullRound, ...prev.filter(r => r.id !== newRoundRef.id)]);

    // 2. Persist to Firestore with timeout guard
    try {
      await Promise.race([
        setDoc(newRoundRef, fullRound),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Round creation timed out')), 6000)),
      ]);
    } catch (err) {
      console.warn('Round creation write notice (persisted optimistically):', err);
    }

    // 3. Make active in competition config
    try {
      await updateConfig({
        activeRoundId: newRoundRef.id,
        status: 'waiting',
      });
    } catch (err) {
      console.warn('Update config notice:', err);
    }

    return newRoundRef.id;
  };

  // Admin action: Activate an existing round
  const activateRound = async (roundId: string) => {
    const targetRound = rounds.find(r => r.id === roundId);
    if (targetRound) {
      setActiveRound(targetRound);
    }
    setConfig(prev => ({ ...prev, activeRoundId: roundId, status: 'waiting' }));
    try {
      await setDoc(doc(db, 'config', 'competition'), { activeRoundId: roundId, status: 'waiting' }, { merge: true });
    } catch (e) {
      console.warn('activateRound notice:', e);
    }
  };

  // Admin action: Start synchronized 10-second countdown
  const startRoundCountdown = async (roundId: string) => {
    try {
      const countdownStartedAt = Date.now();
      const targetStartAt = countdownStartedAt + 10000; // 10 seconds in future
      const roundRef = doc(db, 'rounds', roundId);
      const configRef = doc(db, 'config', 'competition');

      // 1. Wipe previous attempts for this round so all competitors race clean
      const roundAttempts = attempts.filter(a => a.roundId === roundId);
      for (const a of roundAttempts) {
        await deleteDoc(doc(db, 'attempts', a.id)).catch(() => {});
      }
      setAttempts(prev => prev.filter(a => a.roundId !== roundId));
      setUserAttempt(null);
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`innovision_cached_attempt_${roundId}`)) {
            localStorage.removeItem(key);
          }
        });
      } catch {}

      // Optimistic instant state update for immediate UI feedback
      setActiveRound(prev => (prev && prev.id === roundId ? { ...prev, status: 'countdown', startAt: targetStartAt, countdownStartedAt } : prev));
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, status: 'countdown', startAt: targetStartAt, countdownStartedAt } : r));
      setConfig(prev => ({ ...prev, status: 'live', activeRoundId: roundId }));

      // Concurrently persist to Firestore
      await Promise.all([
        setDoc(roundRef, { status: 'countdown', startAt: targetStartAt, countdownStartedAt }, { merge: true }),
        setDoc(configRef, { status: 'live', activeRoundId: roundId }, { merge: true }),
      ]);

      // Automatically transition to in_progress when 10 seconds elapse
      setTimeout(async () => {
        try {
          await Promise.all([
            setDoc(roundRef, { status: 'in_progress' }, { merge: true }),
            setDoc(configRef, { status: 'live', activeRoundId: roundId }, { merge: true }),
          ]);
          setActiveRound(prev => (prev && prev.id === roundId ? { ...prev, status: 'in_progress' } : prev));
        } catch (e) {
          console.warn('Auto transition to in_progress notice:', e);
        }
      }, 10000);
    } catch (err) {
      console.error('startRoundCountdown notice:', err);
    }
  };

  // Admin action: Stop race
  const stopRound = async (roundId: string) => {
    try {
      const roundRef = doc(db, 'rounds', roundId);
      const configRef = doc(db, 'config', 'competition');

      setActiveRound(prev => (prev && prev.id === roundId ? { ...prev, status: 'completed' } : prev));
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, status: 'completed' } : r));
      setConfig(prev => ({ ...prev, status: 'finished' }));

      await Promise.all([
        setDoc(roundRef, { status: 'completed' }, { merge: true }),
        setDoc(configRef, { status: 'finished' }, { merge: true }),
      ]);
    } catch (err) {
      console.error('stopRound notice:', err);
    }
  };

  // Admin action: Reset round to lobby state
  const resetRound = async (roundId: string) => {
    try {
      const roundRef = doc(db, 'rounds', roundId);
      const configRef = doc(db, 'config', 'competition');

      // Clear attempts for this round so all competitors return to lobby clean
      const roundAttempts = attempts.filter(a => a.roundId === roundId);
      for (const a of roundAttempts) {
        await deleteDoc(doc(db, 'attempts', a.id)).catch(() => {});
      }

      setActiveRound(prev => (prev && prev.id === roundId ? { ...prev, status: 'created', startAt: null as any } : prev));
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, status: 'created', startAt: null as any } : r));
      setAttempts(prev => prev.filter(a => a.roundId !== roundId));
      setUserAttempt(null);
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`innovision_cached_attempt_${roundId}`)) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
      setConfig(prev => ({ ...prev, status: 'waiting' }));

      await Promise.all([
        setDoc(roundRef, { status: 'created', startAt: null }, { merge: true }),
        setDoc(configRef, { status: 'waiting' }, { merge: true }),
      ]);
    } catch (err) {
      console.error('resetRound notice:', err);
    }
  };

  // Admin action: Delete a round completely and clear attempts for it
  const deleteRound = async (roundId: string) => {
    try {
      // 1. Delete round doc
      await deleteDoc(doc(db, 'rounds', roundId));

      // 2. Delete all attempts associated with this round
      const roundAttempts = attempts.filter(a => a.roundId === roundId);
      for (const a of roundAttempts) {
        await deleteDoc(doc(db, 'attempts', a.id)).catch(() => {});
      }

      // 3. Update remaining rounds list
      const remaining = rounds.filter(r => r.id !== roundId);
      setRounds(remaining);
      setAttempts(prev => prev.filter(a => a.roundId !== roundId));

      // 4. If deleted round was active, pick next or null
      if (activeRound?.id === roundId || config.activeRoundId === roundId) {
        const nextRound = remaining.length > 0 ? remaining[0] : null;
        setActiveRound(nextRound);
        setUserAttempt(null);
        await setDoc(
          doc(db, 'config', 'competition'),
          {
            activeRoundId: nextRound ? nextRound.id : null,
            status: nextRound ? 'waiting' : 'registration_open',
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.error('deleteRound notice:', err);
    }
  };

  // Admin action: Clear / Wipe active round data so all participants are reset to lobby fresh
  const clearActiveRoundData = async (roundId: string) => {
    try {
      const roundRef = doc(db, 'rounds', roundId);
      const configRef = doc(db, 'config', 'competition');

      // 1. Reset round status and clock in Firestore
      await setDoc(roundRef, { status: 'created', startAt: null }, { merge: true });
      await setDoc(configRef, { status: 'waiting', resultsPublished: false }, { merge: true });

      // 2. Delete all recorded attempts for this round
      const roundAttempts = attempts.filter(a => a.roundId === roundId);
      for (const a of roundAttempts) {
        await deleteDoc(doc(db, 'attempts', a.id)).catch(() => {});
      }

      // 3. Optimistically clear local states so both admin and users immediately reflect the fresh reset
      setActiveRound(prev => (prev && prev.id === roundId ? { ...prev, status: 'created', startAt: null as any } : prev));
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, status: 'created', startAt: null as any } : r));
      setAttempts(prev => prev.filter(a => a.roundId !== roundId));
      setUserAttempt(null);
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`innovision_cached_attempt_${roundId}`)) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
      setConfig(prev => ({ ...prev, status: 'waiting', resultsPublished: false }));
    } catch (err) {
      console.error('clearActiveRoundData notice:', err);
    }
  };

  // Participant action: Submit official race score
  const submitRaceAttempt = async (attemptData: Omit<Attempt, 'id' | 'submittedAt'>): Promise<string> => {
    const currentParticipantId = attemptData.participantId || participant?.id || user?.uid;
    if (!currentParticipantId) throw new Error('Must be a registered competitor to submit attempt');

    // Strictly sanitize payload to eliminate any undefined values that break Firestore
    const sanitizedAttempt = {
      participantId: String(currentParticipantId),
      participantName: String(attemptData.participantName || participant?.name || 'Competitor'),
      department: String(attemptData.department || participant?.department || 'General'),
      year: String(attemptData.year || participant?.year || '1st Year'),
      rollNo: String(attemptData.rollNo || participant?.rollNo || 'N/A'),
      roundId: String(attemptData.roundId || config.activeRoundId || ''),
      wpm: typeof attemptData.wpm === 'number' && !isNaN(attemptData.wpm) ? Math.max(0, Math.min(400, attemptData.wpm)) : 0,
      rawWpm: typeof attemptData.rawWpm === 'number' && !isNaN(attemptData.rawWpm) ? Math.max(0, Math.min(500, attemptData.rawWpm)) : 0,
      accuracy: typeof attemptData.accuracy === 'number' && !isNaN(attemptData.accuracy) ? Math.max(0, Math.min(100, attemptData.accuracy)) : 0,
      punctuationAccuracy: typeof attemptData.punctuationAccuracy === 'number' && !isNaN(attemptData.punctuationAccuracy) ? Math.max(0, Math.min(100, attemptData.punctuationAccuracy)) : 0,
      errors: Math.max(0, Number(attemptData.errors) || 0),
      correctChars: Math.max(0, Number(attemptData.correctChars) || 0),
      totalKeystrokes: Math.max(0, Number(attemptData.totalKeystrokes) || 0),
      blurCount: Math.max(0, Number(attemptData.blurCount) || 0),
      flagged: Boolean(attemptData.flagged),
      flagReason: String(attemptData.flagReason || ''),
      keystrokes: typeof attemptData.keystrokes === 'string' ? attemptData.keystrokes : JSON.stringify(attemptData.keystrokes || []),
      submittedAt: serverTimestamp(),
    };

    const targetRoundId = String(attemptData.roundId || config.activeRoundId || 'default_round');
    const attemptDocId = `att_${targetRoundId}_${currentParticipantId}`;
    const attemptDocRef = doc(db, 'attempts', attemptDocId);

    // Safeguard: Never overwrite an existing valid non-zero attempt with an empty 0-keystroke submission
    const existingAttempt = attempts.find(
      a => a.id === attemptDocId || (a.participantId === currentParticipantId && a.roundId === targetRoundId)
    );
    if (
      existingAttempt &&
      (existingAttempt.wpm > 0 || existingAttempt.totalKeystrokes > 0) &&
      sanitizedAttempt.totalKeystrokes === 0 &&
      sanitizedAttempt.wpm === 0
    ) {
      console.warn('Prevented 0-keystroke submission from overwriting existing valid attempt for', currentParticipantId);
      return attemptDocId;
    }

    // 1. Immediately cache locally in localStorage (Zero Data-Loss Guarantee)
    const localAttempt: Attempt = {
      ...sanitizedAttempt,
      id: attemptDocId,
      submittedAt: Date.now(),
    };
    savePendingAttempt(localAttempt);
    try {
      localStorage.setItem(`innovision_cached_attempt_${targetRoundId}_${currentParticipantId}`, JSON.stringify(localAttempt));
    } catch {}

    // 2. Optimistically update React state so competitor sees ResultCard instantly with zero lag
    setAttempts(prev => {
      const index = prev.findIndex(
        a => a.id === attemptDocId || (a.participantId === currentParticipantId && a.roundId === targetRoundId)
      );
      if (index !== -1) {
        const next = [...prev];
        next[index] = localAttempt;
        return next;
      }
      return [localAttempt, ...prev];
    });
    setUserAttempt(localAttempt);

    // 3. Clear any retry token on participant doc safely without blocking submission
    if (participant?.canRetry && currentParticipantId) {
      updateDoc(doc(db, 'participants', currentParticipantId), {
        canRetry: false,
      }).catch(e => console.warn('canRetry reset notice:', e));
    }

    // 4. Spread concurrent requests using subtle random jitter (0-250ms) to prevent router/network thundering herd
    await new Promise(r => setTimeout(r, Math.random() * 250));

    // 5. Resilient write with timeout guard and exponential backoff retry
    let attemptsCount = 0;
    let writeSuccess = false;
    let lastError: any = null;

    while (attemptsCount < 3 && !writeSuccess) {
      attemptsCount++;
      try {
        await Promise.race([
          setDoc(attemptDocRef, sanitizedAttempt, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 5000)),
        ]);
        writeSuccess = true;
        // Verified on server: remove from pending queue
        removePendingAttempt(currentParticipantId, targetRoundId);
      } catch (err) {
        lastError = err;
        if (attemptsCount < 3) {
          await new Promise(r => setTimeout(r, 600 * attemptsCount + Math.random() * 250));
        }
      }
    }

    if (!writeSuccess) {
      console.warn('Network slow or offline. Attempt safely stored in offline queue and will sync automatically:', lastError);
    }

    return attemptDocId;
  };

  // Admin action: Grant participant a retry
  const grantRetry = async (participantId: string) => {
    try {
      await updateDoc(doc(db, 'participants', participantId), {
        canRetry: true,
      });
      // Optionally delete previous attempt for clean re-race
      if (config.activeRoundId) {
        const existing = attempts.find(
          a => a.participantId === participantId && a.roundId === config.activeRoundId
        );
        if (existing) {
          await deleteDoc(doc(db, 'attempts', existing.id));
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `participants/${participantId}`);
    }
  };

  // Admin action: Disqualify or pardon participant
  const disqualifyParticipant = async (participantId: string, disqualified: boolean) => {
    try {
      await updateDoc(doc(db, 'participants', participantId), {
        disqualified,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `participants/${participantId}`);
    }
  };

  // Admin action: Delete participant
  const deleteParticipantRecord = async (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    setAttempts(prev => prev.filter(a => a.participantId !== participantId));
    try {
      await deleteDoc(doc(db, 'participants', participantId));
      const pAttempts = attempts.filter(a => a.participantId === participantId);
      for (const a of pAttempts) {
        await deleteDoc(doc(db, 'attempts', a.id)).catch(() => {});
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `participants/${participantId}`);
    }
  };

  // Admin action: Publish or hide final results
  const publishResults = async (published: boolean) => {
    await updateConfig({
      resultsPublished: published,
    });
  };

  // Admin action: Finalize all unsubmitted participants with 0 WPM record
  const finalizeUnsubmittedParticipants = async (roundId?: string) => {
    const targetRoundId = roundId || config.activeRoundId;
    if (!targetRoundId) return;

    const roundAttempts = attempts.filter(a => a.roundId === targetRoundId);
    const completedIds = new Set(roundAttempts.map(a => a.participantId));
    const unsubmitted = participants.filter(p => !completedIds.has(p.id) && !p.disqualified);

    for (const p of unsubmitted) {
      const timeoutAttempt = {
        participantId: p.id,
        participantName: p.name,
        department: p.department,
        year: p.year,
        rollNo: p.rollNo || '',
        roundId: targetRoundId,
        wpm: 0,
        rawWpm: 0,
        accuracy: 0,
        punctuationAccuracy: 0,
        errors: 0,
        correctChars: 0,
        totalKeystrokes: 0,
        blurCount: 0,
        flagged: false,
        flagReason: 'Time expired without submission',
        keystrokes: '[]',
        submittedAt: serverTimestamp(),
      };
      try {
        await addDoc(collection(db, 'attempts'), timeoutAttempt);
      } catch (err) {
        console.warn('Failed recording timeout attempt for', p.name, err);
      }
    }
  };

  // Admin action: Clear all recorded attempts for a specific round (e.g. purging test attempts)
  const clearRoundAttempts = async (roundId?: string) => {
    const targetRoundId = roundId || config.activeRoundId;
    if (!targetRoundId) return;

    const roundAttempts = attempts.filter(a => a.roundId === targetRoundId);
    setAttempts(prev => prev.filter(a => a.roundId !== targetRoundId));
    setUserAttempt(null);
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`innovision_cached_attempt_${targetRoundId}`)) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    try {
      const deletions = roundAttempts.map(a => deleteDoc(doc(db, 'attempts', a.id)));
      await Promise.all(deletions);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'attempts');
    }
  };

  // Admin action: Clear ALL recorded attempts across all rounds
  const clearAllAttempts = async () => {
    setAttempts([]);
    setUserAttempt(null);
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('innovision_cached_attempt')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    try {
      const attsSnap = await getDocs(collection(db, 'attempts'));
      const deletions = attsSnap.docs.map(d => deleteDoc(doc(db, 'attempts', d.id)));
      await Promise.all(deletions);
    } catch (err) {
      console.warn('Clear all attempts notice:', err);
    }
  };

  // Admin action: Clear all registered participants and wipe related attempts
  const clearAllParticipants = async () => {
    // 1. Immediately wipe local state for instant responsive UI
    setParticipants([]);
    setAttempts([]);
    setUserAttempt(null);
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('innovision_cached_attempt')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    try {
      // 2. Query Firestore and batch delete all participant docs
      const partsSnap = await getDocs(collection(db, 'participants'));
      const partDeletions = partsSnap.docs.map(d => deleteDoc(doc(db, 'participants', d.id)));
      await Promise.all(partDeletions);

      // 3. Clear all attempts so new participants start with a clean leaderboard
      const attsSnap = await getDocs(collection(db, 'attempts'));
      const attDeletions = attsSnap.docs.map(d => deleteDoc(doc(db, 'attempts', d.id)));
      await Promise.all(attDeletions);

      // 4. Reset all rounds to 'created' state with startAt: null so new users enter fresh lobby
      const roundsSnap = await getDocs(collection(db, 'rounds'));
      if (roundsSnap.docs.length > 0) {
        for (const rDoc of roundsSnap.docs) {
          await setDoc(doc(db, 'rounds', rDoc.id), { status: 'created', startAt: null, countdownStartedAt: null }, { merge: true });
        }
        setActiveRound(prev => (prev ? { ...prev, status: 'created', startAt: null as any, countdownStartedAt: null as any } : null));
        setRounds(prev => prev.map(r => ({ ...r, status: 'created', startAt: null as any, countdownStartedAt: null as any })));
      } else {
        const defaultRoundId = 'round-1-technical-elimination';
        const round1Data = {
          id: defaultRoundId,
          name: 'Round 1 — Technical Elimination',
          passageId: 'easy-3',
          passageTitle: 'The Mechanical Keyboard',
          passageText: 'Click, clack, tap! Mechanical switches - whether linear red, tactile brown, or clicky blue - offer distinct tactile feedback. When typing at 80+ words per minute, your muscle memory takes over completely, turning pure thought into crisp digital prose.',
          difficulty: 'Medium',
          duration: 30,
          allowBackspaceAfterSpace: true,
          status: 'created',
          startAt: null,
          countdownStartedAt: null,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'rounds', defaultRoundId), round1Data);
        setActiveRound(round1Data as any);
        setRounds([round1Data as any]);
      }

      // 5. Update competition config to notify all clients that roster has been reset
      const configRef = doc(db, 'config', 'competition');
      await setDoc(
        configRef,
        {
          status: 'registration_open',
          resultsPublished: false,
          lastRosterResetAt: Date.now(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Clear all participants error:', err);
      handleFirestoreError(err, OperationType.DELETE, 'participants');
    }
  };

  // Admin action: Seed real university participants and sample race attempts
  const seedRealParticipants = async () => {
    const realStudents = [
      {
        name: 'Manish Kumar Baitha',
        email: 'manishkr8@gmail.com',
        rollNo: '23FSTCSE042',
        department: 'Computer Science & Engineering (CSE)',
        year: '3rd Year',
        phone: '+91 9876543210',
        attempt: { wpm: 58.4, rawWpm: 61, accuracy: 96.8, punctuationAccuracy: 100, errors: 2, correctChars: 285, totalKeystrokes: 298 },
      },
      {
        name: 'Anu Sharma',
        email: 'anu.sharma@iusikkim.edu.in',
        rollNo: '23FSTCSE019',
        department: 'Computer Science & Engineering (CSE)',
        year: '3rd Year',
        phone: '+91 9811223344',
        attempt: { wpm: 64.2, rawWpm: 66, accuracy: 98.1, punctuationAccuracy: 95.8, errors: 2, correctChars: 312, totalKeystrokes: 320 },
      },
      {
        name: 'Pema Wangchuk Bhutia',
        email: 'pema.bhutia@iusikkim.edu.in',
        rollNo: '24FSTAI007',
        department: 'Artificial Intelligence & Data Science (AI & DS)',
        year: '2nd Year',
        phone: '+91 9800112233',
        attempt: { wpm: 52.8, rawWpm: 55, accuracy: 95.4, punctuationAccuracy: 94.0, errors: 4, correctChars: 256, totalKeystrokes: 268 },
      },
      {
        name: 'Diksha Chettri',
        email: 'diksha.chettri@iusikkim.edu.in',
        rollNo: '23FSTIT012',
        department: 'Information Technology (IT)',
        year: '3rd Year',
        phone: '+91 9733445566',
        attempt: { wpm: 49.0, rawWpm: 51, accuracy: 97.2, punctuationAccuracy: 96.5, errors: 3, correctChars: 238, totalKeystrokes: 247 },
      },
      {
        name: 'Sonam Tshering Lepcha',
        email: 'sonam.lepcha@iusikkim.edu.in',
        rollNo: '22FSTME015',
        department: 'Mechanical Engineering (Mechanical)',
        year: '4th Year',
        phone: '+91 9644556677',
        attempt: { wpm: 60.5, rawWpm: 62, accuracy: 98.5, punctuationAccuracy: 100, errors: 1, correctChars: 295, totalKeystrokes: 302 },
      },
      {
        name: 'Rohan Pradhan',
        email: 'rohan.pradhan@iusikkim.edu.in',
        rollNo: '25FSTCE004',
        department: 'Civil Engineering (Civil)',
        year: '1st Year',
        phone: '+91 9555667788',
        attempt: { wpm: 43.5, rawWpm: 46, accuracy: 93.6, punctuationAccuracy: 88.5, errors: 6, correctChars: 210, totalKeystrokes: 226 },
      },
      {
        name: 'Pooja Subba',
        email: 'pooja.subba@iusikkim.edu.in',
        rollNo: '24FSTCSE031',
        department: 'Computer Science & Engineering (CSE)',
        year: '2nd Year',
        phone: '+91 9466778899',
        attempt: { wpm: 46.2, rawWpm: 49, accuracy: 94.8, punctuationAccuracy: 92.0, errors: 5, correctChars: 224, totalKeystrokes: 238 },
      },
    ];

    const targetRoundId = activeRound?.id || config.activeRoundId;

    try {
      for (const s of realStudents) {
        const pRef = doc(collection(db, 'participants'));
        await setDoc(pRef, {
          name: s.name,
          email: s.email,
          rollNo: s.rollNo,
          department: s.department,
          year: s.year,
          phone: s.phone,
          canRetry: false,
          disqualified: false,
          createdAt: new Date().toISOString(),
        });

        if (targetRoundId) {
          const attRef = doc(collection(db, 'attempts'));
          await setDoc(attRef, {
            participantId: pRef.id,
            participantName: s.name,
            department: s.department,
            year: s.year,
            rollNo: s.rollNo,
            roundId: targetRoundId,
            wpm: s.attempt.wpm,
            rawWpm: s.attempt.rawWpm,
            accuracy: s.attempt.accuracy,
            punctuationAccuracy: s.attempt.punctuationAccuracy,
            errors: s.attempt.errors,
            correctChars: s.attempt.correctChars,
            totalKeystrokes: s.attempt.totalKeystrokes,
            blurCount: 0,
            flagged: false,
            flagReason: '',
            keystrokes: '[]',
            submittedAt: serverTimestamp(),
          });
        }
      }
      await refreshAllData();
    } catch (err) {
      console.error('Failed to seed real participants:', err);
    }
  };

  // Optimistic participant addition for instantaneous local display
  const addParticipantOptimistic = (newParticipant: Participant) => {
    setParticipants(prev => {
      const exists = prev.some(p => p.id === newParticipant.id);
      if (exists) {
        return prev.map(p => (p.id === newParticipant.id ? newParticipant : p));
      }
      return [newParticipant, ...prev];
    });
  };

  return (
    <CompetitionContext.Provider
      value={{
        config,
        activeRound,
        rounds,
        userAttempt,
        attempts,
        participants,
        loadingConfig,
        serverTimeOffset,
        syncNow,
        refreshAllData,
        updateConfig,
        createRound,
        activateRound,
        startRoundCountdown,
        stopRound,
        resetRound,
        deleteRound,
        clearActiveRoundData,
        submitRaceAttempt,
        grantRetry,
        disqualifyParticipant,
        deleteParticipantRecord,
        publishResults,
        finalizeUnsubmittedParticipants,
        clearRoundAttempts,
        clearAllAttempts,
        clearAllParticipants,
        seedRealParticipants,
        addParticipantOptimistic,
      }}
    >
      {children}
    </CompetitionContext.Provider>
  );
};

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error('useCompetition must be used within a CompetitionProvider');
  }
  return context;
};
