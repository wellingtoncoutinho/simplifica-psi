import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables (both .env and .env.local)
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

// Clean any double quotes from environment variables
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

console.log("Config:", JSON.stringify(firebaseConfig, null, 2));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDatabase() {
  try {
    console.log("Fetching patients...");
    const patientsSnap = await getDocs(collection(db, 'patients'));
    const patientsMap: Record<string, any> = {};
    patientsSnap.forEach(doc => {
      const data = doc.data();
      patientsMap[doc.id] = { id: doc.id, name: data.name, amount: data.amount, sessionDay: data.sessionDay };
      console.log(`Patient: ID=${doc.id}, Name=${data.name}, Amount=${data.amount}, SessionDay=${data.sessionDay}`);
    });

    console.log("\nFetching sessions...");
    const sessionsSnap = await getDocs(collection(db, 'sessions'));
    sessionsSnap.forEach(doc => {
      const data = doc.data();
      const patient = patientsMap[data.patientId] || { name: 'Unknown/Triage' };
      console.log(`Session: ID=${doc.id}, Patient=${patient.name} (ID=${data.patientId}), Date=${data.date}, Time=${data.time}, Amount=${data.amount}, Paid=${data.paid}, Status=${data.status}, isTriage=${data.isTriage}`);
    });

  } catch (error) {
    console.error("Error checking database:", error);
  }
}

checkDatabase().then(() => process.exit(0));
