import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env')) dotenv.config({ path: '.env' });
if (fs.existsSync('.env.local')) dotenv.config({ path: '.env.local', override: true });

for (const key in process.env) {
  if (process.env[key] && process.env[key]!.startsWith('"') && process.env[key]!.endsWith('"')) {
    process.env[key] = process.env[key]!.slice(1, -1);
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function readAuthorizedEmails() {
  try {
    const snap = await getDocs(collection(db, 'authorized_emails'));
    console.log("=== AUTHORIZED EMAILS ===");
    snap.forEach(d => {
      console.log(`Document ID (Email): ${d.id}, Data:`, d.data());
    });
  } catch (e) {
    console.error("Error reading authorized_emails:", e);
  }
}

readAuthorizedEmails().then(() => process.exit(0));
