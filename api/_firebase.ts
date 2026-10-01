import { initializeApp as initAdmin, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClient } from 'firebase/app';
import { getFirestore as getClientFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let adminDb: any = null;
let clientDb: any = null;

export function getDb() {
  // 1. Tentar inicializar com Service Account do Firebase Admin se disponível (em arquivo ou variável de ambiente)
  let serviceAccount: any = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e: any) {
      console.warn('Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    }
  }

  if (!serviceAccount) {
    const localKeyPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(localKeyPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      } catch (e: any) {
        console.warn('Erro ao ler service-account.json local:', e.message);
      }
    }
  }

  if (serviceAccount) {
    try {
      if (typeof serviceAccount === 'string') {
        try { serviceAccount = JSON.parse(serviceAccount); } catch {}
      }
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      if (!getApps().length) {
        initAdmin({
          credential: cert(serviceAccount),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id || 'simpsifica',
        });
      }
      if (!adminDb) {
        adminDb = getAdminFirestore();
      }
      return { db: adminDb, isAdmin: true };
    } catch (e: any) {
      console.warn('Falha ao inicializar firebase-admin:', e.message);
    }
  }

  // 2. Fallback para Client SDK
  if (!clientDb) {
    const app = initClient({
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'simpsifica',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    });
    clientDb = getClientFirestore(app);
  }

  return { db: clientDb, isAdmin: false };
}
