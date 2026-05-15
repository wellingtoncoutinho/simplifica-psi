/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  startOfDay,
  differenceInWeeks,
  getDay,
  addWeeks,
  eachWeekOfInterval,
  subDays,
  subWeeks
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Users, 
  Calendar as CalendarIcon, 
  FileText, 
  DollarSign, 
  FolderOpen, 
  BarChart3, 
  Settings,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Plus,
  Mic,
  Save,
  LogIn,
  Trash2,
  PenTool,
  FileDown,
  Paperclip,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Cake,
  Sparkles,
  Menu,
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from './lib/utils';
import { 
  Patient, 
  Session, 
  Transaction,
  AppNotification 
} from './types';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const calculateIncomePrediction = (start: Date, end: Date, sessions: any[], patients: any[]) => {
  let predictedTotal = 0;
  
  // 1. Calculate from recorded non-cancelled sessions
  const recordedInRange = sessions.filter(s => {
    const d = new Date(s.date + 'T12:00:00');
    return d >= start && d <= end && s.status !== 'Cancelada';
  });
  
  recordedInRange.forEach(s => {
    const amount = parseFloat(s.amount) || parseFloat(patients.find(p => p.id === s.patientId)?.amount || '0') || 0;
    predictedTotal += amount;
  });

  // 2. Add virtual sessions
  patients.filter(p => p.status !== 'Inativo').forEach(p => {
    if (p.sessionDay && p.amount) {
      const daysInInterval = eachDayOfInterval({ start, end });
      daysInInterval.forEach(d => {
        const dayName = format(d, 'eeee', { locale: ptBR });
        const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        if (capitalized !== p.sessionDay) return;
        
        const pCreatedAt = new Date(p.createdAt || p.birthDate || '2024-01-01');
        if (startOfDay(d) < startOfDay(pCreatedAt)) return;

        const hasRecorded = recordedInRange.some(s => s.patientId === p.id && isSameDay(new Date(s.date + 'T12:00:00'), d));
        if (hasRecorded) return;

        const hasCancelled = sessions.some(s => s.patientId === p.id && s.status === 'Cancelada' && isSameDay(new Date(s.date + 'T12:00:00'), d));
        if (hasCancelled) return;

        const weeksDiff = Math.abs(differenceInWeeks(startOfDay(d), startOfDay(pCreatedAt)));
        let shouldCount = false;
        if (!p.recurrence || p.recurrence === 'Semanal') shouldCount = true;
        else if (p.recurrence === 'Quinzenal') shouldCount = weeksDiff % 2 === 0;
        else if (p.recurrence === 'Mensal') shouldCount = weeksDiff % 4 === 0;

        if (shouldCount) {
           predictedTotal += (parseFloat(p.amount) || 0);
        }
      });
    }
  });

  return predictedTotal;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileSettings, setProfileSettings] = useState({
    name: localStorage.getItem('prof_name') || '',
    crp: localStorage.getItem('prof_crp') || '',
    logo: localStorage.getItem('prof_logo') || ''
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<Record<string, any[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [triageInitialName, setTriageInitialName] = useState('');
  const [triageInitialDay, setTriageInitialDay] = useState('');
  const [triageInitialTime, setTriageInitialTime] = useState('');
  const [lastAction, setLastAction] = useState<any>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setIsMobileMenuOpen(false); // Swipe left
    }
    if (touchEnd - touchStart > 75 && touchStart < 50) {
      setIsMobileMenuOpen(true); // Swipe right from edge
    }
  };

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Firestore Real-time Listeners
  useEffect(() => {
    if (!user) {
      setPatients([]);
      setSessions([]);
      setTransactions([]);
      return;
    }

    // Profile Settings Listener
    const unsubProfile = onSnapshot(doc(db, 'profiles', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfileSettings({
          name: data.name || '',
          crp: data.crp || '',
          logo: data.logo || ''
        });
        // Also update localStorage as backup/cache
        localStorage.setItem('prof_name', data.name || '');
        localStorage.setItem('prof_crp', data.crp || '');
        localStorage.setItem('prof_logo', data.logo || '');
      }
    });

    const qPatients = query(collection(db, 'patients'), where('ownerId', '==', user.uid));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Patient));
      setPatients(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'patients'));

    const qSessions = query(collection(db, 'sessions'), where('ownerId', '==', user.uid));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Session));
      setSessions(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sessions'));

    const qTransactions = query(collection(db, 'transactions'), where('ownerId', '==', user.uid));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    return () => {
      unsubProfile();
      unsubPatients();
      unsubSessions();
      unsubTransactions();
    };
  }, [user]);

  // Notification generation removed as requested

  const handleUploadDocument = (patientId: string, file: File, category: 'prontuario' | 'anexo' = 'anexo') => {
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type.split('/')[1].toUpperCase(),
      size: (file.size / 1024).toFixed(1) + ' KB',
      date: new Date().toLocaleDateString('pt-BR'),
      url: URL.createObjectURL(file),
      category: category
    };

    setPatientDocuments(prev => ({
      ...prev,
      [patientId]: [newDoc, ...(prev[patientId] || [])]
    }));
  };

  const handleDeleteDocument = (patientId: string, docId: string) => {
    setPatientDocuments(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).filter(d => d.id !== docId)
    }));
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  const handleAddPatient = async (data: any) => {
    if (!user) return;
    try {
      // 1. Adicionar Paciente
      const patientData: any = {
        name: data.name.toUpperCase(),
        email: data.email,
        phone: data.phone,
        gender: data.gender || '',
        birthDate: data.birthDate || '',
        document: data.document || '',
        cpf: data.document || '',
        occupation: data.occupation || '',
        profession: data.occupation || '',
        address: data.address || '',
        medication: data.medication || '',
        emergencyContact: data.emergencyContact || '',
        sessionDay: data.sessionDay || '',
        sessionTime: data.nextSessionTime || '',
        sessions: data.isNewPatient ? 0 : (data.sessions || 0),
        status: 'Ativo',
        lastSession: data.sessionDay ? `Toda ${data.sessionDay}` : 'Sem sessões',
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
        amount: parseFloat(data.amount) || 0,
        recurrence: data.recurrence || 'Semanal',
        modality: data.modality || 'Online',
        ownerId: user.uid,
        createdAt: data.firstSessionDate ? new Date(data.firstSessionDate + 'T12:00:00').toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clinicalData: {
          anamnese: { queixa: "", historico: "", exame: "" },
          evoluções: [],
          smartNotes: { padroes: "", progresso: "", sugestao: "", topicos: [] }
        }
      };
      const patientRef = await addDoc(collection(db, 'patients'), patientData);
      const newPatientId = patientRef.id;

      // 2. Adicionar Sessão inicial se dia for informado
      if (data.sessionDay) {
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const targetDay = days.indexOf(data.sessionDay);
        if (targetDay !== -1) {
          let date;
          if (data.firstSessionDate) {
            date = new Date(data.firstSessionDate + 'T12:00:00');
          } else {
            date = new Date();
            const currentDay = date.getDay();
            let distance = targetDay - currentDay;
            if (distance <= 0) distance += 7;
            date.setDate(date.getDate() + distance);
          }
          const nextDateStr = date.toISOString().split('T')[0];
          
          const sessionData: any = {
            patientId: newPatientId,
            date: nextDateStr,
            time: data.nextSessionTime || '09:00',
            duration: '50min',
            type: data.modality || 'Presencial',
            status: 'Agendada',
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            amount: parseFloat(data.amount) || 0,
            cost: 0, 
            paid: false,
            nfIssued: false
          };
          await addDoc(collection(db, 'sessions'), sessionData);
        }
      }

      // 3. Adicionar Transação se valor informado
      if (data.amount) {
        const txData: any = {
          patientId: newPatientId,
          patientName: data.name.toUpperCase(),
          amount: parseFloat(data.amount),
          date: new Date().toISOString().split('T')[0],
          status: 'Aguardando',
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'transactions'), txData);
      }

      setIsAddingPatient(false);
    } catch (err: any) {
      alert("Erro ao salvar paciente: " + (err.message || String(err)));
      handleFirestoreError(err, OperationType.CREATE, 'patients');
    }
  };

  const handleAddSession = async (data: any) => {
    if (!user) return;
    try {
      const createdIds: string[] = [];

      // 1. Explicit Cancel action
      if (data.status === 'Cancelada') {
         if (data.id && data.id.toString().startsWith('virtual-')) {
             const cancelRef = await addDoc(collection(db, 'sessions'), {
               patientId: data.patientId || '',
               date: data.originalDate || data.date,
               time: data.originalTime || data.time,
               status: 'Cancelada',
               ownerId: user.uid,
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString()
             });
             createdIds.push(cancelRef.id);
             setLastAction({ type: 'cancel', ids: createdIds });
         } else if (data.id) {
             const oldDoc = sessions.find(s => s.id === data.id);
             const sessionRef = doc(db, 'sessions', data.id);
             await updateDoc(sessionRef, { status: 'Cancelada', updatedAt: new Date().toISOString() });
             createdIds.push(data.id);
             setLastAction({ type: 'update', ids: createdIds, oldData: oldDoc });
         }
         setShowUndoToast(true);
         setTimeout(() => setShowUndoToast(false), 8000);
         return;
      }

      // 2. Edição de Sessão Virtual (Movimentação)
      if (data.id && data.id.toString().startsWith('virtual-')) {
         if (data.editScope === 'all') {
            const p = patients.find(pat => pat.id === data.patientId);
            if (p) {
               const dayName = format(new Date(data.date + 'T12:00:00'), 'eeee', { locale: ptBR });
               const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
               const patientRef = doc(db, 'patients', p.id);
               await updateDoc(patientRef, {
                 sessionDay: capitalized,
                 sessionTime: data.time,
                 updatedAt: new Date().toISOString()
               });
               return; // Updated pattern, no new specific session needed
            }
         } else {
            // Cancel original virtual occurrence if it was moved
            if (data.originalDate && (data.originalDate !== data.date || data.originalTime !== data.time)) {
              const cancelRef = await addDoc(collection(db, 'sessions'), {
                patientId: data.patientId,
                date: data.originalDate,
                time: data.originalTime,
                status: 'Cancelada',
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              createdIds.push(cancelRef.id);
            }
            delete data.id; // Proceed to create a specific session for this occurrence
         }
      }

      // 3. Update an existing non-virtual session
      if (data.id && !data.id.toString().startsWith('virtual-')) {
        const oldDoc = sessions.find(s => s.id === data.id);
        const sessionRef = doc(db, 'sessions', data.id);
        await updateDoc(sessionRef, {
          patientId: data.patientId || '',
          isTriage: data.isTriage || false,
          triageName: data.triageName || '',
          date: data.date,
          time: data.time,
          type: data.type || 'Presencial',
          status: data.status || 'Agendada',
          amount: parseFloat(data.amount) || parseFloat(oldDoc?.amount as any) || 0,
          updatedAt: new Date().toISOString()
        });
        setLastAction({ type: 'update', ids: [data.id], oldData: oldDoc });
        setShowUndoToast(true);
        setTimeout(() => setShowUndoToast(false), 8000);
        return;
      }

      // 4. Create single session (Exception, Triage or New First Session)
      // Se o usuário selecionou uma recorrência nova para um paciente, atualiza o Perfil do Paciente
      if (data.patientId && data.recurrence && data.recurrence !== 'none') {
         const p = patients.find(pat => pat.id === data.patientId);
         if (p) {
             const dayName = format(new Date(data.date + 'T12:00:00'), 'eeee', { locale: ptBR });
             const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
             const patientRef = doc(db, 'patients', p.id);
             await updateDoc(patientRef, {
                 sessionDay: capitalized,
                 sessionTime: data.time,
                 recurrence: data.recurrence,
                 firstSessionDate: data.date,
                 updatedAt: new Date().toISOString()
             });
         }
      }

      // Sempre cria APENAS UMA sessão real (como âncora/exceção ou triagem)
      const sessionData: any = {
        patientId: data.patientId || '',
        isTriage: data.isTriage || false,
        triageName: data.triageName || '',
        date: data.date,
        time: data.time,
        duration: data.duration || '50min',
        type: data.type || 'Presencial',
        status: data.status || 'Agendada',
        amount: parseFloat(data.amount) || 0,
        cost: 0,
        paid: data.paid || false,
        nfIssued: data.nfIssued || false,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const ref = await addDoc(collection(db, 'sessions'), sessionData);
      createdIds.push(ref.id);
      
      setLastAction({ type: 'add', ids: createdIds });
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 8000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sessions');
    }
  };

  const handleUndo = async () => {
    if (!lastAction || !user) return;
    try {
      if (lastAction.type === 'add' || lastAction.type === 'cancel' || lastAction.type === 'move') {
        for (const id of lastAction.ids) {
          await deleteDoc(doc(db, 'sessions', id));
        }
      } else if (lastAction.type === 'update' && lastAction.oldData) {
        for (const id of lastAction.ids) {
          const sessionRef = doc(db, 'sessions', id);
          const { id: _, ...oldDataWithoutId } = lastAction.oldData;
          await updateDoc(sessionRef, { ...oldDataWithoutId, updatedAt: new Date().toISOString() });
        }
      }
      setLastAction(null);
      setShowUndoToast(false);
    } catch (err) {
      alert("Erro ao desfazer alteração: " + err);
    }
  };

  const handleUpdatePatient = async (updatedPatient: any) => {
    if (!user) return;
    try {
      const { id, ...data } = updatedPatient;
      const patientRef = doc(db, 'patients', id);
      await updateDoc(patientRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `patients/${updatedPatient.id}`);
    }
  };

  const handleUpdateSession = async (updatedSession: any) => {
    if (!user) return;
    try {
      const { id, ...data } = updatedSession;
      if (id.toString().startsWith('virtual-')) {
        await setDoc(doc(db, 'sessions', id), {
          ...data,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return;
      }
      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sessions/${updatedSession.id}`);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!user) return;
    try {
      if (id.toString().startsWith('virtual-')) {
         const parts = id.split('-');
         const pId = parts[1];
         const dStr = parts.slice(2).join('-');
         await addDoc(collection(db, 'sessions'), {
             patientId: pId,
             date: dStr,
             status: 'Cancelada',
             ownerId: user.uid,
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString()
         });
         return;
      }
      await deleteDoc(doc(db, 'sessions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sessions/${id}`);
    }
  };

  const handleAddTransaction = async (data: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        ...data,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!user) return;
    
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    // Se o paciente ainda não está inativo, apenas movemos para a "lixeira" (inativos)
    if (patient.status !== 'Inativo') {
      if (confirm(`Deseja mover ${patient.name} para a lista de inativos? O paciente deixará de aparecer na agenda, mas todos os prontuários e dados serão preservados.`)) {
        await handleUpdatePatient({ ...patient, status: 'Inativo' });
      }
      return;
    }

    // Se já está inativo, procedemos com a exclusão definitiva após confirmação extra
    if (!confirm(`EXCLUIR PERMANENTEMENTE? Esta ação é irreversível e apagará TODOS os prontuários, sessões e históricos de ${patient.name}. Deseja continuar?`)) {
      return;
    }

    console.log('Attempting to permanently delete patient and all related data:', id);
    try {
      const { writeBatch, collection, query, where, getDocs } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Delete patient document
      batch.delete(doc(db, 'patients', id));

      // 2. Query and delete all sessions associated with this patient (from Firestore directly)
      const qSessions = query(
        collection(db, 'sessions'), 
        where('ownerId', '==', user.uid),
        where('patientId', '==' , id)
      );
      const sessionsSnapshot = await getDocs(qSessions);
      console.log(`Found ${sessionsSnapshot.size} sessions to delete from DB`);
      sessionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Query and delete all transactions associated with this patient
      const qTransactions = query(
        collection(db, 'transactions'), 
        where('ownerId', '==', user.uid),
        where('patientId', '==' , id)
      );
      const transactionsSnapshot = await getDocs(qTransactions);
      console.log(`Found ${transactionsSnapshot.size} transactions to delete from DB`);
      transactionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. Commit the batch
      await batch.commit();
      console.log('Successfully deleted patient and all related data:', id);
      
      // If the deleted patient was selected, clear selection
      if (selectedPatient === id) {
        setSelectedPatient(null);
      }
    } catch (err) {
      console.error('Delete error for patient and related data:', id, err);
      handleFirestoreError(err, OperationType.DELETE, `patients/${id}`);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'prontuarios', label: 'Prontuários', icon: FileText },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-text-main">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Carregando SimplificaPsi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-text-main p-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/20 blur-[120px] -z-10 rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card w-full max-w-md rounded-[32px] p-8 space-y-8 shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-pink-500" />
          
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg rotate-3">
              <span className="font-bold text-3xl italic text-white flex items-baseline">
                S<span className="text-sm">p</span>
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Simplifica<span className="text-primary">Psi</span></h1>
            <p className="text-text-muted text-sm px-4">Seu consultório inteligente, seguro e para sempre.</p>
          </div>

          <div className="space-y-4 pt-4">
             <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Acesse sua conta</p>
             <button 
              onClick={signInWithGoogle}
              className="w-full h-14 rounded-2xl bg-white text-black flex items-center justify-center gap-4 font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10 group"
             >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:animate-bounce" />
                Entrar com Google
             </button>
             <p className="text-[10px] text-text-muted/50 leading-relaxed max-w-[240px] mx-auto">
                Ao entrar você concorda com nossos termos e garante a segurança dos dados de seus pacientes.
             </p>
          </div>

          <div className="pt-8 border-t border-white/5 opacity-50 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5"><Save size={12} /> <span className="text-[8px] font-bold uppercase">Sincronizado</span></div>
            <div className="flex items-center gap-1.5"><FileText size={12} /> <span className="text-[8px] font-bold uppercase">Criptografado</span></div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="flex h-screen bg-background text-text-main overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar - Desktop and Mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 border-r border-white/5 flex flex-col bg-card/90 backdrop-blur-xl transition-all duration-300 lg:static lg:w-64 lg:bg-card/50",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="font-bold text-xl italic text-white flex items-baseline">
                S<span className="text-xs">p</span>
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Simplifica<span className="text-primary">Psi</span></h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-text-muted hover:text-text-main">
            <ChevronRight className="rotate-180" size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelectedPatient(null);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm",
                activeTab === item.id 
                  ? "bg-primary/20 text-primary border border-primary/20" 
                  : "text-text-muted hover:bg-white/5 hover:text-text-main"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors",
                activeTab === item.id ? "text-primary" : "text-text-muted group-hover:text-text-main"
              )} />
              {item.label}
              {activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

          <div className="p-4 mt-auto border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate text-text-main">{user.displayName || 'Usuário'}</p>
                <p className="text-[10px] text-text-muted truncate uppercase tracking-widest">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors uppercase tracking-widest"
            >
              <LogOut size={14} /> Sair da Conta
            </button>
          </div>
      </aside>

      {/* Backdrop for mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-background transition-colors duration-300">
        {/* Header */}
        <header className="sticky top-0 z-30 glass-card border-x-0 border-t-0 p-4 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4 text-text-muted text-sm flex-1">
             <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="lg:hidden p-2 rounded-xl bg-surface-muted text-text-main"
             >
               <Menu size={20} />
             </button>
             {(activeTab === 'pacientes' || activeTab === 'prontuarios') && !selectedPatient && (
               <div className="flex items-center gap-4 w-full animate-in fade-in slide-in-from-left-4 duration-300">
                  <Search size={18} className="text-text-muted hidden sm:block" />
                  <input 
                    type="text" 
                    placeholder="Buscar pacientes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none focus:ring-0 w-full max-w-md text-text-main text-xs sm:text-sm"
                  />
               </div>
             )}
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="text-text-muted hover:text-text-main p-2 rounded-xl bg-surface-muted hover:opacity-80 transition-all shadow-sm"
              title="Configurações do Perfil"
            >
              <UserCircle size={18} className="lg:w-5 lg:h-5" />
            </button>
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="text-text-muted hover:text-text-main p-2 rounded-xl bg-surface-muted hover:opacity-80 transition-all shadow-sm"
            >
              {theme === 'dark' ? <Moon size={18} className="lg:w-5 lg:h-5" /> : <Sun size={18} className="lg:w-5 lg:h-5" />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardView 
                key="dashboard" 
                user={user}
                patients={patients}
                filteredPatients={filteredPatients} 
                sessions={sessions} 
                transactions={transactions} 
                onPatientSelect={(id) => { setSelectedPatient(id); setActiveTab('pacientes'); }} 
                onGoToAgenda={() => setActiveTab('agenda')}
                onDeletePatient={handleDeletePatient}
              />
            )}
            {activeTab === 'pacientes' && !selectedPatient && (
              <PatientsListView 
                key="patients-list" 
                filteredPatients={filteredPatients} 
                onSelect={setSelectedPatient} 
                onAddClick={() => setIsAddingPatient(true)}
                onDeletePatient={handleDeletePatient}
                onUpdatePatient={handleUpdatePatient}
                onGoToAgenda={() => setActiveTab('agenda')}
              />
            )}
            {activeTab === 'pacientes' && selectedPatient && (
              <PatientDetailsView 
                key="patient-detail" 
                patientId={selectedPatient} 
                patients={patients} 
                documents={patientDocuments[selectedPatient] || []}
                onUpload={(file, category) => handleUploadDocument(selectedPatient, file, category)}
                onDeleteDocument={(docId) => handleDeleteDocument(selectedPatient, docId)}
                onUpdatePatient={handleUpdatePatient}
                onDeletePatient={handleDeletePatient}
                onBack={() => setSelectedPatient(null)} 
                profileSettings={profileSettings}
              />
            )}
            
            {activeTab === 'prontuarios' && !selectedPatient && (
              <ProntuariosListView 
                key="prontuarios-list" 
                patients={filteredPatients} 
                onSelect={setSelectedPatient} 
              />
            )}
            {activeTab === 'prontuarios' && selectedPatient && (
              <PatientDetailsView 
                key="patient-record" 
                patientId={selectedPatient} 
                patients={patients} 
                defaultSubTab="biblioteca"
                documents={patientDocuments[selectedPatient] || []}
                onUpload={(file, category) => handleUploadDocument(selectedPatient, file, category)}
                onDeleteDocument={(docId) => handleDeleteDocument(selectedPatient, docId)}
                onUpdatePatient={handleUpdatePatient}
                onDeletePatient={handleDeletePatient}
                onBack={() => setSelectedPatient(null)} 
                profileSettings={profileSettings}
              />
            )}

            {activeTab === 'financeiro' && (
              <FinanceView 
                key="finance" 
                sessions={sessions} 
                transactions={transactions} 
                patients={patients} 
                onUpdateSession={handleUpdateSession}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteSession={handleDeleteSession}
              />
            )}
            {activeTab === 'agenda' && (
              <CalendarView 
                key="calendar" 
                sessions={sessions} 
                patients={patients} 
                onAddSession={handleAddSession}
                onDeleteSession={handleDeleteSession}
                onUndo={handleUndo}
                lastAction={lastAction}
                onTriageToPatient={(name, day, time) => {
                  setTriageInitialName(name);
                  setTriageInitialDay(day);
                  setTriageInitialTime(time);
                  setIsAddingPatient(true);
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Add Patient Modal */}
        <AnimatePresence>
          {isAddingPatient && (
            <AddPatientModal 
              initialName={triageInitialName}
              initialDay={triageInitialDay}
              initialTime={triageInitialTime}
              onClose={() => { 
                setIsAddingPatient(false); 
                setTriageInitialName(''); 
                setTriageInitialDay('');
                setTriageInitialTime('');
              }} 
              onSave={(data) => { 
                handleAddPatient(data); 
                setTriageInitialName(''); 
                setTriageInitialDay('');
                setTriageInitialTime('');
              }} 
            />
          )}
        </AnimatePresence>

        {/* Profile Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <ProfileSettingsModal
              initialData={profileSettings}
              onClose={() => setIsSettingsOpen(false)}
              onSave={async (data: any) => {
                if (user) {
                  try {
                    await setDoc(doc(db, 'profiles', user.uid), {
                      ...data,
                      updatedAt: serverTimestamp()
                    });
                    // setProfileSettings will be updated by the onSnapshot listener
                    setIsSettingsOpen(false);
                  } catch (err) {
                    console.error("Erro ao salvar perfil:", err);
                    alert("Erro ao salvar configurações do perfil no banco de dados.");
                  }
                } else {
                  // Fallback to localStorage if no user
                  localStorage.setItem('prof_name', data.name);
                  localStorage.setItem('prof_crp', data.crp);
                  localStorage.setItem('prof_logo', data.logo);
                  setProfileSettings(data);
                  setIsSettingsOpen(false);
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Undo Toast */}
        <AnimatePresence>
          {showUndoToast && lastAction && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 px-6 py-4 bg-text-main text-background rounded-2xl shadow-2xl min-w-[320px]"
            >
              <div className="flex-1">
                <p className="text-sm font-bold">Alteração realizada!</p>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-1">Sua agenda foi atualizada</p>
              </div>
              <button 
                onClick={handleUndo}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all uppercase tracking-widest"
              >
                Desfazer
              </button>
              <button onClick={() => setShowUndoToast(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                <Plus className="rotate-45" size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function DashboardView({ 
  user,
  onPatientSelect, 
  patients,
  filteredPatients, 
  sessions, 
  transactions,
  onGoToAgenda,
  onDeletePatient
}: { 
  user: User | null,
  onPatientSelect: (id: string) => void, 
  patients: any[],
  filteredPatients: any[], 
  sessions: any[], 
  transactions: any[],
  onGoToAgenda: () => void,
  onDeletePatient: (id: string) => void
}) {
  const validSessions = useMemo(() => {
    return sessions.filter(s => s.isTriage || patients.some(p => p.id === s.patientId));
  }, [sessions, patients]);

  const validTransactions = useMemo(() => {
    return transactions.filter(t => patients.some(p => p.id === t.patientId));
  }, [transactions, patients]);

  const weeklySessions = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const end = endOfWeek(new Date(), { weekStartsOn: 0 });
    return validSessions.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return d >= start && d <= end && s.status !== 'Cancelada';
    });
  }, [validSessions]);

  const monthlyPredictedIncome = useMemo(() => {
    return calculateIncomePrediction(startOfMonth(new Date()), endOfMonth(new Date()), sessions, patients);
  }, [sessions, patients]);

  const upcomingAgenda = useMemo(() => {
    const now = new Date();
    return validSessions
      .filter(s => {
        const d = new Date(s.date + 'T' + (s.time || '00:00'));
        return d >= now && s.status !== 'Cancelada';
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
  }, [validSessions]);

  const alerts = useMemo(() => {
    const list: any[] = [];
    const today = new Date();
    
    // Aniversários
    patients.forEach(p => {
      if (p.birthDate) {
        // Birthdate is usually DD/MM/AAAA in this app based on some inputs, or ISO
        // Let's try to parse it
        let bDay, bMonth;
        if (p.birthDate.includes('/')) {
          const [d, m] = p.birthDate.split('/');
          bDay = parseInt(d);
          bMonth = parseInt(m) - 1;
        } else {
          const d = new Date(p.birthDate);
          bDay = d.getDate();
          bMonth = d.getMonth();
        }
        if (bDay === today.getDate() && bMonth === today.getMonth()) {
          list.push({ type: 'birthday', patient: p, title: `Aniversário de ${p.name}`, text: 'Parabenize seu paciente hoje!' });
        }
      }
    });

    // Prontuários pendentes (sessões nos últimos 3 dias sem evolução)
    const threeDaysAgo = subDays(today, 3);
    sessions.forEach(s => {
      const d = new Date(s.date + 'T12:00:00');
      if (d >= threeDaysAgo && d <= today && s.status !== 'Cancelada') {
        const p = patients.find(pat => pat.id === s.patientId);
        if (p) {
          const hasEvo = p.clinicalData?.evoluções?.some((e: any) => e.date === format(d, 'dd/MM/yyyy'));
          if (!hasEvo) {
            list.push({ type: 'note', patient: p, session: s, title: `Prontuário Pendente: ${p.name}`, text: `Sessão de ${format(d, 'dd/MM/yyyy')}` });
          }
        }
      }
    });

    // Alertas financeiros
    sessions.forEach(s => {
      if (s.status === 'Cancelada') return;
      const d = new Date(s.date + 'T12:00:00');
      const p = patients.find(pat => pat.id === s.patientId);
      if (!p) return;

      // NF pendente
      if (s.paid && !s.nfIssued) {
        list.push({ type: 'finance', patient: p, session: s, title: `NF Pendente: ${p.name}`, text: `Emitir nota fiscal para sessão de ${format(d, 'dd/MM/yyyy')}` });
      }

      // Pagamento pendente de sessões passadas
      if (!s.paid && d < today && !isSameDay(d, today)) {
        list.push({ type: 'finance', patient: p, session: s, title: `A Receber: ${p.name}`, text: `Pagamento pendente da sessão de ${format(d, 'dd/MM/yyyy')}` });
      }
    });

    return list;
  }, [patients, sessions]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Olá {user?.displayName ? user.displayName.split(' ')[0] : 'Doutor(a)'}! 👋 💜
        </h2>
        <p className="text-text-muted mt-2">Você está no controle da sua rotina. Vamos começar?</p>
        <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">Última atualização: {new Date().toLocaleTimeString()}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard onClick={onGoToAgenda} title="Sessões Hoje" value={validSessions.filter(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.status !== 'Cancelada').length.toString()} subtext="Agendadas para hoje" icon={CalendarIcon} color="text-purple-400" />
        <StatCard onClick={() => {}} title="Pacientes Ativos" value={patients.filter(p => p.status !== 'Inativo').length.toString()} subtext="Gestão total" icon={Users} color="text-blue-400" />
        <StatCard onClick={() => {}} title="Receita Mensal Prevista" value={formatCurrency(monthlyPredictedIncome)} subtext="Previsão baseada em sessões" icon={DollarSign} color="text-pink-400" />
        <StatCard onClick={onGoToAgenda} title="Agendamentos da Semana" value={weeklySessions.length.toString()} subtext="Sessões nesta semana" icon={BarChart3} color="text-orange-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Agenda */}
        <section className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CalendarIcon size={20} className="text-primary" />
              Agenda Próxima
            </h3>
            <span className="text-xs text-text-muted">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Próximos Horários</p>
             {upcomingAgenda.slice(0, 3).map(session => {
               const p = filteredPatients.find(pat => pat.id === session.patientId);
               const sessionDate = new Date(session.date + 'T12:00:00');
               const modality = session.type || p?.modality || 'Presencial';
               return (
                 <div 
                  key={session.id} 
                  onClick={() => session.patientId ? onPatientSelect(session.patientId) : onGoToAgenda()}
                  className="p-4 rounded-2xl bg-surface-muted border border-border-ui flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
                 >
                    <div className="text-center min-w-[70px]">
                      <p className="text-sm font-bold text-text-main">{session.time}</p>
                      <p className="text-[10px] text-text-muted">{format(sessionDate, 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-text-main uppercase">{p?.name || session.triageName || 'PACIENTE'}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          modality === 'Online' ? "bg-blue-500/20 text-blue-400 border-blue-500/20" : "bg-purple-500/20 text-purple-400 border-purple-500/20"
                        )}>{modality}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          session.isTriage ? "bg-orange-500/20 text-orange-400 border-orange-500/20" : "bg-green-500/20 text-green-400 border-green-500/20"
                        )}>{session.isTriage ? 'AVALIAÇÃO' : 'SESSÃO'}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
               );
             })}
             {upcomingAgenda.length === 0 && (
               <div className="py-8 text-center bg-card rounded-2xl border border-dashed border-border-ui">
                 <p className="text-xs text-text-muted">Nenhum agendamento próximo.</p>
               </div>
             )}
             <button onClick={onGoToAgenda} className="w-full py-3 text-sm text-text-muted hover:text-text-main border-t border-white/5 mt-4">Ver Agenda Completa</button>
          </div>
        </section>

        {/* Recent Patients */}
        <section className="glass-card rounded-3xl p-6">
           <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              Alertas Clínicos
            </h3>
          </div>
          <div className="space-y-3">
             {alerts.length > 0 ? alerts.map((alert, idx) => (
               <div 
                key={idx} 
                onClick={() => onPatientSelect(alert.patient.id)}
                className="p-4 flex items-center gap-4 rounded-2xl bg-surface-muted border border-border-ui hover:bg-white/5 transition-all cursor-pointer group"
               >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                    alert.type === 'birthday' ? 'bg-pink-500 text-white shadow-pink-500/20' : 
                    alert.type === 'finance' ? 'bg-green-500 text-white shadow-green-500/20' :
                    'bg-orange-500 text-white shadow-orange-500/20'
                  )}>
                    {alert.type === 'birthday' ? <Cake size={20} /> : 
                     alert.type === 'finance' ? <DollarSign size={20} /> :
                     <FileText size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-main uppercase tracking-tight">{alert.title}</p>
                    <p className="text-xs text-text-muted">{alert.text}</p>
                  </div>
                  <ChevronRight size={18} className="text-text-muted group-hover:text-primary transition-colors" />
               </div>
             )) : (
               <div className="py-12 text-center bg-card/30 rounded-2xl border border-dashed border-border-ui">
                 <Sparkles size={32} className="mx-auto text-primary/20 mb-3" />
                 <p className="text-xs text-text-muted">Tudo em dia! Nenhum alerta pendente.</p>
               </div>
             )}
          </div>
        </section>
      </div>

    </motion.div>
  );
}

function AddPatientModal({ onClose, onSave, initialName = '', initialDay = 'Segunda-feira', initialTime = '' }: { 
  onClose: () => void, 
  onSave: (data: any) => void, 
  initialName?: string,
  initialDay?: string,
  initialTime?: string
}) {
  const [formData, setFormData] = useState({
    name: initialName,
    gender: '',
    birthDate: '',
    phone: '',
    document: '',
    occupation: '',
    email: '',
    address: '',
    medication: '',
    emergencyContact: '',
    isNewPatient: true,
    sessions: '' as any,
    sessionDay: initialDay || 'Segunda-feira',
    nextSessionTime: initialTime,
    amount: '',
    recurrence: 'Semanal',
    modality: 'Online',
    firstSessionDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass-card w-full max-w-4xl md:rounded-[32px] overflow-hidden shadow-2xl md:my-8 h-full md:max-h-[90vh] flex flex-col"
      >
        <div className="p-4 md:p-8 flex items-center justify-between border-b border-white/5 shrink-0">
          <h3 className="text-xl md:text-2xl font-bold text-text-main">Novo Paciente</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-main p-2">
            <ChevronRight size={24} className="rotate-180" />
          </button>
        </div>

        <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          <form id="add-patient-form" onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div className="space-y-5">
                <p className="font-bold text-xs text-primary uppercase tracking-widest pl-1">Informações Básicas</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Nome Completo</label>
                    <input required placeholder="Ex: João Silva" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Gênero/Pronome</label>
                      <input placeholder="Ex: Feminino, Ela/Dela" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Data de Nasc.</label>
                      <input type="text" placeholder="DD/MM/AAAA" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Telefone</label>
                      <input placeholder="(00) 00000-0000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">CPF ou RG</label>
                      <input placeholder="Apenas números" value={formData.document} onChange={(e) => setFormData({...formData, document: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Profissão</label>
                      <input placeholder="Ocupação/Profissão" value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">E-mail</label>
                      <input type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Endereço</label>
                    <input placeholder="Rua, Número, Bairro, Cidade - UF" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Medicação Contínua? (Se sim, qual?)</label>
                    <input placeholder="Não toma / Ex: Sertralina 50mg" value={formData.medication} onChange={(e) => setFormData({...formData, medication: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Contato de Emergência</label>
                    <input placeholder="Nome e Telefone (Grau de parentesco)" value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Session & Finance Info */}
              <div className="space-y-5">
                <p className="font-bold text-xs text-primary uppercase tracking-widest pl-1">Agendamento Padrão & Financeiro</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Situação do Paciente</label>
                    <select 
                      value={formData.isNewPatient ? 'new' : 'old'} 
                      onChange={(e) => setFormData({...formData, isNewPatient: e.target.value === 'new', sessions: ''})} 
                      className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary appearance-none"
                    >
                      <option value="new">Novo Paciente (0 sessões)</option>
                      <option value="old">Paciente Antigo (Já em atendimento)</option>
                    </select>
                  </div>
                  
                  {!formData.isNewPatient && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Sessões Realizadas</label>
                        <input type="number" min="0" placeholder="Ex: 10" value={formData.sessions} onChange={(e) => setFormData({...formData, sessions: e.target.value === '' ? '' : parseInt(e.target.value) || 0})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Dia da Semana</label>
                      <select 
                        value={formData.sessionDay} 
                        onChange={(e) => setFormData({...formData, sessionDay: e.target.value})} 
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary appearance-none"
                      >
                        <option value="">Nenhum/Avulso</option>
                        <option value="Segunda-feira">Segunda-feira</option>
                        <option value="Terça-feira">Terça-feira</option>
                        <option value="Quarta-feira">Quarta-feira</option>
                        <option value="Quinta-feira">Quinta-feira</option>
                        <option value="Sexta-feira">Sexta-feira</option>
                        <option value="Sábado">Sábado</option>
                        <option value="Domingo">Domingo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Hora Padrão</label>
                      <input type="time" value={formData.nextSessionTime} onChange={(e) => setFormData({...formData, nextSessionTime: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Modalidade</label>
                      <select 
                        value={formData.modality} 
                        onChange={(e) => setFormData({...formData, modality: e.target.value})} 
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary appearance-none"
                      >
                        <option value="Online">Online</option>
                        <option value="Presencial">Presencial</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Recorrência</label>
                      <select 
                        value={formData.recurrence} 
                        onChange={(e) => setFormData({...formData, recurrence: e.target.value})} 
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary appearance-none"
                      >
                        <option value="Semanal">Semanal</option>
                        <option value="Quinzenal">Quinzenal</option>
                        <option value="Mensal">Mensal</option>
                        <option value="Nenhuma">Nenhuma (Avaliação/Avulso)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Valor da Sessão/Plano (R$)</label>
                    <input type="number" placeholder="Ex: 250" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>

                  {formData.recurrence !== 'Nenhuma' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        Data de Início / Próxima Sessão
                      </label>
                      <input 
                        type="date" 
                        required
                        value={formData.firstSessionDate} 
                        onChange={(e) => {
                          const date = new Date(e.target.value + 'T12:00:00');
                          const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                          setFormData({
                            ...formData, 
                            firstSessionDate: e.target.value,
                            sessionDay: days[date.getDay()]
                          });
                        }} 
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                      />
                      <p className="text-[10px] text-primary font-bold uppercase tracking-tighter opacity-70 ml-1">
                        A recorrência {formData.recurrence.toLowerCase()} será calculada a partir desta data.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-border-ui flex gap-3 shrink-0 bg-background/50">
          <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl bg-surface-muted border border-border-ui text-text-main font-bold hover:bg-border-ui transition-colors">Cancelar</button>
          <button type="submit" form="add-patient-form" className="flex-[2] px-6 py-4 rounded-2xl bg-primary text-white font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all text-sm uppercase tracking-wider">Salvar Registro</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProntuariosListView({ patients, onSelect }: { patients: any[], onSelect: (id: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-text-main">Arquivo de Prontuários</h2>
        <p className="text-text-muted mt-2">Selecione um paciente para visualizar o histórico clínico completo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map((patient) => (
          <div 
            key={patient.id}
            onClick={() => onSelect(patient.id)}
            className="glass-card rounded-[32px] p-6 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group border border-border-ui"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase italic">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-text-main uppercase text-sm tracking-tight">{patient.name}</h4>
                <p className="text-xs text-text-muted">
                  {(parseInt(patient.sessions) || 0) + (patient.clinicalData?.evoluções?.length || 0)} sessões realizadas
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-text-muted uppercase font-bold tracking-widest">
                <span>Registros Clínicos</span>
                <span className="text-primary">{patient.clinicalData?.evoluções?.length || 0} relatos</span>
              </div>
              <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(((patient.clinicalData?.evoluções?.length || 0) / 10) * 100, 100)}%` }} 
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-ui flex items-center justify-between group-hover:text-primary transition-colors">
              <span className="text-xs font-bold uppercase tracking-widest">Acessar Prontuário</span>
              <ChevronRight size={18} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, subtext, icon: Icon, color, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-card rounded-3xl p-6 relative overflow-hidden group transition-all",
        onClick && "cursor-pointer hover:shadow-xl hover:shadow-primary/5 border-primary/20"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2 rounded-xl bg-white/5", color)}>
          <Icon size={20} />
        </div>
        <MoreVertical size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h4 className="text-sm text-text-muted">{title}</h4>
      <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
      <p className="text-[10px] text-text-muted mt-2">{subtext}</p>
      <div className={cn("absolute -bottom-4 -right-4 w-16 h-16 blur-3xl opacity-20", color.replace('text', 'bg'))} />
    </div>
  );
}

function PatientsListView({ 
  onSelect, 
  filteredPatients, 
  onAddClick,
  onDeletePatient,
  onUpdatePatient,
  onGoToAgenda
}: { 
  onSelect: (id: string) => void, 
  filteredPatients: any[], 
  onAddClick: () => void,
  onDeletePatient: (id: string) => void,
  onUpdatePatient: (patient: any) => void,
  onGoToAgenda: () => void
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ativos' | 'inativos'>('ativos');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const displayPatients = filteredPatients.filter(p => activeTab === 'ativos' ? p.status !== 'Inativo' : p.status === 'Inativo');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Pacientes</h2>
          <p className="text-text-muted text-sm">Gerencie sua lista de pacientes e históricos.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button 
              onClick={() => setActiveTab('ativos')}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === 'ativos' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface-muted text-text-muted hover:text-text-main"
              )}
            >
              Ativos
            </button>
            <button 
              onClick={() => setActiveTab('inativos')}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === 'inativos' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-surface-muted text-text-muted hover:text-text-main"
              )}
            >
              Inativos
            </button>
          </div>
        </div>
        <button 
          onClick={onAddClick}
          className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Paciente
        </button>
      </div>

      <div className="glass-card rounded-3xl overflow-visible">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-surface-muted text-xs text-text-muted font-bold uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Última Sessão</th>
                <th className="px-8 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui">
              {displayPatients.length > 0 ? displayPatients.map(patient => (
                <tr 
                  key={patient.id} 
                  className="hover:bg-surface-muted cursor-pointer transition-colors group"
                  onClick={() => onSelect(patient.id)}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {patient.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{patient.name}</p>
                        <p className="text-xs text-text-muted">{patient.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                     <span className={cn(
                       "text-[10px] px-2 py-0.5 rounded-full border font-bold",
                       patient.status === 'Inativo' ? "bg-orange-500/10 text-orange-500 border-orange-500/10" : "bg-green-500/10 text-green-400 border-green-500/10"
                     )}>
                       {patient.status || 'Ativo'}
                     </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-text-muted">{patient.lastSession}</td>
                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onGoToAgenda();
                        }}
                        className="p-1 rounded-lg hover:bg-primary/10 hover:text-primary text-text-muted transition-all"
                        title="Ver na Agenda"
                      >
                        <CalendarIcon size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(patient.id);
                        }}
                        className="p-1 rounded-lg hover:bg-primary/10 hover:text-primary text-text-muted transition-all"
                        title="Ver Prontuário"
                      >
                        <FileText size={18} />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === patient.id ? null : patient.id);
                          }}
                          className="p-1 rounded-lg hover:bg-surface-muted-dark hover:text-text-main text-text-muted transition-all"
                        >
                          <MoreVertical size={18} />
                        </button>
                        <AnimatePresence>
                          {openMenuId === patient.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-10 w-48 bg-card border border-border-ui rounded-2xl shadow-xl z-20 py-2"
                            >
                               <button 
                                onClick={() => onUpdatePatient({ ...patient, status: patient.status === 'Inativo' ? 'Ativo' : 'Inativo' })}
                                className="w-full text-left px-4 py-2 text-xs text-text-main hover:bg-surface-muted transition-colors flex items-center gap-2"
                               >
                                  {patient.status === 'Inativo' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                  {patient.status === 'Inativo' ? 'Reativar Paciente' : 'Inativar Paciente'}
                               </button>
                               <button 
                                onClick={() => onDeletePatient(patient.id)}
                                className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                               >
                                  <Trash2 size={14} />
                                  Excluir Definitivamente
                               </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-text-muted">Nenhum paciente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-border-ui">
          {displayPatients.length > 0 ? displayPatients.map(patient => (
            <div 
              key={patient.id} 
              className="p-4 space-y-4 hover:bg-surface-muted transition-colors"
              onClick={() => onSelect(patient.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                    {patient.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{patient.name}</p>
                    <p className="text-xs text-text-muted truncate max-w-[150px]">{patient.email}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest",
                  patient.status === 'Inativo' ? "bg-orange-500/10 text-orange-500 border-orange-500/10" : "bg-green-500/10 text-green-400 border-green-500/10"
                )}>
                  {patient.status || 'Ativo'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Última</p>
                  <p className="text-text-main truncate">{patient.lastSession}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border-ui" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => onGoToAgenda()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-primary transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  <CalendarIcon size={14} /> Agenda
                </button>
                <button 
                  onClick={() => onSelect(patient.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  <FileText size={14} /> Prontuário
                </button>
                <button 
                  onClick={() => setOpenMenuId(openMenuId === patient.id ? null : patient.id)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-muted text-text-muted"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          )) : (
            <div className="px-6 py-12 text-center text-text-muted">Nenhum paciente encontrado.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DocCard({ doc, onDelete }: { doc: any, onDelete: (id: string) => void }) {
  return (
    <div className="p-4 rounded-2xl bg-surface-muted border border-border-ui hover:border-primary/30 transition-all group text-center space-y-3 relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(doc.id);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
        title="Excluir documento"
      >
        <Trash2 size={12} />
      </button>
      
      <a 
        href={doc.url} 
        download={doc.name}
        className="block space-y-3"
      >
        <div className="w-full aspect-square bg-card rounded-xl flex items-center justify-center text-text-muted group-hover:text-primary transition-colors overflow-hidden">
          {['JPG', 'PNG', 'WEBP', 'SVG'].includes(doc.type) ? (
            <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
          ) : (
            <FileText size={32} />
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-main truncate uppercase px-1">{doc.name}</p>
          <p className="text-[8px] text-text-muted uppercase mt-0.5">{doc.type} • {doc.size} • {doc.date}</p>
        </div>
      </a>
    </div>
  );
}

function PatientDetailsView({ 
  patientId, 
  onBack, 
  patients, 
  documents, 
  onUpload, 
  onDeleteDocument, 
  onUpdatePatient, 
  onDeletePatient, 
  profileSettings,
  defaultSubTab = 'perfil' 
}: { 
  patientId: string, 
  onBack: () => void, 
  patients: any[], 
  documents: any[], 
  onUpload: (file: File, category: 'prontuario' | 'anexo') => void,
  onDeleteDocument: (docId: string) => void,
  onUpdatePatient: (patient: any) => void,
  onDeletePatient: (id: string) => void,
  profileSettings?: any,
  defaultSubTab?: 'perfil' | 'prontuario' | 'anamnese' | 'smartnotes' | 'biblioteca'
}) {
  const patient = patients.find(p => p.id === patientId);
  const [activeSubTab, setActiveSubTab] = useState<'perfil' | 'prontuario' | 'anamnese' | 'smartnotes' | 'biblioteca'>(defaultSubTab);
  const [isAddingEvolution, setIsAddingEvolution] = useState(false);
  const [newEvolutionNote, setNewEvolutionNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Novos estados para a evolução aprimorada
  const [evolutionDate, setEvolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [evolutionTime, setEvolutionTime] = useState(patient.sessionTime || new Date().toTimeString().substring(0, 5));
  const [evolutionSessionNumber, setEvolutionSessionNumber] = useState(patient.clinicalData?.evoluções?.length ? patient.clinicalData.evoluções.length + 1 : 1);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isGeneratingEvolution, setIsGeneratingEvolution] = useState(false);
  
  const [editingEvolutionId, setEditingEvolutionId] = useState<number | null>(null);
  const [editingEvolutionNote, setEditingEvolutionNote] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  
  const [expandedEvolutions, setExpandedEvolutions] = useState<Set<number>>(new Set());
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const [isGeneratingAllPdf, setIsGeneratingAllPdf] = useState(false);
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editingAnamneseField, setEditingAnamneseField] = useState<string | null>(null);
  
  const [uploadCategory, setUploadCategory] = useState<'prontuario' | 'anexo'>('anexo');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (patient) {
      setEditForm({
        ...patient,
        cpf: patient.cpf || patient.document || '',
        birthDate: patient.birthDate || '',
        profession: patient.profession || patient.occupation || '',
        emergencyName: patient.emergencyName || '',
        emergencyRelation: patient.emergencyRelation || '',
        emergencyPhone: patient.emergencyPhone || '',
        amount: patient.amount || '',
        sessions: patient.sessions || '0',
        status: patient.status || 'Ativo',
        paymentNotes: patient.paymentNotes || ''
      });
    }
  }, [patient]);

  if (!patient || !editForm) return null;

  const handleSaveProfile = () => {
    onUpdatePatient(editForm);
    setIsEditing(false);
  };

  // Initialize clinical data if not present
  const clinicalData = {
    ...patient.clinicalData,
    anamnese: {
      mainComplaint: patient.clinicalData?.anamnese?.mainComplaint || patient.clinicalData?.anamnese?.queixa || "",
      familyHistory: patient.clinicalData?.anamnese?.familyHistory || patient.clinicalData?.anamnese?.historico || "",
      lifeHistory: patient.clinicalData?.anamnese?.lifeHistory || patient.clinicalData?.anamnese?.exame || "",
      currentMedication: patient.clinicalData?.anamnese?.currentMedication || ""
    },
    evoluções: patient.clinicalData?.evoluções || [],
    smartNotes: patient.clinicalData?.smartNotes || {
      padroes: "",
      progresso: "",
      sugestao: "",
      topicos: []
    }
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'pt-BR';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNewEvolutionNote(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognitionRef.current.onstart = () => setIsRecording(true);
    recognitionRef.current.onend = () => setIsRecording(false);
    recognitionRef.current.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleAddEvolution = async () => {
    if (!newEvolutionNote.trim() || isSavingEvolution) return;

    setIsSavingEvolution(true);
    try {
      const formattedDate = evolutionDate.split('-').reverse().join('/');

      const newEvolution = {
        id: Date.now(),
        date: formattedDate,
        time: evolutionTime,
        sessionNumber: evolutionSessionNumber,
        note: newEvolutionNote
      };

      await onUpdatePatient({
        ...patient,
        clinicalData: {
          ...clinicalData,
          evoluções: [newEvolution, ...clinicalData.evoluções]
        }
      });

      setNewEvolutionNote("");
      setTranscriptionText("");
      setEvolutionSessionNumber(prev => prev + 1);
      setIsAddingEvolution(false);
    } finally {
      setIsSavingEvolution(false);
    }
  };

  const handleGenerateEvolution = async () => {
    if (!transcriptionText.trim()) return;
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    setIsGeneratingEvolution(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Atue como um psicólogo clínico experiente. Transforme a seguinte transcrição bruta de um áudio em um relato de sessão clínica organizado em texto corrido e parágrafos, escrito de forma profissional, mas com um tom pessoal (estilo relato de caso).
      
REGRA IMPORTANTÍSSIMA 1: NUNCA invente, presuma ou adicione informações que não estejam na transcrição bruta. Se a transcrição for curta e contiver apenas o básico, devolva um relato curto e básico. O tamanho e a quantidade de detalhes do seu relato devem ser estritamente proporcionais à transcrição fornecida.

REGRA IMPORTANTÍSSIMA 2: Substitua TODOS os nomes próprios de pessoas (pacientes, parceiros, parentes, etc) mencionados na transcrição APENAS pela letra inicial do nome seguida de ponto (exemplo: Gabi -> G., Alana -> A., Carol -> C.). 

Mantenha o fluxo de narrativa em primeira pessoa do terapeuta (ex: "A paciente relatou...", "Questionei se...", "Trabalhei com ela..."). Não adicione saudações, devolva apenas o texto final do relato.

Exemplo de estilo de relato desejado:
"A sessão com a G. foi uma boa sessão. Ela começou contando que no dia anterior havia sentido uma dor no estômago diferente de tudo que já havia sentido antes, como se fosse uma mordida. Foi ao hospital, mas não se sentiu segura com a primeira médica, então foi a um segundo médico. 
Sobre a semana, ela disse que foi tranquila de forma geral, mas que ficou um pouco ansiosa porque uma ex-noiva dela, a A., entrou em contato. O estômago dela ficou ruim depois que recebeu a mensagem. Questionei se o que ela estava sentindo era culpa, e ela confirmou que sim.
Trabalhei com ela a diferença entre colocar um limite e sustentá-lo: que ela tem o direito de estabelecer o que é inegociável para ela, e que a reação do outro não muda esse direito. Falei também sobre assertividade e combinamos que na próxima sessão vamos aprofundar esse tema."

Transcrição bruta a ser convertida:
"${transcriptionText}"
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setNewEvolutionNote(response.text);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('API key')) {
        alert("Chave da API inválida ou não configurada corretamente.");
      } else {
        alert("Erro ao gerar relato com IA. Verifique o console.");
      }
    } finally {
      setIsGeneratingEvolution(false);
    }
  };

  const handleDeleteEvolution = (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir esta evolução?")) return;
    onUpdatePatient({
      ...patient,
      clinicalData: {
        ...clinicalData,
        evoluções: clinicalData.evoluções.filter((e: any) => e.id !== id)
      }
    });
    setOpenDropdownId(null);
  };

  const handleSaveEditEvolution = (id: number) => {
    onUpdatePatient({
      ...patient,
      clinicalData: {
        ...clinicalData,
        evoluções: clinicalData.evoluções.map((e: any) => e.id === id ? { ...e, note: editingEvolutionNote } : e)
      }
    });
    setEditingEvolutionId(null);
    setEditingEvolutionNote("");
  };

  const handleGeneratePDFRecord = async (evo: any) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    setGeneratingPdfId(evo.id);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Atue como um psicólogo clínico extraindo informações de um relato de evolução para um prontuário formal.
Leia o seguinte relato de sessão e extraia as informações dividindo-as nestes 4 tópicos:
1. Demanda/Queixa do Dia (Breve resumo do que o paciente trouxe para a sessão).
2. Intervenções/Técnicas Utilizadas (Ex: Diálogo socrático, Escuta ativa, Questionamento, etc).
3. Evolução e Resposta do Paciente (Como o paciente reagiu e qual o progresso observado).
4. Tarefa de Casa (Se houve alguma combinação para a próxima semana. Se não, escreva "Nenhuma").

Seja muito sucinto, formal e direto. Não adicione saudações, asteriscos ou introduções, retorne APENAS um objeto JSON válido com as seguintes chaves exatas (tudo minúsculo, sem acentos): "demanda", "intervencoes", "evolucao", "tarefa".

Relato:
"${evo.note}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || '{}');

      const doc = new jsPDF();
      
      let startY = 20;

      if (profileSettings?.logo) {
        try {
          doc.addImage(profileSettings.logo, 'JPEG', 14, 10, 30, 30);
          startY = 50;
        } catch (e) {
          console.error("Erro ao adicionar logo:", e);
        }
      }

      if (profileSettings?.name || profileSettings?.crp) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const rightX = 196; // 210mm (A4) - 14mm de margem
        if (profileSettings.name) {
          doc.text(`Psicólogo(a): ${profileSettings.name}`, rightX, 15, { align: 'right' });
        }
        if (profileSettings.crp) {
          doc.text(`CRP: ${profileSettings.crp}`, rightX, 20, { align: 'right' });
        }
      }

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Prontuário Psicológico", 14, startY);

      // 1. Identificação do Paciente
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("1. Identificação do Paciente", 14, startY + 15);
      
      autoTable(doc, {
        startY: startY + 20,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        body: [
          ['Nome Completo', patient.name || ''],
          ['Data de Nascimento', patient.birthDate || ''],
          ['CPF/RG', patient.cpf || patient.document || ''],
          ['Contatos (Telefone/E-mail)', `${patient.phone || ''} / ${patient.email || ''}`],
          ['Responsável Legal (se menor)', '']
        ],
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });

      // 2. Dados do Atendimento
      const finalY1 = (doc as any).lastAutoTable.finalY || 40;
      doc.text("2. Dados do Atendimento", 14, finalY1 + 15);
      
      autoTable(doc, {
        startY: finalY1 + 20,
        theme: 'grid',
        body: [
          ['Data', evo.date || ''],
          ['Horário', evo.time || ''],
          ['Número da Sessão', evo.sessionNumber ? String(evo.sessionNumber) : ''],
          ['Modalidade', 'Presencial ( ) Online (X)']
        ],
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });

      // 3. Registro de Evolução
      const finalY2 = (doc as any).lastAutoTable.finalY || finalY1;
      doc.text("3. Registro de Evolução", 14, finalY2 + 15);
      
      autoTable(doc, {
        startY: finalY2 + 20,
        theme: 'grid',
        body: [
          ['Demanda/Queixa do Dia', data.demanda || ''],
          ['Intervenções/Técnicas Utilizadas', data.intervencoes || ''],
          ['Evolução e Resposta do Paciente', data.evolucao || ''],
          ['Tarefa de Casa (RPD)', data.tarefa || '']
        ],
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });

      // Footer
      const finalY3 = (doc as any).lastAutoTable.finalY || finalY2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const profName = profileSettings.name || "Profissional não cadastrado";
      const profCRP = profileSettings.crp ? `CRP ${profileSettings.crp}` : "CRP não cadastrado";
      doc.text(`${profName}\nPsicólogo Clínico | ${profCRP}`, 140, finalY3 + 30, { align: "center" });

      const pdfBlob = doc.output('blob');
      const safeDate = (evo.date || 'data').replace(/[\/\\]/g, '-');
      const fileName = `Prontuario_Sessao_${evo.sessionNumber || evo.id}_${safeDate}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      onUpload(file, 'prontuario');
      alert("Prontuário gerado e salvo na Biblioteca de Documentos com sucesso!");

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('API key')) {
        alert("Chave da API inválida ou não configurada corretamente.");
      } else {
        alert("Erro ao gerar PDF do Prontuário. Verifique o console.");
      }
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleGenerateAllPDFRecords = async () => {
    if (!clinicalData.evoluções || clinicalData.evoluções.length === 0) {
      alert("Não há evoluções registradas para gerar o prontuário.");
      return;
    }

    setIsGeneratingAllPdf(true);
    try {
      const doc = new jsPDF();
      let startY = 20;

      if (profileSettings?.logo) {
        try {
          doc.addImage(profileSettings.logo, 'JPEG', 14, 10, 30, 30);
          startY = 50;
        } catch (e) {
          console.error("Erro ao adicionar logo:", e);
        }
      }

      if (profileSettings?.name || profileSettings?.crp) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const rightX = 196;
        if (profileSettings.name) {
          doc.text(`Psicólogo(a): ${profileSettings.name}`, rightX, 15, { align: 'right' });
        }
        if (profileSettings.crp) {
          doc.text(`CRP: ${profileSettings.crp}`, rightX, 20, { align: 'right' });
        }
      }

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Prontuário Psicológico Completo", 14, startY);

      doc.setFontSize(12);
      doc.text("1. Identificação do Paciente", 14, startY + 15);
      
      autoTable(doc, {
        startY: startY + 20,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        body: [
          ['Nome Completo', patient.name || ''],
          ['Data de Nascimento', patient.birthDate || ''],
          ['CPF/RG', patient.cpf || patient.document || ''],
          ['Contatos (Telefone/E-mail)', `${patient.phone || ''} / ${patient.email || ''}`],
        ],
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 20;
      doc.text("2. Evoluções Clínicas", 14, currentY);
      currentY += 10;

      const sortedEvolutions = [...clinicalData.evoluções].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return dateA.localeCompare(dateB);
      });

      sortedEvolutions.forEach((evo, index) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Sessão #${evo.sessionNumber || index + 1} - ${evo.date} ${evo.time ? `às ${evo.time}` : ''}`, 14, currentY);
        currentY += 7;
        
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(evo.note, 180);
        doc.text(lines, 14, currentY);
        currentY += (lines.length * 5) + 10;
      });

      const pdfBlob = doc.output('blob');
      const fileName = `Prontuario_Completo_${patient.name.replace(/\s+/g, '_')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      onUpload(file, 'prontuario');
      alert("Prontuário completo gerado e salvo na Biblioteca de Documentos com sucesso!");

    } catch (err: any) {
      console.error(err);
      alert("Erro ao gerar PDF completo.");
    } finally {
      setIsGeneratingAllPdf(false);
    }
  };

  const handleUpdateAnamnese = (field: string, value: string) => {
    onUpdatePatient({
      ...patient,
      clinicalData: {
        ...clinicalData,
        anamnese: {
          ...clinicalData.anamnese,
          [field]: value
        }
      }
    });
  };

  const handleGenerateAI = async () => {
    if (!clinicalData.anamnese.mainComplaint && clinicalData.evoluções.length === 0) {
      alert("Por favor, preencha a anamnese ou adicione evoluções para gerar a análise.");
      return;
    }

    setIsGeneratingAI(true);
    try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setIsGeneratingAI(false);
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Aja como um assistente de psicólogo especializado em análise clínica.
        Analise os dados do paciente ${patient.name} e gere resumos.

        ANAMNESE: 
        Queixa Principal: ${clinicalData.anamnese.mainComplaint}
        Histórico Familiar: ${clinicalData.anamnese.familyHistory}
        História de Vida: ${clinicalData.anamnese.lifeHistory}
        Medicamentos em Uso: ${clinicalData.anamnese.currentMedication}

        SESSÕES (EVOLUÇÕES):
        ${clinicalData.evoluções.map(e => `${e.date}: ${e.note}`).join('\n')}
        
        Gere um objeto JSON com EXATAMENTE esta estrutura:
        {
          "aiSummaries": {
            "observacoes": ["string", "string", "string"],
            "evolucao": ["string", "string", "string"]
          },
          "smartNotes": {
            "padroes": "string descrevendo padrões",
            "progresso": "string descrevendo progresso",
            "sugestao": "string com sugestão terapêutica",
            "topicos": ["string label", "string label"]
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      onUpdatePatient({
        ...patient,
        aiSummaries: data.aiSummaries || { observacoes: [], evolucao: [] },
        clinicalData: {
          ...clinicalData,
          smartNotes: data.smartNotes || clinicalData.smartNotes
        }
      });
    } catch (error) {
      console.error("Erro ao gerar evolução IA:", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, uploadCategory);
    }
  };

  // State mapping for generated summaries
  const observacoesIniciais = patient.aiSummaries?.observacoes || [];
  const evolucaoEmocional = patient.aiSummaries?.evolucao || [];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-xl bg-surface-muted hover:opacity-80 text-text-muted transition-all">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold uppercase text-text-main">{patient.name}</h2>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-text-muted flex items-center gap-1"><Users size={14} /> Ativo desde Jan 2024</span>
            {patient.sessionDay ? (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <CalendarIcon size={14} /> Sessão Padrão: Toda {patient.sessionDay} {patient.sessionTime ? `às ${patient.sessionTime}` : ''}
              </span>
            ) : (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <CalendarIcon size={14} /> Agendamento Flexível
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Nav with overflow for mobile */}
        <div className="lg:col-span-3">
          <div className="flex flex-row overflow-x-auto pb-4 lg:flex-col lg:overflow-visible gap-2 no-scrollbar">
            {[
              { id: 'perfil', label: 'Perfil', icon: Users },
              { id: 'prontuario', label: 'Prontuário', icon: FileText, badge: 'NOVO' },
              { id: 'anamnese', label: 'Anamnese', icon: FileText },
              { id: 'biblioteca', label: 'Biblioteca', icon: FolderOpen },
              { id: 'smartnotes', label: 'Resumo', icon: BarChart3 },
            ].map(item => (
             <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as any)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all text-xs lg:text-sm glass-card hover:bg-surface-muted whitespace-nowrap min-w-max",
                  activeSubTab === item.id ? "border-primary text-primary shadow-sm" : "text-text-main"
                )}
             >
                <item.icon size={18} className={activeSubTab === item.id ? 'text-primary' : 'text-text-muted'} />
                {item.label}
                {item.badge && (
                  <span className="ml-auto text-[8px] bg-primary/10 text-primary px-1 leading-tight rounded">
                    {item.badge}
                  </span>
                )}
             </button>
           ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-6">
           <section className="glass-card rounded-[32px] p-8 min-h-[600px] overflow-hidden">
              <AnimatePresence mode="wait">
                {activeSubTab === 'perfil' && (
                  <motion.div 
                    key="perfil"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between pb-8 border-b border-border-ui">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold italic border border-primary/20">
                          {patient.name.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          {isEditing ? (
                            <input 
                              value={editForm.name} 
                              onChange={(e) => setEditForm({...editForm, name: e.target.value.toUpperCase()})}
                              className="text-2xl font-bold bg-surface-muted border border-border-ui rounded-lg px-2 py-1 outline-none focus:border-primary text-text-main w-full"
                            />
                          ) : (
                            <h3 className="text-2xl font-bold text-text-main uppercase">{patient.name}</h3>
                          )}
                          
                          {isEditing ? (
                            <input 
                              value={editForm.email} 
                              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                              className="text-text-muted bg-surface-muted border border-border-ui rounded-lg px-2 py-1 outline-none focus:border-primary w-full text-sm mt-1"
                            />
                          ) : (
                            <p className="text-text-muted">{patient.email}</p>
                          )}

                          <div className="flex gap-4 mt-2">
                            {isEditing ? (
                              <input 
                                value={editForm.phone} 
                                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                className="text-xs bg-surface-muted px-3 py-1 rounded-lg border border-border-ui outline-none focus:border-primary"
                              />
                            ) : (
                              <span className="text-xs bg-surface-muted px-3 py-1 rounded-full border border-border-ui">{patient.phone}</span>
                            )}
                            {isEditing ? (
                              <select 
                                value={editForm.status || 'Ativo'}
                                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                className="text-xs bg-surface-muted px-3 py-1 rounded-lg border border-border-ui outline-none focus:border-primary font-bold"
                              >
                                <option value="Ativo">ATIVO</option>
                                <option value="Inativo">INATIVO</option>
                              </select>
                            ) : (
                              <span className={cn(
                                "text-xs px-3 py-1 rounded-full border font-bold uppercase tracking-widest",
                                patient.status === 'Inativo' ? "bg-orange-500/10 text-orange-500 border-orange-500/10" : "bg-green-500/10 text-green-500 border-green-500/10"
                              )}>
                                Paciente {patient.status || 'Ativo'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                        className={cn(
                          "px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                          isEditing ? "bg-primary text-white" : "bg-surface-muted text-text-main border border-border-ui hover:bg-border-ui"
                        )}
                      >
                        {isEditing ? 'Salvar Alterações' : 'Editar Perfil'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Informações Pessoais</h4>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">CPF</span>
                            {isEditing ? (
                              <input 
                                placeholder="000.000.000-00"
                                value={editForm.cpf} 
                                onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">{patient.cpf || patient.document || 'Não informado'}</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">Data de Nasc.</span>
                            {isEditing ? (
                              <input 
                                type="date"
                                value={editForm.birthDate} 
                                onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">
                                {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : 'Não informada'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">Profissão</span>
                            {isEditing ? (
                              <input 
                                placeholder="Ex: Designer Gráfico"
                                value={editForm.profession} 
                                onChange={(e) => setEditForm({...editForm, profession: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">{patient.profession || patient.occupation || 'Não informada'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Contatos de Emergência</h4>
                        <div className="p-4 rounded-2xl bg-surface-muted border border-border-ui space-y-3">
                          {isEditing ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] text-text-muted uppercase">Nome do Contato</label>
                                <input 
                                  value={editForm.emergencyName} 
                                  onChange={(e) => setEditForm({...editForm, emergencyName: e.target.value})}
                                  className="w-full text-sm font-bold text-text-main bg-white/5 border border-border-ui rounded-lg px-3 py-2 outline-none focus:border-primary uppercase"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-text-muted uppercase">Parentesco</label>
                                <input 
                                  value={editForm.emergencyRelation} 
                                  onChange={(e) => setEditForm({...editForm, emergencyRelation: e.target.value})}
                                  className="w-full text-xs text-text-main bg-white/5 border border-border-ui rounded-lg px-3 py-2 outline-none focus:border-primary"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-text-muted uppercase">Telefone</label>
                                <input 
                                  value={editForm.emergencyPhone} 
                                  onChange={(e) => setEditForm({...editForm, emergencyPhone: e.target.value})}
                                  className="w-full text-xs text-text-main bg-white/5 border border-border-ui rounded-lg px-3 py-2 outline-none focus:border-primary"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-text-main uppercase">
                                {patient.emergencyName || 'Nenhum contato'} {patient.emergencyRelation && `(${patient.emergencyRelation})`}
                              </p>
                              <p className="text-xs text-text-muted mt-1">{patient.emergencyPhone || 'Telefone não informado'}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border-ui space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Agendamento Padrão</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Dia da Semana</span>
                          {isEditing ? (
                            <select 
                              value={editForm.sessionDay || ''} 
                              onChange={(e) => setEditForm({...editForm, sessionDay: e.target.value})} 
                              className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer"
                            >
                              <option value="">Nenhum</option>
                              <option value="Segunda-feira">Segunda-feira</option>
                              <option value="Terça-feira">Terça-feira</option>
                              <option value="Quarta-feira">Quarta-feira</option>
                              <option value="Quinta-feira">Quinta-feira</option>
                              <option value="Sexta-feira">Sexta-feira</option>
                              <option value="Sábado">Sábado</option>
                              <option value="Domingo">Domingo</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold text-text-main">{patient.sessionDay || 'Nenhum'}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Horário</span>
                          {isEditing ? (
                            <input 
                              type="time"
                              value={editForm.sessionTime || ''} 
                              onChange={(e) => setEditForm({...editForm, sessionTime: e.target.value})}
                              className="text-xs font-bold text-text-main bg-transparent outline-none"
                            />
                          ) : (
                            <span className="text-xs font-bold text-text-main">{patient.sessionTime || 'Nenhum'}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Modalidade</span>
                          {isEditing ? (
                            <select 
                              value={editForm.modality || ''} 
                              onChange={(e) => setEditForm({...editForm, modality: e.target.value})} 
                              className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer"
                            >
                              <option value="Online">Online</option>
                              <option value="Presencial">Presencial</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold text-text-main">{patient.modality || 'Online'}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Recorrência</span>
                          {isEditing ? (
                            <select 
                              value={editForm.recurrence || ''} 
                              onChange={(e) => setEditForm({...editForm, recurrence: e.target.value})} 
                              className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer"
                            >
                              <option value="Semanal">Semanal</option>
                              <option value="Quinzenal">Quinzenal</option>
                              <option value="Mensal">Mensal</option>
                              <option value="Nenhuma">Nenhuma</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold text-text-main">{patient.recurrence || 'Semanal'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border-ui space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Valor e Histórico</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Valor da Sessão (R$)</span>
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.amount || ''} 
                              onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                              className="text-xs font-bold text-text-main bg-transparent outline-none"
                            />
                          ) : (
                            <span className="text-xs font-bold text-text-main">{patient.amount ? `R$ ${patient.amount}` : 'Não informado'}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Sessões Realizadas (Histórico)</span>
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.sessions || '0'} 
                              onChange={(e) => setEditForm({...editForm, sessions: e.target.value})}
                              className="text-xs font-bold text-text-main bg-transparent outline-none"
                            />
                          ) : (
                            <span className="text-xs font-bold text-text-main">{patient.sessions || '0'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border-ui space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Informações de Pagamento (Notas Internas)</h4>
                      <div className="p-4 rounded-2xl bg-surface-muted border border-border-ui">
                        {isEditing ? (
                          <textarea 
                            placeholder="Ex: Paga todo dia 05 e 20, valor diferenciado, etc..."
                            value={editForm.paymentNotes} 
                            onChange={(e) => setEditForm({...editForm, paymentNotes: e.target.value})}
                            className="w-full text-sm text-text-main bg-transparent outline-none min-h-[100px] resize-none"
                          />
                        ) : (
                          <p className="text-sm text-text-main whitespace-pre-wrap">
                            {patient.paymentNotes || 'Nenhuma informação de pagamento registrada.'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border-ui space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-text-main flex items-center gap-2">
                          <FileText size={18} className="text-primary" />
                          Resumo das Sessões
                        </h4>
                        <button 
                          onClick={handleGenerateAI}
                          disabled={isGeneratingAI}
                          className={cn(
                            "bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-2",
                            isGeneratingAI && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isGeneratingAI ? (
                            <>
                              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              Analisando...
                            </>
                          ) : (
                            <>✨ Gerar Evolução IA</>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 rounded-[32px] bg-purple-500/5 border border-purple-500/10">
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-widest">Observações Iniciais</span>
                          <ul className="mt-4 space-y-2 text-sm text-text-muted list-disc ml-5 min-h-[60px]">
                            {observacoesIniciais.length > 0 ? observacoesIniciais.map((obs: string, i: number) => (
                              <li key={i}>{obs}</li>
                            )) : (
                              <p className="text-xs text-text-muted italic opacity-50">Nenhuma observação gerada.</p>
                            )}
                          </ul>
                        </div>
                        <div className="p-6 rounded-[32px] bg-pink-500/5 border border-pink-500/10">
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-300 uppercase tracking-widest">Evolução Emocional</span>
                          <ul className="mt-4 space-y-2 text-sm text-text-muted list-disc ml-5 min-h-[60px]">
                            {evolucaoEmocional.length > 0 ? evolucaoEmocional.map((evo: string, i: number) => (
                              <li key={i}>{evo}</li>
                            )) : (
                              <p className="text-xs text-text-muted italic opacity-50">Nenhuma evolução gerada.</p>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="pt-12 border-t border-red-500/10">
                      <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest">Zona de Perigo</h4>
                            <p className="text-[10px] text-text-muted mt-1">Ao apagar este paciente, todos os seus dados e históricos serão removidos permanentemente.</p>
                          </div>
                          <button 
                            onClick={() => {
                              onDeletePatient(patient.id);
                              onBack();
                            }}
                            className="px-6 py-2 rounded-xl bg-red-500 text-white text-[10px] font-bold uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                          >
                            Apagar Paciente
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'prontuario' && (
                  <motion.div 
                    key="prontuario"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-text-main">Evoluções Clínicas</h3>
                      </div>
                      {!isAddingEvolution && (
                        <button 
                          onClick={() => setIsAddingEvolution(true)}
                          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 shadow-sm transition-all flex items-center gap-2"
                        >
                          <Plus size={16} /> Nova Evolução
                        </button>
                      )}
                    </div>

                    {isAddingEvolution && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 rounded-3xl border border-primary/20 space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Registrar Nova Sessão</h4>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Número da Sessão</label>
                            <input type="number" min="1" value={evolutionSessionNumber} onChange={(e) => setEvolutionSessionNumber(parseInt(e.target.value))} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-2 text-sm text-text-main outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Data</label>
                            <input type="date" value={evolutionDate} onChange={(e) => setEvolutionDate(e.target.value)} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-2 text-sm text-text-main outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Hora</label>
                            <input type="time" value={evolutionTime} onChange={(e) => setEvolutionTime(e.target.value)} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-2 text-sm text-text-main outline-none focus:border-primary" />
                          </div>
                        </div>

                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                             <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Transcrição do Áudio</label>
                           </div>
                           <textarea 
                             value={transcriptionText}
                             onChange={(e) => setTranscriptionText(e.target.value)}
                             placeholder="Cole a transcrição bruta do áudio aqui..."
                             className="w-full bg-surface-muted border border-border-ui rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary min-h-[100px] resize-none"
                           />
                           <button 
                             onClick={handleGenerateEvolution}
                             disabled={isGeneratingEvolution || !transcriptionText.trim()}
                             className="w-full bg-orange-500/10 text-orange-500 border border-orange-500/20 py-3 rounded-xl text-xs font-bold hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             <BarChart3 size={16} />
                             {isGeneratingEvolution ? "Processando com IA..." : "✨ Gerar Relato com IA"}
                           </button>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Relato Final da Sessão</label>
                           <textarea 
                             value={newEvolutionNote}
                             onChange={(e) => setNewEvolutionNote(e.target.value)}
                             placeholder="O relato gerado pela IA aparecerá aqui. Você também pode digitar manualmente..."
                             className="w-full bg-surface-muted border border-border-ui rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary min-h-[150px] resize-none"
                           />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button 
                            onClick={() => setIsAddingEvolution(false)}
                            className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handleAddEvolution}
                            disabled={!newEvolutionNote.trim() || isSavingEvolution}
                            className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                          >
                            {isSavingEvolution ? 'Salvando...' : 'Salvar Evolução'}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-0.5 before:bg-border-ui">
                      {clinicalData.evoluções.length > 0 ? clinicalData.evoluções.map((evo: any, idx: number) => (
                        <div key={evo.id} className="relative pl-12">
                          <div className={cn(
                            "absolute left-0 top-1 w-10 h-10 rounded-full bg-background border-2 flex items-center justify-center z-10",
                            idx === 0 ? "border-primary" : "border-border-ui"
                          )}>
                             <div className={cn("w-2 h-2 rounded-full", idx === 0 ? "bg-primary" : "bg-text-muted")} />
                          </div>
                          
                          {editingEvolutionId === evo.id ? (
                            <div className="glass-card p-6 rounded-2xl border border-primary/50 space-y-4">
                              <textarea 
                                value={editingEvolutionNote}
                                onChange={(e) => setEditingEvolutionNote(e.target.value)}
                                className="w-full bg-surface-muted border border-border-ui rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary min-h-[150px] resize-none"
                              />
                              <div className="flex justify-end gap-3">
                                <button onClick={() => setEditingEvolutionId(null)} className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main">Cancelar</button>
                                <button onClick={() => handleSaveEditEvolution(evo.id)} className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all">Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="glass-card p-6 rounded-2xl border border-border-ui hover:border-primary/30 transition-colors">
                               <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase tracking-widest",
                                      idx === 0 ? "text-primary" : "text-text-muted"
                                    )}>Sessão #{evo.sessionNumber || (clinicalData.evoluções.length - idx)}</span>
                                    <span className="text-[10px] font-bold text-text-muted/50 uppercase tracking-widest">• {evo.date} {evo.time && `às ${evo.time}`}</span>
                                  </div>
                                  <div className="relative">
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenDropdownId(openDropdownId === evo.id ? null : evo.id); }} className="text-text-muted hover:text-text-main p-1"><MoreVertical size={14} /></button>
                                    {openDropdownId === evo.id && (
                                      <div className="absolute right-0 mt-2 w-32 glass-card rounded-xl border border-border-ui shadow-xl overflow-hidden z-20">
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingEvolutionId(evo.id); setEditingEvolutionNote(evo.note); setOpenDropdownId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold text-text-main hover:bg-surface-muted transition-colors flex items-center gap-2"><PenTool size={12}/> Editar</button>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteEvolution(evo.id); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-border-ui"><Trash2 size={12}/> Excluir</button>
                                      </div>
                                    )}
                                  </div>
                               </div>
                               <div className={cn(
                                 "text-sm font-medium whitespace-pre-wrap leading-relaxed",
                                 idx === 0 ? "text-text-main" : "text-text-muted"
                               )}>
                                 {evo.note.length > 200 && !expandedEvolutions.has(evo.id) 
                                   ? evo.note.substring(0, 200) + '...' 
                                   : evo.note}
                                 {evo.note.length > 200 && (
                                   <button 
                                     onClick={() => setExpandedEvolutions(prev => {
                                       const next = new Set(prev);
                                       if (next.has(evo.id)) next.delete(evo.id);
                                       else next.add(evo.id);
                                       return next;
                                     })}
                                     className="ml-2 text-primary font-bold hover:underline text-xs"
                                   >
                                     {expandedEvolutions.has(evo.id) ? 'Ler menos' : 'Ler tudo'}
                                   </button>
                                 )}
                               </div>
                               <div className="mt-4 pt-4 border-t border-border-ui/50">
                                 <button
                                   onClick={() => handleGeneratePDFRecord(evo)}
                                   disabled={generatingPdfId === evo.id}
                                   className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                                 >
                                   {generatingPdfId === evo.id ? (
                                     <>
                                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                      Gerando...
                                     </>
                                   ) : (
                                     <>
                                      <FileDown size={14} />
                                      Gerar Prontuário (PDF)
                                     </>
                                   )}
                                 </button>
                               </div>
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="pl-12 text-center py-12">
                          <p className="text-sm text-text-muted">Nenhuma evolução registrada ainda.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'anamnese' && (
                  <motion.div 
                    key="anamnese"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-text-main">Anamnese Psicológica</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-4">
                        <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui group relative">
                          <h5 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Queixa Principal</h5>
                          {editingAnamneseField === 'mainComplaint' ? (
                            <textarea 
                              autoFocus
                              value={clinicalData.anamnese.mainComplaint}
                              onChange={(e) => handleUpdateAnamnese('mainComplaint', e.target.value)}
                              onBlur={() => setEditingAnamneseField(null)}
                              className="w-full bg-white/5 border border-primary/20 rounded-lg p-2 text-sm text-text-main outline-none min-h-[80px]"
                            />
                          ) : (
                            <p 
                              onClick={() => setEditingAnamneseField('mainComplaint')}
                              className="text-sm text-text-main cursor-pointer hover:text-primary transition-colors min-h-[40px] whitespace-pre-wrap"
                            >
                              {clinicalData.anamnese.mainComplaint || "Clique para descrever a queixa principal..."}
                            </p>
                          )}
                        </div>
                        <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui group relative">
                          <h5 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Histórico Familiar</h5>
                          {editingAnamneseField === 'familyHistory' ? (
                            <textarea 
                              autoFocus
                              value={clinicalData.anamnese.familyHistory}
                              onChange={(e) => handleUpdateAnamnese('familyHistory', e.target.value)}
                              onBlur={() => setEditingAnamneseField(null)}
                              className="w-full bg-white/5 border border-primary/20 rounded-lg p-2 text-sm text-text-main outline-none min-h-[80px]"
                            />
                          ) : (
                            <p 
                              onClick={() => setEditingAnamneseField('familyHistory')}
                              className="text-sm text-text-main cursor-pointer hover:text-primary transition-colors min-h-[40px] whitespace-pre-wrap"
                            >
                              {clinicalData.anamnese.familyHistory || "Clique para descrever o histórico familiar..."}
                            </p>
                          )}
                        </div>
                        <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui group relative">
                          <h5 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">História de Vida</h5>
                          {editingAnamneseField === 'lifeHistory' ? (
                            <textarea 
                              autoFocus
                              value={clinicalData.anamnese.lifeHistory}
                              onChange={(e) => handleUpdateAnamnese('lifeHistory', e.target.value)}
                              onBlur={() => setEditingAnamneseField(null)}
                              className="w-full bg-white/5 border border-primary/20 rounded-lg p-2 text-sm text-text-main outline-none min-h-[80px]"
                            />
                          ) : (
                            <p 
                              onClick={() => setEditingAnamneseField('lifeHistory')}
                              className="text-sm text-text-main cursor-pointer hover:text-primary transition-colors min-h-[40px] whitespace-pre-wrap"
                            >
                              {clinicalData.anamnese.lifeHistory || "Clique para descrever a história de vida..."}
                            </p>
                          )}
                        </div>
                        <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui group relative">
                          <h5 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Medicamentos em Uso</h5>
                          {editingAnamneseField === 'currentMedication' ? (
                            <textarea 
                              autoFocus
                              value={clinicalData.anamnese.currentMedication}
                              onChange={(e) => handleUpdateAnamnese('currentMedication', e.target.value)}
                              onBlur={() => setEditingAnamneseField(null)}
                              className="w-full bg-white/5 border border-primary/20 rounded-lg p-2 text-sm text-text-main outline-none min-h-[80px]"
                            />
                          ) : (
                            <p 
                              onClick={() => setEditingAnamneseField('currentMedication')}
                              className="text-sm text-text-main cursor-pointer hover:text-primary transition-colors min-h-[40px] whitespace-pre-wrap"
                            >
                              {clinicalData.anamnese.currentMedication || "Clique para descrever os medicamentos em uso..."}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'smartnotes' && (
                  <motion.div 
                    key="smartnotes"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                          <BarChart3 size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-text-main">Resumo SimplificaPsi IA</h3>
                      </div>
                      <button 
                        onClick={handleGenerateAI}
                        disabled={isGeneratingAI}
                        className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2"
                      >
                        {isGeneratingAI ? "Analisando..." : "✨ Gerar Análise SimplificaPsi"}
                      </button>
                    </div>

                    <div className="p-8 rounded-[32px] bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                          <span className="text-xs font-bold">✨</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-text-main">Padrões Identificados</h4>
                          <p className="text-xs text-text-muted italic">Análise baseada no seu registro clínico</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                        <div className="p-5 rounded-2xl bg-surface-muted border border-border-ui space-y-2">
                           <p className="text-xs font-bold text-primary uppercase">Evolução do Humor</p>
                           <p className="text-sm text-text-main">{clinicalData.smartNotes.padroes || "Gere a análise para identificar padrões."}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-surface-muted border border-border-ui space-y-2">
                           <p className="text-xs font-bold text-green-500 uppercase">Progresso Clínico</p>
                           <p className="text-sm text-text-main">{clinicalData.smartNotes.progresso || "Gere a análise para medir o progresso."}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-surface-muted border border-border-ui space-y-2">
                           <p className="text-xs font-bold text-pink-500 uppercase">Tópicos Recorrentes</p>
                           <div className="flex flex-wrap gap-2 mt-1">
                              {clinicalData.smartNotes.topicos.length > 0 ? clinicalData.smartNotes.topicos.map((t: string) => (
                                <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5">{t}</span>
                              )) : (
                                <p className="text-xs text-text-muted opacity-50 italic">Sem tópicos ainda.</p>
                              )}
                           </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                           <p className="text-xs font-bold text-primary uppercase">Sugestão IA</p>
                           <p className="text-sm text-text-main italic">{clinicalData.smartNotes.sugestao || "Gere a análise para receber sugestões."}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'biblioteca' && (
                  <motion.div 
                    key="biblioteca"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <FolderOpen size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-text-main uppercase tracking-tight">Biblioteca de Documentos</h3>
                      </div>
                      <div className="flex gap-3">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onUpload(file, uploadCategory);
                              e.target.value = '';
                            }
                          }} 
                          className="hidden" 
                        />
                         <button 
                          onClick={handleGenerateAllPDFRecords}
                          disabled={isGeneratingAllPdf}
                          className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-all uppercase flex items-center gap-2"
                        >
                           {isGeneratingAllPdf ? (
                             <>
                               <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                               Gerando...
                             </>
                           ) : (
                             <>
                               <FileDown size={14} />
                               Baixar Prontuário Completo
                             </>
                           )}
                        </button>
                        <button 
                          onClick={() => { setUploadCategory('prontuario'); setTimeout(() => fileInputRef.current?.click(), 0); }}
                          className="bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all border border-primary/20 uppercase"
                        >
                           + Prontuário
                        </button>
                        <button 
                          onClick={() => { setUploadCategory('anexo'); setTimeout(() => fileInputRef.current?.click(), 0); }}
                          className="bg-surface-muted text-text-main border border-border-ui px-4 py-2 rounded-xl text-xs font-bold hover:bg-border-ui transition-all uppercase"
                        >
                           + Outro Documento
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Section 1: Prontuários (Relatos + Uploaded Prontuários) */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                          <FileText size={16} className="text-primary" />
                          <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">Prontuários</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* System Evolution Records */}
                          {patient.clinicalData?.evoluções?.map((ev: any, idx: number) => (
                            <div key={`ev-${idx}`} className="p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all group space-y-3 relative">
                              <div className="w-full aspect-[4/3] bg-card rounded-xl flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors">
                                <FileText size={32} />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-text-main uppercase truncate">Relato Sessão #{ev.sessionNumber || idx + 1}</p>
                                <p className="text-[8px] text-text-muted uppercase mt-0.5">{ev.date} • {ev.time}</p>
                              </div>
                            </div>
                          ))}

                          {/* Uploaded Prontuários */}
                          {documents.filter(d => d.category === 'prontuario').map((doc) => (
                            <DocCard key={doc.id} doc={doc} onDelete={onDeleteDocument} />
                          ))}

                          {(patient.clinicalData?.evoluções?.length === 0 && documents.filter(d => d.category === 'prontuario').length === 0) && (
                            <div className="col-span-2 py-10 text-center text-[10px] text-text-muted uppercase tracking-widest border border-dashed border-border-ui rounded-2xl opacity-50">
                              Nenhum prontuário registrado
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Outros Documentos / Anexos */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                          <Paperclip size={16} className="text-accent" />
                          <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">Anexos e Documentos</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {documents.filter(d => d.category !== 'prontuario').map((doc) => (
                            <DocCard key={doc.id} doc={doc} onDelete={onDeleteDocument} />
                          ))}

                          {documents.filter(d => d.category !== 'prontuario').length === 0 && (
                            <div className="col-span-2 py-10 text-center text-[10px] text-text-muted uppercase tracking-widest border border-dashed border-border-ui rounded-2xl opacity-50">
                              Nenhum anexo encontrado
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </section>
        </div>
      </div>
    </motion.div>
  );
}

function FinanceView({ sessions, transactions, patients, onUpdateSession, onAddTransaction, onDeleteTransaction, onDeleteSession }: { 
  sessions: any[], 
  transactions: any[], 
  patients: any[],
  onUpdateSession: (session: any) => void,
  onAddTransaction: (data: any) => void,
  onDeleteTransaction: (id: string) => void,
  onDeleteSession: (id: string) => void
}) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [historyModalOpen, setHistoryModalOpen] = useState<'receita' | 'giro' | 'despesa' | 'lucro' | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  const calculatePrediction = (start: Date, end: Date) => {
    return calculateIncomePrediction(start, end, sessions, patients);
  };

  const monthlyPredicted = useMemo(() => {
    return calculatePrediction(startOfMonth(new Date()), endOfMonth(new Date()));
  }, [sessions, patients]);

  const prevMonthlyPredicted = useMemo(() => {
    const lastMonth = subMonths(new Date(), 1);
    return calculatePrediction(startOfMonth(lastMonth), endOfMonth(lastMonth));
  }, [sessions, patients]);

  const weeklyPredicted = useMemo(() => {
    return calculatePrediction(startOfWeek(new Date(), { weekStartsOn: 0 }), endOfWeek(new Date(), { weekStartsOn: 0 }));
  }, [sessions, patients]);

  const prevWeeklyPredicted = useMemo(() => {
    const lastWeek = subWeeks(new Date(), 1);
    return calculatePrediction(startOfWeek(lastWeek, { weekStartsOn: 0 }), endOfWeek(lastWeek, { weekStartsOn: 0 }));
  }, [sessions, patients]);

  const monthlyReceived = useMemo(() => {
    return sessions.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return isSameMonth(d, new Date()) && s.paid;
    }).reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [sessions]);

  const prevMonthlyReceived = useMemo(() => {
    const lastMonth = subMonths(new Date(), 1);
    return sessions.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return isSameMonth(d, lastMonth) && s.paid;
    }).reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [sessions]);

  const monthlyPending = useMemo(() => {
    return sessions.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return isSameMonth(d, new Date()) && !s.paid && s.status !== 'Cancelada';
    }).reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [sessions]);

  const manualExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'Despesa' && isSameMonth(new Date(t.date + 'T12:00:00'), new Date()))
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const prevManualExpenses = useMemo(() => {
    const lastMonth = subMonths(new Date(), 1);
    return transactions.filter(t => t.type === 'Despesa' && isSameMonth(new Date(t.date + 'T12:00:00'), lastMonth))
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const totalCosts = manualExpenses;
  const prevTotalCosts = prevManualExpenses;

  const netProfit = monthlyReceived - totalCosts;
  const prevNetProfit = prevMonthlyReceived - prevTotalCosts;

  const calculatePercentage = (current: number, previous: number) => {
    if (previous === 0) return null; // Sem dados suficientes para percentual
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return percentage;
  };

  const renderBadge = (current: number, previous: number) => {
    const pct = calculatePercentage(current, previous);
    if (pct === null) return null;
    const isPositive = pct >= 0;
    return (
      <span className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full",
        isPositive ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
      )}>
        {isPositive ? '+' : ''}{pct.toFixed(0)}%
      </span>
    );
  };

  const displaySessions = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const end = endOfWeek(new Date(), { weekStartsOn: 0 });

    let list = [...sessions.filter(s => s.status !== 'Cancelada')];
    
    patients.filter(p => p.status !== 'Inativo').forEach(p => {
      if (p.sessionDay && p.recurrence && p.recurrence !== 'Nenhuma') {
        const daysInInterval = eachDayOfInterval({ start, end });
        daysInInterval.forEach(d => {
          const dayName = format(d, 'eeee', { locale: ptBR });
          const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          if (capitalized !== p.sessionDay) return;
          
          const pCreatedAt = new Date(p.createdAt || p.birthDate || '2024-01-01');
          if (startOfDay(d) < startOfDay(pCreatedAt)) return;

          const weeksDiff = Math.abs(differenceInWeeks(d, pCreatedAt));
          let isRecurrenceDay = false;
          if (p.recurrence === 'Semanal') isRecurrenceDay = true;
          else if (p.recurrence === 'Quinzenal') isRecurrenceDay = weeksDiff % 2 === 0;
          else if (p.recurrence === 'Mensal') isRecurrenceDay = weeksDiff % 4 === 0;

          if (!isRecurrenceDay) return;

          const hasRecorded = list.some(s => s.patientId === p.id && isSameDay(new Date(s.date + 'T12:00:00'), d));
          const hasCancelled = sessions.some(s => s.patientId === p.id && s.status === 'Cancelada' && isSameDay(new Date(s.date + 'T12:00:00'), d));

          if (!hasRecorded && !hasCancelled) {
            list.push({
              id: `virtual-${p.id}-${format(d, 'yyyy-MM-dd')}`,
              patientId: p.id,
              date: format(d, 'yyyy-MM-dd'),
              time: p.sessionTime || '09:00',
              duration: '50min',
              type: p.modality || 'Online',
              status: 'Agendada',
              paid: false,
              amount: p.amount || 0
            });
          }
        });
      }
    });

    list = list.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      const isCurrentWeek = d >= start && d <= end;
      const isPastOrCurrent = d <= end;
      const isUnpaid = !s.paid;
      
      // Mostrar se for desta semana OU se for uma sessão pendente passada/atual.
      // Sessões pendentes do FUTURO não devem poluir o giro semanal da tela.
      return isCurrentWeek || (isUnpaid && isPastOrCurrent);
    });

    list = list.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

    if (filter === 'paid') list = list.filter(s => s.paid);
    if (filter === 'pending') list = list.filter(s => !s.paid);
    
    return list;
  }, [sessions, patients, filter]);

  const displayExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'Despesa').sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const handleSaveExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) return alert('Preencha todos os campos');
    onAddTransaction({
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      type: 'Despesa',
      status: 'Pago'
    });
    setIsAddingExpense(false);
    setExpenseForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const getHistoryData = (type: 'receita' | 'giro' | 'despesa' | 'lucro') => {
    const data = [];
    for (let i = 1; i <= 6; i++) {
      if (type === 'giro') {
        const w = subWeeks(new Date(), i);
        const s = startOfWeek(w, { weekStartsOn: 0 });
        const e = endOfWeek(w, { weekStartsOn: 0 });
        data.push({ label: `Sem. de ${format(s, 'dd/MM', { locale: ptBR })}`, value: calculatePrediction(s, e) });
      } else {
        const m = subMonths(new Date(), i);
        const s = startOfMonth(m);
        const e = endOfMonth(m);
        let val = 0;
        if (type === 'receita') {
          val = calculatePrediction(s, e);
        } else if (type === 'despesa') {
          val = transactions.filter(t => t.type === 'Despesa' && isSameMonth(new Date(t.date + 'T12:00:00'), m)).reduce((acc, t) => acc + (t.amount || 0), 0);
        } else if (type === 'lucro') {
          const rec = sessions.filter(x => isSameMonth(new Date(x.date + 'T12:00:00'), m) && x.paid).reduce((acc, x) => acc + (x.amount || 0), 0);
          const desp = transactions.filter(t => t.type === 'Despesa' && isSameMonth(new Date(t.date + 'T12:00:00'), m)).reduce((acc, t) => acc + (t.amount || 0), 0);
          val = rec - desp;
        }
        data.push({ label: format(m, 'MMMM yyyy', { locale: ptBR }), value: val });
      }
    }
    return data;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      onClick={() => setOpenDropdownId(null)}
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-main">Gestão Financeira</h2>
          <p className="text-text-muted mt-2">Acompanhe seus rendimentos e custos de consultório.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAddingExpense(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
          >
            <Plus size={16} />
            Nova Despesa
          </button>
          <div className="flex gap-2 p-1 bg-surface-muted rounded-2xl border border-border-ui">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              filter === 'all' ? "bg-card text-primary shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('paid')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              filter === 'paid' ? "bg-card text-green-500 shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            Recebidos
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              filter === 'pending' ? "bg-card text-yellow-500 shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            A Receber
          </button>
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-[32px] border border-white/5 space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div className="flex items-center gap-2 relative">
              {renderBadge(monthlyPredicted, prevMonthlyPredicted)}
              <button 
                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === 'receita' ? null : 'receita'); }}
                className="text-text-muted hover:text-text-main p-1 rounded-full transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {openDropdownId === 'receita' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-8 right-0 w-48 bg-card border border-border-ui rounded-2xl shadow-xl z-20 py-2"
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); setHistoryModalOpen('receita'); setOpenDropdownId(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-surface-muted transition-colors"
                    >
                      Extratos Passados
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase font-bold tracking-widest">Receita Mensal</p>
            <h3 className="text-2xl font-bold text-text-main mt-1 font-mono">{formatCurrency(monthlyPredicted)}</h3>
            <p className="text-[10px] text-text-muted mt-2">
              Previsão baseada na agenda
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[32px] border border-white/5 space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <CalendarIcon size={20} />
            </div>
            <div className="flex items-center gap-2 relative">
              {renderBadge(weeklyPredicted, prevWeeklyPredicted)}
              <button 
                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === 'giro' ? null : 'giro'); }}
                className="text-text-muted hover:text-text-main p-1 rounded-full transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {openDropdownId === 'giro' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-8 right-0 w-48 bg-card border border-border-ui rounded-2xl shadow-xl z-20 py-2"
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); setHistoryModalOpen('giro'); setOpenDropdownId(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-surface-muted transition-colors"
                    >
                      Extratos Passados
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase font-bold tracking-widest">Giro Semanal</p>
            <h3 className="text-2xl font-bold text-text-main mt-1 font-mono">{formatCurrency(weeklyPredicted)}</h3>
            <p className="text-[10px] text-text-muted mt-2">
              Previsão baseada na agenda
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[32px] border border-white/5 space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
            <div className="flex items-center gap-2 relative">
              {renderBadge(totalCosts, prevTotalCosts)}
              <button 
                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === 'despesa' ? null : 'despesa'); }}
                className="text-text-muted hover:text-text-main p-1 rounded-full transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {openDropdownId === 'despesa' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-8 right-0 w-48 bg-card border border-border-ui rounded-2xl shadow-xl z-20 py-2"
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); setHistoryModalOpen('despesa'); setOpenDropdownId(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-surface-muted transition-colors"
                    >
                      Extratos Passados
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase font-bold tracking-widest">Despesas</p>
            <h3 className="text-2xl font-bold text-red-500 mt-1 font-mono">{formatCurrency(totalCosts)}</h3>
            <p className="text-[10px] text-text-muted mt-2">
              Total de Despesas
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[32px] bg-primary/5 border border-primary/20 space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <DollarSign size={20} />
            </div>
            <div className="flex items-center gap-2 relative">
              {renderBadge(netProfit, prevNetProfit)}
              <button 
                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === 'lucro' ? null : 'lucro'); }}
                className="text-text-muted hover:text-text-main p-1 rounded-full transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {openDropdownId === 'lucro' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-8 right-0 w-48 bg-card border border-border-ui rounded-2xl shadow-xl z-20 py-2"
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); setHistoryModalOpen('lucro'); setOpenDropdownId(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-surface-muted transition-colors"
                    >
                      Extratos Passados
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <p className="text-xs text-primary uppercase font-bold tracking-widest">Lucro Líquido</p>
            <h3 className="text-2xl font-bold text-text-main mt-1 font-mono">{formatCurrency(netProfit)}</h3>
            <p className="text-[10px] text-text-muted mt-2">
              Receita - Custos
            </p>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {historyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-[32px] shadow-2xl border border-border-ui overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-border-ui flex items-center justify-between sticky top-0 bg-card z-10">
                <h3 className="text-xl font-bold text-text-main">Extratos Passados</h3>
                <button onClick={() => setHistoryModalOpen(null)} className="text-text-muted hover:text-red-500 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {getHistoryData(historyModalOpen).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-surface-muted rounded-2xl border border-white/5">
                    <span className="text-sm font-bold text-text-muted uppercase tracking-widest">{item.label}</span>
                    <span className="font-mono text-lg font-bold text-text-main">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="glass-card rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h4 className="font-bold text-lg text-text-main uppercase tracking-widest">Controle de Atendimentos</h4>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">A Receber: {formatCurrency(monthlyPending)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="w-full text-left hidden md:table">
            <thead>
              <tr className="bg-surface-muted text-[10px] text-text-muted font-bold uppercase tracking-widest">
                <th className="px-8 py-4">Paciente / Sessão</th>
                <th className="px-8 py-4">Data / Horário</th>
                <th className="px-8 py-4">Valor</th>
                <th className="px-8 py-4">Status Pagamento</th>
                <th className="px-8 py-4">Nota Fiscal</th>
                <th className="px-8 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displaySessions.map(session => {
                const p = patients.find(pat => pat.id === session.patientId);
                return (
                  <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center text-xs font-bold text-text-muted group-hover:text-primary transition-colors">
                          {session.isTriage ? 'T' : (p?.name?.[0] || 'P')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-main uppercase">{p?.name || session.triageName || 'Paciente'}</p>
                          <p className="text-[10px] text-text-muted uppercase tracking-tighter">{session.type} • {session.duration || '50min'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-text-main font-mono">{format(new Date(session.date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                      <p className="text-[10px] text-text-muted uppercase">{session.time}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-text-main font-mono">{formatCurrency(parseFloat(session.amount) || parseFloat(p?.amount) || 0)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <button 
                        onClick={() => onUpdateSession({ ...session, paid: !session.paid })}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                          session.paid 
                            ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                            : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20"
                        )}
                      >
                        {session.paid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {session.paid ? 'Recebido' : 'A Receber'}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                       <button 
                        onClick={() => onUpdateSession({ ...session, nfIssued: !session.nfIssued })}
                        className={cn(
                          "p-2 rounded-xl transition-all border",
                          session.nfIssued 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-surface-muted text-text-muted border-transparent hover:border-border-ui"
                        )}
                        title={session.nfIssued ? "NF Emitida" : "Marcar NF Emitida"}
                      >
                        <Receipt size={18} />
                      </button>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este registro de atendimento? Esta ação é irreversível.')) {
                            onDeleteSession(session.id);
                          }
                        }}
                        className="p-2 rounded-xl text-text-muted hover:text-red-500 transition-colors"
                        title="Excluir Atendimento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displaySessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-text-muted uppercase text-xs tracking-widest opacity-50">
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-white/5">
            {displaySessions.map(session => {
              const p = patients.find(pat => pat.id === session.patientId);
              return (
                <div key={session.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-text-main uppercase">{p?.name || session.triageName || 'Paciente'}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-tighter">{format(new Date(session.date + 'T12:00:00'), 'dd/MM/yyyy')} • {session.time}</p>
                    </div>
                    <p className="text-sm font-bold text-text-main font-mono">{formatCurrency(parseFloat(session.amount) || parseFloat(p?.amount) || 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onUpdateSession({ ...session, paid: !session.paid })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                        session.paid ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      )}
                    >
                      {session.paid ? 'Recebido' : 'Pendente'}
                    </button>
                    <button 
                      onClick={() => onUpdateSession({ ...session, nfIssued: !session.nfIssued })}
                      className={cn(
                        "w-12 flex items-center justify-center rounded-xl border transition-all",
                        session.nfIssued ? "bg-primary/10 text-primary border-primary/20" : "bg-surface-muted text-text-muted border-transparent"
                      )}
                    >
                      <Receipt size={18} />
                    </button>
                    <button 
                      onClick={() => onDeleteSession(session.id)}
                      className="w-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
            {displaySessions.length === 0 && (
              <div className="p-12 text-center text-text-muted uppercase text-[10px] tracking-widest opacity-50">
                Nenhum registro.
              </div>
            )}
          </div>
        </div>
      </section>

      {displayExpenses.length > 0 && (
        <section className="glass-card rounded-[32px] overflow-hidden border border-white/5 shadow-2xl bg-red-500/5">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h4 className="font-bold text-lg text-red-500 uppercase tracking-widest">Despesas Manuais</h4>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total: {formatCurrency(manualExpenses)}</span>
          </div>
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full text-left hidden md:table">
              <thead>
                <tr className="bg-surface-muted text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">Descrição</th>
                  <th className="px-8 py-4">Data</th>
                  <th className="px-8 py-4 text-right">Valor</th>
                  <th className="px-8 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-text-main uppercase">{expense.description}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-text-main font-mono">{expense.date}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-sm font-bold text-red-500 font-mono">-{formatCurrency(expense.amount)}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => onDeleteTransaction(expense.id)}
                        className="p-2 rounded-xl text-text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-white/5">
              {displayExpenses.map(expense => (
                <div key={expense.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-text-main uppercase">{expense.description}</p>
                      <p className="text-[10px] text-text-muted font-mono">{expense.date}</p>
                    </div>
                    <p className="text-sm font-bold text-red-500 font-mono">-{formatCurrency(expense.amount)}</p>
                  </div>
                  <button 
                    onClick={() => onDeleteTransaction(expense.id)}
                    className="w-full py-2.5 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Excluir Despesa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Expense Modal */}
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md rounded-[32px] overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 bg-red-500/10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TrendingDown size={24} className="text-red-500" />
                  Nova Despesa
                </h3>
              </div>
              <div className="p-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Descrição</label>
                  <input 
                    type="text"
                    placeholder="Ex: Aluguel, Luz, Software..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-red-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Valor (R$)</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Data</label>
                    <input 
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                      className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-red-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsAddingExpense(false)}
                    className="flex-1 py-4 text-sm font-bold text-text-muted hover:text-text-main transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveExpense}
                    className="flex-[2] bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all uppercase text-[10px] tracking-widest"
                  >
                    Salvar Despesa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CalendarView({ sessions, patients, onAddSession, onDeleteSession, onTriageToPatient, onUndo, lastAction }: { 
  sessions: any[], 
  patients: any[], 
  onAddSession: (data: any) => void,
  onDeleteSession: (id: string) => void,
  onTriageToPatient: (name: string, day: string, time: string) => void,
  onUndo?: () => void,
  lastAction?: any
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const getDaySessions = (day: Date) => {
    const dayName = format(day, 'eeee', { locale: ptBR });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dateStr = format(day, 'yyyy-MM-dd');
    
    const daySessions: any[] = [];

    // 1. Recorded Sessions from 'sessions' collection
    const recordedSessions = sessions.filter(s => s.status !== 'Cancelada' && isSameDay(new Date(s.date + 'T12:00:00'), day));
    recordedSessions.forEach(s => {
      // Show cancelled sessions but with distinct style (handled by CSS)
      const p = patients.find(pat => pat.id === s.patientId);
      daySessions.push({
        ...s,
        patientName: s.isTriage ? s.triageName : (p?.name || 'Paciente'),
        dayName: capitalizedDayName,
        // For recorded sessions, use the number stored or calculate it
        sessionNumber: s.sessionNumber || (p ? calculateSessionNumber(p, day) : 1)
      });
    });

    // 2. Recurrent Sessions from Patients
    patients.forEach(p => {
      if (p.status === 'Inativo') return;
      if (p.sessionDay === capitalizedDayName && p.sessionTime && p.sessionDay !== '' && p.sessionDay !== 'Nenhum') {
        // Skip if there's already a recorded session for this patient today
        const hasRecorded = recordedSessions.some(s => s.patientId === p.id);
        const hasCancelled = sessions.some(s => s.patientId === p.id && s.status === 'Cancelada' && isSameDay(new Date(s.date + 'T12:00:00'), day));
        
        if (hasRecorded || hasCancelled) return;

        const pCreatedAt = new Date(p.createdAt || p.birthDate || '2024-01-01');
        const weeksDiff = Math.abs(differenceInWeeks(startOfDay(day), startOfDay(pCreatedAt)));
        
        let shouldRender = false;
        if (!p.recurrence || p.recurrence === 'Semanal') shouldRender = true;
        else if (p.recurrence === 'Quinzenal') shouldRender = weeksDiff % 2 === 0;
        else if (p.recurrence === 'Mensal') shouldRender = weeksDiff % 4 === 0;

        if (shouldRender) {
          daySessions.push({
            id: `virtual-${p.id}-${dateStr}`,
            patientId: p.id,
            patientName: p.name,
            time: p.sessionTime,
            type: p.modality || 'Online',
            status: 'Recorrente',
            isTriage: false,
            dayName: capitalizedDayName,
            sessionNumber: calculateSessionNumber(p, day)
          });
        }
      }
    });

    return daySessions.sort((a, b) => a.time.localeCompare(b.time));
  };

  const calculateSessionNumber = (patient: any, targetDay: Date) => {
    const baseCount = parseInt(patient.sessions) || 0;
    const start = startOfDay(new Date(patient.createdAt || '2024-01-01'));
    const end = startOfDay(targetDay);
    
    if (end < start) return baseCount;

    const patientRecords = sessions.filter(s => s.patientId === patient.id);
    const cancelledDates = patientRecords.filter(s => s.status === 'Cancelada').map(s => s.date);

    let count = 0;
    let current = start;
    while (format(current, 'eeee', { locale: ptBR }).charAt(0).toUpperCase() + format(current, 'eeee', { locale: ptBR }).slice(1) !== patient.sessionDay) {
      const next = new Date(current);
      next.setDate(current.getDate() + 1);
      current = next;
      if (current > end) break;
    }

    while (current <= end) {
      const weeksDiff = Math.abs(differenceInWeeks(current, start));
      let isRecurrenceDay = false;
      
      if (!patient.recurrence || patient.recurrence === 'Semanal') isRecurrenceDay = true;
      else if (patient.recurrence === 'Quinzenal') isRecurrenceDay = weeksDiff % 2 === 0;
      else if (patient.recurrence === 'Mensal') isRecurrenceDay = weeksDiff % 4 === 0;

      if (isRecurrenceDay) {
        const dStr = format(current, 'yyyy-MM-dd');
        if (!cancelledDates.includes(dStr)) {
          count++;
        }
      }
      const next = new Date(current);
      next.setDate(current.getDate() + 7);
      current = next;
    }
    
    return baseCount + count;
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-main">Agenda Mensal</h2>
          <p className="text-text-muted mt-2">Visão completa do seu consultório e recorrências.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card/50 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-xl">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-white/5 transition-all text-text-muted hover:text-primary"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 text-center min-w-[150px]">
            <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-1">
              {format(currentDate, 'yyyy')}
            </p>
            <h3 className="text-lg font-bold text-text-main capitalize leading-none">
              {format(currentDate, 'MMMM', { locale: ptBR })}
            </h3>
          </div>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-white/5 transition-all text-text-muted hover:text-primary"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {lastAction && (
             <button 
               onClick={onUndo}
               className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all font-mono whitespace-nowrap"
             >
               <ChevronLeft className="rotate-180" size={16} />
               Desfazer Alteração
             </button>
          )}
          <button 
            onClick={() => {
              setEditingSession(null);
              setIsModalOpen(true);
            }}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20 transition-all font-mono whitespace-nowrap"
          >
            <Plus size={20} />
            Novo Agendamento
          </button>
        </div>
      </div>

      <section className="glass-card rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/5">
          {WEEKDAYS_SHORT.map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-bold text-text-muted uppercase tracking-widest border-r last:border-r-0 border-white/5">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
          {calendarDays.map((day, idx) => {
            const sessions = getDaySessions(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDay = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');

            return (
              <div 
                key={day.toString()} 
                onClick={() => setSelectedMobileDay(day)}
                className={cn(
                  "p-2 border-r border-b border-white/5 relative group transition-colors cursor-pointer md:cursor-default",
                  !isCurrentMonth && "bg-white/[0.02] opacity-30",
                  idx % 7 === 6 && "border-r-0",
                  isTodayDay && "bg-primary/5",
                  "min-h-[80px] md:min-h-0"
                )}
              >
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className={cn(
                    "text-xs font-bold flex items-center justify-center w-6 h-6 rounded-lg",
                    isTodayDay ? "bg-primary text-white" : "text-text-muted"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {sessions.length > 0 && (
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-50">
                      {sessions.length} {sessions.length === 1 ? 'Sessão' : 'Sessões'}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar pr-1 hidden md:block">
                  {sessions.map(session => (
                    <div 
                      key={session.id}
                      className={cn(
                        "p-1.5 rounded-lg border text-[9px] font-bold leading-tight relative group/session cursor-pointer transition-all hover:scale-[1.02]",
                        session.status === 'Cancelada' 
                          ? "bg-red-500/10 border-red-500/20 text-red-400 opacity-60 line-through" 
                          : session.isTriage 
                            ? "bg-orange-500/10 border-orange-500/20 text-orange-400" 
                            : "bg-primary/10 border-primary/20 text-primary"
                      )}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="truncate flex-1 uppercase tracking-tight">{session.patientName || 'Paciente'}</span>
                        <span className="shrink-0 opacity-70">{session.time}</span>
                      </div>

                      {/* Expanded info on hover */}
                      <div className="hidden group-hover/session:block mt-1 pt-1 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex justify-between items-center text-[7px] text-white/60 uppercase tracking-widest font-bold mb-1.5">
                          <span>{session.status === 'Cancelada' ? 'Cancelada' : session.type}</span>
                          {!session.isTriage && <span>#{session.sessionNumber}</span>}
                        </div>
                        
                        <div className="flex gap-1">
                          {session.isTriage && session.status !== 'Cancelada' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onTriageToPatient(session.patientName, session.dayName, session.time); }}
                              className="flex-[2] bg-primary/20 text-primary py-1 rounded-md text-[7px] font-bold hover:bg-primary hover:text-white transition-all border border-primary/20 uppercase"
                            >Efetivar</button>
                          )}
                          
                          {session.status !== 'Cancelada' && (
                            <>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingSession({
                                    ...session,
                                    date: dateStr,
                                    originalDate: dateStr,
                                    originalTime: session.time
                                  });
                                  setIsModalOpen(true);
                                }}
                                className="flex-1 bg-white/10 text-white/70 py-1 rounded-md text-[7px] font-bold hover:bg-white/20 transition-all border border-white/5 uppercase"
                              >Editar</button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (confirm('Deseja cancelar este atendimento?')) {
                                    onAddSession({
                                      id: session.id,
                                      patientId: session.patientId || '',
                                      triageName: session.triageName || session.patientName || '',
                                      date: dateStr,
                                      originalDate: dateStr,
                                      time: session.time,
                                      originalTime: session.time,
                                      status: 'Cancelada',
                                      isTriage: session.isTriage,
                                      type: session.type
                                    });
                                  }
                                }}
                                className="flex-1 bg-red-500/10 text-red-400 py-1 rounded-md text-[7px] font-bold hover:bg-red-500 hover:text-white transition-all border border-red-500/20 uppercase"
                              >Cancelar</button>
                            </>
                          )}
                          
                          {/* Botão de exclusão definitiva para sessões gravadas (mesmo canceladas) */}
                          {!session.id?.toString().startsWith('virtual-') && (
                             <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (confirm('Deseja excluir permanentemente este registro da agenda?')) {
                                  onDeleteSession(session.id);
                                }
                              }}
                              className="p-1 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                              title="Excluir Registro"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Mobile indicators (dots/bars) */}
                <div className="md:hidden flex flex-col gap-1 mt-1">
                  {sessions.slice(0, 3).map(session => (
                    <div 
                      key={`mob-${session.id}`} 
                      className={cn(
                        "h-1.5 w-full rounded-full",
                        session.status === 'Cancelada' ? "bg-red-500/50" : session.isTriage ? "bg-orange-500" : "bg-primary"
                      )} 
                    />
                  ))}
                  {sessions.length > 3 && (
                    <div className="text-[8px] text-center text-text-muted font-bold">+{sessions.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mobile Day Details Modal */}
      <AnimatePresence>
        {selectedMobileDay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="glass-card w-full max-w-md h-[80vh] md:h-auto md:max-h-[80vh] md:rounded-[32px] rounded-t-[32px] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-text-main capitalize">{format(selectedMobileDay, 'EEEE, d', { locale: ptBR })}</h3>
                  <p className="text-sm text-text-muted capitalize">{format(selectedMobileDay, 'MMMM yyyy', { locale: ptBR })}</p>
                </div>
                <button onClick={() => setSelectedMobileDay(null)} className="p-2 rounded-xl hover:bg-surface-muted transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {getDaySessions(selectedMobileDay).length === 0 ? (
                  <div className="text-center py-12 text-text-muted">
                    <CalendarIcon size={48} className="mx-auto opacity-20 mb-4" />
                    <p className="text-sm">Nenhum agendamento para este dia.</p>
                  </div>
                ) : (
                  getDaySessions(selectedMobileDay).map(session => (
                    <div 
                      key={session.id}
                      className={cn(
                        "p-4 rounded-2xl border text-sm font-bold relative",
                        session.status === 'Cancelada' 
                          ? "bg-red-500/10 border-red-500/20 text-red-400 opacity-80" 
                          : session.isTriage 
                            ? "bg-orange-500/10 border-orange-500/20 text-orange-400" 
                            : "bg-primary/10 border-primary/20 text-primary"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="uppercase tracking-tight text-lg truncate flex-1">{session.patientName || 'Paciente'}</span>
                        <span className="shrink-0 text-base">{session.time}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold mb-4 opacity-80">
                        <span>{session.status === 'Cancelada' ? 'Cancelada' : session.type}</span>
                        {!session.isTriage && session.status !== 'Cancelada' && <span>#{session.sessionNumber}</span>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {session.isTriage && session.status !== 'Cancelada' && (
                          <button 
                            onClick={() => { setSelectedMobileDay(null); onTriageToPatient(session.patientName, session.dayName, session.time); }}
                            className="flex-1 bg-primary/20 text-primary py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all border border-primary/20 uppercase"
                          >Efetivar</button>
                        )}
                        
                        {session.status !== 'Cancelada' && (
                          <>
                            <button 
                              onClick={() => { 
                                setSelectedMobileDay(null);
                                setEditingSession({
                                  ...session,
                                  date: format(selectedMobileDay, 'yyyy-MM-dd'),
                                  originalDate: format(selectedMobileDay, 'yyyy-MM-dd'),
                                  originalTime: session.time
                                });
                                setIsModalOpen(true);
                              }}
                              className="flex-1 bg-white/10 text-white py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition-all border border-white/5 uppercase"
                            >Editar</button>
                            <button 
                              onClick={() => { 
                                if (confirm('Deseja cancelar este atendimento?')) {
                                  onAddSession({
                                    id: session.id,
                                    patientId: session.patientId || '',
                                    triageName: session.triageName || session.patientName || '',
                                    date: format(selectedMobileDay, 'yyyy-MM-dd'),
                                    originalDate: format(selectedMobileDay, 'yyyy-MM-dd'),
                                    time: session.time,
                                    originalTime: session.time,
                                    status: 'Cancelada',
                                    isTriage: session.isTriage,
                                    type: session.type
                                  });
                                }
                              }}
                              className="flex-1 bg-red-500/10 text-red-400 py-2 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all border border-red-500/20 uppercase"
                            >Cancelar</button>
                          </>
                        )}
                        
                        {!session.id?.toString().startsWith('virtual-') && (
                           <button 
                            onClick={() => { 
                              if (confirm('Deseja excluir permanentemente este registro da agenda?')) {
                                onDeleteSession(session.id);
                              }
                            }}
                            className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                            title="Excluir Registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <ScheduleModal 
            onClose={() => {
              setIsModalOpen(false);
              setEditingSession(null);
            }} 
            patients={patients} 
            initialData={editingSession}
            onSave={(data) => {
              onAddSession({
                ...data,
                isTriage: !data.patientId,
                patientId: data.patientId || ''
              });
              setIsModalOpen(false);
              setEditingSession(null);
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScheduleModal({ onClose, patients, onSave, initialData }: { 
  onClose: () => void, 
  patients: any[], 
  onSave: (data: any) => void,
  initialData?: any
}) {
  const [editScope, setEditScope] = useState<'single' | 'all'>('single');
  const [formData, setFormData] = useState({
    id: initialData?.id || null,
    patientId: initialData?.patientId || '',
    triageName: initialData?.patientName || initialData?.triageName || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    originalDate: initialData?.originalDate || initialData?.date || new Date().toISOString().split('T')[0],
    time: initialData?.time || '09:00',
    originalTime: initialData?.originalTime || initialData?.time || '09:00',
    type: initialData?.type || 'Online',
    recurrence: initialData?.recurrence || 'none',
    status: initialData?.status || 'Agendada',
    amount: initialData?.amount || ''
  });

  useEffect(() => {
    if (formData.patientId && !initialData) {
      const p = patients.find(p => p.id === formData.patientId);
      if (p?.amount) setFormData(prev => ({ ...prev, amount: p.amount }));
    }
  }, [formData.patientId, initialData, patients]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass-card w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-text-main">
              {initialData?.status === 'Recorrente' ? 'Ajustar Horário' : 'Agendar Sessão'}
            </h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-muted transition-colors">
               <Plus className="rotate-45" size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {!initialData ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Paciente ou Nome (Triagem)</label>
                <input 
                  value={formData.triageName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matchedPatient = patients.find(p => p.name.toLowerCase() === val.toLowerCase());
                    setFormData({...formData, triageName: val, patientId: matchedPatient ? matchedPatient.id : ''});
                  }}
                  list="patients-list"
                  placeholder="Selecione um paciente ou digite um novo nome"
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary"
                />
                <datalist id="patients-list">
                  {patients.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Ajustando sessão de:</p>
                <p className="text-sm font-bold text-text-main mt-1 uppercase">{formData.triageName}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Data</label>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Horário</label>
                <input 
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Valor da Sessão (R$)</label>
              <input 
                type="number"
                placeholder="Ex: 150"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary font-mono"
              />
            </div>
            
            {initialData && initialData.status === 'Recorrente' && (
              <div className="space-y-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest pl-1">Alterar Recorrência</label>
                <div className="flex gap-2">
                   <button 
                    type="button"
                    onClick={() => setEditScope('single')}
                    className={cn(
                      "flex-1 px-2 py-2 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-widest",
                      editScope === 'single' 
                        ? "bg-orange-500 text-white border-orange-500" 
                        : "bg-surface-muted text-orange-500/70 border-orange-500/20 hover:border-orange-500/50"
                    )}
                   >
                     Apenas este
                   </button>
                   <button 
                    type="button"
                    onClick={() => setEditScope('all')}
                    className={cn(
                      "flex-1 px-2 py-2 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-widest",
                      editScope === 'all' 
                        ? "bg-orange-500 text-white border-orange-500" 
                        : "bg-surface-muted text-orange-500/70 border-orange-500/20 hover:border-orange-500/50"
                    )}
                   >
                     Todos os próximos
                   </button>
                </div>
              </div>
            )}

            {!initialData && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Recorrência</label>
                <div className="grid grid-cols-2 gap-2">
                   {[
                     { label: 'Nenhuma (Avaliação)', value: 'none' },
                     { label: 'Semanal', value: 'Semanal' },
                     { label: 'Quinzenal', value: 'Quinzenal' },
                     { label: 'Mensal', value: 'Mensal' }
                   ].map(opt => (
                     <button 
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({...formData, recurrence: opt.value})}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                        formData.recurrence === opt.value 
                          ? "bg-primary text-white border-primary" 
                          : "bg-surface-muted text-text-muted border-border-ui hover:border-primary/30"
                      )}
                     >
                       {opt.label}
                     </button>
                   ))}
                </div>
              </div>
            )}

            {!initialData && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Tipo de Sessão</label>
                <div className="flex gap-2">
                   {[
                     { label: 'Presencial', value: 'Presencial' },
                     { label: 'Online', value: 'Online' }
                   ].map(opt => (
                     <button 
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({...formData, type: opt.value})}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                        formData.type === opt.value 
                          ? "bg-primary/20 text-primary border-primary/20" 
                          : "bg-surface-muted text-text-muted border-border-ui"
                      )}
                     >
                       {opt.label}
                     </button>
                   ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 text-sm font-bold text-text-muted hover:text-text-main transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (!formData.patientId && !formData.triageName.trim()) {
                    return alert('Por favor, selecione um paciente ou digite um nome para triagem.');
                  }
                  onSave({ 
                    ...formData, 
                    editScope,
                    originalDate: initialData?.originalDate || initialData?.date,
                    originalTime: initialData?.originalTime || initialData?.time
                  });
                }}
                className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all font-mono uppercase text-xs"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProfileSettingsModal({ initialData, onClose, onSave }: any) {
  const [formData, setFormData] = useState(initialData);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass-card w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-text-main">Configurações do Perfil</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-muted transition-colors">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Nome do Profissional</label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="Ex: Dr. João Silva"
              className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Número do CRP</label>
            <input 
              value={formData.crp} 
              onChange={e => setFormData({...formData, crp: e.target.value})} 
              placeholder="Ex: CRP 06/12345"
              className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Logo da Clínica (Opcional)</label>
            <div className="flex items-center gap-4 mt-2">
              {formData.logo && (
                <div className="relative group">
                  <img src={formData.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white/5 p-2 border border-border-ui" />
                  <button 
                    onClick={() => setFormData({...formData, logo: ''})}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <Plus className="rotate-45" size={14} />
                  </button>
                </div>
              )}
              <label className="flex-1 bg-surface-muted border border-dashed border-border-ui rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <span className="text-xs font-bold text-text-muted">Fazer Upload</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <button 
          onClick={() => onSave(formData)} 
          className="w-full mt-8 bg-primary text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity font-mono uppercase text-xs"
        >
          Salvar Configurações
        </button>
      </motion.div>
    </motion.div>
  );
}
