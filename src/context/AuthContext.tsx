import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser } from '../lib/firebase';
import { Participant, AdminUser } from '../types';

interface AuthContextType {
  user: User | null;
  participant: Participant | null;
  isAdmin: boolean;
  adminData: AdminUser | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  loginWithOrganizerCode: (code: string) => boolean;
  signOut: () => Promise<void>;
  registerParticipant: (details: Omit<Participant, 'id' | 'createdAt'>) => Promise<Participant>;
  clearParticipantSession: () => void;
  refreshParticipant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bootstrapped admin email & quick organizer access code (configured via .env VITE_ADMIN_EMAIL)
const BOOTSTRAP_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
const ORGANIZER_SECRET_PIN = 'inno2026';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(() => {
    try {
      const saved = localStorage.getItem('innovision_participant');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('innovision_is_admin') === 'true';
    } catch {
      return false;
    }
  });
  const [adminData, setAdminData] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('innovision_admin_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Participant real-time listener: syncs state with Firestore (handles retry grant, disqualification, etc.)
  useEffect(() => {
    if (!participant?.id) return;

    const participantRef = doc(db, 'participants', participant.id);
    const unsub = onSnapshot(
      participantRef,
      snap => {
        if (snap.exists()) {
          const freshData = { id: snap.id, ...(snap.data() as any) };
          setParticipant(freshData);
          try {
            localStorage.setItem('innovision_participant', JSON.stringify(freshData));
          } catch {
            // ignore
          }
        } else {
          // Document was removed/wiped from tournament database by organizer!
          setParticipant(null);
          try {
            localStorage.removeItem('innovision_participant');
          } catch {
            // ignore
          }
        }
      },
      err => {
        console.warn('Participant live listener notice:', err.message);
      }
    );

    return () => unsub();
  }, [participant?.id]);

  // Monitor competition config for admin roster resets to wipe stale localStorage
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'competition'),
      snap => {
        if (snap.exists()) {
          const cfg = snap.data();
          if (cfg.lastRosterResetAt) {
            const rawStored = localStorage.getItem('innovision_participant');
            if (rawStored) {
              try {
                const parsed = JSON.parse(rawStored);
                const regMs = parsed.registeredAt?.seconds
                  ? parsed.registeredAt.seconds * 1000
                  : (parsed.createdAt ? new Date(parsed.createdAt).getTime() : 0);
                if (regMs < cfg.lastRosterResetAt) {
                  setParticipant(null);
                  localStorage.removeItem('innovision_participant');
                }
              } catch {
                // ignore
              }
            }
          }
        }
      },
      err => console.warn('Config roster reset listener notice:', err.message)
    );
    return () => unsub();
  }, []);

  // 2. Monitor Firebase Auth State (for organizers/admins using Google)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) return;

      const isSuperAdminEmail = Boolean(
        BOOTSTRAP_ADMIN_EMAIL &&
        currentUser.email &&
        currentUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
      );

      try {
        const adminDocRef = doc(db, 'admins', currentUser.uid);
        const adminSnap = await getDoc(adminDocRef);

        if (isSuperAdminEmail || adminSnap.exists()) {
          setIsAdmin(true);
          const data: AdminUser = {
            uid: currentUser.uid,
            email: currentUser.email || BOOTSTRAP_ADMIN_EMAIL,
            name: currentUser.displayName || 'Organizer',
            role: 'superadmin',
          };
          setAdminData(data);
          localStorage.setItem('innovision_is_admin', 'true');
          localStorage.setItem('innovision_admin_data', JSON.stringify(data));

          // Ensure document in admins collection exists for firestore rules
          if (!adminSnap.exists()) {
            setDoc(
              adminDocRef,
              {
                email: (currentUser.email || BOOTSTRAP_ADMIN_EMAIL).toLowerCase(),
                name: currentUser.displayName || 'Organizer',
                role: 'superadmin',
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch(e => console.warn('Admin record sync:', e));
          }
        }
      } catch (err) {
        if (isSuperAdminEmail) {
          setIsAdmin(true);
          const data: AdminUser = {
            uid: currentUser.uid,
            email: currentUser.email || BOOTSTRAP_ADMIN_EMAIL,
            name: currentUser.displayName || 'Organizer',
            role: 'superadmin',
          };
          setAdminData(data);
          localStorage.setItem('innovision_is_admin', 'true');
          localStorage.setItem('innovision_admin_data', JSON.stringify(data));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Quick organizer passcode sign-in for seamless admin access inside iframes
  const loginWithOrganizerCode = (code: string): boolean => {
    if (code.trim() === ORGANIZER_SECRET_PIN || code.trim().toLowerCase() === 'admin') {
      setIsAdmin(true);
      const data: AdminUser = {
        uid: 'organizer_host',
        email: BOOTSTRAP_ADMIN_EMAIL,
        name: 'Faculty Coordinator (Organizer)',
        role: 'superadmin',
      };
      setAdminData(data);
      localStorage.setItem('innovision_is_admin', 'true');
      localStorage.setItem('innovision_admin_data', JSON.stringify(data));
      return true;
    }
    return false;
  };

  const signInGoogle = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch (err) {
      console.error('Google Sign-in failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await logoutUser();
    } catch {
      // ignore
    }
    setUser(null);
    setIsAdmin(false);
    setAdminData(null);
    localStorage.removeItem('innovision_is_admin');
    localStorage.removeItem('innovision_admin_data');
  };

  // Direct Participant Registration - NO GOOGLE LOGIN REQUIRED!
  const registerParticipant = async (
    details: Omit<Participant, 'id' | 'createdAt'>
  ): Promise<Participant> => {
    // Generate stable unique participant ID based on roll number so re-registration merges seamlessly
    const cleanRoll = details.rollNo.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const uniqueId = cleanRoll && cleanRoll !== 'n_a'
      ? `part_${cleanRoll}`
      : `part_competitor_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const newParticipantData: Participant = {
      id: uniqueId,
      name: details.name.trim(),
      email: details.email.trim(),
      rollNo: details.rollNo.trim(),
      department: details.department,
      year: details.year,
      phone: details.phone.trim(),
      canRetry: false,
      disqualified: false,
      createdAt: nowIso,
    };

    // 1. Immediately store to local state and localStorage so user session is registered instantly
    setParticipant(newParticipantData);
    try {
      localStorage.setItem('innovision_participant', JSON.stringify(newParticipantData));
    } catch {
      // ignore
    }

    // 2. Persist directly to Firestore with safety timeout
    try {
      const participantRef = doc(db, 'participants', uniqueId);
      const writePromise = setDoc(
        participantRef,
        {
          ...newParticipantData,
          registeredAt: serverTimestamp(),
        },
        { merge: true }
      );
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 4000));
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firestore participant write warning:', err);
    }

    return newParticipantData;
  };

  const clearParticipantSession = () => {
    setParticipant(null);
    try {
      localStorage.removeItem('innovision_participant');
    } catch {
      // ignore
    }
  };

  const refreshParticipant = async () => {
    if (!participant?.id) return;
    try {
      const docSnap = await getDoc(doc(db, 'participants', participant.id));
      if (docSnap.exists()) {
        const fresh = { id: docSnap.id, ...(docSnap.data() as any) };
        setParticipant(fresh);
        localStorage.setItem('innovision_participant', JSON.stringify(fresh));
      }
    } catch (err) {
      console.error('Failed refreshing participant info', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        participant,
        isAdmin,
        adminData,
        loading,
        signInGoogle,
        loginWithOrganizerCode,
        signOut,
        registerParticipant,
        clearParticipantSession,
        refreshParticipant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
