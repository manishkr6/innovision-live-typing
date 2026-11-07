import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import fallbackConfig from '../firebase-applet-config.json' with { type: 'json' };

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: process.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
};
const firestoreDatabaseId =
  process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || fallbackConfig.firestoreDatabaseId || '(default)';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firestoreDatabaseId);

async function clearUsersAndAttempts() {
  console.log('--- PURGING USER DATA FROM FIRESTORE (KEEPING ADMINS) ---');

  // 1. Clear attempts
  const attemptsSnap = await getDocs(collection(db, 'attempts'));
  console.log(`Found ${attemptsSnap.docs.length} attempts to delete.`);
  for (const d of attemptsSnap.docs) {
    await deleteDoc(doc(db, 'attempts', d.id));
    console.log(`Deleted attempt: ${d.id}`);
  }

  // 2. Clear participants
  const participantsSnap = await getDocs(collection(db, 'participants'));
  console.log(`Found ${participantsSnap.docs.length} participants to delete.`);
  for (const d of participantsSnap.docs) {
    await deleteDoc(doc(db, 'participants', d.id));
    console.log(`Deleted participant: ${d.id}`);
  }

  // 3. Reset competition config to clean state
  await setDoc(
    doc(db, 'config', 'competition'),
    {
      status: 'registration_open',
      activeRoundId: null,
      resultsPublished: false,
      announcement: 'Welcome to INNOVISION 2026 Live Typing Arena! Registration is open.',
    },
    { merge: true }
  );
  console.log('Competition configuration reset to registration_open.');

  // 4. Verify admin collection is intact
  const adminsSnap = await getDocs(collection(db, 'admins'));
  console.log(`Admins collection has ${adminsSnap.docs.length} records intact.`);
  for (const a of adminsSnap.docs) {
    console.log(`Preserved admin: ${a.id} ->`, a.data());
  }

  console.log('✅ ALL USER DATA PURGED SUCCESSFULLY. ADMINS PRESERVED.');
  process.exit(0);
}

clearUsersAndAttempts().catch((err) => {
  console.error('Error clearing data:', err);
  process.exit(1);
});
