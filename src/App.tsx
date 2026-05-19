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
  Play,
  Pause,
  Square,
  Loader2,
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
  UserCircle,
  HelpCircle,
  Send,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from './lib/utils';
import LandingPage from './components/LandingPage';
import { 
  Patient, 
  Session, 
  Transaction,
  AppNotification 
} from './types';
import { auth, db, signInWithGoogle, signInWithGoogleCalendar } from './lib/firebase';
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
  orderBy,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
import { Joyride, EventData, STATUS, Step, TooltipRenderProps } from 'react-joyride';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const CLINICAL_APPROACHES: Record<string, { name: string; rules: string; pdfTopics: string[]; evolutionPrompt: string }> = {
  tcc: {
    name: "Terapia Cognitivo-Comportamental",
    rules: "Siga a linha de raciocínio da TCC (identificando pensamentos, comportamentos, regulação emocional ou plano de ação) de forma orgânica e sutil. Evite forçar termos técnicos excessivos de uma só vez; use-os apenas se fizerem sentido prático na sessão.",
    pdfTopics: [
      "1. Demanda / Queixa do Dia",
      "2. Distorções Cognitivas & Crenças Identificadas",
      "3. Técnicas & Intervenções de TCC Aplicadas",
      "4. Plano de Ação / Tarefas Comportamentais"
    ],
    evolutionPrompt: "Analise a evolução clínica sob a ótica da Terapia Cognitivo-Comportamental. Identifique padrões de distorções cognitivas, crenças nucleares ativadas, o progresso na regulação emocional e adesão às tarefas terapêuticas de forma sóbria e equilibrada."
  },
  psicanalise: {
    name: "Psicanálise",
    rules: "Siga a escuta analítica (focando no material trazido, defesas sutis ou dinâmica subjetiva) de forma natural, leve e fluida. Evite forçar termos acadêmicos pesados; trate o processo com a sobriedade de um analista em sua rotina diária. NUNCA fale em 'tarefas de casa', 'reestruturação' ou 'metas'.",
    pdfTopics: [
      "1. Material Clínico Trazido (Livre Associação)",
      "2. Dinâmica Inconsciente & Defesas Observadas",
      "3. Manejo Clínico & Intervenções da Escuta Analítica",
      "4. Direcionamento e Apontamentos para Sessões Futuras"
    ],
    evolutionPrompt: "Analise o caso sob a ótica da Psicanálise de forma sóbria. Identifique padrões repetitivos de defesas do Ego, manifestações latentes do inconsciente na fala do paciente e dinâmicas de transferência estruturadas ao longo do tempo."
  },
  gestalt: {
    name: "Gestalt-Terapia",
    rules: "Siga a perspectiva fenomenológica (awareness, contato ou a queixa no aqui-e-agora) de forma orgânica e sutil. Evite carregar o relato com jargões técnicos desnecessários; mantenha o texto focado na vivência do cliente de forma fluida. NUNCA fale em 'tarefas' ou 'esquemas cognitivos'.",
    pdfTopics: [
      "1. Experiência Imediata / Queixa no Aqui-e-Agora",
      "2. Dinâmica da Fronteira de Contato & Bloqueios Observados",
      "3. Experimentos Gestálticos & Intervenções do Terapeuta",
      "4. Nível de Awareness & Integração da Sessão"
    ],
    evolutionPrompt: "Analise o caso clínico sob a ótica da Gestalt-Terapia de forma leve. Identifique o nível de awareness (consciência corporal/emocional) do cliente, bloqueios no ciclo de contato com o meio, e a passagem para o auto-suporte."
  },
  humanista: {
    name: "Psicologia Humanista / Existencial / ACP",
    rules: "Siga a escuta empática e existencial de forma sutil, focando no self e na vivência do cliente. Evite qualquer tipo de rotulação diagnóstica ou excesso de jargões técnicos; escreva com naturalidade, acolhimento e leveza.",
    pdfTopics: [
      "1. Vivência Experiencial / Queixa Existencial Trazida",
      "2. Facilitação, Alinhamento Empático & Aceitação Incondicional",
      "3. Movimentos de Autoatualização & Bloqueios do Self",
      "4. Direcionamento da Escuta e Insights Centrados no Cliente"
    ],
    evolutionPrompt: "Analise a evolução clínica sob a ótica Humanista / Existencial de forma empática e natural. Foque no processo de autoatualização, na congruência interna e no fortalecimento do self do paciente."
  },
  behaviorismo: {
    name: "Análise do Comportamento (Behaviorismo)",
    rules: "Descreva as contingências e dinâmicas comportamentais de forma natural, objetiva e sutil. Evite sobrecarregar o texto com excesso de terminologias técnicas acadêmicas; mantenha a escrita limpa, precisa e fluida.",
    pdfTopics: [
      "1. Contexto Antecedente / Queixa Comportamental",
      "2. Análise Funcional (Tríplice Contingência)",
      "3. Procedimentos Aplicados & Mudanças Contingenciais",
      "4. Reforçamentos Programados & Orientações Práticas"
    ],
    evolutionPrompt: "Analise a evolução clínica sob a ótica da Análise do Comportamento de forma objetiva. Identifique a estabilidade ou mudança na tríplice contingência e a eficácia dos reforçadores manejados de forma natural."
  },
  junguiana: {
    name: "Psicologia Analítica (Junguiana)",
    rules: "Trate as dinâmicas inconscientes e simbólicas de forma sutil, natural e equilibrada. Evite forçar termos arquetípicos pesados de forma artificial ou caricata; relate a vivência do paciente com fluidez e sobriedade.",
    pdfTopics: [
      "1. Material Simbólico / Demanda Trazida à Tona",
      "2. Dinâmica de Complexos Ativados & Projeções Identificadas",
      "3. Amplificação de Símbolos & Intervenções Junguianas",
      "4. Movimentos Rumo à Individuação & Integração da Sombra"
    ],
    evolutionPrompt: "Analise a evolução clínica sob a ótica da Psicologia Analítica Junguiana. Identifique as manifestações do inconsciente pessoal e coletivo e a ativação de complexos de forma sutil."
  },
  act: {
    name: "ACT (Terapia de Aceitação e Compromisso)",
    rules: "Siga a lógica da flexibilidade e aceitação de forma sutil e humana (desfusão de pensamentos, contato com valores ou ação comprometida). Evite forçar termos do Hexaflex de forma artificial ou excessiva; escreva de forma orgânica e natural.",
    pdfTopics: [
      "1. Experiência Presente / Fusões Cognitivas Evidenciadas",
      "2. Processos de Aceitação & Desfusão Desenvolvidos",
      "3. Valores Pessoais Explorados & Barreiras Identificadas",
      "4. Ações Comprometidas Pactuadas para a Semana"
    ],
    evolutionPrompt: "Analise o caso clínico sob a ótica da ACT de forma humana. Identifique os níveis de flexibilidade ou rigidez psicológica do cliente nos eixos do Hexaflex de maneira sutil e natural."
  },
  dbt: {
    name: "DBT (Terapia Dialética Comportamental)",
    rules: "Siga a dinâmica dialética (manejo de limites, validação emocional, regulação ou habilidades) de forma natural e sutil. Evite carregar o texto com terminologias de manual; relate a sessão com leveza, humanidade e fluidez.",
    pdfTopics: [
      "1. Comportamentos-Alvo Analisados (Análise em Cadeia)",
      "2. Equilíbrio Dialético (Manejo de Validação vs. Mudança)",
      "3. Treino de Habilidades DBT Exploradas na Sessão",
      "4. Plano de Segurança / Acordos Inter-sessões"
    ],
    evolutionPrompt: "Analise a evolução clínica sob a ótica da DBT de forma equilibrada. Identifique a redução de comportamentos-alvo desadaptativos e a aplicação prática das habilidades de regulação de forma sóbria."
  }
};

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
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessages, setSupportMessages] = useState<Array<{ role: 'user' | 'model', content: string }>>([
    {
      role: 'model',
      content: `Olá! Eu sou o assistente do SimplePsi. Conheço todo o funcionamento da plataforma para te ajudar no que for preciso! 🌿

Você pode me perguntar coisas como:
- *Como sincronizar minha agenda com o Google Calendar?*
- *Como funciona a lixeira de pacientes?*
- *Como gerar Smart Notes a partir de áudios das sessões?*

Como posso te ajudar hoje?`
    }
  ]);
  const [isGeneratingSupport, setIsGeneratingSupport] = useState(false);
  const [supportMessageInput, setSupportMessageInput] = useState('');
  const [supportInteractionCount, setSupportInteractionCount] = useState(0);
  const [supportSessionId, setSupportSessionId] = useState('');
  const [runTour, setRunTour] = useState(false);
  const [profileSettings, setProfileSettings] = useState({
    name: localStorage.getItem('prof_name') || '',
    crp: localStorage.getItem('prof_crp') || '',
    logo: localStorage.getItem('prof_logo') || '',
    isGoogleCalendarEnabled: localStorage.getItem('prof_gcal_enabled') === 'true',
    clinicalApproach: localStorage.getItem('prof_approach') || 'tcc'
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_calendar_access_token'));
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [supportMessages, isGeneratingSupport, isSupportOpen]);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Pre-authorized master emails
        const masterEmails = [
          'juniorcoutinho58@gmail.com',
          'wellingtoncoutinho58@gmail.com',
          'acessoriavitrinni@gmail.com'
        ];
        const userEmail = user.email ? user.email.toLowerCase().trim() : '';

        if (masterEmails.includes(userEmail)) {
          setUser(user);
          setAuthError(null);
          setLoading(false);
          return;
        }

        try {
          // 1. Check if user already has an existing clinical profile
          const profileRef = doc(db, 'profiles', user.uid);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            // Existing registered user! Let them log in immediately.
            setUser(user);
            setAuthError(null);
            setLoading(false);
            return;
          }

          // 2. Check if email document exists in Firestore 'authorized_emails'
          const docRef = doc(db, 'authorized_emails', userEmail);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && docSnap.data().active !== false) {
            setUser(user);
            setAuthError(null);
          } else {
            // Not authorized! Sign out immediately
            await auth.signOut();
            setUser(null);
            setAuthError(
              "Este e-mail não possui uma licença vitalícia ativa do SimplePsi. Se você acabou de comprar, aguarde 2 minutinhos para a liberação automática ou fale com o nosso suporte."
            );
          }
        } catch (err) {
          console.error("Erro ao verificar e-mail autorizado:", err);
          await auth.signOut();
          setUser(null);
          setAuthError(
            "Verificação de licença indisponível no momento. Por favor, tente novamente em instantes ou chame o suporte."
          );
        }
      } else {
        setUser(null);
      }
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
          logo: data.logo || '',
          isGoogleCalendarEnabled: data.isGoogleCalendarEnabled || false,
          clinicalApproach: data.clinicalApproach || 'tcc'
        });
        // Also update localStorage as backup/cache
        localStorage.setItem('prof_name', data.name || '');
        localStorage.setItem('prof_crp', data.crp || '');
        localStorage.setItem('prof_logo', data.logo || '');
        localStorage.setItem('prof_gcal_enabled', data.isGoogleCalendarEnabled ? 'true' : 'false');
        localStorage.setItem('prof_approach', data.clinicalApproach || 'tcc');
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

  // Trigger Tour on first login if name/CRP are not set and tour not completed
  useEffect(() => {
    if (!loading && user) {
      const isTourCompleted = localStorage.getItem('simplepsi_tour_completed') === 'true';
      if (isTourCompleted) return;

      const isProfileEmpty = !profileSettings?.name && !profileSettings?.crp;
      if (isProfileEmpty) {
        const timer = setTimeout(() => {
          setRunTour(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user, profileSettings]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  // Product Tour steps configuration
  const tourSteps: Step[] = useMemo(() => [
    {
      target: 'body',
      placement: 'center',
      title: 'Boas-vindas ao SimplePsi!',
      content: (
        <div className="space-y-3">
          <p>Olá! Ficamos muito felizes em ter você aqui. O SimplePsi foi desenhado para tornar a gestão do seu consultório de psicologia simples, rápida e inteligente.</p>
          <p className="font-bold text-primary">Vamos fazer um tour rápido de 1 minuto para você conhecer os principais recursos?</p>
        </div>
      )
    },
    {
      target: '#profile-settings-button',
      placement: 'bottom',
      title: 'Configurações do Perfil e CRP 🪪',
      content: (
        <div className="space-y-2">
          <p>O primeiro passo é clicar aqui para preencher o seu <strong className="font-bold text-text-main">Nome</strong> e <strong className="font-bold text-text-main">CRP</strong>.</p>
          <p className="text-xs text-text-muted">Isso é fundamental, pois esses dados serão usados para assinar digitalmente e gerar automaticamente os prontuários e laudos em PDF dos seus pacientes!</p>
        </div>
      )
    },
    {
      target: '#nav-pacientes',
      placement: 'right',
      title: 'Seus Pacientes 👥',
      content: (
        <div className="space-y-2">
          <p>Na aba <strong className="font-bold text-text-main">Pacientes</strong>, você faz a gestão completa de quem você atende.</p>
          <p className="text-xs text-text-muted">Aqui você cadastra novos pacientes, gerencia dados de contato, visualiza o histórico de sessões e mantém as fichas clínicas sempre organizadas.</p>
        </div>
      )
    },
    {
      target: '#nav-prontuarios',
      placement: 'right',
      title: '✨ IA & Prontuários Inteligentes',
      content: (
        <div className="space-y-2">
          <p>Chega de gastar horas digitando relatos após as sessões! Nesta aba, nossa <strong className="font-bold text-text-main">Inteligência Artificial</strong> gera prontuários estruturados.</p>
          <p className="text-xs text-text-muted">Basta colar ou ditar a transcrição bruta da sessão. A IA resume, substitui nomes de terceiros por iniciais (garantindo sigilo) e envia o relato final direto para a pasta <strong className="font-bold text-text-main">Biblioteca</strong> do paciente.</p>
        </div>
      )
    },
    {
      target: '#nav-financeiro',
      placement: 'right',
      title: 'Controle Financeiro 💰',
      content: (
        <div className="space-y-2">
          <p>Monitore a saúde do seu consultório sem espresso.</p>
          <p className="text-xs text-text-muted">Acompanhe sessões pagas, pendentes de cobrança, faturamento mensal e fluxo de caixa de forma visual, simplificada e automatizada.</p>
        </div>
      )
    },
    {
      target: 'body',
      placement: 'center',
      title: '📲 SimplePsi no seu Celular!',
      content: (
        <div className="space-y-3">
          <p className="text-sm">Sabia que você pode salvar o SimplePsi na tela inicial do seu celular para acessar como se fosse um app nativo?</p>
          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 text-[11px] space-y-2 text-left">
            <p>🍏 <strong className="font-bold text-text-main">No iPhone (iOS)</strong>: Abra o site no <strong className="font-bold text-text-main">Safari</strong>, clique no ícone de <strong className="font-bold text-text-main">Compartilhar</strong> (quadrado com seta para cima) e selecione <strong className="font-bold text-text-main">Adicionar à Tela de Início</strong>.</p>
            <p>🤖 <strong className="font-bold text-text-main">No Android</strong>: Abra no <strong className="font-bold text-text-main">Chrome</strong>, clique nos <strong className="font-bold text-text-main">três pontinhos</strong> no canto superior direito e escolha <strong className="font-bold text-text-main">Adicionar à Tela inicial</strong> ou <strong className="font-bold text-text-main">Instalar aplicativo</strong>.</p>
          </div>
          <p className="text-xs font-bold text-accent">Muito mais prático para o seu dia a dia!</p>
        </div>
      )
    }
  ], []);

  // Callback to handle tour transitions and auto-opening mobile menu
  const handleJoyrideCallback = (data: EventData) => {
    const { action, index, status, type } = data;

    if (type === 'step:before') {
      const target = tourSteps[index]?.target;
      const isMobile = window.innerWidth < 1024;

      if (isMobile) {
        if (target === '#nav-pacientes' || target === '#nav-prontuarios' || target === '#nav-financeiro') {
          setIsMobileMenuOpen(true);
        } else {
          setIsMobileMenuOpen(false);
        }
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      localStorage.setItem('simplepsi_tour_completed', 'true');
      setIsMobileMenuOpen(false);
    }
  };

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
        meetingLink: data.meetingLink || '',
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

  const shouldShowWhatsAppSupport = () => {
    if (supportInteractionCount >= 5) return true;
    const lower = supportMessages.map(m => m.content.toLowerCase()).join(' ');
    return lower.includes('whatsapp') || lower.includes('suporte humano') || lower.includes('falar com atendente') || lower.includes('suporte direto');
  };

  const handleSendSupport = async () => {
    if (!supportMessageInput.trim()) return;

    const userMessage = supportMessageInput.trim();
    const updatedMessages = [...supportMessages, { role: 'user' as const, content: userMessage }];
    setSupportMessages(updatedMessages);
    setSupportMessageInput('');
    setIsGeneratingSupport(true);
    setSupportInteractionCount(prev => prev + 1);

    const docId = supportSessionId || `support_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (!supportSessionId) {
      setSupportSessionId(docId);
    }

    try {
      // Save suggestion/ticket snapshot to Firestore collection
      const ticketData = {
        id: docId,
        userEmail: user?.email || 'anonimo@simplepsi.com.br',
        userName: user?.displayName || 'Psicólogo',
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'Nova Sugestão'
      };
      await setDoc(doc(db, 'support_tickets', docId), ticketData, { merge: true });
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setSupportMessages(prev => [...prev, {
          role: 'model',
          content: "Desculpe, a chave da API do Gemini não está configurada neste ambiente. Por favor, configure a variável `VITE_GEMINI_API_KEY`."
        }]);
        setIsGeneratingSupport(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      // Compile conversation history for the model context
      const contents = updatedMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      // Inject the strict humanized instructions and platform knowledge as system instruction/prefix
      const systemInstruction = `
        Você é a IA de Suporte Oficial da plataforma SimplePsi, um sistema de gestão clínica para psicólogos.
        Sua principal missão é ajudar os psicólogos que usam a plataforma com empatia, clareza e OBJETIVIDADE.
        
        REGRAS DE OURO DA SUA PERSONALIDADE:
        - NUNCA use símbolos de negrito (dois asteriscos **), itálico (*) ou qualquer formatação com asteriscos. Escreva em texto puro limpo, usando parágrafos ou listas numeradas simples.
        - NÃO faça propagandas, discursos de venda ou elogios aos recursos do SimplePsi. O psicólogo já comprou e usa o sistema. Vá direto ao ponto, explicando apenas o passo a passo prático de onde ele deve clicar.
        - Respostas curtas e práticas: dê respostas curtas, atenciosas e objetivas. Se o usuário perguntar algo, ensine como fazer em 2 ou 3 passos rápidos.
        - Nunca admita que é um modelo de linguagem ou que foi desenvolvido pela Google/OpenAI. Fale como o Assistente de Suporte do SimplePsi.

        MAPA DE FUNCIONALIDADES DO SIMPLEPSI (Para você guiar o usuário na navegação):
        1. Painel Inicial (Dashboard):
           - Resumos de Sessões Hoje, Pacientes Ativos e Receita Mensal Prevista.
           - Tabela de atendimentos do dia com links rápidos de chamada online.
        2. Pacientes:
           - Cadastro rápido de triagem ou completo (CPF, nascimento, contatos).
           - Lixeira (Aba Inativos): Local para restaurar ou excluir permanentemente pacientes.
           - Bloco Payment Notes: Bloco de notas financeiras personalizado dentro de cada paciente.
        3. Agenda:
           - Agenda semanal interativa com suporte a sessões recorrentes, remarcações e cancelamentos.
           - Integração Google Calendar: Sincroniza consultas e insere o link da sessão no local do evento.
        4. Prontuários e Anamnese:
           - Anamnese dividida em Queixa Principal, Histórico Familiar, História de Vida e Medicamentos.
           - Evolução de Sessão com gravação de áudio de sessão e Smart Notes (transcrição e resumos estruturados por IA).
        5. Financeiro:
           - Registro prático de receitas e despesas com categorização. Para Nota Fiscal, instrua o usuário a registrar a receita no Financeiro e colocar o número da nota fiscal no campo de Descrição ou Observações.
        6. Configurações do Perfil:
           - Nome e CRP que assinam automaticamente o PDF.
           - Integração das credenciais do Google Agenda.

        Se o usuário demonstrar frustração extrema ou se esta for a 5ª interação ou mais, informe amigavelmente que ele também pode chamar o suporte direto no WhatsApp pelo botão que aparecerá na janela de chat.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          ...contents
        ],
      });

      const modelReply = response.text || "Desculpe, não consegui processar a resposta agora. Pode tentar novamente?";
      const finalMessages = [...updatedMessages, { role: 'model' as const, content: modelReply }];
      setSupportMessages(finalMessages);

      // Update support ticket conversation history in Firestore with AI reply
      await setDoc(doc(db, 'support_tickets', docId), {
        messages: finalMessages.map(m => ({ role: m.role, content: m.content })),
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (err) {
      console.error("Erro no chat de suporte de IA:", err);
      setSupportMessages(prev => [...prev, {
        role: 'model',
        content: "Ops, ocorreu um erro de conexão ao processar seu suporte de IA. Se o erro persistir, você pode me chamar no WhatsApp de Suporte Humano abaixo!"
      }]);
    } finally {
      setIsGeneratingSupport(false);
    }
  };

  // Google Calendar Authentication & Sync Helpers
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        localStorage.setItem('google_calendar_access_token', credential.accessToken);
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error("Erro no login com Google:", err);
    }
  };

  const getFutureAgendaSlots = (daysCount: number) => {
    const slots: any[] = [];
    const today = new Date();
    
    for (let i = 0; i < daysCount; i++) {
      const day = new Date();
      day.setDate(today.getDate() + i);
      const dayName = format(day, 'eeee', { locale: ptBR });
      const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // 1. Recorded Sessions from Firestore
      const recorded = sessions.filter(s => s.status !== 'Cancelada' && s.date === dateStr);
      recorded.forEach(s => {
        slots.push({
          id: s.id,
          patientId: s.patientId,
          patientName: s.isTriage ? s.triageName : (patients.find(p => p.id === s.patientId)?.name || 'Paciente'),
          date: s.date,
          time: s.time,
          type: s.type,
          duration: s.duration || '50min',
          status: s.status,
          isTriage: s.isTriage,
          googleEventId: s.googleEventId
        });
      });

      // 2. Recurrent Sessions from Patients
      patients.forEach(p => {
        if (p.status === 'Inativo') return;
        if (p.sessionDay === capitalizedDayName && p.sessionTime && p.sessionDay !== '' && p.sessionDay !== 'Nenhum') {
          // Skip if there's already a recorded session for this patient today
          const hasRecorded = recorded.some(s => s.patientId === p.id);
          const hasCancelled = sessions.some(s => s.patientId === p.id && s.status === 'Cancelada' && s.date === dateStr);
          
          if (hasRecorded || hasCancelled) return;

          const pCreatedAt = new Date((p as any).createdAt || p.birthDate || '2024-01-01');
          const weeksDiff = Math.abs(differenceInWeeks(startOfDay(day), startOfDay(pCreatedAt)));
          
          let shouldRender = false;
          if (!p.recurrence || p.recurrence === 'Semanal') shouldRender = true;
          else if (p.recurrence === 'Quinzenal') shouldRender = weeksDiff % 2 === 0;
          else if (p.recurrence === 'Mensal') shouldRender = weeksDiff % 4 === 0;

          if (shouldRender) {
            slots.push({
              id: `virtual-${p.id}-${dateStr}`,
              patientId: p.id,
              patientName: p.name,
              date: dateStr,
              time: p.sessionTime,
              type: p.modality || 'Online',
              duration: '50min',
              status: 'Recorrente',
              isTriage: false,
              sessionValue: p.sessionAmount || 0
            });
          }
        }
      });
    }
    
    return slots;
  };

  const syncAllFutureSessionsToGoogle = async (accessToken: string) => {
    try {
      if (!user) return;
      
      const totalPatients = patients.length;
      const activePatientsWithSchedule = patients.filter(p => p.status !== 'Inativo' && p.sessionDay && p.sessionDay !== 'Nenhum' && p.sessionTime).length;
      
      // 1. Get all future agenda slots for the next 30 days
      const futureSlots = getFutureAgendaSlots(30);

      // Count pending vs existing
      const pendingSlots = futureSlots.filter(s => !s.googleEventId);
      const existingSlots = futureSlots.filter(s => !!s.googleEventId);

      // Diagnostic Alert
      alert(`SimplePsi - Diagnóstico de Sincronização:\n\n` +
            `- Total de Pacientes: ${totalPatients}\n` +
            `- Pacientes com dia/hora fixos: ${activePatientsWithSchedule}\n` +
            `- Consultas detectadas nos próximos 30 dias: ${futureSlots.length}\n` +
            `- Consultas novas (não enviadas ao Google): ${pendingSlots.length}\n` +
            `- Consultas já vinculadas (serão atualizadas): ${existingSlots.length}\n\n` +
            `Ao clicar em OK, iniciaremos a sincronização e reconciliação de todas as consultas no seu Google Agenda.`);

      if (futureSlots.length === 0) {
        console.log("Nenhuma consulta futura pendente de sincronização.");
        return;
      }

      console.log(`Iniciando reconciliação em lote de ${futureSlots.length} consultas futuras...`);
      
      // Temporary override to ensure local token is active
      localStorage.setItem('google_calendar_access_token', accessToken);

      let successCount = 0;
      let failCount = 0;
      let lastErrorMessage = '';

      for (const slot of futureSlots) {
        try {
          if (!slot.googleEventId) {
            if (slot.id.startsWith('virtual-')) {
              // Materialize virtual session as a real session document in Firestore
              const sessionData = {
                patientId: slot.patientId,
                date: slot.date,
                time: slot.time,
                duration: slot.duration || '50min',
                type: slot.type || 'Presencial',
                status: 'Agendada',
                amount: parseFloat(slot.sessionValue) || 0,
                cost: 0,
                paid: false,
                nfIssued: false,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              const docRef = await addDoc(collection(db, 'sessions'), sessionData);
              const success = await syncSessionToGoogleCalendar(sessionData, docRef.id, true);
              if (success) successCount++;
              else failCount++;
            } else {
              // Already a recorded session, sync it directly
              const success = await syncSessionToGoogleCalendar(slot, slot.id, true);
              if (success) successCount++;
              else failCount++;
            }
          } else {
            // Already has googleEventId, perform update/reconciliation
            const success = await updateSessionInGoogleCalendar(slot, true);
            if (success) successCount++;
            else failCount++;
          }
        } catch (errSlot: any) {
          failCount++;
          lastErrorMessage = errSlot.message || String(errSlot);
          console.error("Falha ao sincronizar slot individual:", slot, errSlot);
        }
      }

      alert(`Resultado da Sincronização & Reconciliação:\n\n` +
            `- Consultas sincronizadas/atualizadas com sucesso: ${successCount}\n` +
            `- Consultas com falha: ${failCount}` +
            (failCount > 0 ? `\n- Último erro relatado: ${lastErrorMessage}` : ''));

    } catch (err: any) {
      console.error("Erro na sincronização em lote:", err);
      alert("Erro crítico na sincronização: " + (err.message || err));
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const userConfirmed = window.confirm(
        "🔒 Segurança e Integração da Google Agenda\n\n" +
        "Para sincronizar as consultas do SimplePsi com a sua Google Agenda em tempo real, o Google solicitará permissão para gerenciar eventos de calendário.\n\n" +
        "Como a nossa plataforma é exclusiva e utiliza sua conta pessoal direta, a Google poderá exibir um aviso de 'App não verificado' ou 'Site suspeito'. Isso é normal para apps privados que ainda não concluíram a verificação empresarial completa da Google.\n\n" +
        "Para prosseguir com segurança:\n" +
        "1. Clique em 'Avançado' (no canto inferior esquerdo da tela de consentimento da Google).\n" +
        "2. Clique no link 'Acessar SimplePsi (não seguro)'.\n\n" +
        "Garantimos 100% de sigilo ético e que nenhuma outra informação da sua conta Google será lida. Deseja iniciar a conexão manual agora?"
      );
      
      if (!userConfirmed) return;

      const result = await signInWithGoogleCalendar();
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        localStorage.setItem('google_calendar_access_token', credential.accessToken);
        setGoogleAccessToken(credential.accessToken);
        
        // Turn on the toggle in profiles document too!
        if (user) {
          const profileRef = doc(db, 'profiles', user.uid);
          await setDoc(profileRef, { isGoogleCalendarEnabled: true }, { merge: true });
        }

        // Inform user about batch sync
        alert("Google Agenda conectado com sucesso! O SimplePsi vai iniciar a sincronização automática de todas as suas consultas futuras agora. Aguarde um instante...");

        await syncAllFutureSessionsToGoogle(credential.accessToken);

        alert("Tudo pronto! Todas as suas consultas futuras foram sincronizadas e espelhadas com sucesso no Google Agenda.");
      } else {
        alert("Não foi possível obter a autorização da Google Agenda. Tente novamente.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao conectar com Google Agenda: " + (err.message || err));
    }
  };

  const formatLocalIsoString = (dateStr: string, timeStr: string, durationStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day, hours, minutes);

      let durationMinutes = 50;
      if (durationStr?.includes('h')) {
        durationMinutes = parseFloat(durationStr) * 60;
      } else if (durationStr?.includes('min')) {
        durationMinutes = parseFloat(durationStr);
      }

      const endD = new Date(d.getTime() + durationMinutes * 60000);

      const pad = (num: number) => num.toString().padStart(2, '0');
      const formatTz = (dateObj: Date) => {
        const tzo = -dateObj.getTimezoneOffset();
        const dif = tzo >= 0 ? '+' : '-';
        return dateObj.getFullYear() +
          '-' + pad(dateObj.getMonth() + 1) +
          '-' + pad(dateObj.getDate()) +
          'T' + pad(dateObj.getHours()) +
          ':' + pad(dateObj.getMinutes()) +
          ':' + pad(dateObj.getSeconds()) +
          dif + pad(Math.floor(Math.abs(tzo) / 60)) +
          ':' + pad(Math.abs(tzo) % 60);
      };

      return {
        start: formatTz(d),
        end: formatTz(endD)
      };
    } catch (e) {
      console.error("Erro ao formatar data/hora:", e);
      return {
        start: `${dateStr}T${timeStr}:00-03:00`,
        end: `${dateStr}T${timeStr}:00-03:00`
      };
    }
  };

  const getCalendarAuthHeaders = () => {
    const token = localStorage.getItem('google_calendar_access_token');
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : null;
  };

  const syncSessionToGoogleCalendar = async (sessionData: any, sessionId: string, bypassEnabledCheck = false): Promise<boolean> => {
    if (!profileSettings.isGoogleCalendarEnabled && !bypassEnabledCheck) return false;
    const headers = getCalendarAuthHeaders();
    if (!headers) return false;

    try {
      const p = patients.find(pat => pat.id === sessionData.patientId);
      const patientName = p ? p.name : (sessionData.triageName || "Paciente");
      const meetingLink = p?.meetingLink || "";
      const { start, end } = formatLocalIsoString(sessionData.date, sessionData.time, sessionData.duration || '50min');

      const body = {
        summary: `Consulta - ${patientName}`,
        description: `Consulta clínica agendada via SimplePsi.\nPaciente: ${patientName}\nModalidade: ${sessionData.type || 'Presencial'}` + 
                     (meetingLink ? `\nLink da Sessão: ${meetingLink}` : ''),
        location: meetingLink || '',
        start: {
          dateTime: start,
          timeZone: "America/Sao_Paulo"
        },
        end: {
          dateTime: end,
          timeZone: "America/Sao_Paulo"
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (response.status === 401) {
        console.warn("Token da Google Agenda expirou.");
        return false;
      }

      if (response.ok) {
        const event = await response.json();
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, { googleEventId: event.id });
        return true;
      } else {
        const errText = await response.text();
        console.error("Erro da API do Google Calendar:", errText);
        throw new Error(errText);
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar com Google Agenda:", err);
      throw err;
    }
  };

  const updateSessionInGoogleCalendar = async (sessionData: any, bypassEnabledCheck = false): Promise<boolean> => {
    if (!profileSettings.isGoogleCalendarEnabled && !bypassEnabledCheck) return false;
    if (!sessionData.googleEventId) return false;
    const headers = getCalendarAuthHeaders();
    if (!headers) return false;

    try {
      const p = patients.find(pat => pat.id === sessionData.patientId);
      const patientName = p ? p.name : (sessionData.triageName || "Paciente");
      const meetingLink = p?.meetingLink || "";
      const { start, end } = formatLocalIsoString(sessionData.date, sessionData.time, sessionData.duration || '50min');

      const body = {
        summary: `Consulta - ${patientName}`,
        description: `Consulta clínica agendada via SimplePsi.\nPaciente: ${patientName}\nModalidade: ${sessionData.type || 'Presencial'}` + 
                     (meetingLink ? `\nLink da Sessão: ${meetingLink}` : ''),
        location: meetingLink || '',
        start: {
          dateTime: start,
          timeZone: "America/Sao_Paulo"
        },
        end: {
          dateTime: end,
          timeZone: "America/Sao_Paulo"
        }
      };

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${sessionData.googleEventId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });

      if (response.status === 401) {
        console.warn("Token da Google Agenda expirou.");
        return false;
      }
      return response.ok;
    } catch (err) {
      console.error("Erro ao atualizar evento na Google Agenda:", err);
      return false;
    }
  };

  const deleteSessionFromGoogleCalendar = async (googleEventId: string) => {
    if (!profileSettings.isGoogleCalendarEnabled || !googleEventId) return;
    const headers = getCalendarAuthHeaders();
    if (!headers) return;

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'DELETE',
        headers
      });

      if (response.status === 401) {
        console.warn("Token da Google Agenda expirou.");
      }
    } catch (err) {
      console.error("Erro ao excluir evento da Google Agenda:", err);
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
             if (oldDoc && oldDoc.googleEventId) {
               await deleteSessionFromGoogleCalendar(oldDoc.googleEventId);
             }
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
        const updatedData = {
          patientId: data.patientId || '',
          isTriage: data.isTriage || false,
          triageName: data.triageName || '',
          date: data.date,
          time: data.time,
          type: data.type || 'Presencial',
          status: data.status || 'Agendada',
          amount: parseFloat(data.amount) || parseFloat(oldDoc?.amount as any) || 0,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(sessionRef, updatedData);
        setLastAction({ type: 'update', ids: [data.id], oldData: oldDoc });

        // Google Agenda Sync
        if (oldDoc && oldDoc.googleEventId) {
          if (updatedData.status === 'Cancelada') {
            await deleteSessionFromGoogleCalendar(oldDoc.googleEventId);
          } else {
            await updateSessionInGoogleCalendar({ ...updatedData, googleEventId: oldDoc.googleEventId });
          }
        }

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

      // Google Agenda Sync
      if (sessionData.status !== 'Cancelada') {
        await syncSessionToGoogleCalendar(sessionData, ref.id);
      }
      
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
          const sessionToDelete = sessions.find(s => s.id === id);
          if (sessionToDelete && sessionToDelete.googleEventId) {
            await deleteSessionFromGoogleCalendar(sessionToDelete.googleEventId);
          }
          await deleteDoc(doc(db, 'sessions', id));
        }
      } else if (lastAction.type === 'update' && lastAction.oldData) {
        for (const id of lastAction.ids) {
          const sessionRef = doc(db, 'sessions', id);
          const { id: _, ...oldDataWithoutId } = lastAction.oldData;
          await updateDoc(sessionRef, { ...oldDataWithoutId, updatedAt: new Date().toISOString() });
          if (lastAction.oldData.googleEventId) {
            await updateSessionInGoogleCalendar({ ...oldDataWithoutId, googleEventId: lastAction.oldData.googleEventId });
          }
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

      // Google Agenda Sync
      if (data.googleEventId) {
        if (data.status === 'Cancelada') {
          await deleteSessionFromGoogleCalendar(data.googleEventId);
        } else {
          await updateSessionInGoogleCalendar({ ...data, googleEventId: data.googleEventId });
        }
      }
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
      const sessionToDelete = sessions.find(s => s.id === id);
      if (sessionToDelete && sessionToDelete.googleEventId) {
        await deleteSessionFromGoogleCalendar(sessionToDelete.googleEventId);
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
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Carregando SimplePsi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onLogin={handleGoogleLogin} />
        
        {/* Auth Error Premium Modal */}
        {authError && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#FAF9F6] border border-[#2E3C2B]/10 max-w-md w-full rounded-3xl p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-300 text-[#2E3C2B]">
              <button 
                onClick={() => setAuthError(null)} 
                className="absolute top-4 right-4 text-[#2E3C2B]/40 hover:text-[#2E3C2B]/80 transition-colors p-2"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-serif font-black text-[#2E3C2B]">Acesso Não Autorizado</h3>
                <p className="text-sm text-[#2E3C2B]/70 leading-relaxed font-sans">
                  {authError}
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <a 
                  href="https://wa.me/5562983208784" // Wellington's Whatsapp!
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold rounded-xl transition-all shadow-md shadow-[#5F7D5C]/10 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-sans"
                >
                  Falar com o Suporte
                </a>
                <button 
                  onClick={() => setAuthError(null)}
                  className="w-full py-3 bg-transparent hover:bg-[#2E3C2B]/5 text-[#2E3C2B]/80 font-bold rounded-xl transition-all flex items-center justify-center text-xs uppercase tracking-wider font-sans"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div 
      className="flex h-screen bg-background text-text-main overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Interactive Product Tour */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        onEvent={handleJoyrideCallback}
        tooltipComponent={CustomTooltip}
        options={{
          overlayColor: 'rgba(0, 0, 0, 0.65)',
          zIndex: 10000,
          overlayClickAction: false,
        }}
      />

      {/* Sidebar - Desktop and Mobile */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 border-r border-white/5 flex flex-col bg-card/90 backdrop-blur-xl transition-all duration-300 lg:static lg:w-64 lg:bg-card/50",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/apple-touch-icon.png" className="w-10 h-10 object-contain rounded-xl shadow-lg border border-white/5" alt="Logo" />
            <h1 className="text-xl font-bold tracking-tight">Simple<span className="text-primary">Psi</span></h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-text-muted hover:text-text-main">
            <ChevronRight className="rotate-180" size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
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

          <div className="p-4 mt-auto border-t border-white/5 space-y-3">
            <button 
              onClick={() => setIsSupportOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all border border-transparent hover:border-primary/10 group"
            >
              <HelpCircle size={15} className="text-text-muted group-hover:text-primary transition-colors" />
              <span>Suporte & Sugestões</span>
            </button>

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
              id="profile-settings-button"
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
                onGoToFinanceiro={() => setActiveTab('financeiro')}
                onGoToPacientes={() => { setSelectedPatient(null); setActiveTab('pacientes'); }}
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
                isGoogleCalendarEnabled={profileSettings.isGoogleCalendarEnabled}
                googleAccessToken={googleAccessToken}
                onOpenSettings={() => setIsSettingsOpen(true)}
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
              googleAccessToken={googleAccessToken}
              onConnectGoogleCalendar={handleConnectGoogleCalendar}
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
                  localStorage.setItem('prof_approach', data.clinicalApproach || 'tcc');
                  setProfileSettings(data);
                  setIsSettingsOpen(false);
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Support & Feedback Modal */}
        <AnimatePresence>
          {isSupportOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card border border-border-ui w-full max-w-lg rounded-[32px] p-6 space-y-4 shadow-2xl relative overflow-hidden text-left flex flex-col max-h-[90vh]"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-pink-500" />
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border-ui pb-3">
                  <div className="flex items-center gap-2.5 text-primary">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <HelpCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-main">Guia de IA & Suporte</h3>
                      <p className="text-[10px] text-text-muted">Assistente técnico inteligente do SimplePsi</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsSupportOpen(false);
                      setSupportMessageInput('');
                    }}
                    className="text-text-muted hover:text-text-main text-[10px] uppercase tracking-widest font-bold bg-surface-muted hover:bg-border-ui px-3 py-1.5 rounded-xl transition-all"
                  >
                    Fechar
                  </button>
                </div>

                {/* Chat Message Window */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[250px] max-h-[380px] flex flex-col">
                  {supportMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap shadow-sm transition-all",
                        msg.role === 'user'
                          ? "bg-primary text-white self-end rounded-tr-none text-left"
                          : "bg-surface-muted border border-border-ui text-text-main self-start rounded-tl-none text-left font-normal"
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isGeneratingSupport && (
                    <div className="flex items-center gap-1.5 bg-surface-muted border border-border-ui rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] self-start text-xs text-text-muted shadow-sm">
                      <span>Assistente está escrevendo</span>
                      <span className="flex gap-0.5 ml-1 items-center">
                        <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* WhatsApp Escalation Card */}
                {shouldShowWhatsAppSupport() && (
                  <div className="bg-primary/5 border border-primary/25 rounded-2xl p-4 text-left space-y-2.5 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base">🌿</span>
                      <div>
                        <h4 className="text-xs font-bold text-primary font-outfit">Precisa de suporte humano?</h4>
                        <p className="text-[10px] text-text-muted leading-relaxed mt-0.5">
                          A nossa equipe de suporte está online no WhatsApp pronta para te ajudar com todo o histórico deste chat já compartilhado.
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/5562983208784?text=${encodeURIComponent(
                        `Olá Suporte SimplePsi! Estou usando o sistema e preciso de suporte com a plataforma. Aqui está o histórico da minha conversa com a IA de Suporte:\n\n${supportMessages.map(m => `${m.role === 'user' ? 'Psicólogo' : 'IA Assistente'}: ${m.content}`).join('\n\n')}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-green-500/10 hover:scale-[1.01]"
                    >
                      💬 Chamar Suporte no WhatsApp
                    </a>
                  </div>
                )}

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendSupport();
                  }}
                  className="flex items-center gap-2 pt-2 border-t border-border-ui"
                >
                  <input
                    type="text"
                    value={supportMessageInput}
                    onChange={(e) => setSupportMessageInput(e.target.value)}
                    placeholder="Pergunte sobre Google Agenda, Smart Notes, lixeira..."
                    disabled={isGeneratingSupport}
                    className="flex-1 bg-surface-muted border border-border-ui rounded-2xl px-4 py-3.5 text-xs text-text-main focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 placeholder:text-text-muted/40 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingSupport || !supportMessageInput.trim()}
                    className={cn(
                      "p-3.5 rounded-2xl text-white shadow-lg transition-all flex items-center justify-center",
                      supportMessageInput.trim() && !isGeneratingSupport
                        ? "bg-primary hover:opacity-90 shadow-primary/15 hover:scale-[1.03]"
                        : "bg-text-muted/20 text-text-muted cursor-not-allowed shadow-none"
                    )}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </motion.div>
            </motion.div>
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
  onGoToFinanceiro,
  onGoToPacientes,
  onDeletePatient
}: { 
  user: User | null,
  onPatientSelect: (id: string) => void, 
  patients: any[],
  filteredPatients: any[], 
  sessions: any[], 
  transactions: any[],
  onGoToAgenda: () => void,
  onGoToFinanceiro: () => void,
  onGoToPacientes: () => void,
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
          Olá {user?.displayName ? user.displayName.split(' ')[0] : 'Doutor(a)'}!
        </h2>
        <p className="text-text-muted mt-2">Você está no controle da sua rotina. Vamos começar?</p>
        <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">Última atualização: {new Date().toLocaleTimeString()}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard onClick={onGoToAgenda} title="Sessões Hoje" value={validSessions.filter(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.status !== 'Cancelada').length.toString()} subtext="Agendadas para hoje" icon={CalendarIcon} color="text-purple-400" />
        <StatCard onClick={onGoToPacientes} title="Pacientes Ativos" value={patients.filter(p => p.status !== 'Inativo').length.toString()} subtext="Gestão total" icon={Users} color="text-blue-400" />
        <StatCard onClick={onGoToFinanceiro} title="Receita Mensal Prevista" value={formatCurrency(monthlyPredictedIncome)} subtext="Previsão baseada em sessões" icon={DollarSign} color="text-pink-400" />
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
                onClick={() => {
                  if (alert.type === 'finance') {
                    onGoToFinanceiro();
                  } else {
                    onPatientSelect(alert.patient.id);
                  }
                }}
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
    meetingLink: '',
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

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Link de Atendimento (ex: Google Meet, Zoom)</label>
                    <input 
                      type="url" 
                      placeholder="https://meet.google.com/xyz-abc-123" 
                      value={formData.meetingLink} 
                      onChange={(e) => setFormData({...formData, meetingLink: e.target.value})} 
                      className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary placeholder:text-text-muted/40" 
                    />
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
                  {Math.max(parseInt(patient.sessions) || 0, patient.clinicalData?.evoluções?.length || 0)} sessões realizadas
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
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/wav';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = mimeType 
        ? new MediaRecorder(stream, { mimeType }) 
        : new MediaRecorder(stream);
      
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await transcribeAudio(finalBlob);
      };

      recorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Por favor, verifique as permissões de áudio do seu navegador.");
    }
  };

  const pauseAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resumeAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    audioChunksRef.current = [];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (blob: Blob) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1];
          const mimeType = blob.type || 'audio/webm';

          const ai = new GoogleGenAI({ apiKey });
          const prompt = "Transcreva o áudio acima na íntegra, com máxima precisão. Escreva exatamente o que foi falado (em português), palavra por palavra, de forma corrida. Não adicione resumos, comentários, introduções ou explicações. Apenas retorne a transcrição bruta pura.";

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              {
                inlineData: {
                  data: base64String,
                  mimeType: mimeType
                }
              },
              prompt
            ]
          });

          if (response.text) {
            setTranscriptionText(prev => prev ? prev + " " + response.text : response.text);
          } else {
            alert("Não foi possível transcrever nada do áudio fornecido.");
          }
        } catch (err: any) {
          console.error("Erro ao transcrever com Gemini:", err);
          alert("Erro ao transcrever o áudio. Tente novamente.");
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err: any) {
      console.error("Erro ao processar blob do gravador:", err);
      alert("Erro ao processar o arquivo de áudio.");
      setIsTranscribing(false);
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
      const approachKey = profileSettings.clinicalApproach || 'tcc';
      const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Atue como um psicólogo clínico experiente cuja abordagem teórica principal de atendimento é a ${approachInfo.name}.
      Transforme a seguinte transcrição bruta de um áudio em um relato de sessão clínica organizado em texto corrido e parágrafos, escrito de forma profissional, mas com um tom pessoal (estilo relato de caso) adequado à sua linha teórica de atendimento.
      
      DIRETRIZES DA SUA ABORDAGEM CLÍNICA (${approachInfo.name}):
      ${approachInfo.rules}
      
      REGRA DE ESTILO CRÍTICA: Escreva de forma extremamente natural, humana, equilibrada e fluida. Utilize os conceitos teóricos da sua abordagem de maneira SUTIL e ORGÂNICA, apenas onde fizer sentido prático na fala do cliente. NUNCA force termos técnicos desnecessários de forma artificial e evite encher o relato com excesso de jargões acadêmicos. O texto deve soar como as anotações sóbrias e elegantes de um terapeuta humano real em seu cotidiano, sem parecer um artigo científico caricato.
      
      REGRA IMPORTANTÍSSIMA 1: NUNCA invente, presuma ou adicione informações que não estejam na transcrição bruta. Se a transcrição for curta e contiver apenas o básico, devolva um relato curto e básico. O tamanho e a quantidade de detalhes do seu relato devem ser estritamente proporcionais à transcrição fornecida.
      
      REGRA IMPORTANTÍSSIMA 2: Substitua TODOS os nomes próprios de pessoas (pacientes, parceiros, parentes, etc) mencionados na transcrição APENAS pela letra inicial do nome seguida de ponto (exemplo: Gabi -> G., Alana -> A., Carol -> C.). 
      
      Mantenha o fluxo de narrativa em primeira pessoa do terapeuta (ex: "A paciente relatou...", "Questionei se...", "Trabalhei com ela..."). Não adicione saudações, devolva apenas o texto final do relato.
      
      Exemplo de estilo de relato de referência (exemplo genérico para compreender o tom desejado):
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

    const approachKey = profileSettings.clinicalApproach || 'tcc';
    const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

    setGeneratingPdfId(evo.id);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Atue como um psicólogo clínico da abordagem ${approachInfo.name} extraindo informações de um relato de evolução para um prontuário formal.
Leia o seguinte relato de sessão e extraia as informações dividindo-as nestes 4 tópicos:
1. ${approachInfo.pdfTopics[0]} (Breve resumo do que o paciente trouxe para a sessão).
2. ${approachInfo.pdfTopics[1]} (Intervenções e técnicas específicas utilizadas na sessão).
3. ${approachInfo.pdfTopics[2]} (Como o paciente reagiu e qual o progresso observado).
4. ${approachInfo.pdfTopics[3]} (Acordos ou orientações inter-sessões).

Seja muito sucinto, formal, ético e direto de acordo com as diretrizes da sua abordagem. Não adicione saudações, asteriscos ou introduções, retorne APENAS um objeto JSON válido com as seguintes chaves exatas (tudo minúsculo, sem acentos): "demanda", "intervencoes", "evolucao", "tarefa".

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
          [approachInfo.pdfTopics[0], data.demanda || ''],
          [approachInfo.pdfTopics[1], data.intervencoes || ''],
          [approachInfo.pdfTopics[2], data.evolucao || ''],
          [approachInfo.pdfTopics[3], data.tarefa || '']
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

      const approachKey = profileSettings.clinicalApproach || 'tcc';
      const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Aja como um assistente de psicólogo altamente experiente e especializado em análise clínica sob a ótica da abordagem ${approachInfo.name}.
        Analise os dados do paciente ${patient.name} e gere os resumos solicitados estruturados sob a sua ótica teórica.
        
        DIRETRIZES DA ANÁLISE CLÍNICA (${approachInfo.name}):
        ${approachInfo.evolutionPrompt}
        Certifique-se de que a linguagem teórica, os insights psicológicos e a terminologia utilizada correspondam estritamente a essa abordagem clínica.

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

                        <div className="col-span-2 lg:col-span-4 flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Link de Atendimento (ex: Google Meet, Zoom)</span>
                          {isEditing ? (
                            <input 
                              type="url"
                              placeholder="https://meet.google.com/xyz-abc-123"
                              value={editForm.meetingLink || ''} 
                              onChange={(e) => setEditForm({...editForm, meetingLink: e.target.value})}
                              className="text-xs font-bold text-text-main bg-transparent outline-none w-full placeholder:text-text-muted/40"
                            />
                          ) : (
                            patient.meetingLink ? (
                              <a 
                                href={patient.meetingLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-0.5 break-all"
                              >
                                {patient.meetingLink}
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-text-muted italic">Nenhum cadastrado</span>
                            )
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

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Transcrição do Áudio</label>
                            </div>

                            {/* Elegant Audio Recorder Interface */}
                            <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/5 relative overflow-hidden transition-all duration-300">
                              {isTranscribing ? (
                                <div className="flex flex-col items-center justify-center py-4 space-y-3 animate-pulse">
                                  <Loader2 size={24} className="text-primary animate-spin" />
                                  <p className="text-xs font-bold text-primary uppercase tracking-widest text-center">Transcrevendo áudio com Inteligência Artificial...</p>
                                </div>
                              ) : isRecording ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                                      {isPaused ? "GRAVAÇÃO PAUSADA" : "GRAVANDO"}
                                    </span>
                                    
                                    {/* Bouncing Audio Waveform Animation */}
                                    <div className="flex items-end gap-0.5 h-4 ml-1">
                                      {[...Array(6)].map((_, i) => (
                                        <div 
                                          key={i} 
                                          className="w-0.5 bg-primary rounded-full transition-all duration-300"
                                          style={{ 
                                            height: isPaused ? '4px' : '100%',
                                            animation: isPaused ? 'none' : `bounce 1s ease-in-out infinite alternate`,
                                            animationDelay: `${i * 0.15}s`
                                          }} 
                                        />
                                      ))}
                                    </div>
                                    <style>{`
                                      @keyframes bounce {
                                        0% { height: 4px; }
                                        100% { height: 16px; }
                                      }
                                    `}</style>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <span className="text-base font-bold text-text-main font-mono tracking-wider bg-surface-muted px-3 py-1 rounded-xl border border-white/5">
                                      {formatDuration(recordingDuration)}
                                    </span>

                                    <div className="flex items-center gap-2">
                                      {isPaused ? (
                                        <button
                                          onClick={resumeAudioRecording}
                                          className="p-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-xl transition-all border border-green-500/20"
                                          title="Retomar Gravação"
                                        >
                                          <Play size={16} />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={pauseAudioRecording}
                                          className="p-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 rounded-xl transition-all border border-yellow-500/20"
                                          title="Pausar Gravação"
                                        >
                                          <Pause size={16} />
                                        </button>
                                      )}

                                      <button
                                        onClick={stopAudioRecording}
                                        className="p-2.5 bg-primary text-white rounded-xl transition-all hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 px-4 font-bold text-xs uppercase tracking-widest"
                                        title="Parar e Transcrever"
                                      >
                                        <Square size={12} className="fill-white" />
                                        Concluir
                                      </button>

                                      <button
                                        onClick={cancelAudioRecording}
                                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-500 rounded-xl transition-all border border-red-500/10"
                                        title="Descartar Áudio"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                      <Mic size={20} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-text-main uppercase tracking-tight">Gravador de Relatos</p>
                                      <p className="text-[10px] text-text-muted">Grave o áudio da sessão e o SimplePsi transcreve automaticamente.</p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={startAudioRecording}
                                    className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
                                  >
                                    <Mic size={16} />
                                    Gravar Áudio
                                  </button>
                                </div>
                              )}
                            </div>

                            <textarea 
                              value={transcriptionText}
                              onChange={(e) => setTranscriptionText(e.target.value)}
                              placeholder="Fale no gravador acima ou cole a transcrição bruta do áudio aqui..."
                              className="w-full bg-surface-muted border border-border-ui rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary min-h-[120px] resize-none"
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
                        <h3 className="text-xl font-bold text-text-main">Resumo SimplePsi IA</h3>
                      </div>
                      <button 
                        onClick={handleGenerateAI}
                        disabled={isGeneratingAI}
                        className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2"
                      >
                        {isGeneratingAI ? "Analisando..." : "✨ Gerar Análise SimplePsi"}
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
  const [currentFinanceDate, setCurrentFinanceDate] = useState(new Date());
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
    const start = startOfWeek(currentFinanceDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentFinanceDate, { weekStartsOn: 0 });

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
      const isSelectedWeek = d >= start && d <= end;
      const isCurrentWeek = isSameDay(startOfWeek(new Date(), { weekStartsOn: 0 }), start);
      const isPastOrCurrent = d <= end;
      const isUnpaid = !s.paid;
      
      if (isCurrentWeek) {
        // Mostrar se for desta semana OU se for uma sessão pendente passada/atual.
        return isSelectedWeek || (isUnpaid && isPastOrCurrent);
      } else {
        // Se for outra semana, mostrar apenas as consultas dessa semana.
        return isSelectedWeek;
      }
    });

    list = list.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

    if (filter === 'paid') list = list.filter(s => s.paid);
    if (filter === 'pending') list = list.filter(s => !s.paid);
    
    return list;
  }, [sessions, patients, filter, currentFinanceDate]);

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
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/5">
          <h4 className="font-bold text-lg text-text-main uppercase tracking-widest">Controle de Atendimentos</h4>
          
          <div className="flex items-center gap-4 bg-surface-muted/50 p-2 rounded-2xl border border-white/5">
            <button 
              onClick={() => setCurrentFinanceDate(prev => subWeeks(prev, 1))}
              className="p-2 hover:bg-white/5 rounded-xl text-text-muted hover:text-text-main transition-colors"
              title="Semana Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold text-text-main uppercase tracking-wider font-mono">
              Semana: {format(startOfWeek(currentFinanceDate, { weekStartsOn: 0 }), 'dd/MM/yyyy')} - {format(endOfWeek(currentFinanceDate, { weekStartsOn: 0 }), 'dd/MM/yyyy')}
            </span>
            <button 
              onClick={() => setCurrentFinanceDate(prev => addWeeks(prev, 1))}
              className="p-2 hover:bg-white/5 rounded-xl text-text-muted hover:text-text-main transition-colors"
              title="Próxima Semana"
            >
              <ChevronRight size={20} />
            </button>
            {!isSameDay(startOfWeek(new Date(), { weekStartsOn: 0 }), startOfWeek(currentFinanceDate, { weekStartsOn: 0 })) && (
              <button 
                onClick={() => setCurrentFinanceDate(new Date())}
                className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30 transition-all ml-2"
              >
                Hoje
              </button>
            )}
          </div>

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
                          <p className="text-[10px] text-text-muted uppercase tracking-tighter">{session.type} • {p?.cpf || p?.document ? `CPF: ${p.cpf || p.document}` : 'SEM CPF'}</p>
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
                      <p className="text-[10px] text-text-muted uppercase tracking-tighter">{format(new Date(session.date + 'T12:00:00'), 'dd/MM/yyyy')} • {session.time} • {session.type} • {p?.cpf || p?.document ? `CPF: ${p.cpf || p.document}` : 'SEM CPF'}</p>
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

function CalendarView({ 
  sessions, 
  patients, 
  onAddSession, 
  onDeleteSession, 
  onTriageToPatient, 
  onUndo, 
  lastAction,
  isGoogleCalendarEnabled,
  googleAccessToken,
  onOpenSettings
}: { 
  sessions: any[], 
  patients: any[], 
  onAddSession: (data: any) => void,
  onDeleteSession: (id: string) => void,
  onTriageToPatient: (name: string, day: string, time: string) => void,
  onUndo?: () => void,
  lastAction?: any,
  isGoogleCalendarEnabled?: boolean,
  googleAccessToken?: string | null,
  onOpenSettings?: () => void
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
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-text-main">Agenda Mensal</h2>
            {isGoogleCalendarEnabled && googleAccessToken ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Google Sincronizado
              </span>
            ) : (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
                title="Configurar Google Agenda"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Google Desconectado
              </button>
            )}
          </div>
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
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-50 hidden md:inline">
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

function ProfileSettingsModal({ initialData, onClose, onSave, googleAccessToken, onConnectGoogleCalendar }: any) {
  const [formData, setFormData] = useState(initialData);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  useEffect(() => {
    const isAuthorized = auth.currentUser?.email === 'wellcoutinho99@gmail.com' || auth.currentUser?.email === 'juniorcoutinho58@gmail.com';
    if (isAdminPanelOpen && isAuthorized) {
      const q = query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tickets: any[] = [];
        snapshot.forEach((doc) => {
          tickets.push({ id: doc.id, ...doc.data() });
        });
        setAdminTickets(tickets);
      }, (err) => {
        console.error("Erro ao escutar tickets de suporte:", err);
      });
      return unsubscribe;
    }
  }, [isAdminPanelOpen]);

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
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Abordagem Clínica Principal</label>
            <select
              value={formData.clinicalApproach || 'tcc'}
              onChange={e => setFormData({...formData, clinicalApproach: e.target.value})}
              className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23888' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.25rem',
                backgroundRepeat: 'no-repeat',
                paddingRight: '2.5rem'
              }}
            >
              <option value="tcc" className="bg-background-dark">TCC (Terapia Cognitivo-Comportamental)</option>
              <option value="psicanalise" className="bg-background-dark">Psicanálise</option>
              <option value="gestalt" className="bg-background-dark">Gestalt-Terapia</option>
              <option value="humanista" className="bg-background-dark">Existencial / ACP (Centrada na Pessoa)</option>
              <option value="behaviorismo" className="bg-background-dark">Análise do Comportamento (Behaviorismo)</option>
              <option value="junguiana" className="bg-background-dark">Psicologia Analítica (Junguiana)</option>
              <option value="act" className="bg-background-dark">ACT (Terapia de Aceitação e Compromisso)</option>
              <option value="dbt" className="bg-background-dark">DBT (Terapia Dialética Comportamental)</option>
            </select>
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

          {/* Google Calendar Sync Panel */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-text-main uppercase tracking-tight">Sincronizar Google Agenda</p>
                <p className="text-[10px] text-text-muted">Espelhar consultas automaticamente em tempo real.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isGoogleCalendarEnabled} 
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setFormData({ ...formData, isGoogleCalendarEnabled: checked });
                  }}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-surface-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {formData.isGoogleCalendarEnabled && (
              <>
                <div className="glass-card p-3.5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${googleAccessToken ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-[10px] font-bold text-text-main uppercase tracking-wider">
                      {googleAccessToken ? 'CONECTADO' : 'NÃO CONECTADO'}
                    </span>
                  </div>
                  <button
                    onClick={onConnectGoogleCalendar}
                    type="button"
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    {googleAccessToken ? 'Reconectar' : 'Conectar Google'}
                  </button>
                </div>

                {!googleAccessToken && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-3.5 mt-2 space-y-2">
                    <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      Instruções de Segurança e Conexão
                    </p>
                    <p className="text-[9px] text-text-muted leading-relaxed">
                      Como o SimplePsi é uma plataforma privada de gestão clínica dedicada, o Google pode exibir uma tela com o aviso <strong className="text-text-main">"O Google não verificou este app"</strong>. Isso é absolutamente seguro e esperado para ferramentas customizadas.
                    </p>
                    <div className="text-[9px] text-text-muted leading-relaxed pl-2 border-l border-white/5 space-y-1">
                      <p>1. Na tela de aviso, clique em <strong className="text-text-main">"Avançado"</strong> (no canto inferior esquerdo).</p>
                      <p>2. Depois, clique em <strong className="text-text-main">"Acessar simplepsi (não seguro)"</strong> para autorizar a sincronização segura da sua agenda.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {(auth.currentUser?.email === 'wellcoutinho99@gmail.com' || auth.currentUser?.email === 'juniorcoutinho58@gmail.com') && (
            <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(true)}
                className="w-full py-3.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 font-mono"
              >
                💡 Painel de Sugestões SimplePsi
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={() => onSave(formData)} 
          className="w-full mt-8 bg-primary text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity font-mono uppercase text-xs"
        >
          Salvar Configurações
        </button>
      </motion.div>

      {/* Secret Suggestions Admin Modal */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-2xl max-h-[85vh] rounded-[32px] overflow-hidden shadow-2xl p-8 flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="text-left">
                  <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                    <span>💡</span> Central de Sugestões & Feedback
                  </h3>
                  <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider">
                    Tickets de suporte dos usuários em tempo real
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminPanelOpen(false)}
                  className="p-2 rounded-xl hover:bg-surface-muted transition-colors"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              {/* Tickets List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {adminTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted space-y-2">
                    <span className="text-2xl">🌱</span>
                    <p className="text-xs font-bold uppercase tracking-wider">Nenhuma sugestão ainda</p>
                    <p className="text-[10px] leading-relaxed max-w-xs">
                      Quando os psicólogos começarem a conversar com a IA de suporte, as conversas aparecerão aqui de forma instantânea.
                    </p>
                  </div>
                ) : (
                  adminTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-surface-muted border border-border-ui rounded-2xl p-5 hover:border-primary/30 transition-all space-y-3 relative group text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                            👤 {ticket.userName || 'Psicólogo'}
                          </h4>
                          <p className="text-[10px] text-text-muted font-mono">{ticket.userEmail}</p>
                        </div>
                        <span className="text-[9px] text-text-muted font-mono whitespace-nowrap bg-white/5 px-2.5 py-1 rounded-lg">
                          {new Date(ticket.updatedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {ticket.messages && ticket.messages.length > 0 && (
                        <p className="text-[10px] text-text-muted leading-relaxed line-clamp-2 bg-background/30 p-2.5 rounded-xl border border-white/5">
                          <span className="font-bold text-text-main uppercase text-[8px] tracking-widest block mb-0.5">Última Mensagem:</span>
                          {ticket.messages[ticket.messages.length - 1].content}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(ticket)}
                          className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          📖 Ver Conversa Completa
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja apagar esta sugestão de forma permanente?')) {
                              try {
                                await deleteDoc(doc(db, 'support_tickets', ticket.id));
                              } catch (err) {
                                console.error(err);
                                alert('Erro ao apagar ticket.');
                              }
                            }
                          }}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                          title="Apagar Ticket"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secret Ticket Conversation Detail overlay */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-lg max-h-[80vh] rounded-[32px] overflow-hidden shadow-2xl p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="text-left">
                  <h4 className="text-sm font-bold text-text-main">
                    Conversa com {selectedTicket.userName}
                  </h4>
                  <p className="text-[9px] text-text-muted font-mono">{selectedTicket.userEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 rounded-xl hover:bg-surface-muted transition-colors"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                {selectedTicket.messages && selectedTicket.messages.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${
                      m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[8px] text-text-muted uppercase tracking-wider font-mono mb-1 px-1">
                      {m.role === 'user' ? 'Psicólogo' : 'IA Assistente'}
                    </span>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed text-left ${
                        m.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-[#5F7D5C]/10 text-text-main border border-[#5F7D5C]/20 rounded-tl-none'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold hover:opacity-90 transition-opacity font-mono uppercase text-xs"
              >
                Voltar para a Lista
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CustomTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  skipProps,
  size
}: TooltipRenderProps) {
  const isLight = document.body.classList.contains('light');
  const bg = isLight ? '#ffffff' : 'rgba(20, 20, 29, 0.9)';
  const textColor = isLight ? 'text-slate-900' : 'text-slate-100';
  const mutedColor = isLight ? 'text-slate-500' : 'text-slate-400';
  const borderColor = isLight ? 'border-slate-200' : 'border-white/10';
  
  const getButtonText = () => {
    if (index === 0) return 'Começar o Tour 🚀';
    if (index === size - 1) return 'Concluir ✨';
    return 'Avançar ➡️';
  };

  return (
    <div 
      {...tooltipProps} 
      className={`max-w-sm md:max-w-md w-full rounded-[24px] p-6 shadow-2xl relative overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 border ${borderColor}`}
      style={{
        background: bg,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Decorative top border gradient line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
      
      {/* Step Progress Bubble */}
      <div className="flex items-center justify-between mb-4 mt-1">
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
          Passo {index + 1} de {size}
        </span>
        {index < size - 1 && (
          <button 
            {...skipProps}
            className="text-xs text-text-muted hover:text-text-main transition-colors uppercase tracking-wider font-bold"
          >
            Pular
          </button>
        )}
      </div>

      {/* Title */}
      {step.title && (
        <h3 className={`text-base font-bold ${textColor} mb-2 leading-tight flex items-center gap-2`}>
          {step.title}
        </h3>
      )}

      {/* Content */}
      <div className={`text-xs ${mutedColor} mb-6 leading-relaxed`}>
        {step.content}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        {/* Back Button */}
        {index > 0 ? (
          <button 
            {...backProps}
            className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main transition-colors uppercase tracking-wider flex items-center gap-1.5"
          >
            <ChevronLeft size={14} /> Voltar
          </button>
        ) : (
          <div />
        )}

        {/* Primary/Next/Finish Button */}
        <button 
          {...primaryProps}
          className="bg-primary text-white hover:opacity-90 px-5 py-2.5 rounded-xl text-xs font-bold font-mono uppercase transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}
