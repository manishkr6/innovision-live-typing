import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, setDoc } from 'firebase/firestore';
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

const attemptIds = ['PTgMKCYCMNHc6YUomSUf', 'Tvot2Is1ZYkMlPWOqLsH', 'eZvJ2ND67Rr1lsGXan3p'];
const participantIds = ['3Gfobw91eyTpeeR67BuOCE5PLEG3', 'ETsotRP5edSa5T9LsHilvm8t95f2'];

async function run() {
  console.log('Deleting known attempts...');
  for (const id of attemptIds) {
    try {
      await deleteDoc(doc(db, 'attempts', id));
      console.log('Successfully deleted attempt', id);
    } catch (e: any) {
      console.warn('Failed attempt delete:', id, e.message);
    }
  }

  console.log('Deleting known participants...');
  for (const id of participantIds) {
    try {
      await deleteDoc(doc(db, 'participants', id));
      console.log('Successfully deleted participant', id);
    } catch (e: any) {
      console.warn('Failed participant delete:', id, e.message);
    }
  }

  // Reset config to clean state
  try {
    await setDoc(doc(db, 'config', 'competition'), {
      status: 'registration_open',
      activeRoundId: null,
      resultsPublished: false,
      announcement: 'Welcome to INNOVISION 2026 Live Typing Arena! Registration is open.',
    }, { merge: true });
    console.log('Reset competition config');
  } catch (e: any) {
    console.warn('Config reset warning:', e.message);
  }

  process.exit(0);
}

run();
