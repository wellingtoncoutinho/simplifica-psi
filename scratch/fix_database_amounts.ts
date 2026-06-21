import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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

async function migrateDatabase() {
  try {
    console.log("Fetching patients...");
    const patientsSnap = await getDocs(collection(db, 'patients'));
    const patientsMap: Record<string, any> = {};
    patientsSnap.forEach(d => {
      const data = d.data();
      patientsMap[d.id] = { id: d.id, name: data.name, amount: data.amount };
    });

    console.log("Fetching sessions...");
    const sessionsSnap = await getDocs(collection(db, 'sessions'));
    let updateCount = 0;

    for (const sDoc of sessionsSnap.docs) {
      const sData = sDoc.data();
      if (!sData.patientId || sData.isTriage === true) continue;

      const patient = patientsMap[sData.patientId];
      if (patient && patient.amount !== undefined) {
        const expectedAmount = parseFloat(patient.amount) || 0;
        const currentAmount = parseFloat(sData.amount) || 0;

        if (currentAmount !== expectedAmount) {
          console.log(`Updating Session ID=${sDoc.id} (${patient.name}): changing amount from ${currentAmount} to ${expectedAmount}`);
          const sRef = doc(db, 'sessions', sDoc.id);
          await updateDoc(sRef, { amount: expectedAmount, updatedAt: new Date().toISOString() });
          updateCount++;
        }
      }
    }

    console.log(`\nMigration completed successfully! Updated ${updateCount} session documents.`);

  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrateDatabase().then(() => process.exit(0));
