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

async function inspectProfiles() {
  try {
    const profilesSnap = await getDocs(collection(db, 'profiles'));
    console.log("=== PROFILES ===");
    const profilesMap: Record<string, any> = {};
    profilesSnap.forEach(d => {
      const data = d.data();
      profilesMap[d.id] = data;
      console.log(`Profile: UID=${d.id}, Name=${data.name}, Email=${data.email}, isTrial=${data.isTrial}, trialStartDate=${data.trialStartDate}`);
    });

    console.log("\n=== PATIENTS ===");
    const patientsSnap = await getDocs(collection(db, 'patients'));
    const patientCounts: Record<string, number> = {};
    patientsSnap.forEach(d => {
      const data = d.data();
      const ownerId = data.ownerId;
      patientCounts[ownerId] = (patientCounts[ownerId] || 0) + 1;
    });

    for (const [ownerId, count] of Object.entries(patientCounts)) {
      const prof = profilesMap[ownerId] || { name: 'Unknown', email: 'Unknown' };
      console.log(`Owner: ${prof.email} (${prof.name}) [UID: ${ownerId}] has ${count} patients.`);
    }

  } catch (e) {
    console.error(e);
  }
}

inspectProfiles().then(() => process.exit(0));
