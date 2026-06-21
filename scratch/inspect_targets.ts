import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectTargetData() {
  try {
    console.log("=== INSPECTING PATIENTS ===");
    const patientsSnap = await getDocs(collection(db, 'patients'));
    const patients: any[] = [];
    patientsSnap.forEach(d => {
      const data = d.data();
      if (data.name.includes("BÁRBARA") || data.name.includes("GUILHERME") || data.name.includes("BARBARA")) {
        patients.push({ id: d.id, ...data });
        console.log(`Patient: ID=${d.id}, Name=${data.name}, Amount=${data.amount}, sessionDay=${data.sessionDay}, sessionTime=${data.sessionTime}`);
      }
    });

    console.log("\n=== INSPECTING SESSIONS ===");
    const sessionsSnap = await getDocs(collection(db, 'sessions'));
    sessionsSnap.forEach(d => {
      const data = d.data();
      const matchedPatient = patients.find(p => p.id === data.patientId);
      if (matchedPatient) {
        console.log(`Session: ID=${d.id}, Patient=${matchedPatient.name}, Data=${JSON.stringify(data, null, 2)}`);
      }
    });

  } catch (error) {
    console.error("Inspection error:", error);
  }
}

inspectTargetData().then(() => process.exit(0));
