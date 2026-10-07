/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
  addDays,
  subWeeks
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleGenAI } from "@google/genai";

async function generateContentWithFallback(
  ai: any,
  options: {
    model?: string;
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
  ];
  
  const requestedModel = (options.model && !options.model.includes('2.5'))
    ? options.model
    : "gemini-3.8-flash";

  const modelQueue = [
    requestedModel,
    ...modelsToTry.filter(m => m !== requestedModel)
  ];

  let lastError: any = null;

  for (const model of modelQueue) {
    let attempts = 2;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`Trying Gemini with model: ${model} (attempt ${attempt}/${attempts})`);
        const response = await ai.models.generateContent({
          ...options,
          model: model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        console.warn(`Error on model ${model} (attempt ${attempt}):`, msg);
        
        const isTransient = 
          msg.includes('503') || 
          msg.includes('UNAVAILABLE') || 
          msg.includes('high demand') ||
          msg.includes('429') || 
          msg.includes('RESOURCE_EXHAUSTED') || 
          msg.includes('quota');

        if (isTransient && attempt < attempts) {
          const waitMs = msg.includes('429') ? 2000 : 500 * attempt;
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        break;
      }
    }
  }
  
  throw lastError;
}

function safeJsonParse(rawText: string): any {
  // Strip markdown code fences
  let sanitized = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  
  // Try to find the JSON boundary in case there's surrounding conversational text
  const firstBrace = sanitized.indexOf('{');
  const firstBracket = sanitized.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = sanitized.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = sanitized.lastIndexOf(']');
  }
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    sanitized = sanitized.slice(startIdx, endIdx + 1);
  }
  
  // State machine to escape raw control characters inside JSON string values
  let inString = false;
  let escaped = false;
  let cleaned = '';
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    
    if (inString) {
      if (char === '\n') {
        cleaned += '\\n';
      } else if (char === '\r') {
        cleaned += '\\r';
      } else if (char === '\t') {
        cleaned += '\\t';
      } else {
        cleaned += char;
      }
    } else {
      cleaned += char;
    }
    
    if (char === '\\' && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  return JSON.parse(cleaned);
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import { 
  LayoutDashboard, 
  Users, 
  Calendar as CalendarIcon, 
  CalendarDays,
  Clock,
  FileText, 
  DollarSign, 
  CreditCard,
  FolderOpen, 
  BarChart3, 
  Settings,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ChevronDown,
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
  MessageSquare,
  FileDown,
  Download,
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
  Video,
  Chrome,
  Copy,
  Check,
  X,
  ShieldCheck,
  Smile,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Upload,
  Building,
  GraduationCap,
  Phone,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, getWhatsAppLink, formatPatientFrequency, getPatientLastSessionInfo } from './lib/utils';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import PaywallScreen from './components/PaywallScreen';
import UpgradeModal from './components/UpgradeModal';
import AdminPanel from './components/AdminPanel';
import PatientPortalDashboard from './components/PatientPortalDashboard';
import PsychologistPatientPortalView from './components/PsychologistPatientPortalView';
import ClinicTeamModal from './components/ClinicTeamModal';
import ClinicDashboardView from './components/clinic/ClinicDashboardView';
import ClinicMasterAgendaView from './components/clinic/ClinicMasterAgendaView';
import ClinicSupervisionView from './components/clinic/ClinicSupervisionView';
import ClinicReceptionCrmView from './components/clinic/ClinicReceptionCrmView';
import ClinicFinanceView from './components/clinic/ClinicFinanceView';
import ClinicLoginPage from './components/clinic/ClinicLoginPage';
import { WhatsAppRemindersPanel } from './components/WhatsAppRemindersPanel';
import ContentIdeasModal from './components/ContentIdeasModal';
import { GoogleMeetExtensionModal, CHROME_EXTENSION_STORE_URL, TCLE_TEMPLATE_TEXT, TCLE_TEMPLATE_TEXT_PT } from './components/GoogleMeetExtensionModal';
const DataMigrationModal = React.lazy(() => 
  import('./components/DataMigrationModal').then(m => ({ default: m.DataMigrationModal }))
);
import { 
  Patient, 
  Session, 
  Transaction,
  AppNotification,
  PatientPortal,
  PdfLibraryItem,
  DiaryEntry,
  Clinic,
  ClinicMember,
  ClinicUserRole,
  ClinicCrmLead,
  SupervisionCase
} from './types';
import { 
  detectCurrentClinicSlug, 
  getClinicBySlug, 
  applyClinicTheme,
  getSimulatedClinicMember,
  setSimulatedClinicMember,
  getDemoClinicSessions,
  getClinicSessions,
  saveClinicSessions,
  addOrUpdateClinicSession,
  deleteClinicSession,
  DEFAULT_DEMO_MEMBERS,
  subscribeClinicMembers,
  saveClinicSupervisionCase
} from './lib/clinicService';
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
  getDoc,
  writeBatch,
  getDocs,
  deleteField
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
    rules: "Analise e estruture o caso sob a ótica da TCC, identificando e detalhando os pensamentos automáticos, emoções, distorções cognitivas, comportamentos (incluindo de segurança ou esquemas de enfrentamento) e, principalmente, as crenças centrais/nucleares, regras intermediárias e pressupostos trazidos direta ou indiretamente na fala do paciente.",
    pdfTopics: [
      "1. Demanda / Queixa do Dia",
      "2. Técnicas & Intervenções de TCC Aplicadas",
      "3. Distorções Cognitivas & Crenças Identificadas",
      "4. Plano de Ação / Tarefas Comportamentais"
    ],
    evolutionPrompt: "Analise a evolução clínica sob a ótica da Terapia Cognitivo-Comportamental. Identifique padrões de distorções cognitivas, crenças nucleares ativadas, o progresso na regulação emocional e adesão às tarefas terapêuticas de forma sóbria e equilibrada."
  },
  psicanalise: {
    name: "Psicanálise",
    rules: "Siga a escuta analítica (focando no material trazido, defesas sutis ou dinâmica subjetiva) de forma natural, leve e fluida. Evite forçar termos acadêmicos pesados; trate o processo com a sobriedade de um analista em sua rotina diária. NUNCA fale em 'tarefas de casa', 'reestruturação' ou 'metas'.",
    pdfTopics: [
      "1. Material Clínico Trazido (Livre Associação)",
      "2. Manejo Clínico & Intervenções da Escuta Analítica",
      "3. Dinâmica Inconsciente & Defesas Observadas",
      "4. Direcionamento e Apontamentos para Sessões Futuras"
    ],
    evolutionPrompt: "Analise o caso sob a ótica da Psicanálise de forma sóbria. Identifique padrões repetitivos de defesas do Ego, manifestações latentes do inconsciente na fala do paciente e dinâmicas de transferência estruturadas ao longo do tempo."
  },
  gestalt: {
    name: "Gestalt-Terapia",
    rules: "Siga a perspectiva fenomenológica (awareness, contato ou a queixa no aqui-e-agora) de forma orgânica e sutil. Evite carregar o relato com jargões técnicos desnecessários; mantenha o texto focado na vivência do cliente de forma fluida. NUNCA fale em 'tarefas' ou 'esquemas cognitivos'.",
    pdfTopics: [
      "1. Experiência Imediata / Queixa no Aqui-e-Agora",
      "2. Experimentos Gestálticos & Intervenções do Terapeuta",
      "3. Dinâmica da Fronteira de Contato & Bloqueios Observados",
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
      "2. Procedimentos Aplicados & Mudanças Contingenciais",
      "3. Análise Funcional (Tríplice Contingência)",
      "4. Reforçamentos Programados & Orientações Práticas"
    ],
    evolutionPrompt: "Analise a evolução clínica sob a ótica da Análise do Comportamento de forma objetiva. Identifique a estabilidade ou mudança na tríplice contingência e a eficácia dos reforçadores manejados de forma natural."
  },
  junguiana: {
    name: "Psicologia Analítica (Junguiana)",
    rules: "Trate as dinâmicas inconscientes e simbólicas de forma sutil, natural e equilibrada. Evite forçar termos arquetípicos pesados de forma artificial ou caricata; relate a vivência do paciente com fluidez e sobriedade.",
    pdfTopics: [
      "1. Material Simbólico / Demanda Trazida à Tona",
      "2. Amplificação de Símbolos & Intervenções Junguianas",
      "3. Dinâmica de Complexos Ativados & Projeções Identificadas",
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
    evolutionPrompt: "Analise o caso clínico sob a ótica da ACT de forma humana. Identifique os níveis de flexibilidade ou rigidez psicológica do client nos eixos do Hexaflex de maneira sutil e natural."
  },
  dbt: {
    name: "DBT (Terapia Dialética Comportamental)",
    rules: "Siga a dinâmica dialética (manejo de limites, validação emocional, regulação ou habilidades) de forma natural e sutil. Evite carregar o texto com terminologias de manual; relate a sessão com leveza, humanidade e fluidez.",
    pdfTopics: [
      "1. Comportamentos-Alvo Analisados (Análise em Cadeia)",
      "2. Equilíbrio Dialético (Manejo de Validação vs. Mudança)",
      "3. Habilidades DBT & Evolução Comportamental Observada",
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

// Safe LocalStorage helpers with memory fallback (prevent Safari Private Browsing SecurityError & QuotaExceededError)
const memoryStorage: Record<string, string> = {};

function safeGetStorage(key: string, fallback: string = ''): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = localStorage.getItem(key);
      if (val !== null && val !== undefined) return val;
    }
  } catch (e) {
    // Fallback to memory
  }
  return memoryStorage[key] ?? fallback;
}

function safeGetStorageJSON<T>(key: string, fallback: T): T {
  try {
    const raw = safeGetStorage(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    memoryStorage[key] = value;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    // Silently fall back to in-memory in Safari Private Mode
  }
}

function safeRemoveStorage(key: string): void {
  try {
    delete memoryStorage[key];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // Silently ignore in Safari Private Mode
  }
}

// Safe Date parser (robust against Safari ISO parsing, DD/MM/YYYY, undefined, etc.)
export function safeDateParse(dateInput: any, fallbackDate: Date = new Date()): Date {
  if (!dateInput) return fallbackDate;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? fallbackDate : dateInput;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return fallbackDate;
    
    // ISO string with T already (e.g. 2026-08-26T18:53:19.123Z)
    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? fallbackDate : d;
    }
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(`${trimmed}T12:00:00`);
      return isNaN(d.getTime()) ? fallbackDate : d;
    }
    // Format DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [dd, mm, yyyy] = trimmed.split('/');
      const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
      return isNaN(d.getTime()) ? fallbackDate : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? fallbackDate : d;
  }
  return fallbackDate;
}

const calculateIncomePrediction = (start: Date, end: Date, sessions: any[], patients: any[]) => {
  let predictedTotal = 0;
  
  // 1. Calculate from recorded non-cancelled sessions
  const recordedInRange = sessions.filter(s => {
    const d = safeDateParse(s.date);
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
        
        const pRecurrenceStart = safeDateParse(p.recurrenceStart || p.createdAt || p.birthDate, new Date('2024-01-01T12:00:00'));
        if (startOfDay(d) < startOfDay(pRecurrenceStart)) return;

        const hasRecorded = recordedInRange.some(s => s.patientId === p.id && isSameDay(safeDateParse(s.date), d));
        if (hasRecorded) return;

        const hasCancelled = sessions.some(s => s.patientId === p.id && s.status === 'Cancelada' && isSameDay(safeDateParse(s.date), d));
        if (hasCancelled) return;

        const weeksDiff = Math.abs(differenceInWeeks(startOfDay(d), startOfDay(pRecurrenceStart)));
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

/**
 * Resolves whether a logged-in user belongs to 'BR' (Brazil) or 'PT' (Portugal).
 * Guarantees that Brazilian users (especially Wellington and accounts with CRP / Pix / CPF) are NEVER mistakenly converted to PT.
 */
const resolveUserCountry = (data?: any, email?: string | null): 'BR' | 'PT' => {
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  // 1. Wellington & Administrators are unconditionally Brazilian
  if (cleanEmail === 'wellcoutinho99@gmail.com' || cleanEmail === 'juniorcoutinho58@gmail.com') {
    return 'BR';
  }

  // 2. Brazilian-specific credentials: CRP (Conselho Regional de Psicologia) or Brazilian Pix Key / CPF
  if (data?.crp && String(data.crp).trim().length > 0) {
    return 'BR';
  }
  if (data?.pixKey && String(data.pixKey).trim().length > 0) {
    return 'BR';
  }
  if (data?.cpfCnpj && String(data.cpfCnpj).trim().length > 0) {
    return 'BR';
  }

  // 3. Portugal-specific credentials: OPP (Ordem dos Psicólogos Portugueses) or MB WAY
  if (data?.opp && String(data.opp).trim().length > 0) {
    return 'PT';
  }
  if (data?.mbwayPhone && String(data.mbwayPhone).trim().length > 0) {
    return 'PT';
  }

  // 4. Stored country in Firestore profile
  if (data?.country === 'PT') {
    return 'PT';
  }
  if (data?.country === 'BR') {
    return 'BR';
  }

  // 5. Default fallback is always Brazil
  return 'BR';
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('simplepsi_privacy_mode') === 'true';
  });
  const [currentCountry, setCurrentCountry] = useState<'BR' | 'PT'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/pt') || window.location.search.includes('country=pt')) {
        return 'PT';
      }
      const saved = localStorage.getItem('simplepsi_country');
      if (saved === 'PT' || saved === 'BR') return saved as 'BR' | 'PT';
      const profCountry = localStorage.getItem('prof_country');
      if (profCountry === 'PT' || profCountry === 'BR') return profCountry as 'BR' | 'PT';
      const opp = localStorage.getItem('prof_opp');
      if (opp) return 'PT';
      const crp = localStorage.getItem('prof_crp');
      const pix = localStorage.getItem('prof_pix_key');
      if (crp || pix) return 'BR';
    }
    return 'BR';
  });
  // Monitor country routing strictly based on URL for unauthenticated visitors
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user || loading) return;

    const pathname = window.location.pathname;
    const isPtPath = pathname.startsWith('/pt') || window.location.search.includes('country=pt');

    if (isPtPath) {
      localStorage.setItem('simplepsi_country', 'PT');
      if (currentCountry !== 'PT') setCurrentCountry('PT');
    } else {
      localStorage.setItem('simplepsi_country', 'BR');
      if (currentCountry !== 'BR') setCurrentCountry('BR');
    }
  }, [currentCountry, user, loading]);

  // Guarantee that logged-in users are NEVER left on the /pt landing page URL
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/pt')) {
        window.history.replaceState({}, '', '/');
      }
    }
  }, [user]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalSelectedPlan, setAuthModalSelectedPlan] = useState<'consultorio' | 'ilimitado' | null>(null);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [checkoutSuccessPlan, setCheckoutSuccessPlan] = useState<'consultorio' | 'ilimitado' | null>(null);

  const handleOpenAuthModal = (plan?: 'consultorio' | 'ilimitado' | null, country?: 'BR' | 'PT') => {
    if (country) {
      setCurrentCountry(country);
      if (country === 'PT') {
        localStorage.setItem('simplepsi_country', 'PT');
      }
    }
    setAuthModalSelectedPlan(plan || null);
    setIsAuthModalOpen(true);
  };

  // Direct checkout listener when user chooses plan from landing page
  useEffect(() => {
    if (!user) return;
    const pendingPlan = localStorage.getItem('pending_checkout_plan');
    const pendingCountry = (localStorage.getItem('pending_checkout_country') || localStorage.getItem('simplepsi_country') || currentCountry) as 'BR' | 'PT';
    if (pendingPlan && (pendingPlan === 'consultorio' || pendingPlan === 'ilimitado')) {
      setIsRedirectingToStripe(true);
      (async () => {
        try {
          const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plan: pendingPlan,
              userId: user.uid,
              userEmail: user.email,
              returnOrigin: window.location.origin,
              country: pendingCountry,
            }),
          });
          const data = await response.json();
          if (data?.url) {
            localStorage.removeItem('pending_checkout_plan');
            localStorage.removeItem('pending_checkout_country');
            window.location.href = data.url;
            return;
          }
        } catch (err) {
          console.error("Erro ao redirecionar para checkout pendente:", err);
        }
        localStorage.removeItem('pending_checkout_plan');
        localStorage.removeItem('pending_checkout_country');
        setIsRedirectingToStripe(false);
      })();
    }
  }, [user]);

  // Direct listener when user returns from successful Stripe checkout
  useEffect(() => {
    if (!user) return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('checkout') === 'success') {
      const planParam = searchParams.get('plan') as 'consultorio' | 'ilimitado' | null;
      const finalPlan = (planParam === 'consultorio' || planParam === 'ilimitado') ? planParam : 'consultorio';

      setCheckoutSuccessPlan(finalPlan);

      // Instant profile upgrade
      const profileRef = doc(db, 'profiles', user.uid);
      updateDoc(profileRef, {
        isTrial: false,
        subscription: {
          status: 'active',
          plan: finalPlan,
          updatedAt: new Date().toISOString()
        }
      }).catch(err => console.warn('Erro ao atualizar perfil após checkout:', err));

      setProfileSettings(prev => ({
        ...prev,
        isTrial: false,
        subscription: {
          status: 'active',
          plan: finalPlan,
        }
      }));

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('simplepsi_privacy_mode', String(next));
      return next;
    });
  };

  // Listen for the special /import-transcript route
  useEffect(() => {
    if (window.location.pathname.includes('/import-transcript') || window.location.search.includes('goto=import-transcript')) {
      if (user) {
        setActiveTab('import-transcript');
        if (window.location.search.includes('goto=import-transcript')) {
          window.history.replaceState({}, '', '/import-transcript');
        }
      }
    }
  }, [user]);

  // ==========================================
  // ESTADOS DE MULTI-TENANT & CLÍNICA (B2B)
  // ==========================================
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);
  const [currentClinicMember, setCurrentClinicMember] = useState<ClinicMember | null>(null);
  const [clinicMembers, setClinicMembers] = useState<ClinicMember[]>(DEFAULT_DEMO_MEMBERS);
  const [clinicSessions, setClinicSessions] = useState<Session[]>(() => getDemoClinicSessions());
  const [isClinicTeamModalOpen, setIsClinicTeamModalOpen] = useState(false);
  const [isClinicRoleSwitcherOpen, setIsClinicRoleSwitcherOpen] = useState(false);
  const [isForceClinicLogin, setIsForceClinicLogin] = useState(false);

  useEffect(() => {
    const slug = detectCurrentClinicSlug();
    if (slug) {
      getClinicBySlug(slug).then((clinic) => {
        if (clinic) {
          setCurrentClinic(clinic);
          applyClinicTheme(clinic.theme);
          
          const savedMember = getSimulatedClinicMember(clinic.id);
          if (savedMember) {
            setCurrentClinicMember(savedMember);
          } else if (user?.email) {
            const found = DEFAULT_DEMO_MEMBERS.find(m => m.email.toLowerCase() === user.email?.toLowerCase());
            if (found) {
              setCurrentClinicMember(found);
            }
          }
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (!currentClinic?.id) return;
    const loadedSessions = getClinicSessions(currentClinic.id);
    setClinicSessions(loadedSessions);

    const unsub = subscribeClinicMembers(currentClinic.id, (loaded) => {
      setClinicMembers(loaded);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [currentClinic?.id]);

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
    name: safeGetStorage('prof_name'),
    crp: safeGetStorage('prof_crp'),
    logo: safeGetStorage('prof_logo'),
    isGoogleCalendarEnabled: safeGetStorage('prof_gcal_enabled') === 'true',
    clinicalApproach: safeGetStorage('prof_approach', 'tcc'),
    trialStartDate: safeGetStorage('prof_trial_start') || null,
    isTrial: safeGetStorage('prof_is_trial') === 'true',
    subscription: safeGetStorageJSON<any>('prof_subscription', null),
    tccAiUsage: safeGetStorageJSON<string[]>('prof_tcc_ai_usage', []),
    cpfCnpj: safeGetStorage('prof_cpf_cnpj'),
    address: safeGetStorage('prof_address'),
    phone: safeGetStorage('prof_phone'),
    signatureText: safeGetStorage('prof_signature_text'),
    pixKey: safeGetStorage('prof_pix_key'),
    pixType: safeGetStorage('prof_pix_type'),
    country: (() => {
      const crp = safeGetStorage('prof_crp');
      const pix = safeGetStorage('prof_pix_key');
      if (crp || pix) return 'BR';
      const opp = safeGetStorage('prof_opp');
      if (opp) return 'PT';
      const savedProf = safeGetStorage('prof_country');
      if (savedProf === 'PT' || savedProf === 'BR') return savedProf as 'BR' | 'PT';
      if (typeof window !== 'undefined') {
        if (window.location.pathname.startsWith('/pt') || window.location.search.includes('country=pt')) return 'PT';
      }
      const savedSimple = safeGetStorage('simplepsi_country');
      if (savedSimple === 'PT') return 'PT';
      return 'BR';
    })() as 'BR' | 'PT',
    opp: safeGetStorage('prof_opp'),
    nif: safeGetStorage('prof_nif'),
    mbwayPhone: safeGetStorage('prof_mbway_phone'),
    iban: safeGetStorage('prof_iban')
  });

  // Keep currentCountry in sync with profileSettings.country for logged-in users
  useEffect(() => {
    if (user && profileSettings?.country && currentCountry !== profileSettings.country) {
      setCurrentCountry(profileSettings.country);
    }
  }, [user, profileSettings?.country, currentCountry]);

  const isPT = user ? profileSettings.country === 'PT' : currentCountry === 'PT';

  const [isAuthorizedEmail, setIsAuthorizedEmail] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);
  const [isContentIdeasModalOpen, setIsContentIdeasModalOpen] = useState(false);

  const openUpgradeModalWithReason = (reason?: string) => {
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
  };

  const handleOpenRadar = () => {
    if (effectivePlan === 'ilimitado' || effectivePlan === 'lifetime' || user?.email?.toLowerCase().trim() === 'wellcoutinho99@gmail.com') {
      setIsContentIdeasModalOpen(true);
    } else {
      openUpgradeModalWithReason(
        'O Radar de Conteúdo para Redes Sociais gera pautas, ganchos e carrosséis com IA a partir dos eixos clínicos dos seus pacientes com 100% de sigilo ético. Este recurso é exclusivo do Plano Ilimitado!'
      );
    }
  };

  // Helper to calculate trial remaining days
  const trialRemainingDays = useMemo(() => {
    if (!profileSettings.trialStartDate) return 7;
    const start = safeDateParse(profileSettings.trialStartDate);
    const today = new Date();
    
    // Set times to midnight to calculate pure date differences
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = todayDateOnly.getTime() - startDateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return 7 - diffDays;
  }, [profileSettings.trialStartDate]);

  const isTrialExpired = useMemo(() => {
    // Se o usuário estiver no ambiente de uma clínica, não é bloqueado pelo trial solo
    if (currentClinic) return false;
    return profileSettings.isTrial && trialRemainingDays < 0;
  }, [profileSettings.isTrial, trialRemainingDays, currentClinic]);

  // Plano Efetivo do Usuário
  const effectivePlan = useMemo<'free' | 'consultorio' | 'ilimitado' | 'lifetime'>(() => {
    const email = user?.email?.toLowerCase().trim();
    // 1. Administrador ou E-mail com acesso permanente concedido
    if (email === 'wellcoutinho99@gmail.com' || email === 'acessoriavitrinni@gmail.com') return 'lifetime';
    if (isAuthorizedEmail) return 'lifetime';
    if (profileSettings?.subscription?.plan === 'lifetime') return 'lifetime';
    // Usuário legado sem trial ativo
    if (profileSettings?.isTrial === false && !profileSettings?.subscription?.plan) return 'lifetime';

    // 2. Assinatura Stripe Ativa
    const sub = profileSettings?.subscription;
    if (sub?.status === 'active') {
      if (sub.plan === 'ilimitado') return 'ilimitado';
      if (sub.plan === 'consultorio') return 'consultorio';
    }

    // 3. Período de Testes Inicial (7 dias de experiência ilimitada)
    if (profileSettings?.isTrial && trialRemainingDays >= 0) {
      return 'ilimitado';
    }

    // 4. Padrão: Plano Gratuito (Start)
    return 'free';
  }, [user, isAuthorizedEmail, profileSettings, trialRemainingDays]);

  // Validação e consumo de cota diária de IA (5 usos/dia para o plano Start)
  const checkAndConsumeDailyAiUsage = (): boolean => {
    if (effectivePlan === 'lifetime' || effectivePlan === 'ilimitado' || effectivePlan === 'consultorio') {
      return true;
    }

    const today = new Date().toISOString().split('T')[0];
    const storedUsage = safeGetStorageJSON<{ date: string; count: number }>('simplepsi_free_ai_usage', { date: today, count: 0 });
    let count = storedUsage.date === today ? storedUsage.count : 0;

    if (count >= 5) {
      openUpgradeModalWithReason('Você atingiu o limite de 5 usos diários de IA do plano Start (Gratuito). Faça o upgrade para ter inteligência artificial sem limites!');
      return false;
    }

    count += 1;
    safeSetStorage('simplepsi_free_ai_usage', JSON.stringify({ date: today, count }));
    return true;
  };
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => safeGetStorage('google_calendar_access_token') || null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [hasAcceptedExtensionTerms, setHasAcceptedExtensionTerms] = useState(() => safeGetStorage("simplepsi_meet_extension_consent") === "true");
  const [isExtensionBannerDismissed, setIsExtensionBannerDismissed] = useState(() => safeGetStorage("simplepsi_meet_banner_dismissed") === "true");
  const [isMigrationBannerDismissed, setIsMigrationBannerDismissed] = useState(() => safeGetStorage("simplepsi_migration_banner_dismissed") === "true");

  const isMigrationAllowed = useMemo(() => {
    const email = user?.email?.toLowerCase().trim();
    return email === 'wellcoutinho99@gmail.com' || email === 'cristyanlf@gmail.com' || email === 'viniciusfelix.psi@gmail.com';
  }, [user]);

  const [patients, setPatients] = useState<Patient[]>([]);

  // Limite máximo de pacientes pelo plano
  const maxPatientsAllowed = useMemo(() => {
    if (effectivePlan === 'lifetime' || effectivePlan === 'ilimitado') return Infinity;
    if (effectivePlan === 'consultorio') return 15;
    return 5; // Plano 'free' / 'start'
  }, [effectivePlan]);

  const isPatientLimitReached = useMemo(() => {
    if (maxPatientsAllowed === Infinity) return false;
    return (patients || []).length >= maxPatientsAllowed;
  }, [patients, maxPatientsAllowed]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [portalInitialPatientId, setPortalInitialPatientId] = useState<string | undefined>(undefined);
  const [portalInitialSubTab, setPortalInitialSubTab] = useState<'pdfs' | 'safety' | 'diary' | 'access' | undefined>(undefined);
  const [patientDocuments, setPatientDocuments] = useState<Record<string, any[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [triageInitialName, setTriageInitialName] = useState('');
  const [triageInitialDay, setTriageInitialDay] = useState('');
  const [triageInitialTime, setTriageInitialTime] = useState('');
  const [triageInitialSessionId, setTriageInitialSessionId] = useState('');
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
          'acessoriavitrinni@gmail.com',
          'wellcoutinho99@gmail.com',
          'cristyanlf@gmail.com',
          'viniciusfelix.psi@gmail.com',
          'simplepsi.app@gmail.com'
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

          // 2. Check if email document exists in Firestore 'authorized_emails'
          const docRef = doc(db, 'authorized_emails', userEmail);
          const docSnap = await getDoc(docRef);
          const isAuthorized = docSnap.exists() && docSnap.data().active !== false;

          if (isAuthorized) {
            // Paid User
            if (!profileSnap.exists()) {
              // Create paid profile
              const newProfile = {
                name: user.displayName || '',
                email: userEmail,
                createdAt: new Date().toISOString(),
                isTrial: false,
                clinicalApproach: 'tcc',
                isGoogleCalendarEnabled: false
              };
              await setDoc(profileRef, newProfile);
              setProfileSettings(prev => ({
                ...prev,
                ...newProfile,
                trialStartDate: null
              }));
            } else if (profileSnap.data().isTrial) {
              // Convert trial user to paid user
              await updateDoc(profileRef, { isTrial: false });
              setProfileSettings(prev => ({
                ...prev,
                isTrial: false
              }));
            } else {
              // Paid user already has profile
              const data = profileSnap.data();
              const resolvedCountry = resolveUserCountry(data, user.email);
              if (data.country !== resolvedCountry) {
                updateDoc(profileRef, { country: resolvedCountry }).catch(console.error);
              }
              setProfileSettings(prev => ({
                ...prev,
                name: data.name || '',
                crp: data.crp || '',
                logo: data.logo || '',
                isGoogleCalendarEnabled: data.isGoogleCalendarEnabled || false,
                clinicalApproach: data.clinicalApproach || 'tcc',
                trialStartDate: data.trialStartDate || null,
                isTrial: false,
                subscription: data.subscription || null,
                tccAiUsage: data.tccAiUsage || [],
                cpfCnpj: data.cpfCnpj || '',
                address: data.address || '',
                phone: data.phone || '',
                signatureText: data.signatureText || '',
                pixKey: data.pixKey || '',
                pixType: data.pixType || '',
                pixName: data.pixName || '',
                country: resolvedCountry,
                opp: data.opp || '',
                nif: data.nif || '',
                mbwayPhone: data.mbwayPhone || '',
                iban: data.iban || ''
              }));
              safeSetStorage('prof_country', resolvedCountry);
              if (resolvedCountry === 'BR') {
                safeSetStorage('simplepsi_country', 'BR');
                setCurrentCountry('BR');
                if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pt')) {
                  window.history.replaceState({}, '', '/');
                }
              } else {
                safeSetStorage('simplepsi_country', 'PT');
                setCurrentCountry('PT');
              }
            }
            setUser(user);
            setAuthError(null);
          } else {
            // Unpaid User (No email document in authorized_emails)
            if (profileSnap.exists()) {
              // User already has a profile.
              // If it's a trial, we allow them in (checked for expiration in the UI).
              // If it's not a trial, they are a legacy authorized user, we let them in.
              const data = profileSnap.data();
              const resolvedCountry = resolveUserCountry(data, user.email);
              if (data.country !== resolvedCountry) {
                updateDoc(profileRef, { country: resolvedCountry }).catch(console.error);
              }
              setProfileSettings(prev => ({
                ...prev,
                name: data.name || '',
                crp: data.crp || '',
                logo: data.logo || '',
                isGoogleCalendarEnabled: data.isGoogleCalendarEnabled || false,
                clinicalApproach: data.clinicalApproach || 'tcc',
                trialStartDate: data.trialStartDate || null,
                isTrial: data.isTrial || false,
                subscription: data.subscription || null,
                tccAiUsage: data.tccAiUsage || [],
                cpfCnpj: data.cpfCnpj || '',
                address: data.address || '',
                phone: data.phone || '',
                signatureText: data.signatureText || '',
                pixKey: data.pixKey || '',
                pixType: data.pixType || '',
                pixName: data.pixName || '',
                country: resolvedCountry,
                opp: data.opp || '',
                nif: data.nif || '',
                mbwayPhone: data.mbwayPhone || '',
                iban: data.iban || ''
              }));
              safeSetStorage('prof_country', resolvedCountry);
              if (resolvedCountry === 'BR') {
                safeSetStorage('simplepsi_country', 'BR');
                setCurrentCountry('BR');
                if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pt')) {
                  window.history.replaceState({}, '', '/');
                }
              } else {
                safeSetStorage('simplepsi_country', 'PT');
                setCurrentCountry('PT');
              }
              setUser(user);
              setAuthError(null);
            } else {
              // New user signing up for the first time without purchase -> Give them the 7-day trial!
              const resolvedNewCountry = (localStorage.getItem('pending_checkout_country') === 'PT' ? 'PT' : 'BR') as 'BR' | 'PT';
              const newProfile = {
                name: user.displayName || '',
                email: userEmail,
                createdAt: new Date().toISOString(),
                trialStartDate: new Date().toISOString(),
                isTrial: true,
                clinicalApproach: 'tcc',
                isGoogleCalendarEnabled: false,
                tccAiUsage: [],
                country: resolvedNewCountry
              };
              await setDoc(profileRef, newProfile);
              setProfileSettings(prev => ({
                ...prev,
                ...newProfile
              }));
              setUser(user);
              setAuthError(null);
            }
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
      setDiaryEntries([]);
      return;
    }

    // Profile Settings Listener
    const unsubProfile = onSnapshot(doc(db, 'profiles', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const resolvedCountry = resolveUserCountry(data, user.email);

        // Auto-heal profile doc in Firestore if it was incorrectly marked as PT
        if (data.country !== resolvedCountry) {
          updateDoc(doc(db, 'profiles', user.uid), { country: resolvedCountry }).catch(console.error);
        }

        setProfileSettings({
          name: data.name || '',
          crp: data.crp || '',
          logo: data.logo || '',
          isGoogleCalendarEnabled: data.isGoogleCalendarEnabled || false,
          clinicalApproach: data.clinicalApproach || 'tcc',
          trialStartDate: data.trialStartDate || null,
          isTrial: data.isTrial || false,
          subscription: data.subscription || null,
          tccAiUsage: data.tccAiUsage || [],
          cpfCnpj: data.cpfCnpj || '',
          address: data.address || '',
          phone: data.phone || '',
          signatureText: data.signatureText || '',
          pixKey: data.pixKey || '',
          pixType: data.pixType || '',
          pixName: data.pixName || '',
          country: resolvedCountry,
          opp: data.opp || '',
          nif: data.nif || '',
          mbwayPhone: data.mbwayPhone || '',
          iban: data.iban || ''
        });
        // Also update storage as backup/cache
        safeSetStorage('prof_name', data.name || '');
        safeSetStorage('prof_crp', data.crp || '');
        safeSetStorage('prof_logo', data.logo || '');
        safeSetStorage('prof_gcal_enabled', data.isGoogleCalendarEnabled ? 'true' : 'false');
        safeSetStorage('prof_approach', data.clinicalApproach || 'tcc');
        safeSetStorage('prof_trial_start', data.trialStartDate || '');
        safeSetStorage('prof_is_trial', data.isTrial ? 'true' : 'false');
        safeSetStorage('prof_subscription', JSON.stringify(data.subscription || null));
        safeSetStorage('prof_tcc_ai_usage', JSON.stringify(data.tccAiUsage || []));
        safeSetStorage('prof_cpf_cnpj', data.cpfCnpj || '');
        safeSetStorage('prof_address', data.address || '');
        safeSetStorage('prof_phone', data.phone || '');
        safeSetStorage('prof_signature_text', data.signatureText || '');
        safeSetStorage('prof_pix_key', data.pixKey || '');
        safeSetStorage('prof_pix_type', data.pixType || '');
        safeSetStorage('prof_pix_name', data.pixName || '');
        safeSetStorage('prof_country', resolvedCountry);
        if (resolvedCountry === 'BR') {
          safeSetStorage('simplepsi_country', 'BR');
          setCurrentCountry('BR');
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pt')) {
            window.history.replaceState({}, '', '/');
          }
        } else {
          safeSetStorage('simplepsi_country', 'PT');
          setCurrentCountry('PT');
        }
        if (data.opp) safeSetStorage('prof_opp', data.opp);
        if (data.nif) safeSetStorage('prof_nif', data.nif);
        if (data.mbwayPhone) safeSetStorage('prof_mbway_phone', data.mbwayPhone);
        if (data.iban) safeSetStorage('prof_iban', data.iban);
      }
    });

    // Authorized Email Real-time Listener (Automatically upgrades user to vitalício when payment occurs)
    const userEmail = user.email ? user.email.toLowerCase().trim() : '';
    const unsubAuthEmail = onSnapshot(doc(db, 'authorized_emails', userEmail), async (snapshot) => {
      const isAuth = snapshot.exists() && snapshot.data().active !== false;
      setIsAuthorizedEmail(isAuth);
      if (isAuth) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists() && profileSnap.data().isTrial) {
            await updateDoc(profileRef, { isTrial: false });
          }
        } catch (e) {
          console.error("Erro ao converter perfil de trial:", e);
        }
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

    const qDiary = query(collection(db, 'diary_entries'), where('ownerId', '==', user.uid));
    const unsubDiary = onSnapshot(qDiary, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DiaryEntry));
      data.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setDiaryEntries(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diary_entries'));

    return () => {
      unsubProfile();
      unsubPatients();
      unsubSessions();
      unsubTransactions();
      unsubDiary();
      unsubAuthEmail();
    };
  }, [user]);

  // Robô de Lembretes Automático: Multi-layer fail-safe
  // Garante que, independentemente de crons externos da nuvem, o próprio app verifica e dispara
  // lembretes pendentes automaticamente ao carregar, a cada 10 min e ao reativar a aba.
  useEffect(() => {
    if (!user) return;

    const runSilentCronSync = async () => {
      try {
        const lastSyncKey = 'simplepsi_last_reminder_cron_sync';
        const lastSync = localStorage.getItem(lastSyncKey);
        const now = Date.now();
        // Cooldown de 10 minutos para não repetir requisições no mesmo minuto
        if (lastSync && now - parseInt(lastSync, 10) < 10 * 60 * 1000) {
          return;
        }
        localStorage.setItem(lastSyncKey, now.toString());
        await fetch('/api/cron-reminders', { method: 'POST' });
      } catch (err) {
        // Falhas silenciosas de rede não afetam o fluxo da aplicação
      }
    };

    // 1. Executa 3 segundos após carregar
    const initTimer = setTimeout(runSilentCronSync, 3000);
    // 2. Executa a cada 10 minutos com o app aberto
    const interval = setInterval(runSilentCronSync, 10 * 60 * 1000);

    // 3. Executa imediatamente quando o profissional retornar à aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSilentCronSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Auto-garantir documentos do portal e sincronizar dados bidirecionalmente em tempo real
  useEffect(() => {
    if (!user || patients.length === 0) return;

    const qPortals = query(collection(db, 'patient_portal'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(qPortals, async (snapshot) => {
      try {
        const existingPortals = new Map(snapshot.docs.map(d => [d.id, d.data() as PatientPortal]));

        for (const p of patients) {
          if (p.status !== 'Inativo') {
            const portalData = existingPortals.get(p.id);
            const cleanCpf = (p.cpf || p.document || '').replace(/\D/g, '');

            if (!portalData) {
              await setDoc(doc(db, 'patient_portal', p.id), {
                patientId: p.id,
                ownerId: user.uid,
                cpf: cleanCpf,
                patientUid: null,
                tutorialCompleted: false,
                name: p.name.toUpperCase(),
                phone: p.phone || '',
                email: p.email || '',
                birthDate: p.birthDate || '',
                gender: p.gender || '',
                profession: p.profession || p.occupation || '',
                address: p.address || '',
                emergencyName: '',
                emergencyRelation: '',
                emergencyPhone: '',
                sharedPDFs: [],
                contractSigned: p.contractSigned || false,
                contractSignedAt: p.contractSignedAt || null,
                contractSignature: p.contractSignature || null,
                contractSignedBy: p.contractSignedBy || '',
                contractSignedDocument: p.contractSignedDocument || '',
                contractSignedText: p.contractSignedText || '',
                contractManualOverride: p.contractManualOverride || false,
                contractManualNotes: p.contractManualNotes || '',
                pixKey: profileSettings.pixKey || '',
                pixType: profileSettings.pixType || '',
                pixName: profileSettings.pixName || profileSettings.name || '',
                updatedAt: new Date().toISOString()
              });
              console.log(`Auto-created missing portal doc for patient ${p.name}`);
            } else {
              // 1. Sincronizar campos do paciente e do psicólogo para o portal
              const portalUpdates: any = {};
              if (!portalData.cpf && cleanCpf) portalUpdates.cpf = cleanCpf;
              if (!portalData.birthDate && p.birthDate) portalUpdates.birthDate = p.birthDate;
              if (!portalData.gender && p.gender) portalUpdates.gender = p.gender;
              if (!portalData.profession && (p.profession || p.occupation)) portalUpdates.profession = p.profession || p.occupation;
              if (!portalData.address && p.address) portalUpdates.address = p.address;
              if (!portalData.phone && p.phone) portalUpdates.phone = p.phone;
              if (!portalData.email && p.email) portalUpdates.email = p.email;
              if (profileSettings.pixKey && portalData.pixKey !== profileSettings.pixKey) portalUpdates.pixKey = profileSettings.pixKey;
              if (profileSettings.pixType && portalData.pixType !== profileSettings.pixType) portalUpdates.pixType = profileSettings.pixType;
              if (profileSettings.pixName && portalData.pixName !== profileSettings.pixName) portalUpdates.pixName = profileSettings.pixName;

              if (Object.keys(portalUpdates).length > 0) {
                portalUpdates.updatedAt = new Date().toISOString();
                await updateDoc(doc(db, 'patient_portal', p.id), portalUpdates);
                console.log(`Synced fields for patient portal ${p.name}:`, Object.keys(portalUpdates));
              }

              // 2. Sincronizar campos do portal para o paciente (caso estejam no portal mas não no paciente)
              const patientUpdates: any = {};
              if (portalData.birthDate && portalData.birthDate !== p.birthDate) {
                patientUpdates.birthDate = portalData.birthDate;
              }
              if (portalData.gender && portalData.gender !== p.gender) {
                patientUpdates.gender = portalData.gender;
              }
              const pProfession = p.profession || p.occupation || '';
              if (portalData.profession && portalData.profession !== pProfession) {
                patientUpdates.profession = portalData.profession;
              }
              if (portalData.address && portalData.address !== p.address) {
                patientUpdates.address = portalData.address;
              }
              if (portalData.emergencyName && portalData.emergencyName !== p.emergencyName) {
                patientUpdates.emergencyName = portalData.emergencyName;
              }
              if (portalData.emergencyRelation && portalData.emergencyRelation !== p.emergencyRelation) {
                patientUpdates.emergencyRelation = portalData.emergencyRelation;
              }
              if (portalData.emergencyPhone && portalData.emergencyPhone !== p.emergencyPhone) {
                patientUpdates.emergencyPhone = portalData.emergencyPhone;
              }

              if (Object.keys(patientUpdates).length > 0) {
                patientUpdates.updatedAt = new Date().toISOString();
                await updateDoc(doc(db, 'patients', p.id), patientUpdates);
                console.log(`Synced fields from portal to patient ${p.name}:`, Object.keys(patientUpdates));
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar documentos do portal:", err);
      }
    });

    return () => unsubscribe();
  }, [user, patients]);

  // Notification generation removed as requested

  const handleUploadDocument = (patientId: string, file: File, category: 'prontuario' | 'anexo' = 'anexo') => {
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type && file.type.includes('/') ? file.type.split('/')[1].toUpperCase() : 'PDF',
      size: (file.size / 1024).toFixed(1) + ' KB',
      date: new Date().toLocaleDateString('pt-BR'),
      url: URL.createObjectURL(file),
      category: category,
      createdAt: new Date().toISOString()
    };

    setPatientDocuments(prev => ({
      ...prev,
      [patientId]: [newDoc, ...(prev[patientId] || [])]
    }));
    return Promise.resolve();
  };

  const handleDeleteDocument = (patientId: string, docId: string) => {
    setPatientDocuments(prev => ({
      ...prev,
      [patientId]: (prev[patientId] || []).filter(d => d.id !== docId)
    }));
    return Promise.resolve();
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
      const isTourCompleted = safeGetStorage('simplepsi_tour_completed') === 'true';
      if (isTourCompleted) return;

      const isProfileEmpty = !profileSettings?.name && !profileSettings?.crp && !profileSettings?.opp;
      if (isProfileEmpty) {
        const timer = setTimeout(() => {
          setRunTour(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user, profileSettings]);
  const hasRunSilentSync = useRef(false);

  useEffect(() => {
    if (user && profileSettings.isGoogleCalendarEnabled && patients.length > 0 && !hasRunSilentSync.current) {
      const token = safeGetStorage('google_calendar_access_token');
      const expiresAtStr = safeGetStorage('google_calendar_expires_at');
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr) : 0;
      const now = new Date().getTime();

      // Se temos o token e ele ainda está válido por pelo menos 2 minutos, sincronizamos silenciosamente
      if (token && now < expiresAt - 2 * 60 * 1000) {
        hasRunSilentSync.current = true;
        console.log("Iniciando sincronização silenciosa no carregamento do app...");
        const timer = setTimeout(() => {
          syncAllFutureSessionsToGoogle(token, true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profileSettings.isGoogleCalendarEnabled, patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  // Product Tour steps configuration
  const tourSteps: Step[] = useMemo(() => {
    if (isPT) {
      return [
        {
          target: 'body',
          placement: 'center',
          title: 'Boas-vindas ao SimplePsi! 🇵🇹',
          content: (
            <div className="space-y-3">
              <p>Seja muito bem-vindo(a)! O SimplePsi foi desenvolvido para tornar a gestão do seu consultório de psicologia simples, rápida e inteligente.</p>
              <p className="font-bold text-primary">Deseja realizar uma breve visita guiada de 1 minuto para conhecer as principais funcionalidades?</p>
            </div>
          )
        },
        {
          target: '#profile-settings-button',
          placement: 'bottom',
          title: 'Definições do Perfil e Cédula OPP 🪪',
          content: (
            <div className="space-y-2">
              <p>O primeiro passo é clicar aqui para preencher o seu <strong className="font-bold text-text-main">Nome</strong> e a sua <strong className="font-bold text-text-main">Cédula Profissional OPP</strong>.</p>
              <p className="text-xs text-text-muted">Estes dados são essenciais para assinar digitalmente e emitir automaticamente os processos clínicos, declarações e relatórios em PDF dos seus utentes de acordo com as normas da OPP e RGPD!</p>
            </div>
          )
        },
        {
          target: '#nav-pacientes',
          placement: 'right',
          title: 'Os seus Utentes 👥',
          content: (
            <div className="space-y-2">
              <p>No separador <strong className="font-bold text-text-main">Utentes</strong>, realiza a gestão integral de quem acompanha em consulta.</p>
              <p className="text-xs text-text-muted">Aqui pode registar novos utentes, gerir contactos, consultar o histórico de sessões e manter os processos clínicos sempre organizados.</p>
            </div>
          )
        },
        {
          target: '#nav-prontuarios',
          placement: 'right',
          title: '✨ IA & Processos Clínicos Inteligentes',
          content: (
            <div className="space-y-2">
              <p>Deixe de despender horas a redigir notas após cada consulta! Neste separador, a nossa <strong className="font-bold text-text-main">Inteligência Artificial Clínica</strong> estrutura os registos automaticamente.</p>
              <p className="text-xs text-text-muted">Basta ditar ou colar a transcrição bruta da sessão. A IA resume, anonimiza nomes de terceiros (garantindo sigilo rigoroso) e arquiva a evolução diretamente na pasta de <strong className="font-bold text-text-main">Documentos</strong> do utente.</p>
            </div>
          )
        },
        {
          target: '#nav-financeiro',
          placement: 'right',
          title: 'Gestão Financeira & Faturação 💰',
          content: (
            <div className="space-y-2">
              <p>Controle os rendimentos do seu consultório sem preocupações.</p>
              <p className="text-xs text-text-muted">Acompanhe consultas liquidadas, pagamentos pendentes, faturação mensal e métodos de recebimento (MB WAY / Transferência) de forma intuitiva.</p>
            </div>
          )
        },
        {
          target: 'body',
          placement: 'center',
          title: '📲 SimplePsi no seu Telemóvel!',
          content: (
            <div className="space-y-3">
              <p className="text-sm">Sabia que pode guardar o SimplePsi no ecrã principal do seu telemóvel para aceder diretamente como uma aplicação nativa?</p>
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 text-[11px] space-y-2 text-left">
                <p>🍏 <strong className="font-bold text-text-main">No iPhone (iOS)</strong>: Aceda através do <strong className="font-bold text-text-main">Safari</strong>, prima o ícone de <strong className="font-bold text-text-main">Partilhar</strong> (quadrado com seta a apontar para cima) e selecione <strong className="font-bold text-text-main">Adicionar ao Ecrã Principal</strong>.</p>
                <p>🤖 <strong className="font-bold text-text-main">No Android</strong>: Aceda no <strong className="font-bold text-text-main">Chrome</strong>, prima os <strong className="font-bold text-text-main">três pontos</strong> no canto superior direito e escolha <strong className="font-bold text-text-main">Instalar aplicação</strong> ou <strong className="font-bold text-text-main">Adicionar ao ecrã inicial</strong>.</p>
              </div>
              <p className="text-xs font-bold text-accent">Muito mais comodidade e agilidade para o seu quotidiano clínico!</p>
            </div>
          )
        }
      ];
    }

    return [
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
            <p>Monitore a saúde do seu consultório sem estresse.</p>
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
    ];
  }, [isPT]);

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
      safeSetStorage('simplepsi_tour_completed', 'true');
      setIsMobileMenuOpen(false);
    }
  };

  const handleAddPatient = async (data: any) => {
    if (!user) return;
    if (isPatientLimitReached) {
      openUpgradeModalWithReason(
        isPT
          ? (effectivePlan === 'consultorio' 
              ? 'Atingiu o limite de 15 utentes do plano Consultório. Atualize para o plano Ilimitado!' 
              : 'Atingiu o limite de 5 utentes do plano Start (Gratuito). Atualize para registar novos utentes!')
          : (effectivePlan === 'consultorio' 
              ? 'Você atingiu o limite de 15 pacientes do plano Consultório. Faça o upgrade para o plano Ilimitado!' 
              : 'Você atingiu o limite de 5 pacientes do plano Start (Gratuito). Faça o upgrade para cadastrar novos pacientes!')
      );
      return;
    }
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
        nif: data.document || '',
        occupation: data.occupation || '',
        profession: data.occupation || '',
        address: data.address || '',
        medication: data.medication || '',
        emergencyContact: data.emergencyContact || '',
        sessionDay: data.sessionDay || '',
        sessionTime: data.nextSessionTime || '',
        sessions: data.isNewPatient ? 0 : (data.sessions || 0),
        status: 'Ativo',
        lastSession: formatPatientFrequency(data),
        photo: '',
        amount: parseFloat(data.amount) || 0,
        recurrence: data.recurrence || 'Semanal',
        recurrenceStart: data.firstSessionDate || new Date().toISOString().split('T')[0],
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

      if (currentClinic) {
        const assignedPsy = clinicMembers.find(m => m.id === data.psychologistId || m.email === data.psychologistId) || currentClinicMember;
        patientData.clinicId = currentClinic.id;
        patientData.psychologistId = data.psychologistId || currentClinicMember?.email || '';
        patientData.psychologistName = assignedPsy?.name || data.psychologistId || '';
      }

      const patientRef = await addDoc(collection(db, 'patients'), patientData);
      const newPatientId = patientRef.id;

      // 1.1. Criar espelho na coleção patient_portal para acesso do paciente
      const cleanCpf = (data.document || '').replace(/\D/g, '');
      await setDoc(doc(db, 'patient_portal', newPatientId), {
        patientId: newPatientId,
        ownerId: user.uid,
        cpf: cleanCpf,
        nif: cleanCpf,
        patientUid: null,
        tutorialCompleted: false,
        name: data.name.toUpperCase(),
        phone: data.phone || '',
        email: data.email || '',
        birthDate: data.birthDate || '',
        gender: data.gender || '',
        profession: data.occupation || '',
        address: data.address || '',
        emergencyName: '',
        emergencyRelation: '',
        emergencyPhone: '',
        sharedPDFs: [],
        updatedAt: new Date().toISOString()
      });

      // 2. Adicionar/Atualizar Sessão inicial
      if (triageInitialSessionId) {
        const triageSessionRef = doc(db, 'sessions', triageInitialSessionId);
        await updateDoc(triageSessionRef, {
          patientId: newPatientId,
          isTriage: false,
          triageName: '',
          date: data.firstSessionDate || new Date().toISOString().split('T')[0],
          time: data.nextSessionTime || '09:00',
          type: data.modality || 'Online',
          status: 'Agendada',
          amount: parseFloat(data.amount) || 0,
          updatedAt: new Date().toISOString()
        });

        // Google Agenda Sync
        const updatedTriageSession = {
          id: triageInitialSessionId,
          patientId: newPatientId,
          date: data.firstSessionDate || new Date().toISOString().split('T')[0],
          time: data.nextSessionTime || '09:00',
          duration: '50min',
          type: data.modality || 'Online',
          status: 'Agendada',
          amount: parseFloat(data.amount) || 0,
          cost: 0,
          paid: false,
          nfIssued: false
        };
        await syncSessionToGoogleCalendar(updatedTriageSession, triageInitialSessionId);

        setTriageInitialSessionId(''); // Reset state
      } else if (data.sessionDay) {
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

  const handlePromoteLeadToPatient = async (
    lead: ClinicCrmLead,
    targetPsychologistEmail: string,
    sessionDate?: string,
    sessionTime?: string
  ) => {
    if (!user) return;
    try {
      const assignedPsy = clinicMembers.find(m => m.email === targetPsychologistEmail || m.id === targetPsychologistEmail) || currentClinicMember;

      let sessionDayName = '';
      if (sessionDate) {
        try {
          const parsed = new Date(sessionDate + 'T12:00:00');
          const dName = format(parsed, 'eeee', { locale: ptBR });
          sessionDayName = dName.charAt(0).toUpperCase() + dName.slice(1);
        } catch (e) {}
      }

      const patientData: any = {
        name: lead.name.toUpperCase(),
        email: lead.email || '',
        phone: lead.phone,
        gender: '',
        birthDate: '',
        document: '',
        cpf: '',
        occupation: '',
        profession: '',
        address: '',
        medication: '',
        emergencyContact: '',
        sessionDay: sessionDayName,
        sessionTime: sessionTime || lead.scheduledTime || '14:00',
        sessions: 0,
        status: 'Ativo',
        lastSession: formatPatientFrequency({ recurrence: 'Semanal', sessionDay: sessionDayName, sessionTime: sessionTime }),
        photo: '',
        amount: lead.amount || 180,
        recurrence: 'Semanal',
        recurrenceStart: sessionDate || lead.scheduledDate || new Date().toISOString().split('T')[0],
        modality: lead.sessionRoom?.includes('Online') ? 'Online' : 'Presencial',
        meetingLink: '',
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clinicalData: {
          anamnese: { 
            queixa: lead.complaint || '', 
            historico: lead.notes ? `Anotações da Recepção / CRM: ${lead.notes}` : '', 
            exame: '' 
          },
          evoluções: [],
          smartNotes: { padroes: '', progresso: '', sugestao: '', topicos: [] }
        }
      };

      if (currentClinic) {
        patientData.clinicId = currentClinic.id;
        patientData.psychologistId = targetPsychologistEmail || currentClinicMember?.email || '';
        patientData.psychologistName = assignedPsy?.name || targetPsychologistEmail || '';
      }

      const patientRef = await addDoc(collection(db, 'patients'), patientData);
      const newPatientId = patientRef.id;

      // Cria espelho no patient_portal
      await setDoc(doc(db, 'patient_portal', newPatientId), {
        patientId: newPatientId,
        ownerId: user.uid,
        cpf: '',
        patientUid: null,
        tutorialCompleted: false,
        name: lead.name.toUpperCase(),
        phone: lead.phone || '',
        email: lead.email || '',
        birthDate: '',
        gender: '',
        profession: '',
        address: '',
        emergencyName: '',
        emergencyRelation: '',
        emergencyPhone: '',
        sharedPDFs: [],
        updatedAt: new Date().toISOString()
      });

      // Se houver data agendada, cria a 1ª sessão
      const targetDate = sessionDate || lead.scheduledDate;
      const targetTime = sessionTime || lead.scheduledTime || '14:00';
      if (targetDate) {
        const sessionData: any = {
          patientId: newPatientId,
          isTriage: false,
          triageName: '',
          date: targetDate,
          time: targetTime,
          duration: '50min',
          type: lead.sessionRoom?.includes('Online') ? 'Online' : 'Presencial',
          status: 'Agendada',
          amount: lead.amount || 180,
          cost: 0,
          paid: lead.paymentStatus === 'paid',
          nfIssued: lead.receiptIssued || false,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const sessRef = await addDoc(collection(db, 'sessions'), sessionData);

        if (currentClinic) {
          const clinicSess: Session = {
            id: sessRef.id,
            clinicId: currentClinic.id,
            patientId: newPatientId,
            patientName: lead.name.toUpperCase(),
            psychologistId: targetPsychologistEmail || currentClinicMember?.email || '',
            psychologistName: assignedPsy?.name || targetPsychologistEmail || 'Psicólogo(a)',
            date: targetDate,
            time: targetTime,
            duration: '50min',
            type: (lead.sessionRoom?.includes('Online') ? 'Online' : 'Presencial') as 'Presencial' | 'Online',
            room: lead.sessionRoom || currentClinic.settings?.rooms?.[0] || 'Sala 01 - Presencial',
            status: 'Agendada',
            amount: lead.amount || 180,
            paid: lead.paymentStatus === 'paid',
            notes: lead.notes || ''
          };
          const updatedClinicSessions = addOrUpdateClinicSession(currentClinic.id, clinicSess);
          setClinicSessions(updatedClinicSessions);
        }
      }
    } catch (err: any) {
      console.error('Erro ao efetivar lead em paciente:', err);
      alert('Erro ao efetivar paciente: ' + (err.message || String(err)));
      throw err;
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

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
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
        safeSetStorage('google_calendar_access_token', credential.accessToken);
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

          const pRecurrenceStart = p.recurrenceStart ? new Date(p.recurrenceStart + 'T12:00:00') : new Date((p as any).createdAt || p.birthDate || '2024-01-01');
          if (startOfDay(day) < startOfDay(pRecurrenceStart)) return;
          const weeksDiff = Math.abs(differenceInWeeks(startOfDay(day), startOfDay(pRecurrenceStart)));
          
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
              sessionValue: p.amount || 0
            });
          }
        }
      });
    }
    
    return slots;
  };

  const syncAllFutureSessionsToGoogle = async (accessToken: string, silent = false) => {
    try {
      if (!user) return;
      
      const totalPatients = patients.length;
      const activePatientsWithSchedule = patients.filter(p => p.status !== 'Inativo' && p.sessionDay && p.sessionDay !== 'Nenhum' && p.sessionTime).length;
      
      // 1. Get all future agenda slots for the next 30 days
      const futureSlots = getFutureAgendaSlots(30);

      // Count pending vs existing
      const pendingSlots = futureSlots.filter(s => !s.googleEventId);
      const existingSlots = futureSlots.filter(s => !!s.googleEventId);

      if (!silent) {
        // Diagnostic Alert
        alert(`SimplePsi - Diagnóstico de Sincronização:\n\n` +
              `- Total de Pacientes: ${totalPatients}\n` +
              `- Pacientes com dia/hora fixos: ${activePatientsWithSchedule}\n` +
              `- Consultas detectadas nos próximos 30 dias: ${futureSlots.length}\n` +
              `- Consultas novas (não enviadas ao Google): ${pendingSlots.length}\n` +
              `- Consultas já vinculadas (serão atualizadas): ${existingSlots.length}\n\n` +
              `Ao clicar em OK, iniciaremos a sincronização e reconciliação de todas as consultas no seu Google Agenda.`);
      }

      if (futureSlots.length === 0) {
        console.log("Nenhuma consulta futura pendente de sincronização.");
        return;
      }

      console.log(`Iniciando reconciliação em lote de ${futureSlots.length} consultas futuras...`);
      
      // Temporary override to ensure local token is active
      safeSetStorage('google_calendar_access_token', accessToken);

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

      if (!silent) {
        alert(`Resultado da Sincronização & Reconciliação:\n\n` +
              `- Consultas sincronizadas/atualizadas com sucesso: ${successCount}\n` +
              `- Consultas com falha: ${failCount}` +
              (failCount > 0 ? `\n- Último erro relatado: ${lastErrorMessage}` : ''));
      }

    } catch (err: any) {
      console.error("Erro na sincronização em lote:", err);
      if (!silent) {
        alert("Erro crítico na sincronização: " + (err.message || err));
      }
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const result = await signInWithGoogleCalendar();
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        const expiresAt = new Date().getTime() + 3500 * 1000; // ~1 hour
        safeSetStorage('google_calendar_access_token', credential.accessToken);
        safeSetStorage('google_calendar_expires_at', expiresAt.toString());
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
      if (err.code === 'auth/popup-blocked') {
        alert("A janela de conexão foi bloqueada pelo seu navegador. Por favor, libere pop-ups para este site e tente novamente.");
      } else {
        alert("Erro ao conectar com Google Agenda: " + (err.message || err));
      }
    }
  };

  const formatLocalIsoString = (dateStr: string, timeStr: string, durationStr: string) => {
    try {
      if (!timeStr) timeStr = "08:00";
      if (!dateStr) dateStr = new Date().toISOString().split('T')[0];

      let year = new Date().getFullYear();
      let month = new Date().getMonth() + 1;
      let day = new Date().getDate();

      if (dateStr.includes('/')) {
        const parts = dateStr.split('/').map(p => parseInt(p, 10));
        if (parts.length === 3) {
          if (parts[2] > 1000) {
            day = parts[0];
            month = parts[1];
            year = parts[2];
          } else {
            year = parts[0];
            month = parts[1];
            day = parts[2];
          }
        }
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-').map(p => parseInt(p, 10));
        if (parts.length === 3) {
          if (parts[0] > 1000) {
            year = parts[0];
            month = parts[1];
            day = parts[2];
          } else {
            day = parts[0];
            month = parts[1];
            year = parts[2];
          }
        }
      }

      const timeParts = (timeStr || "08:00").split(':').map(p => parseInt(p, 10));
      const hours = !isNaN(timeParts[0]) ? timeParts[0] : 8;
      const minutes = !isNaN(timeParts[1]) ? timeParts[1] : 0;

      const d = new Date(year, month - 1, day, hours, minutes, 0);

      let durationMinutes = 50;
      if (durationStr?.includes('h')) {
        durationMinutes = parseFloat(durationStr) * 60;
      } else if (durationStr?.includes('min')) {
        durationMinutes = parseFloat(durationStr);
      }
      if (isNaN(durationMinutes) || durationMinutes <= 0) durationMinutes = 50;

      const endD = new Date(d.getTime() + durationMinutes * 60000);

      const pad = (num: number) => (isNaN(num) ? "00" : num.toString().padStart(2, '0'));
      const formatTz = (dateObj: Date) => {
        if (isNaN(dateObj.getTime())) {
          return new Date().toISOString();
        }
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
      console.error("Erro ao formatar data/hora para Google Calendar:", e);
      return {
        start: `${dateStr}T${timeStr || '08:00'}:00-03:00`,
        end: `${dateStr}T${timeStr || '08:50'}:00-03:00`
      };
    }
  };

  const ensureValidCalendarToken = async (): Promise<string | null> => {
    const token = safeGetStorage('google_calendar_access_token');
    const expiresAtStr = safeGetStorage('google_calendar_expires_at');
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr) : 0;
    const now = new Date().getTime();
    
    // Se o token existe e ainda é válido (com margem de 2 minutos), retorna o token
    if (token && now < expiresAt - 2 * 60 * 1000) {
      return token;
    }

    // Se expirou, limpa o token local para que a UI mostre status real (desconectado/reconectar)
    if (token && now >= expiresAt - 2 * 60 * 1000) {
      safeRemoveStorage('google_calendar_access_token');
      safeRemoveStorage('google_calendar_expires_at');
      setGoogleAccessToken(null);
    }
    
    // NUNCA dispara popup/redirect de autenticação do Google automaticamente em segundo plano!
    // Isso evita redirecionamentos repentinos quando o psicólogo está realizando ações comuns (apagar sessão, emitir nota, etc.)
    return null;
  };

  const handleManualSyncGoogleCalendar = async () => {
    let token = await ensureValidCalendarToken();
    if (!token) {
      try {
        const result = await signInWithGoogleCalendar();
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential && credential.accessToken) {
          const expiresAt = new Date().getTime() + 3500 * 1000;
          safeSetStorage('google_calendar_access_token', credential.accessToken);
          safeSetStorage('google_calendar_expires_at', expiresAt.toString());
          setGoogleAccessToken(credential.accessToken);
          token = credential.accessToken;
          if (user) {
            const profileRef = doc(db, 'profiles', user.uid);
            await setDoc(profileRef, { isGoogleCalendarEnabled: true }, { merge: true });
          }
        }
      } catch (err: any) {
        console.error("Erro na autenticação manual do Google Agenda:", err);
        if (err.code === 'auth/popup-blocked') {
          alert("A janela de conexão foi bloqueada pelo seu navegador. Por favor, libere pop-ups e tente novamente.");
        } else {
          alert("Erro ao conectar Google Agenda: " + (err.message || err));
        }
        return;
      }
    }

    if (token) {
      await syncAllFutureSessionsToGoogle(token, false);
    }
  };

  const syncSessionToGoogleCalendar = async (sessionData: any, sessionId: string, bypassEnabledCheck = false): Promise<boolean> => {
    if (!profileSettings.isGoogleCalendarEnabled && !bypassEnabledCheck) return false;
    const token = await ensureValidCalendarToken();
    if (!token) return false;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const p = patients.find(pat => pat.id === sessionData.patientId);
      const patientName = p ? p.name : (sessionData.triageName || "Paciente");
      const meetingLink = p?.meetingLink || "";
      const { start, end } = formatLocalIsoString(sessionData.date, sessionData.time, sessionData.duration || '50min');
      const userTimeZone = profileSettings?.country === 'PT'
        ? 'Europe/Lisbon'
        : (Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo");

      const body = {
        summary: `Consulta - ${patientName}`,
        description: `Consulta clínica agendada via SimplePsi.\nPaciente: ${patientName}\nModalidade: ${sessionData.type || 'Presencial'}` + 
                     (meetingLink ? `\nLink da Sessão: ${meetingLink}` : ''),
        location: meetingLink || '',
        start: {
          dateTime: start,
          timeZone: userTimeZone
        },
        end: {
          dateTime: end,
          timeZone: userTimeZone
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (response.status === 401) {
        console.warn("Token da Google Agenda expirou (401).");
        safeRemoveStorage('google_calendar_access_token');
        safeRemoveStorage('google_calendar_expires_at');
        setGoogleAccessToken(null);
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
        return false;
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar com Google Agenda:", err);
      return false;
    }
  };

  const updateSessionInGoogleCalendar = async (sessionData: any, bypassEnabledCheck = false): Promise<boolean> => {
    if (!profileSettings.isGoogleCalendarEnabled && !bypassEnabledCheck) return false;
    if (!sessionData.googleEventId) return false;
    const token = await ensureValidCalendarToken();
    if (!token) return false;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const p = patients.find(pat => pat.id === sessionData.patientId);
      const patientName = p ? p.name : (sessionData.triageName || "Paciente");
      const meetingLink = p?.meetingLink || "";
      const { start, end } = formatLocalIsoString(sessionData.date, sessionData.time, sessionData.duration || '50min');
      const userTimeZone = profileSettings?.country === 'PT'
        ? 'Europe/Lisbon'
        : (Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo");

      const body = {
        summary: `Consulta - ${patientName}`,
        description: `Consulta clínica agendada via SimplePsi.\nPaciente: ${patientName}\nModalidade: ${sessionData.type || 'Presencial'}` + 
                     (meetingLink ? `\nLink da Sessão: ${meetingLink}` : ''),
        location: meetingLink || '',
        start: {
          dateTime: start,
          timeZone: userTimeZone
        },
        end: {
          dateTime: end,
          timeZone: userTimeZone
        }
      };

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${sessionData.googleEventId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });

      if (response.status === 401) {
        console.warn("Token da Google Agenda expirou (401).");
        safeRemoveStorage('google_calendar_access_token');
        safeRemoveStorage('google_calendar_expires_at');
        setGoogleAccessToken(null);
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
    const token = await ensureValidCalendarToken();
    if (!token) return;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'DELETE',
        headers
      });

      if (response.status === 401) {
        console.warn("Token da Google Agenda expirou (401).");
        safeRemoveStorage('google_calendar_access_token');
        safeRemoveStorage('google_calendar_expires_at');
        setGoogleAccessToken(null);
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

               // Update all future scheduled sessions for this patient to the new day of the week & time
               const todayStr = new Date().toISOString().split('T')[0];
               const patientSessionsToUpdate = sessions.filter(s => 
                 s.patientId === p.id && 
                 s.status === 'Agendada' && 
                 s.date >= todayStr
               );
               
               const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
               const newDayIndex = daysOfWeek.indexOf(capitalized);
               
               if (newDayIndex !== -1) {
                 for (const s of patientSessionsToUpdate) {
                   const currentDate = new Date(s.date + 'T12:00:00');
                   const currentDayIndex = currentDate.getDay();
                   const diffDays = newDayIndex - currentDayIndex;
                   
                   const newDate = new Date(currentDate);
                   newDate.setDate(currentDate.getDate() + diffDays);
                   const newDateStr = newDate.toISOString().split('T')[0];
                   
                   await updateDoc(doc(db, 'sessions', s.id), {
                     date: newDateStr,
                     time: data.time,
                     updatedAt: new Date().toISOString()
                   });
                   
                   if (s.googleEventId) {
                     await updateSessionInGoogleCalendar({
                       ...s,
                       date: newDateStr,
                       time: data.time
                     });
                   }
                 }
               }
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
        const updatedData: any = {
          patientId: data.patientId || '',
          isTriage: data.isTriage || false,
          triageName: data.triageName || '',
          date: data.date,
          time: data.time,
          type: data.type || 'Presencial',
          status: data.status === 'Recorrente' ? 'Agendada' : (data.status || 'Agendada'),
          amount: parseFloat(data.amount) || parseFloat(oldDoc?.amount as any) || 0,
          updatedAt: new Date().toISOString()
        };

        // Se a data ou horário mudou, OU se o status foi alterado para 'Agendada' (remarcação / reativação):
        const isDateOrTimeChanged = oldDoc && (oldDoc.date !== data.date || oldDoc.time !== data.time);
        const isReactivated = oldDoc && oldDoc.status === 'Desmarcou' && updatedData.status === 'Agendada';

        if (isDateOrTimeChanged || isReactivated) {
          updatedData.reminderD1Sent = false;
          updatedData.reminderD0Sent = false;
          updatedData.reminderStatus = 'pending';
          updatedData.desmarcouAt = deleteField();
          if (isDateOrTimeChanged && oldDoc?.confirmedAt) {
            updatedData.confirmedAt = deleteField();
          }
        }

        // If the date or time changed, we should cancel the original slot if it was a recurrence day
        // to prevent ghost/recurrent sessions from showing up again on the old date.
        if (oldDoc && (oldDoc.date !== data.date || oldDoc.time !== data.time)) {
          const p = patients.find(pat => pat.id === oldDoc.patientId);
          if (p && p.sessionDay) {
            const oldDateObj = new Date(oldDoc.date + 'T12:00:00');
            const oldDayName = format(oldDateObj, 'eeee', { locale: ptBR });
            const capitalizedOldDayName = oldDayName.charAt(0).toUpperCase() + oldDayName.slice(1);
            
            if (p.sessionDay === capitalizedOldDayName) {
              await addDoc(collection(db, 'sessions'), {
                patientId: oldDoc.patientId,
                date: oldDoc.date,
                time: oldDoc.time,
                status: 'Cancelada',
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
        }

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
        status: data.status === 'Recorrente' ? 'Agendada' : (data.status || 'Agendada'),
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

      // Sincronização com a Agenda Geral da Clínica caso esteja no modo Clínica
      if (currentClinic) {
        const psyEmail = currentClinicMember?.email || user.email || '';
        const psyName = currentClinicMember?.name || 'Psicólogo(a)';
        const pat = patients.find(p => p.id === data.patientId);
        const clinicSess: Session = {
          id: ref.id,
          clinicId: currentClinic.id,
          patientId: data.patientId || '',
          patientName: pat?.name || data.triageName || 'Paciente',
          psychologistId: psyEmail,
          psychologistName: psyName,
          date: data.date,
          time: data.time,
          duration: data.duration || '50min',
          type: data.type || 'Presencial',
          room: currentClinic.settings?.rooms?.[0] || 'Sala 01 - Presencial',
          status: data.status === 'Recorrente' ? 'Agendada' : (data.status || 'Agendada'),
          amount: parseFloat(data.amount) || 0,
          paid: data.paid || false,
          notes: ''
        };
        const updatedClinicSessions = addOrUpdateClinicSession(currentClinic.id, clinicSess);
        setClinicSessions(updatedClinicSessions);
      }

      // Google Agenda Sync
      if (sessionData.status !== 'Cancelada') {
        await syncSessionToGoogleCalendar(sessionData, ref.id);
      }
      
      // Auto-trigger fail-safe: verificar e enviar lembretes imediatos/véspera caso elegível
      fetch('/api/cron-reminders', { method: 'POST' }).catch(() => {});

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
      
      const oldPatient = patients.find(p => p.id === id);
      const isDayChanged = oldPatient && oldPatient.sessionDay !== data.sessionDay;
      const isTimeChanged = oldPatient && oldPatient.sessionTime !== data.sessionTime;
      const isRecurrenceChanged = oldPatient && oldPatient.recurrence !== data.recurrence;
      const isRecurrenceStartChanged = oldPatient && oldPatient.recurrenceStart !== data.recurrenceStart;
      const isModalityChanged = oldPatient && oldPatient.modality !== data.modality;

      await updateDoc(patientRef, {
        ...data,
        amount: parseFloat(data.amount) || 0,
        sessions: parseInt(data.sessions) || 0,
        updatedAt: new Date().toISOString()
      });

      // 1.2. Sincronizar com o espelho patient_portal
      try {
        const cleanCpf = (data.document || data.cpf || '').replace(/\D/g, '');
        const portalRef = doc(db, 'patient_portal', id);
        const portalDoc = await getDoc(portalRef);
        if (portalDoc.exists()) {
          await updateDoc(portalRef, {
            cpf: cleanCpf || portalDoc.data().cpf || '',
            name: (data.name || '').toUpperCase() || portalDoc.data().name,
            phone: data.phone || portalDoc.data().phone || '',
            email: data.email || portalDoc.data().email || '',
            birthDate: data.birthDate || portalDoc.data().birthDate || '',
            gender: data.gender || portalDoc.data().gender || '',
            profession: data.profession || data.occupation || portalDoc.data().profession || '',
            address: data.address || portalDoc.data().address || '',
            updatedAt: new Date().toISOString()
          });
        } else {
          await setDoc(portalRef, {
            patientId: id,
            ownerId: user.uid,
            cpf: cleanCpf,
            patientUid: null,
            tutorialCompleted: false,
            name: (data.name || '').toUpperCase(),
            phone: data.phone || '',
            email: data.email || '',
            birthDate: data.birthDate || '',
            gender: data.gender || '',
            profession: data.profession || data.occupation || '',
            address: data.address || '',
            sharedPDFs: [],
            updatedAt: new Date().toISOString()
          });
        }
      } catch (portalErr) {
        console.error("Erro ao sincronizar dados com portal do paciente:", portalErr);
      }

      // If default schedule day/time, recurrence, recurrence start date, or modality changed, update/align future scheduled sessions
      if (isDayChanged || isTimeChanged || isRecurrenceChanged || isRecurrenceStartChanged || isModalityChanged) {
        const todayStr = new Date().toISOString().split('T')[0];
        const patientSessionsToUpdate = sessions.filter(s => 
          s.patientId === id && 
          s.status === 'Agendada' && 
          s.date >= todayStr
        );
        
        const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const targetDayName = data.sessionDay || (oldPatient?.sessionDay || '');
        const newDayIndex = daysOfWeek.indexOf(targetDayName);
        
        if (newDayIndex !== -1) {
          for (const s of patientSessionsToUpdate) {
            const currentDate = new Date(s.date + 'T12:00:00');
            const currentDayIndex = currentDate.getDay();
            const diffDays = newDayIndex - currentDayIndex;
            
            const adjustedDate = new Date(currentDate);
            adjustedDate.setDate(currentDate.getDate() + diffDays);
            const newDateStr = adjustedDate.toISOString().split('T')[0];

            // Calculate if this adjusted date matches the new recurrence pattern
            const newRecurrence = data.recurrence || (oldPatient?.recurrence || 'Semanal');
            const newRecurrenceStart = data.recurrenceStart 
              ? new Date(data.recurrenceStart + 'T12:00:00') 
              : new Date(oldPatient?.createdAt || oldPatient?.birthDate || '2024-01-01');

            let shouldKeep = false;
            if (newRecurrence === 'Nenhuma') {
              shouldKeep = false;
            } else if (startOfDay(adjustedDate) >= startOfDay(newRecurrenceStart)) {
              const weeksDiff = Math.abs(differenceInWeeks(startOfDay(adjustedDate), startOfDay(newRecurrenceStart)));
              if (newRecurrence === 'Semanal') shouldKeep = true;
              else if (newRecurrence === 'Quinzenal') shouldKeep = weeksDiff % 2 === 0;
              else if (newRecurrence === 'Mensal') shouldKeep = weeksDiff % 4 === 0;
            }

            if (shouldKeep) {
              await updateDoc(doc(db, 'sessions', s.id), {
                date: newDateStr,
                time: data.sessionTime || s.time,
                type: data.modality || s.type,
                updatedAt: new Date().toISOString()
              });
              
              if (s.googleEventId) {
                await updateSessionInGoogleCalendar({
                  ...s,
                  date: newDateStr,
                  time: data.sessionTime || s.time,
                  type: data.modality || s.type
                });
              }
            } else {
              // Delete future scheduled physical session that doesn't fit the new recurrence pattern
              if (s.googleEventId) {
                await deleteSessionFromGoogleCalendar(s.googleEventId);
              }
              await deleteDoc(doc(db, 'sessions', s.id));
            }
          }
        } else if (isModalityChanged) {
          // Se não houver dia da semana definido mas a modalidade mudou, atualiza a modalidade de todas as agendadas futuras
          for (const s of patientSessionsToUpdate) {
            await updateDoc(doc(db, 'sessions', s.id), {
              type: data.modality,
              updatedAt: new Date().toISOString()
            });
            if (s.googleEventId) {
              await updateSessionInGoogleCalendar({
                ...s,
                type: data.modality
              });
            }
          }
        }
      }
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
          status: data.status === 'Recorrente' ? 'Agendada' : (data.status || 'Agendada'),
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return;
      }
      const sessionRef = doc(db, 'sessions', id);
      const updatedData = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      if (updatedData.status === 'Recorrente') {
        updatedData.status = 'Agendada';
      }
      await updateDoc(sessionRef, updatedData);

      // Sincronizar com clinicSessions se no modo clínica
      if (currentClinic) {
        const existingClinicSess = clinicSessions.find(s => s.id === id);
        if (existingClinicSess) {
          const updatedClinicSess: Session = {
            ...existingClinicSess,
            ...data,
            id
          };
          const updatedList = addOrUpdateClinicSession(currentClinic.id, updatedClinicSess);
          setClinicSessions(updatedList);
        }
      }

      // Google Agenda Sync
      if (data.googleEventId) {
        if (data.status === 'Cancelada') {
          await deleteSessionFromGoogleCalendar(data.googleEventId);
        } else {
          await updateSessionInGoogleCalendar({ ...data, googleEventId: data.googleEventId });
        }
      }

      // Auto-trigger fail-safe: verificar e enviar lembretes imediatos/véspera caso elegível
      fetch('/api/cron-reminders', { method: 'POST' }).catch(() => {});
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sessions/${updatedSession.id}`);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!user) return;
    try {
      if (currentClinic) {
        const updatedList = deleteClinicSession(currentClinic.id, id);
        setClinicSessions(updatedList);
      }

      // Se a sessão de fato existe no banco (mesmo com ID iniciando em 'virtual-'), vamos excluí-la
      const sessionExists = sessions.some(s => s.id === id);
      if (sessionExists) {
        const sessionToDelete = sessions.find(s => s.id === id);
        if (sessionToDelete && sessionToDelete.googleEventId) {
          await deleteSessionFromGoogleCalendar(sessionToDelete.googleEventId);
        }
        await deleteDoc(doc(db, 'sessions', id));
        return;
      }

      if (id.toString().startsWith('virtual-')) {
         const virtualContent = id.toString().substring('virtual-'.length);
         const dStr = virtualContent.slice(-10); // YYYY-MM-DD
         const pId = virtualContent.slice(0, -11); // pacienteId
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
      const batch = writeBatch(db);

      // 1. Delete patient document
      batch.delete(doc(db, 'patients', id));

      // 1.1. Delete patient portal document
      batch.delete(doc(db, 'patient_portal', id));

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

      // 3.1. Query and delete all diary entries associated with this patient
      const qDiary = query(
        collection(db, 'diary_entries'),
        where('ownerId', '==', user.uid),
        where('patientId', '==', id)
      );
      const diarySnapshot = await getDocs(qDiary);
      console.log(`Found ${diarySnapshot.size} diary entries to delete from DB`);
      diarySnapshot.forEach((doc) => {
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

  const clinicRole = useMemo<ClinicUserRole>(() => {
    if (!currentClinic) return 'psychologist';
    if (currentClinicMember?.role) return currentClinicMember.role;
    const userEmail = user?.email?.toLowerCase().trim();
    if (userEmail && (userEmail === currentClinic.ownerEmail?.toLowerCase().trim() || userEmail === 'simplepsi.app@gmail.com')) {
      return 'clinic_admin';
    }
    return 'psychologist';
  }, [currentClinic, currentClinicMember, user]);

  const isClinicAdmin = useMemo(() => {
    return clinicRole === 'clinic_admin';
  }, [clinicRole]);

  // Sincroniza sessões do psicólogo: une as sessões pessoais com as sessões da clínica atribuídas a ele
  const displayedPersonalSessions = useMemo(() => {
    if (!currentClinic || clinicRole !== 'psychologist') return sessions;

    const myEmail = (currentClinicMember?.email || '').toLowerCase().trim();
    const myId = (currentClinicMember?.id || '').toLowerCase().trim();
    const myName = (currentClinicMember?.name || '').toLowerCase().trim();

    const myClinicSessions = clinicSessions.filter(cs => {
      const pId = (cs.psychologistId || '').toLowerCase().trim();
      const pName = (cs.psychologistName || '').toLowerCase().trim();
      return pId === myEmail || pId === myId || (myName !== '' && pName === myName);
    });

    const sessionMap = new Map<string, Session>();
    sessions.forEach(s => sessionMap.set(s.id, s));
    myClinicSessions.forEach(cs => sessionMap.set(cs.id, cs));
    return Array.from(sessionMap.values());
  }, [sessions, clinicSessions, currentClinic, clinicRole, currentClinicMember]);

  const menuItems = useMemo(() => {
    if (currentClinic) {
      const usedPsySeats = clinicMembers.filter(m => m.role === 'psychologist').length;
      const totalSeats = currentClinic.maxSeats || 7;

      if (clinicRole === 'clinic_admin') {
        return [
          { id: 'dashboard', label: 'Dashboard da Clínica', icon: LayoutDashboard },
          { id: 'crm-recepcao', label: 'CRM & Recepção', icon: Phone },
          { id: 'agenda', label: 'Agenda Geral (Multiprofissional)', icon: CalendarIcon },
          { id: 'minha-equipe', label: `Minha Equipe (${usedPsySeats}/${totalSeats} Vagas)`, icon: Building },
          { id: 'supervisao', label: 'Supervisão Clínica', icon: GraduationCap },
          { id: 'pacientes', label: 'Pacientes da Clínica', icon: Users },
          { id: 'financeiro', label: 'Financeiro Geral', icon: DollarSign },
        ];
      }
      if (clinicRole === 'receptionist') {
        return [
          { id: 'crm-recepcao', label: 'CRM & Captação', icon: Phone },
          { id: 'agenda', label: 'Agenda Geral (Recepção)', icon: CalendarIcon },
          { id: 'pacientes', label: 'Cadastro de Pacientes', icon: Users },
          { id: 'financeiro', label: 'Caixa & Pagamentos', icon: DollarSign },
        ];
      }
      if (clinicRole === 'supervisor') {
        return [
          { id: 'supervisao', label: 'Painel de Supervisão', icon: GraduationCap },
          { id: 'agenda', label: 'Agenda Geral da Clínica', icon: CalendarIcon },
          { id: 'pacientes', label: 'Casos Clínicos', icon: FileText },
        ];
      }
      // Psicólogo atendente da clínica
      return [
        { id: 'dashboard', label: 'Meu Dashboard', icon: LayoutDashboard },
        { id: 'pacientes', label: 'Meus Pacientes', icon: Users },
        { id: 'agenda', label: 'Minha Agenda', icon: CalendarIcon },
        { id: 'agenda-clinica', label: 'Agenda Geral da Clínica', icon: Building },
        { id: 'prontuarios', label: 'Prontuários & Anamnese', icon: FileText },
        { id: 'financeiro', label: 'Meu Financeiro', icon: DollarSign },
        { id: 'area-paciente', label: 'Área do Paciente', icon: UserCircle },
        { id: 'import-transcript', label: 'Importar Transcrição', icon: FileDown },
      ];
    }

    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pacientes', label: profileSettings?.country === 'PT' ? 'Utentes' : 'Pacientes', icon: Users },
      { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
      { id: 'prontuarios', label: profileSettings?.country === 'PT' ? 'Processos Clínicos' : 'Prontuários', icon: FileText },
      { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
      { id: 'area-paciente', label: profileSettings?.country === 'PT' ? 'Portal do Utente' : 'Área do Paciente', icon: UserCircle },
      { id: 'whatsapp-lembretes', label: 'Lembretes WhatsApp', icon: MessageSquare },
      { id: 'import-transcript', label: 'Importar Transcrição', icon: FileDown },
    ];
    if (user?.email && user.email.toLowerCase().trim() === 'wellcoutinho99@gmail.com') {
      items.push({ id: 'admin', label: 'Painel Admin', icon: ShieldCheck });
    }
    return items;
  }, [user, currentClinic, clinicRole, clinicMembers, profileSettings?.country]);

  const isPrivacyRoute = window.location.pathname.startsWith('/privacidade') || window.location.search.includes('goto=privacidade');

  if (isPrivacyRoute) {
    return <PrivacyPolicyPage onBack={() => {
      window.history.pushState({}, '', '/');
      window.location.href = '/';
    }} />;
  }

  const isPatientRoute = window.location.pathname.startsWith('/paciente') || window.location.search.includes('role=paciente');

  if (isPatientRoute) {
    return <PatientPortalDashboard />;
  }

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

  if (isRedirectingToStripe) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAF9F6] text-[#2E3C2B]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-12 h-12 border-4 border-[#5F7D5C] border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-serif font-black text-[#2E3C2B]">Redirecionando para a Stripe...</h2>
          <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
            Estamos conectando você ao checkout seguro para concluir sua assinatura. Um instante!
          </p>
        </div>
      </div>
    );
  }

  if (currentClinic && (!currentClinicMember || isForceClinicLogin)) {
    return (
      <ClinicLoginPage 
        clinic={currentClinic}
        members={clinicMembers}
        onLoginGoogle={handleGoogleLogin}
        onSelectSimulatedMember={(member) => {
          setSimulatedClinicMember(currentClinic.id, member);
          setCurrentClinicMember(member);
          setIsForceClinicLogin(false);
          if (member.role === 'receptionist') {
            setActiveTab('crm-recepcao');
          } else if (member.role === 'supervisor') {
            setActiveTab('supervisao');
          } else if (member.role === 'clinic_admin') {
            setActiveTab('dashboard');
          } else {
            setActiveTab('dashboard');
          }
        }}
        onExitClinicMode={() => {
          window.history.pushState({}, '', '/');
          setCurrentClinic(null);
          setCurrentClinicMember(null);
          setIsForceClinicLogin(false);
          applyClinicTheme();
        }}
      />
    );
  }

  if (!user && !currentClinicMember) {
    return (
      <>
        <LandingPage 
          onLogin={handleOpenAuthModal} 
          initialCountry={currentCountry}
        />
        
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthModalSelectedPlan(null);
          }}
          selectedPlan={authModalSelectedPlan}
          country={currentCountry}
        />
        
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
                  href="https://wa.me/5511939215473" // Wellington's Whatsapp!
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

  if (isTrialExpired && effectivePlan === 'free' && (patients || []).length > 5) {
    return (
      <PaywallScreen 
        userId={user.uid}
        email={user.email || ''} 
        patientCount={(patients || []).length}
        onSignOut={() => auth.signOut()} 
        onContinueFree={() => {
          setProfileSettings(prev => ({ ...prev, isTrial: false }));
        }}
      />
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
          <div className="flex items-center gap-3 min-w-0">
            {currentClinic?.theme?.logoUrl ? (
              <img src={currentClinic.theme.logoUrl} className="w-10 h-10 object-contain rounded-xl shadow-lg border border-white/5 shrink-0" alt="Logo" />
            ) : (
              <div 
                className="w-10 h-10 rounded-xl shadow-lg border border-white/5 flex items-center justify-center font-bold text-white text-lg shrink-0"
                style={{ backgroundColor: currentClinic?.theme?.primaryColor || 'var(--color-primary)' }}
              >
                {currentClinic ? currentClinic.name[0] : <img src="/apple-touch-icon.png" className="w-10 h-10 object-contain rounded-xl" alt="Logo" />}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight truncate">
                {currentClinic ? currentClinic.name : <>Simple<span className="text-primary">Psi</span></>}
              </h1>
              {currentClinic && (
                <p className="text-[10px] text-text-muted font-medium truncate">⚡ por SimplePsi</p>
              )}
            </div>
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
                if (item.id === 'minha-equipe') {
                  setIsClinicTeamModalOpen(true);
                  setIsMobileMenuOpen(false);
                  return;
                }
                setActiveTab(item.id);
                setSelectedPatient(null);
                setIsMobileMenuOpen(false);
                setPortalInitialPatientId(undefined);
                setPortalInitialSubTab(undefined);
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
            {!currentClinic && effectivePlan !== 'lifetime' && (
              <button 
                onClick={() => openUpgradeModalWithReason()}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all border border-transparent hover:border-primary/10 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard size={15} className="text-text-muted group-hover:text-primary transition-colors" />
                  <span>Gerenciar Plano</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {profileSettings.isTrial && trialRemainingDays >= 0
                    ? `Trial (${Math.max(0, trialRemainingDays)}d)`
                    : effectivePlan === 'ilimitado' 
                    ? 'Ilimitado' 
                    : effectivePlan === 'consultorio' 
                    ? 'Consultório' 
                    : 'Start'}
                </span>
              </button>
            )}

            <button 
              onClick={() => setIsSupportOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all border border-transparent hover:border-primary/10 group cursor-pointer"
            >
              <HelpCircle size={15} className="text-text-muted group-hover:text-primary transition-colors" />
              <span>Suporte & Sugestões</span>
            </button>

            {currentClinic ? (
              <div className="p-3 rounded-2xl bg-surface-muted border border-border-ui space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                    {(currentClinicMember?.name || currentClinicMember?.email || 'A')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-text-main">
                      {currentClinicMember?.name || 'Administrador(a)'}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">
                      {currentClinicMember?.email || currentClinic?.ownerEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border-ui/60 text-[10px]">
                  <span className="font-semibold text-primary">
                    {clinicRole === 'clinic_admin' ? '👑 Gestor/Admin' : 
                     clinicRole === 'supervisor' ? '🎓 Supervisor' : 
                     clinicRole === 'receptionist' ? '📋 Recepção' : '🩺 Psicólogo'}
                  </span>
                  <button
                    onClick={() => setIsClinicRoleSwitcherOpen(true)}
                    className="text-text-muted hover:text-text-main underline"
                  >
                    Alternar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                  {user?.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" /> : user?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate text-text-main">{user?.displayName || 'Usuário'}</p>
                  <p className="text-[10px] text-text-muted truncate uppercase tracking-widest">{user?.email}</p>
                </div>
              </div>
            )}

            {currentClinic ? (
              <div className="space-y-1.5">
                <button 
                  onClick={() => {
                    setSimulatedClinicMember(currentClinic.id, null);
                    setCurrentClinicMember(null);
                    setIsForceClinicLogin(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors uppercase tracking-widest border border-primary/20"
                >
                  <LogIn size={14} /> Trocar Conta / Login
                </button>
                <button 
                  onClick={() => {
                    setSimulatedClinicMember(currentClinic.id, null);
                    setCurrentClinicMember(null);
                    setCurrentClinic(null);
                    applyClinicTheme();
                    window.history.pushState({}, '', '/');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors uppercase tracking-widest"
                >
                  <LogOut size={14} /> Sair da Clínica
                </button>
              </div>
            ) : (
              <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors uppercase tracking-widest"
              >
                <LogOut size={14} /> Sair da Conta
              </button>
            )}
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
            {/* Seletor Rápido de Cargo / Simulação no Localhost */}
            {currentClinic && (
              <div className="relative">
                <button
                  onClick={() => setIsClinicRoleSwitcherOpen(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-text-main text-xs font-bold hover:bg-primary/20 transition-all shadow-sm"
                  title="Alternar Perfil da Equipe / Modo Teste"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[130px] sm:max-w-xs">
                    {currentClinicMember?.name || (isClinicAdmin ? 'Gestor(a) / Admin' : 'Psicólogo(a)')}
                  </span>
                  <ChevronDown size={14} className="text-primary shrink-0" />
                </button>

                {/* Dropdown de Simulação */}
                <AnimatePresence>
                  {isClinicRoleSwitcherOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-card border border-border-ui rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 text-text-main"
                    >
                      <div className="p-2 border-b border-border-ui/60 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                          Simular Cargo da Equipe
                        </span>
                        <span className="text-xs font-bold text-primary">{currentClinic.name}</span>
                      </div>

                      {DEFAULT_DEMO_MEMBERS.map((m) => {
                        const isSelected = currentClinicMember?.email === m.email;
                        const roleNames = {
                          clinic_admin: '👑 Gestor(a) / Admin',
                          psychologist: '🩺 Psicólogo(a)',
                          supervisor: '🎓 Supervisor(a)',
                          receptionist: '📋 Recepção / Secretária'
                        };

                        return (
                          <button
                            key={m.email}
                            onClick={() => {
                              setSimulatedClinicMember(currentClinic.id, m);
                              setCurrentClinicMember(m);
                              setIsClinicRoleSwitcherOpen(false);
                            }}
                            className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all ${
                              isSelected ? 'bg-primary/15 font-bold text-primary' : 'hover:bg-surface-muted text-text-muted hover:text-text-main'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{m.name}</p>
                              <span className="text-[10px] opacity-75">{roleNames[m.role]}</span>
                            </div>
                            {isSelected && <Check size={14} className="text-primary shrink-0" />}
                          </button>
                        );
                      })}

                      <div className="pt-1 border-t border-border-ui/60 mt-1">
                        <button
                          onClick={() => {
                            setIsClinicRoleSwitcherOpen(false);
                            setSimulatedClinicMember(currentClinic.id, null);
                            setCurrentClinicMember(null);
                            setIsForceClinicLogin(true);
                          }}
                          className="w-full p-2 text-left text-[11px] font-semibold text-text-muted hover:text-primary hover:bg-surface-muted rounded-xl"
                        >
                          🔐 Tela de Login da Clínica
                        </button>
                        <button
                          onClick={() => {
                            setIsClinicRoleSwitcherOpen(false);
                            window.history.pushState({}, '', '/');
                            setCurrentClinic(null);
                            setCurrentClinicMember(null);
                            applyClinicTheme();
                          }}
                          className="w-full p-2 text-left text-[11px] font-semibold text-red-400 hover:bg-red-500/10 rounded-xl"
                        >
                          🚪 Sair do Modo Clínica
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {currentClinic && isClinicAdmin && (
              <button 
                onClick={() => setIsClinicTeamModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all shadow-sm"
              >
                <Building size={14} />
                <span className="hidden sm:inline">Minha Equipe ({currentClinic.maxSeats || 7} Vagas)</span>
              </button>
            )}

            {/* Botão de Acesso Rápido: Radar de Conteúdo (PRO) */}
            <button
              onClick={handleOpenRadar}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-primary/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/25 hover:border-purple-500/40 text-text-main text-xs font-bold transition-all shadow-sm group cursor-pointer"
              title="Radar de Conteúdo para Redes Sociais (Instagram & LinkedIn)"
            >
              <Sparkles size={14} className="text-purple-400 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="hidden sm:inline">Radar de Conteúdo</span>
              <span className="text-[9px] bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0">
                PRO
              </span>
            </button>

            {/* Botão Modo Privacidade (Instagram) */}
            <button
              onClick={togglePrivacyMode}
              className={cn(
                "p-2 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer relative",
                isPrivacyMode 
                  ? "bg-purple-600 text-white shadow-purple-500/25 ring-2 ring-purple-500/40" 
                  : "bg-surface-muted text-text-muted hover:text-text-main hover:opacity-80"
              )}
              title={isPrivacyMode ? "Desativar Modo Privacidade" : "Ativar Modo Privacidade (Ocultar dados)"}
            >
              {isPrivacyMode ? (
                <EyeOff size={18} className="lg:w-5 lg:h-5 text-white" />
              ) : (
                <Eye size={18} className="lg:w-5 lg:h-5" />
              )}
            </button>

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
          {checkoutSuccessPlan && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Sparkles size={20} className="text-white fill-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Assinatura Ativada com Sucesso!</h4>
                  <p className="text-xs text-white/90 leading-relaxed">
                    Seu plano <strong>{checkoutSuccessPlan === 'ilimitado' ? 'Ilimitado Pro' : 'Consultório'}</strong> está 100% ativo! Todos os recursos e automações foram liberados na sua conta.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutSuccessPlan(null)}
                className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {((activeTab === 'crm-recepcao') || (activeTab === 'dashboard' && currentClinic && clinicRole === 'receptionist')) && currentClinic && (
              <ClinicReceptionCrmView 
                key="clinic-crm-view"
                clinic={currentClinic}
                currentMember={currentClinicMember}
                members={clinicMembers}
                onPromoteLeadToPatient={handlePromoteLeadToPatient}
              />
            )}

            {activeTab === 'dashboard' && currentClinic && clinicRole === 'clinic_admin' && (
              <ClinicDashboardView 
                key="clinic-dashboard" 
                clinic={currentClinic}
                currentMember={currentClinicMember}
                members={clinicMembers}
                sessions={clinicSessions}
                patients={patients}
                isPrivacyMode={isPrivacyMode}
                onOpenTeamModal={() => setIsClinicTeamModalOpen(true)}
                onGoToMasterAgenda={() => setActiveTab('agenda')}
                onOpenNewSessionModal={() => setActiveTab('agenda')}
                onSelectPatient={(id) => { setSelectedPatient(id); setActiveTab('pacientes'); }}
              />
            )}

            {activeTab === 'dashboard' && currentClinic && clinicRole === 'supervisor' && (
              <ClinicSupervisionView 
                key="clinic-supervision-dash"
                clinic={currentClinic}
                currentMember={currentClinicMember}
                members={clinicMembers}
                patients={patients}
                sessions={clinicSessions}
              />
            )}

            {activeTab === 'dashboard' && (!currentClinic || (clinicRole !== 'clinic_admin' && clinicRole !== 'supervisor')) && (
              <DashboardView 
                key="dashboard" 
                user={user}
                patients={patients}
                filteredPatients={filteredPatients} 
                sessions={sessions} 
                transactions={transactions} 
                diaryEntries={diaryEntries}
                isPrivacyMode={isPrivacyMode}
                onTogglePrivacyMode={togglePrivacyMode}
                onPatientSelect={(id) => { setSelectedPatient(id); setActiveTab('pacientes'); }} 
                onGoToAgenda={() => setActiveTab('agenda')}
                onGoToFinanceiro={() => setActiveTab('financeiro')}
                onGoToPacientes={() => { setSelectedPatient(null); setActiveTab('pacientes'); }}
                onDeletePatient={handleDeletePatient}
                onGoToPortalTab={(patientId, tab) => {
                  setPortalInitialPatientId(patientId);
                  setPortalInitialSubTab(tab);
                  setActiveTab('area-paciente');
                }}
                hasAcceptedExtensionTerms={hasAcceptedExtensionTerms}
                onOpenExtensionModal={() => setShowExtensionModal(true)}
                isExtensionBannerDismissed={isExtensionBannerDismissed}
                onDismissExtensionBanner={() => {
                  setIsExtensionBannerDismissed(true);
                  safeSetStorage('simplepsi_meet_banner_dismissed', 'true');
                }}
                isMigrationAllowed={isMigrationAllowed}
                isMigrationBannerDismissed={isMigrationBannerDismissed}
                onDismissMigrationBanner={() => {
                  setIsMigrationBannerDismissed(true);
                  safeSetStorage('simplepsi_migration_banner_dismissed', 'true');
                }}
                onOpenMigrationModal={() => setShowMigrationModal(true)}
                effectivePlan={effectivePlan}
                onOpenUpgradeModal={openUpgradeModalWithReason}
              />
            )}

            {(activeTab === 'supervisao') && currentClinic && (
              <ClinicSupervisionView 
                key="clinic-supervision-tab"
                clinic={currentClinic}
                currentMember={currentClinicMember}
                members={clinicMembers}
                patients={patients}
                sessions={clinicSessions}
              />
            )}

            {activeTab === 'pacientes' && !selectedPatient && (
              <PatientsListView 
                key="patients-list" 
                isPT={isPT}
                filteredPatients={filteredPatients} 
                onSelect={setSelectedPatient} 
                onAddClick={() => {
                  if (isPatientLimitReached) {
                    openUpgradeModalWithReason(
                      isPT
                        ? (effectivePlan === 'consultorio' 
                            ? 'Atingiu o limite de 15 utentes do plano Consultório. Atualize para o plano Ilimitado!' 
                            : 'Atingiu o limite de 5 utentes do plano Start (Gratuito). Atualize para registar novos utentes!')
                        : (effectivePlan === 'consultorio' 
                            ? 'Você atingiu o limite de 15 pacientes do plano Consultório. Faça o upgrade para o plano Ilimitado!' 
                            : 'Você atingiu o limite de 5 pacientes do plano Start (Gratuito). Faça o upgrade para cadastrar novos pacientes!')
                    );
                  } else {
                    setIsAddingPatient(true);
                  }
                }}
                onDeletePatient={handleDeletePatient}
                onUpdatePatient={handleUpdatePatient}
                onGoToAgenda={() => setActiveTab('agenda')}
                isMigrationAllowed={isMigrationAllowed}
                onOpenMigrationModal={() => setShowMigrationModal(true)}
                currentClinic={currentClinic}
                clinicMembers={clinicMembers}
                clinicRole={clinicRole}
                currentClinicMember={currentClinicMember}
                effectivePlan={effectivePlan}
                maxPatientsAllowed={maxPatientsAllowed}
                onOpenUpgradeModal={openUpgradeModalWithReason}
              />
            )}
            {activeTab === 'pacientes' && selectedPatient && (
              <PatientDetailsView 
                key="patient-detail" 
                patientId={selectedPatient} 
                patients={patients} 
                sessions={sessions}
                currentUserEmail={user?.email || ''}
                documents={patientDocuments[selectedPatient] || []}
                onUpload={(file, category) => handleUploadDocument(selectedPatient, file, category)}
                onDeleteDocument={(docId) => handleDeleteDocument(selectedPatient, docId)}
                onUpdatePatient={handleUpdatePatient}
                onDeletePatient={handleDeletePatient}
                onBack={() => setSelectedPatient(null)} 
                profileSettings={profileSettings}
                hasAcceptedExtensionTerms={hasAcceptedExtensionTerms}
                onOpenExtensionModal={() => setShowExtensionModal(true)}
                clinicRole={clinicRole}
                currentClinic={currentClinic}
                currentClinicMember={currentClinicMember}
                clinicMembers={clinicMembers}
                checkAndConsumeDailyAiUsage={checkAndConsumeDailyAiUsage}
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
                sessions={sessions}
                currentUserEmail={user?.email || ''}
                defaultSubTab="biblioteca"
                documents={patientDocuments[selectedPatient] || []}
                onUpload={(file, category) => handleUploadDocument(selectedPatient, file, category)}
                onDeleteDocument={(docId) => handleDeleteDocument(selectedPatient, docId)}
                onUpdatePatient={handleUpdatePatient}
                onDeletePatient={handleDeletePatient}
                onBack={() => setSelectedPatient(null)} 
                profileSettings={profileSettings}
                hasAcceptedExtensionTerms={hasAcceptedExtensionTerms}
                onOpenExtensionModal={() => setShowExtensionModal(true)}
                clinicRole={clinicRole}
                currentClinic={currentClinic}
                currentClinicMember={currentClinicMember}
                clinicMembers={clinicMembers}
                checkAndConsumeDailyAiUsage={checkAndConsumeDailyAiUsage}
              />
            )}

            {activeTab === 'financeiro' && currentClinic ? (
              <ClinicFinanceView 
                key="clinic-finance"
                clinic={currentClinic}
                members={clinicMembers}
                sessions={clinicSessions}
                currentMember={currentClinicMember}
                onUpdateSession={(updated) => {
                  setClinicSessions(addOrUpdateClinicSession(currentClinic.id, updated));
                }}
                onUpdateClinic={(updatedClinic) => {
                  setCurrentClinic(updatedClinic);
                  applyClinicTheme(updatedClinic.theme);
                }}
              />
            ) : activeTab === 'financeiro' && (
              <FinanceView 
                key="finance" 
                sessions={sessions} 
                transactions={transactions} 
                patients={patients} 
                onUpdateSession={handleUpdateSession}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteSession={handleDeleteSession}
                isPT={isPT}
              />
            )}

            {/* Agenda Geral da Clínica vs Agenda Pessoal */}
            {(activeTab === 'agenda-clinica' || (activeTab === 'agenda' && currentClinic && (clinicRole === 'clinic_admin' || clinicRole === 'receptionist' || clinicRole === 'supervisor'))) && currentClinic && (
              <ClinicMasterAgendaView 
                key="clinic-master-agenda"
                clinic={currentClinic}
                members={clinicMembers}
                sessions={clinicSessions}
                patients={patients}
                onAddSession={(newSession) => {
                  setClinicSessions(addOrUpdateClinicSession(currentClinic.id, newSession as Session));
                }}
                onUpdateSession={(updated) => {
                  setClinicSessions(addOrUpdateClinicSession(currentClinic.id, updated));
                }}
                onDeleteSession={(sId) => {
                  setClinicSessions(deleteClinicSession(currentClinic.id, sId));
                }}
                currentMember={currentClinicMember}
              />
            )}

            {activeTab === 'agenda' && (!currentClinic || (clinicRole !== 'clinic_admin' && clinicRole !== 'receptionist' && clinicRole !== 'supervisor')) && (
              <CalendarView 
                key="calendar" 
                sessions={displayedPersonalSessions} 
                patients={patients} 
                onAddSession={handleAddSession}
                onDeleteSession={handleDeleteSession}
                onUndo={handleUndo}
                lastAction={lastAction}
                isGoogleCalendarEnabled={profileSettings.isGoogleCalendarEnabled}
                googleAccessToken={googleAccessToken}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSyncGoogleCalendar={handleManualSyncGoogleCalendar}
                onConnectGoogleCalendar={handleConnectGoogleCalendar}
                onTriageToPatient={(name, day, time, sessionId) => {
                  setTriageInitialName(name);
                  setTriageInitialDay(day);
                  setTriageInitialTime(time);
                  setTriageInitialSessionId(sessionId || '');
                  setIsAddingPatient(true);
                }}
                isScheduleAutonomyDisabled={Boolean(currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.allowPsychologistManageAgenda === false)}
                onOpenWhatsAppReminders={() => setActiveTab('whatsapp-lembretes')}
                isWhatsAppAdmin={Boolean(user?.email && user.email.toLowerCase().trim() === 'wellcoutinho99@gmail.com')}
                isPT={isPT}
              />
            )}

            {activeTab === 'whatsapp-lembretes' && (
              <WhatsAppRemindersPanel
                key="whatsapp-lembretes"
                user={user}
                sessions={displayedPersonalSessions}
                patients={patients}
                profileSettings={profileSettings}
                effectivePlan={effectivePlan}
                onOpenUpgradeModal={() => openUpgradeModalWithReason(
                  profileSettings?.country === 'PT'
                    ? 'Efetue upgrade para o Plano Ilimitado Pro para desbloquear lembretes automáticos no dia da consulta (D-0) com ligação do Google Meet!'
                    : 'Faça upgrade para o Plano Ilimitado Pro para desbloquear lembretes automáticos no dia da sessão (D-0) com link do Google Meet!'
                )}
              />
            )}
            
            {activeTab === 'import-transcript' && (
              <ImportTranscriptView 
                key="import-transcript" 
                patients={patients}
                clinicalApproach={profileSettings.clinicalApproach || 'tcc'}
                onOpenExtensionModal={() => setShowExtensionModal(true)}
                isTranscriptionDisabled={Boolean(currentClinic && clinicRole === 'psychologist' && (currentClinic.settings?.aiSettings?.enabled === false || currentClinic.settings?.aiSettings?.allowTranscription === false))}
                onSaveSession={async (patientId, date, time, duration, amount, type, note) => {
                  try {
                    const p = patients.find(pat => pat.id === patientId);
                    const existingSession = sessions.find(s => s.patientId === patientId && s.date === date && s.status === 'Agendada');
                    
                    let isScheduledDay = false;
                    if (p && p.sessionDay) {
                      const dObj = new Date(date + 'T12:00:00');
                      const dayName = format(dObj, 'eeee', { locale: ptBR });
                      const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                      if (p.sessionDay === capitalized) {
                        isScheduledDay = true;
                      }
                    }

                    let sessionId = '';
                    let createdOrUpdatedSession = false;

                    if (existingSession) {
                      await updateDoc(doc(db, 'sessions', existingSession.id), {
                        status: 'Realizada',
                        updatedAt: new Date().toISOString(),
                        amount: parseFloat(amount) || existingSession.amount || 0
                      });
                      sessionId = existingSession.id;
                      createdOrUpdatedSession = true;
                    } else if (isScheduledDay) {
                      const sessionData: any = {
                        patientId,
                        date,
                        time,
                        duration,
                        type,
                        status: 'Realizada',
                        ownerId: user.uid,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        amount: parseFloat(amount) || 0,
                        cost: 0,
                        paid: false,
                        nfIssued: false
                      };
                      const sessionRef = await addDoc(collection(db, 'sessions'), sessionData);
                      sessionId = sessionRef.id;
                      createdOrUpdatedSession = true;
                    }
                    
                    if (p) {
                      const evolucoes = p.clinicalData?.evoluções || [];
                      const nextSessionNum = (evolucoes.length > 0 ? Math.max(...evolucoes.map(e => e.sessionNumber || 0)) : 0) + 1;
                      
                      const newEvo = {
                        id: sessionId || 'evo_' + Date.now(),
                        date: date.split('-').reverse().join('/'),
                        time,
                        sessionNumber: nextSessionNum,
                        note: note
                      };
                      
                      const updatedEvolucoes = [newEvo, ...evolucoes];
                      
                      await updateDoc(doc(db, 'patients', p.id), {
                        sessions: (parseInt(p.sessions as any) || 0) + 1,
                        lastSession: date.split('-').reverse().join('/'),
                        "clinicalData.evoluções": updatedEvolucoes,
                        updatedAt: new Date().toISOString()
                      });
                    }
                    
                    setSelectedPatient(patientId);
                    setActiveTab('pacientes');
                    
                    if (createdOrUpdatedSession) {
                      alert("Transcrição importada e sessão registrada com sucesso!");
                    } else {
                      alert("Transcrição importada como relato de evolução com sucesso! (Nenhuma sessão financeira foi criada para este dia não agendado)");
                    }

                    // Limpa o storage da extensão
                    window.dispatchEvent(new CustomEvent("simplepsi-clear-transcript"));
                  } catch (err: any) {
                    alert("Erro ao salvar a sessão: " + err.message);
                  }
                }}
                onCancel={() => {
                  setActiveTab('dashboard');
                  // Limpa o storage da extensão
                  window.dispatchEvent(new CustomEvent("simplepsi-clear-transcript"));
                }}
              />
            )}

            {activeTab === 'area-paciente' && (
              <PsychologistPatientPortalView 
                key="psychologist-patient-portal"
                user={user}
                patients={patients}
                initialPatientId={portalInitialPatientId}
                initialSubTab={portalInitialSubTab}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPanel key="admin" />
            )}
          </AnimatePresence>
        </div>

        {/* Add Patient Modal */}
        <AnimatePresence>
          {isAddingPatient && (
            <AddPatientModal 
              isPT={isPT}
              initialName={triageInitialName}
              initialDay={triageInitialDay}
              initialTime={triageInitialTime}
              currentClinic={currentClinic}
              clinicMembers={clinicMembers}
              clinicRole={clinicRole}
              currentClinicMember={currentClinicMember}
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
              hasAcceptedExtensionTerms={hasAcceptedExtensionTerms}
              onOpenExtensionModal={() => setShowExtensionModal(true)}
              onSave={async (data: any) => {
                if (user) {
                  try {
                    const isWellington = user.email?.toLowerCase().trim() === 'wellcoutinho99@gmail.com' || user.email?.toLowerCase().trim() === 'juniorcoutinho58@gmail.com';
                    const targetCountry = isWellington ? 'BR' : (data.country || 'BR');
                    await setDoc(doc(db, 'profiles', user.uid), {
                      ...data,
                      email: user.email || data.email,
                      country: targetCountry,
                      updatedAt: serverTimestamp()
                    }, { merge: true });
                    safeSetStorage('prof_country', targetCountry);
                    if (targetCountry === 'BR') {
                      safeSetStorage('simplepsi_country', 'BR');
                      setCurrentCountry('BR');
                    }

                    // Propagar dados de Pix imediatamente para os portais dos pacientes
                    try {
                      const qUserPortals = query(collection(db, 'patient_portal'), where('ownerId', '==', user.uid));
                      const userPortalsSnap = await getDocs(qUserPortals);
                      if (!userPortalsSnap.empty) {
                        const portalBatch = writeBatch(db);
                        userPortalsSnap.forEach(pDoc => {
                          portalBatch.update(pDoc.ref, {
                            pixKey: data.pixKey || '',
                            pixType: data.pixType || '',
                            pixName: data.pixName || data.name || '',
                            updatedAt: new Date().toISOString()
                          });
                        });
                        await portalBatch.commit();
                      }
                    } catch (portalSyncErr) {
                      console.warn("Aviso ao sincronizar Pix nos portais:", portalSyncErr);
                    }

                    // setProfileSettings will be updated by the onSnapshot listener
                    setIsSettingsOpen(false);
                  } catch (err) {
                    console.error("Erro ao salvar perfil:", err);
                    alert("Erro ao salvar configurações do perfil no banco de dados.");
                  }
                } else {
                  // Fallback to storage if no user
                  safeSetStorage('prof_name', data.name);
                  safeSetStorage('prof_crp', data.crp);
                  safeSetStorage('prof_logo', data.logo);
                  safeSetStorage('prof_approach', data.clinicalApproach || 'tcc');
                  safeSetStorage('prof_cpf_cnpj', data.cpfCnpj || '');
                  safeSetStorage('prof_address', data.address || '');
                  safeSetStorage('prof_phone', data.phone || '');
                  safeSetStorage('prof_signature_text', data.signatureText || '');
                  safeSetStorage('prof_pix_key', data.pixKey || '');
                  safeSetStorage('prof_pix_type', data.pixType || '');
                  safeSetStorage('prof_pix_name', data.pixName || '');
                  setProfileSettings(data);
                  setIsSettingsOpen(false);
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Modal da Extensão do Google Meet */}
        <GoogleMeetExtensionModal 
          isOpen={showExtensionModal}
          onClose={() => setShowExtensionModal(false)}
          hasAccepted={hasAcceptedExtensionTerms}
          onAccept={() => {
            setHasAcceptedExtensionTerms(true);
            safeSetStorage("simplepsi_meet_extension_consent", "true");
          }}
        />

        {/* Modal de Upgrade de Plano e Assinatura Stripe */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeReason(undefined);
          }}
          userId={user?.uid}
          userEmail={user?.email || ''}
          currentPlan={effectivePlan}
          isTrial={profileSettings?.isTrial && trialRemainingDays >= 0}
          trialDaysRemaining={Math.max(0, trialRemainingDays)}
          hasStripeCustomer={Boolean(profileSettings?.subscription?.stripeCustomerId)}
          limitReason={upgradeReason}
          country={profileSettings?.country || currentCountry}
        />

        {/* Modal de Ideias de Conteúdo para Redes Sociais (Radar Clínico Pro) */}
        <ContentIdeasModal
          isOpen={isContentIdeasModalOpen}
          onClose={() => setIsContentIdeasModalOpen(false)}
          patients={patients}
          user={user}
        />

        {/* Modal de Gestão da Equipe da Clínica (B2B) */}
        {currentClinic && (
          <ClinicTeamModal
            isOpen={isClinicTeamModalOpen}
            onClose={() => setIsClinicTeamModalOpen(false)}
            clinic={currentClinic}
            onUpdateClinic={(updated) => {
              setCurrentClinic(updated);
              applyClinicTheme(updated.theme);
            }}
            currentUserEmail={user?.email || ''}
          />
        )}

        {/* Modal de Migração de Dados (Apenas para Contas de Teste Autorizadas) */}
        {isMigrationAllowed && showMigrationModal && (
          <Suspense fallback={null}>
            <DataMigrationModal 
              isOpen={showMigrationModal}
              onClose={() => setShowMigrationModal(false)}
              currentUserId={user?.uid || ''}
              currentUserEmail={user?.email || ''}
              onSuccess={() => {
                setShowMigrationModal(false);
                setActiveTab('pacientes');
                setSelectedPatient(null);
              }}
            />
          </Suspense>
        )}

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
                      href={`https://wa.me/5511939215473?text=${encodeURIComponent(
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
  diaryEntries,
  onGoToAgenda,
  onGoToFinanceiro,
  onGoToPacientes,
  onDeletePatient,
  onGoToPortalTab,
  hasAcceptedExtensionTerms = false,
  onOpenExtensionModal,
  isExtensionBannerDismissed = false,
  onDismissExtensionBanner,
  isMigrationAllowed = false,
  isMigrationBannerDismissed = false,
  onDismissMigrationBanner,
  onOpenMigrationModal,
  isPrivacyMode = false,
  onTogglePrivacyMode,
  effectivePlan = 'free',
  onOpenUpgradeModal
}: { 
  user: User | null,
  onPatientSelect: (id: string) => void, 
  patients: any[],
  filteredPatients: any[], 
  sessions: any[], 
  transactions: any[],
  diaryEntries: DiaryEntry[],
  onGoToAgenda: () => void,
  onGoToFinanceiro: () => void,
  onGoToPacientes: () => void,
  onDeletePatient: (id: string) => void,
  onGoToPortalTab: (patientId: string, tab: 'pdfs' | 'safety' | 'diary' | 'access') => void,
  hasAcceptedExtensionTerms?: boolean,
  onOpenExtensionModal?: () => void,
  isExtensionBannerDismissed?: boolean,
  onDismissExtensionBanner?: () => void,
  isMigrationAllowed?: boolean,
  isMigrationBannerDismissed?: boolean,
  onDismissMigrationBanner?: () => void,
  onOpenMigrationModal?: () => void,
  isPrivacyMode?: boolean,
  onTogglePrivacyMode?: () => void,
  effectivePlan?: string,
  onOpenUpgradeModal?: (reason?: string) => void
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDayPayments, setSelectedDayPayments] = useState<any[]>([]);
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    // Registra que as novidades já foram exibidas no dashboard para nunca mais reaparecerem em sessões futuras
    safeSetStorage('simplepsi_meet_banner_dismissed', 'true');
    safeSetStorage('simplepsi_migration_banner_dismissed', 'true');
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday
  
  const dayCells = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [monthStart, monthEnd]);

  // Compute all scheduled payments in the selected month
  const monthPayments = useMemo(() => {
    const list: Array<{
      date: Date;
      patient: any;
      amount: number;
      periodicity: string;
    }> = [];

    const weekdaysNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    const getWeekdayOccurrencesInMonth = (weekdayName: string) => {
      return daysInMonth.filter(d => weekdaysNames[d.getDay()] === weekdayName).length;
    };

    patients.forEach(p => {
      if (p.status === 'Inativo') return;
      if (!p.paymentPeriodicity) return;

      const amountPerSession = parseFloat(p.amount) || 0;

      // 1. Determine session count in this month
      const activeSessions = sessions.filter(s => s.patientId === p.id && s.date >= monthStartStr && s.date <= monthEndStr && s.status !== 'Cancelada');
      let sessionCount = 0;
      if (activeSessions.length > 0) {
        sessionCount = activeSessions.length;
      } else {
        // Fallback to occurrences of sessionDay in the month, or 4 if not set
        const targetSessionDay = p.sessionDay || 'Segunda-feira';
        sessionCount = getWeekdayOccurrencesInMonth(targetSessionDay) || 4;
      }

      // 2. Add payments based on periodicity
      if (p.paymentPeriodicity === 'Mensal') {
        const targetDay = p.paymentDay1 || 5;
        const monthDaysCount = monthEnd.getDate();
        
        let dayNum = targetDay;
        if (targetDay > monthDaysCount) {
          dayNum = monthDaysCount;
        }
        const payDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
        const payValue = 4 * amountPerSession;
        list.push({ date: payDate, patient: p, amount: payValue, periodicity: 'Mensal' });

      } else if (p.paymentPeriodicity === 'Quinzenal') {
        const targetDay1 = p.paymentDay1 || 5;
        const targetDay2 = p.paymentDay2 || 20;
        const monthDaysCount = monthEnd.getDate();
        const payValue = 2 * amountPerSession;

        // First payment
        let dayNum1 = targetDay1;
        if (targetDay1 > monthDaysCount) dayNum1 = monthDaysCount;
        const payDate1 = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum1);
        list.push({ date: payDate1, patient: p, amount: payValue, periodicity: 'Quinzenal' });

        // Second payment
        let dayNum2 = targetDay2;
        if (targetDay2 > monthDaysCount) dayNum2 = monthDaysCount;
        const payDate2 = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum2);
        list.push({ date: payDate2, patient: p, amount: payValue, periodicity: 'Quinzenal' });

      } else if (p.paymentPeriodicity === 'Semanal') {
        const targetWeekday = p.paymentWeekday || p.sessionDay || 'Segunda-feira';
        const paymentDays = daysInMonth.filter(d => weekdaysNames[d.getDay()] === targetWeekday);
        const payValue = 1 * amountPerSession;

        paymentDays.forEach(day => {
          list.push({ date: day, patient: p, amount: payValue, periodicity: 'Semanal' });
        });

      } else if (p.paymentPeriodicity === 'Por Sessão') {
        if (activeSessions.length > 0) {
          activeSessions.forEach(s => {
            const payDate = new Date(s.date + 'T12:00:00');
            list.push({ date: payDate, patient: p, amount: amountPerSession, periodicity: 'Por Sessão' });
          });
        } else {
          const targetSessionDay = p.sessionDay || 'Segunda-feira';
          const fallbackDays = daysInMonth.filter(d => weekdaysNames[d.getDay()] === targetSessionDay);
          fallbackDays.forEach(day => {
            list.push({ date: day, patient: p, amount: amountPerSession, periodicity: 'Por Sessão' });
          });
        }
      }
    });

    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    return list;
  }, [daysInMonth, patients, sessions, monthEnd, monthStart, currentDate]);

  const totalForecast = useMemo(() => {
    return monthPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [monthPayments]);

  const validSessions = useMemo(() => {
    return sessions.filter(s => s.isTriage || patients.some(p => p.id === s.patientId));
  }, [sessions, patients]);

  const validTransactions = useMemo(() => {
    return transactions.filter(t => patients.some(p => p.id === t.patientId));
  }, [transactions, patients]);

  const getAgendaSlotsForInterval = (start: Date, end: Date) => {
    const slots: any[] = [];
    const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
    const weekdaysNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    days.forEach(day => {
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

          const pRecurrenceStart = p.recurrenceStart ? new Date(p.recurrenceStart + 'T12:00:00') : new Date((p as any).createdAt || p.birthDate || '2024-01-01');
          if (startOfDay(day) < startOfDay(pRecurrenceStart)) return;
          const weeksDiff = Math.abs(differenceInWeeks(startOfDay(day), startOfDay(pRecurrenceStart)));
          
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
              sessionValue: p.amount || 0
            });
          }
        }
      });
    });

    return slots;
  };

  const getFutureAgendaSlots = (daysCount: number) => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + daysCount - 1);
    return getAgendaSlotsForInterval(today, end);
  };

  const sessionsTodayCount = useMemo(() => {
    const today = new Date();
    return getAgendaSlotsForInterval(today, today).length;
  }, [sessions, patients]);

  const weeklySessionsCount = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const end = endOfWeek(new Date(), { weekStartsOn: 0 });
    return getAgendaSlotsForInterval(start, end).length;
  }, [sessions, patients]);

  const monthlyPredictedIncome = useMemo(() => {
    return calculateIncomePrediction(startOfMonth(new Date()), endOfMonth(new Date()), sessions, patients);
  }, [sessions, patients]);

  const upcomingAgenda = useMemo(() => {
    const now = new Date();
    const futureSlots = getFutureAgendaSlots(30);
    return futureSlots
      .filter(s => {
        const d = new Date(s.date + 'T' + (s.time || '00:00'));
        return d >= startOfDay(now) && s.status !== 'Cancelada';
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
  }, [sessions, patients]);

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
        } else if (p.birthDate.includes('-')) {
          const [y, m, d] = p.birthDate.split('-');
          bDay = parseInt(d);
          bMonth = parseInt(m) - 1;
        } else {
          const d = new Date(p.birthDate + 'T12:00:00');
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

      {/* Banner da Extensão do Google Meet */}
      {!isExtensionBannerDismissed && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/20 via-primary/10 to-surface-muted border border-primary/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative shadow-lg shadow-primary/5 text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/25 mt-0.5">
              <Video size={24} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-primary text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Novidade Oficial
                </span>
                <h4 className="text-sm sm:text-base font-bold text-text-main">
                  Transcreva suas consultas online pelo Google Meet
                </h4>
              </div>
              <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
                Instale nossa extensão oficial para o Google Chrome. Ela captura as falas com 100% de sigilo local e gera a evolução clínica na sua abordagem em 1 clique.
              </p>
              <p className="text-[10.5px] text-primary font-bold">
                ⭐ * Requisito: manter legendas ativadas em Português no Google Meet durante a chamada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={onOpenExtensionModal}
              className="flex-1 md:flex-none px-5 py-3 bg-primary text-white hover:opacity-90 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Chrome size={15} />
              Ativar Extensão
            </button>
            {onDismissExtensionBanner && (
              <button
                type="button"
                onClick={onDismissExtensionBanner}
                className="p-3 text-text-muted hover:text-text-main rounded-2xl hover:bg-surface-muted transition-colors cursor-pointer"
                title="Dispensar do Dashboard"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Banner de Migração de Dados (Apenas Contas Autorizadas) */}
      {isMigrationAllowed && !isMigrationBannerDismissed && (
        <div className="bg-gradient-to-r from-primary/15 via-surface-muted to-card border border-primary/25 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30 shadow-md shadow-primary/10">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-text-main uppercase tracking-tight">
                  Migração Mágica de Prontuários (BETA)
                </h4>
                <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Disponível para seu perfil
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Arraste seus PDFs de prontuários ou planilhas de pacientes para importar cadastros e histórico clínico automaticamente com IA.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={onOpenMigrationModal}
              className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white hover:opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <Upload size={14} />
              Testar Migração
            </button>
            {onDismissMigrationBanner && (
              <button
                type="button"
                onClick={onDismissMigrationBanner}
                className="p-2.5 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-muted transition-colors cursor-pointer"
                title="Dispensar do Dashboard"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard onClick={onGoToAgenda} title="Sessões Hoje" value={sessionsTodayCount.toString()} subtext="Agendadas para hoje" icon={CalendarIcon} color="text-purple-400" isBlurred={isPrivacyMode} />
        <StatCard onClick={onGoToPacientes} title="Pacientes Ativos" value={patients.filter(p => p.status !== 'Inativo').length.toString()} subtext="Gestão total" icon={Users} color="text-blue-400" isBlurred={isPrivacyMode} />
        <StatCard onClick={onGoToFinanceiro} title="Receita Mensal Prevista" value={formatCurrency(monthlyPredictedIncome)} subtext="Previsão baseada em sessões" icon={DollarSign} color="text-pink-400" isBlurred={isPrivacyMode} />
        <StatCard onClick={onGoToAgenda} title="Agendamentos da Semana" value={weeklySessionsCount.toString()} subtext="Sessões nesta semana" icon={BarChart3} color="text-orange-400" isBlurred={isPrivacyMode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Agenda */}
        <section className="glass-card rounded-3xl p-6 flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CalendarIcon size={20} className="text-primary" />
              Agenda Próxima
            </h3>
            <span className="text-xs text-text-muted">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 min-h-0 relative">
             <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">Próximos Horários</p>
             {upcomingAgenda.slice(0, 15).map(session => {
               const p = patients.find(pat => pat.id === session.patientId);
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
                      <div className="flex items-center gap-2">
                        <p className={cn("font-medium text-text-main uppercase transition-all", isPrivacyMode && "privacy-blur")}>{p?.name || session.triageName || 'PACIENTE'}</p>
                        {!isPrivacyMode && p?.phone && getWhatsAppLink(p.phone) && (
                          <a 
                            href={getWhatsAppLink(p.phone)!} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-green-500 hover:text-green-400 p-1 transition-colors flex items-center justify-center rounded-lg hover:bg-green-500/10 cursor-pointer"
                            title="Conversar no WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                            </svg>
                          </a>
                        )}
                      </div>
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
          </div>
          <button onClick={onGoToAgenda} className="w-full py-3 text-sm text-text-muted hover:text-text-main border-t border-white/5 mt-4 shrink-0">Ver Agenda Completa</button>
        </section>

        {/* Recent Patients */}
        <section className="glass-card rounded-3xl p-6 flex flex-col h-[480px]">
           <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              Alertas Clínicos
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 min-h-0 relative">
             <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">Alertas</p>
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
                    <p className={cn("text-sm font-bold text-text-main uppercase tracking-tight transition-all", isPrivacyMode && "privacy-blur")}>{alert.title}</p>
                    <p className={cn("text-xs text-text-muted transition-all", isPrivacyMode && "privacy-blur")}>{alert.text}</p>
                  </div>
                  <ChevronRight size={18} className="text-text-muted group-hover:text-primary transition-colors" />
               </div>
             )) : (
               <div className="py-12 text-center bg-card/30 rounded-2xl border border-dashed border-border-ui h-full flex flex-col justify-center">
                 <Sparkles size={32} className="mx-auto text-primary/20 mb-3" />
                 <p className="text-xs text-text-muted">Tudo em dia! Nenhum alerta pendente.</p>
               </div>
             )}
          </div>
        </section>
      </div>

      {/* Central de Relatos e Humor dos Pacientes */}
      <section className="glass-card rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Smile size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                Relatos e Humor dos Pacientes
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Acompanhe as últimas atualizações e sentimentos enviados pelos pacientes no portal.
              </p>
            </div>
          </div>
        </div>

        {diaryEntries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diaryEntries.slice(0, 4).map((entry) => {
              const p = patients.find((pat) => pat.id === entry.patientId);
              const getMoodBadgeColor = (mood: number) => {
                if (mood >= 8) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if (mood >= 5) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              };
              
              return (
                <div
                  key={entry.id}
                  onClick={() => onGoToPortalTab(entry.patientId, 'diary')}
                  className="p-4 rounded-2xl bg-surface-muted border border-border-ui hover:bg-white/5 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={cn("text-xs font-bold text-text-main uppercase group-hover:text-primary transition-all", isPrivacyMode && "privacy-blur")}>
                        {p?.name || 'Paciente'}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {entry.date ? entry.date.split('-').reverse().join('/') : ''}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                      getMoodBadgeColor(entry.mood)
                    )}>
                      Humor: {entry.mood}/10
                    </span>
                  </div>
                  <p className={cn("text-xs text-text-muted leading-relaxed italic border-l-2 border-primary/20 pl-2 line-clamp-2 transition-all", isPrivacyMode && "privacy-blur-strong")}>
                    "{entry.text || 'Sem anotações escritas.'}"
                  </p>
                  <div className="flex items-center justify-end text-[10px] font-bold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-opacity gap-1 mt-1">
                    <span>Ver Diário Completo</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-card/30 rounded-2xl border border-dashed border-border-ui">
            <Smile size={32} className="mx-auto text-text-muted/20 mb-2" />
            <p className="text-xs text-text-muted">Nenhum relato ou atualização recente enviada pelos pacientes.</p>
          </div>
        )}
      </section>

      {/* Calendário de Recebimentos de Pacientes */}
      <section className="glass-card rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center flex-shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                Calendário de Recebimentos
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Acompanhe a escala e datas de pagamento configuradas para seus pacientes.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Mês */}
            <div className="flex items-center gap-1.5 bg-surface-muted p-1 rounded-xl border border-white/5 shadow-sm">
              <button 
                onClick={() => {
                  setCurrentDate(prev => subMonths(prev, 1));
                  setSelectedDayPayments([]);
                  setSelectedDayLabel('');
                  setSelectedDate(null);
                }} 
                className="p-1.5 rounded-lg hover:bg-border-ui text-text-muted hover:text-text-main transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider min-w-[90px] text-center text-text-main">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button 
                onClick={() => {
                  setCurrentDate(prev => addMonths(prev, 1));
                  setSelectedDayPayments([]);
                  setSelectedDayLabel('');
                  setSelectedDate(null);
                }} 
                className="p-1.5 rounded-lg hover:bg-border-ui text-text-muted hover:text-text-main transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Alternador de Modo de Visualização */}
            <div className="flex bg-surface-muted p-1 rounded-xl border border-white/5 shadow-sm">
              <button 
                onClick={() => setViewMode('grid')} 
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all", 
                  viewMode === 'grid' ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
                )}
              >
                Grade
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all", 
                  viewMode === 'list' ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
                )}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        {/* Resumo/Previsão Financeira */}
        <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] text-green-400 uppercase tracking-widest font-bold">Previsão de Entrada (Este Mês)</p>
            <p className="text-sm text-text-muted">Projeção calculada com base na frequência e valores combinados.</p>
          </div>
          <div className="text-left sm:text-right">
            <span className={cn("text-xl font-bold text-green-400 transition-all", isPrivacyMode && "privacy-blur-strong")}>{formatCurrency(totalForecast)}</span>
            <p className="text-[9px] text-text-muted uppercase tracking-wider mt-0.5">{monthPayments.length} vencimentos previstos</p>
          </div>
        </div>

        {viewMode === 'grid' ? (
          /* Visualização de Grade Mensal */
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-white/5 pb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {dayCells.map((day, idx) => {
                const inMonth = isSameMonth(day, currentDate);
                const dayDateStr = format(day, 'yyyy-MM-dd');
                const dayPayments = monthPayments.filter(p => format(p.date, 'yyyy-MM-dd') === dayDateStr);
                const isSelected = selectedDate && isSameDay(day, selectedDate) && inMonth;

                return (
                  <div 
                    key={idx}
                    onClick={() => {
                      if (!inMonth) return;
                      if (dayPayments.length > 0) {
                        setSelectedDayPayments(dayPayments);
                        setSelectedDayLabel(format(day, "dd 'de' MMMM", { locale: ptBR }));
                        setSelectedDate(day);
                      } else {
                        setSelectedDayPayments([]);
                        setSelectedDayLabel('');
                        setSelectedDate(null);
                      }
                    }}
                    className={cn(
                      "p-2 border rounded-2xl min-h-[60px] sm:min-h-[75px] flex flex-col justify-between transition-all select-none relative",
                      !inMonth ? "opacity-15 bg-transparent border-transparent" : "bg-surface-muted/30 border-white/5 cursor-pointer hover:bg-surface-muted/65",
                      isToday(day) && "border-primary bg-primary/5 shadow-inner shadow-primary/5",
                      isSelected && "border-green-500 bg-green-500/5 shadow-inner shadow-green-500/5"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold", 
                      isToday(day) ? "text-primary" : "text-text-muted"
                    )}>
                      {day.getDate()}
                    </span>

                    {dayPayments.length > 0 && inMonth && (
                      <div className="flex flex-col gap-0.5 w-full">
                        {/* Desktop: Mostrar Nomes e Valores */}
                        <div className="hidden md:flex flex-col gap-0.5 w-full">
                          {dayPayments.slice(0, 2).map((p, pIdx) => (
                            <span 
                              key={pIdx}
                              className={cn("text-[7.5px] font-medium leading-tight bg-green-500/10 text-green-400 border border-green-500/10 px-1 rounded truncate w-full transition-all", isPrivacyMode && "privacy-blur")}
                            >
                              {p.patient.name.split(' ')[0]}
                            </span>
                          ))}
                          {dayPayments.length > 2 && (
                            <span className="text-[7px] text-text-muted text-center font-bold">+{dayPayments.length - 2}</span>
                          )}
                        </div>

                        {/* Mobile: Mostrar apenas Bolinha Verde */}
                        <div className="md:hidden flex items-center justify-center pt-1.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Painel Detalhado de Recebimento do Dia Selecionado */}
            <AnimatePresence mode="wait">
              {selectedDayPayments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-4 bg-background border border-border-ui rounded-2xl text-left space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Recebimentos para: <span className="text-text-main font-black">{selectedDayLabel}</span>
                    </p>
                    <button 
                      onClick={() => {
                        setSelectedDayPayments([]);
                        setSelectedDayLabel('');
                        setSelectedDate(null);
                      }}
                      className="text-[9px] text-text-muted hover:text-text-main font-bold uppercase tracking-wider"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDayPayments.map((p, idx) => (
                      <div 
                        key={idx}
                        onClick={() => onPatientSelect(p.patient.id)}
                        className="p-3 bg-surface-muted hover:bg-white/5 border border-border-ui rounded-xl flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="overflow-hidden">
                          <p className={cn("text-xs font-bold text-text-main group-hover:text-primary transition-all truncate", isPrivacyMode && "privacy-blur")}>{p.patient.name}</p>
                          <p className="text-[9px] text-text-muted uppercase tracking-wider mt-0.5">{p.periodicity}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {!isPrivacyMode && p.patient.phone && getWhatsAppLink(p.patient.phone) && (
                            <a 
                              href={getWhatsAppLink(p.patient.phone)!} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-green-500 hover:text-green-400 p-1.5 transition-colors flex items-center justify-center rounded-lg hover:bg-green-500/10 cursor-pointer"
                              title="Conversar no WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                              </svg>
                            </a>
                          )}
                          <span className={cn("text-xs font-bold text-green-400 shrink-0 transition-all", isPrivacyMode && "privacy-blur-strong")}>{formatCurrency(p.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Visualização de Lista / Fila Cronológica */
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
            {monthPayments.map((p, idx) => (
              <div 
                key={idx}
                onClick={() => onPatientSelect(p.patient.id)}
                className="p-4 bg-surface-muted hover:bg-white/5 border border-border-ui rounded-2xl flex items-center justify-between gap-4 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {p.date.getDate()}
                  </div>
                  <div>
                    <p className={cn("text-xs font-bold text-text-main group-hover:text-primary transition-all", isPrivacyMode && "privacy-blur")}>{p.patient.name}</p>
                    <p className="text-[9px] text-text-muted uppercase tracking-widest mt-0.5">
                      {p.periodicity} • {format(p.date, 'eeee', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!isPrivacyMode && p.patient.phone && getWhatsAppLink(p.patient.phone) && (
                    <a 
                      href={getWhatsAppLink(p.patient.phone)!} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-green-500 hover:text-green-400 p-1.5 transition-colors flex items-center justify-center rounded-lg hover:bg-green-500/10 cursor-pointer"
                      title="Conversar no WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                      </svg>
                    </a>
                  )}
                  <p className={cn("text-xs font-bold text-green-400 font-mono transition-all", isPrivacyMode && "privacy-blur-strong")}>{formatCurrency(p.amount)}</p>
                </div>
              </div>
            ))}
            
            {monthPayments.length === 0 && (
              <div className="py-12 text-center bg-card/30 rounded-2xl border border-dashed border-border-ui">
                <p className="text-xs text-text-muted">Nenhum recebimento previsto para este mês.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
}

function getNextDateForWeekday(targetDayName: string, allowToday = false): string {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const targetDayIndex = days.indexOf(targetDayName);
  if (targetDayIndex === -1) return new Date().toISOString().split('T')[0];
  const today = new Date();
  const currentDayIndex = today.getDay();
  let diff = targetDayIndex - currentDayIndex;
  if (diff < 0 || (diff === 0 && !allowToday)) {
    diff += 7;
  }
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toISOString().split('T')[0];
}

function AddPatientModal({ 
  onClose, 
  onSave, 
  initialName = '', 
  initialDay = 'Segunda-feira', 
  initialTime = '',
  currentClinic,
  clinicMembers = [],
  clinicRole,
  currentClinicMember,
  isPT: isPTProp
}: { 
  onClose: () => void, 
  onSave: (data: any) => void, 
  initialName?: string,
  initialDay?: string,
  initialTime?: string,
  currentClinic?: Clinic | null,
  clinicMembers?: ClinicMember[],
  clinicRole?: ClinicUserRole | null,
  currentClinicMember?: ClinicMember | null,
  isPT?: boolean
}) {
  const isPT = isPTProp ?? (typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt')
  ));

  const defaultPsy = clinicRole === 'psychologist' && currentClinicMember 
    ? (currentClinicMember.email || currentClinicMember.id) 
    : (clinicMembers.find(m => m.role === 'psychologist')?.email || '');

  const isPriceLocked = Boolean(
    currentClinic && 
    clinicRole === 'psychologist' && 
    currentClinic.settings?.allowPsychologistSetPrice === false
  );

  const [formData, setFormData] = useState(() => ({
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
    amount: isPT ? '50' : '180',
    recurrence: 'Semanal',
    modality: 'Online',
    meetingLink: '',
    firstSessionDate: getNextDateForWeekday(initialDay || 'Segunda-feira'),
    psychologistId: defaultPsy
  }));

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
          <h3 className="text-xl md:text-2xl font-bold text-text-main">
            {isPT ? 'Novo Utente' : 'Novo Paciente'}
          </h3>
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
                  {currentClinic && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        Psicólogo(a) Responsável na Clínica *
                      </label>
                      <select
                        value={formData.psychologistId}
                        disabled={clinicRole === 'psychologist'}
                        onChange={(e) => setFormData({ ...formData, psychologistId: e.target.value })}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary appearance-none disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {clinicMembers.filter(m => m.role === 'psychologist').map((p) => (
                          <option key={p.id} value={p.email}>{p.name || p.email}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Nome Completo</label>
                    <input required placeholder="Ex: João Silva" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        {isPT ? 'Género / Pronome' : 'Gênero/Pronome'}
                      </label>
                      <input placeholder={isPT ? "Ex: Feminino, Ela" : "Ex: Feminino, Ela/Dela"} value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Data de Nasc.</label>
                      <input type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        {isPT ? 'Telemóvel / Telefone' : 'Telefone'}
                      </label>
                      <input placeholder={isPT ? "912 345 678 ou +351..." : "(00) 00000-0000"} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        {isPT ? 'NIF ou Cartão de Cidadão' : 'CPF ou RG'}
                      </label>
                      <input placeholder={isPT ? "Ex: 123456789" : "Apenas números"} value={formData.document} onChange={(e) => setFormData({...formData, document: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Profissão</label>
                      <input placeholder={isPT ? "Profissão / Ocupação" : "Ocupação/Profissão"} value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">E-mail</label>
                      <input type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      {isPT ? 'Morada' : 'Endereço'}
                    </label>
                    <input placeholder={isPT ? "Rua, Número, Código Postal, Localidade" : "Rua, Número, Bairro, Cidade - UF"} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      {isPT ? 'Medicação Regular? (Se sim, qual?)' : 'Medicação Contínua? (Se sim, qual?)'}
                    </label>
                    <input placeholder="Não toma / Ex: Sertralina 50mg" value={formData.medication} onChange={(e) => setFormData({...formData, medication: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      {isPT ? 'Contacto de Emergência' : 'Contato de Emergência'}
                    </label>
                    <input placeholder={isPT ? "Nome e Telemóvel (Grau de parentesco)" : "Nome e Telefone (Grau de parentesco)"} value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Session & Finance Info */}
              <div className="space-y-5">
                <p className="font-bold text-xs text-primary uppercase tracking-widest pl-1">
                  {isPT ? 'Agendamento Habitual & Financeiro' : 'Agendamento Padrão & Financeiro'}
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      {isPT ? 'Estado do Utente' : 'Situação do Paciente'}
                    </label>
                    <select 
                      value={formData.isNewPatient ? 'new' : 'old'} 
                      onChange={(e) => setFormData({...formData, isNewPatient: e.target.value === 'new', sessions: ''})} 
                      className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary appearance-none"
                    >
                      <option value="new">{isPT ? 'Novo Utente (0 consultas)' : 'Novo Paciente (0 sessões)'}</option>
                      <option value="old">{isPT ? 'Utente Já Acompanhado (Consultas anteriores)' : 'Paciente Antigo (Já em atendimento)'}</option>
                    </select>
                  </div>
                  
                  {!formData.isNewPatient && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                          {isPT ? 'Consultas realizadas antes do registo no sistema' : 'Sessões realizadas antes do cadastro no sistema'}
                        </label>
                        <input type="number" min="0" placeholder="Ex: 10" value={formData.sessions} onChange={(e) => setFormData({...formData, sessions: e.target.value === '' ? '' : parseInt(e.target.value) || 0})} className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Dia da Semana</label>
                      <select 
                        value={formData.sessionDay} 
                        onChange={(e) => {
                          const newDay = e.target.value;
                          const nextDate = newDay ? getNextDateForWeekday(newDay) : formData.firstSessionDate;
                          setFormData({
                            ...formData, 
                            sessionDay: newDay,
                            firstSessionDate: nextDate
                          });
                        }} 
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
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        {isPT ? 'Hora Habitual' : 'Hora Padrão'}
                      </label>
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
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        {isPT ? 'Periodicidade' : 'Recorrência'}
                      </label>
                      <select 
                        value={formData.recurrence} 
                        onChange={(e) => setFormData({...formData, recurrence: e.target.value})} 
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary appearance-none"
                      >
                        <option value="Semanal">Semanal</option>
                        <option value="Quinzenal">Quinzenal</option>
                        <option value="Mensal">Mensal</option>
                        <option value="Nenhuma">{isPT ? 'Nenhuma (Consulta Pontual/Avaliação)' : 'Nenhuma (Avaliação/Avulso)'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        {isPT ? 'Valor da Consulta (€)' : 'Valor da Sessão/Plano (R$)'}
                      </label>
                      {isPriceLocked && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                          <Lock size={10} /> Definido pela Clínica
                        </span>
                      )}
                    </div>
                    <input 
                      type="number" 
                      placeholder={isPT ? "Ex: 50" : "Ex: 180"} 
                      disabled={isPriceLocked}
                      value={formData.amount} 
                      onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                      className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      {isPT ? 'Hiperligação da Consulta (ex: Google Meet, Zoom)' : 'Link de Atendimento (ex: Google Meet, Zoom)'}
                    </label>
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
                        {isPT ? 'Data de Início / Próxima Consulta' : 'Data de Início / Próxima Sessão'}
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
                        {isPT 
                          ? `A periodicidade ${formData.recurrence.toLowerCase()} será calculada a partir desta data.` 
                          : `A recorrência ${formData.recurrence.toLowerCase()} será calculada a partir desta data.`}
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
          <button type="submit" form="add-patient-form" className="flex-[2] px-6 py-4 rounded-2xl bg-primary text-white font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all text-sm uppercase tracking-wider">
            {isPT ? 'Guardar Registo' : 'Salvar Registro'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProntuariosListView({ patients, onSelect }: { patients: any[], onSelect: (id: string) => void }) {
  const isPT = typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt')
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-text-main">
          {isPT ? 'Arquivo de Processos Clínicos' : 'Arquivo de Prontuários'}
        </h2>
        <p className="text-text-muted mt-2">
          {isPT ? 'Selecione um utente para visualizar o processo clínico completo.' : 'Selecione um paciente para visualizar o histórico clínico completo.'}
        </p>
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
                  {Math.max(parseInt(patient.sessions) || 0, patient.clinicalData?.evoluções?.length || 0)} {isPT ? 'consultas realizadas' : 'sessões realizadas'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-text-muted uppercase font-bold tracking-widest">
                <span>{isPT ? 'Registos Clínicos' : 'Registros Clínicos'}</span>
                <span className="text-primary">{patient.clinicalData?.evoluções?.length || 0} {isPT ? 'notas' : 'relatos'}</span>
              </div>
              <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(((patient.clinicalData?.evoluções?.length || 0) / 10) * 100, 100)}%` }} 
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-ui flex items-center justify-between group-hover:text-primary transition-colors">
              <span className="text-xs font-bold uppercase tracking-widest">
                {isPT ? 'Aceder ao Processo Clínico' : 'Acessar Prontuário'}
              </span>
              <ChevronRight size={18} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, subtext, icon: Icon, color, onClick, isBlurred }: any) {
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
      <p className={cn("text-2xl font-bold mt-1 tracking-tight transition-all", isBlurred && "privacy-blur-strong")}>{value}</p>
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
  onGoToAgenda,
  isMigrationAllowed = false,
  onOpenMigrationModal,
  currentClinic,
  clinicMembers = [],
  clinicRole,
  currentClinicMember,
  effectivePlan = 'free',
  maxPatientsAllowed = 5,
  onOpenUpgradeModal,
  isPT: isPTProp
}: { 
  onSelect: (id: string) => void, 
  filteredPatients: any[], 
  onAddClick: () => void,
  onDeletePatient: (id: string) => void,
  onUpdatePatient: (patient: any) => void,
  onGoToAgenda: () => void,
  isMigrationAllowed?: boolean,
  onOpenMigrationModal?: () => void,
  currentClinic?: Clinic | null,
  clinicMembers?: ClinicMember[],
  clinicRole?: ClinicUserRole | null,
  currentClinicMember?: ClinicMember | null,
  effectivePlan?: string,
  maxPatientsAllowed?: number,
  onOpenUpgradeModal?: (reason?: string) => void,
  isPT?: boolean
}) {
  const isPT = isPTProp ?? (typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt')
  ));

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ativos' | 'inativos'>('ativos');
  const [sortBy, setSortBy] = useState<'alfabetica' | 'recentes' | 'atividade'>('alfabetica');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [selectedPsyFilter, setSelectedPsyFilter] = useState<string>(
    clinicRole === 'psychologist' && currentClinicMember?.email ? currentClinicMember.email : 'all'
  );

  const isScheduleAutonomyDisabled = Boolean(
    currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.allowPsychologistManageAgenda === false
  );

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setIsSortDropdownOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const displayPatients = useMemo(() => {
    let list = filteredPatients.filter(p => activeTab === 'ativos' ? p.status !== 'Inativo' : p.status === 'Inativo');
    
    if (currentClinic && selectedPsyFilter !== 'all') {
      const filterLower = selectedPsyFilter.toLowerCase().trim();
      list = list.filter(p => {
        const pEmail = (p.psychologistId || '').toLowerCase().trim();
        const pName = (p.psychologistName || '').toLowerCase().trim();
        return pEmail === filterLower || pName.includes(filterLower);
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'alfabetica') {
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      } else if (sortBy === 'recentes') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      } else if (sortBy === 'atividade') {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        if (dateB !== dateA) return dateB - dateA;
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }
      return 0;
    });
  }, [filteredPatients, activeTab, sortBy]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{isPT ? 'Utentes' : 'Pacientes'}</h2>
          <p className="text-text-muted text-sm">{isPT ? 'Gerencie a sua lista de utentes e históricos clínicos.' : 'Gerencie sua lista de pacientes e históricos.'}</p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('ativos')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === 'ativos' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface-muted text-text-muted hover:text-text-main"
                )}
              >
                {isPT ? 'Ativos' : 'Ativos'}
              </button>
              <button 
                onClick={() => setActiveTab('inativos')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === 'inativos' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-surface-muted text-text-muted hover:text-text-main"
                )}
              >
                {isPT ? 'Inativos' : 'Inativos'}
              </button>
            </div>

            <div className="relative flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest ml-1">Ordenar:</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSortDropdownOpen(!isSortDropdownOpen);
                }}
                className="px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-muted text-text-main hover:bg-surface-muted-dark transition-all flex items-center gap-1.5 border border-white/5 shadow-sm"
              >
                <span>
                  {sortBy === 'alfabetica' && 'Alfabética'}
                  {sortBy === 'recentes' && (isPT ? 'Mais Recentes' : 'Mais Recentes')}
                  {sortBy === 'atividade' && (isPT ? 'Última Atividade' : 'Última Atividade')}
                </span>
                <ChevronDown size={11} className={cn("transition-transform duration-200 text-text-muted", isSortDropdownOpen && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {isSortDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute top-full left-0 mt-1.5 w-44 bg-card border border-border-ui rounded-2xl shadow-xl z-30 py-1 overflow-hidden"
                  >
                    <button 
                      onClick={() => { setSortBy('alfabetica'); setIsSortDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-3.5 py-2 text-[11px] transition-colors flex items-center justify-between font-medium",
                        sortBy === 'alfabetica' ? "bg-primary/10 text-primary font-bold" : "text-text-main hover:bg-surface-muted"
                      )}
                    >
                      <span>Ordem Alfabética</span>
                      {sortBy === 'alfabetica' && <Check size={12} />}
                    </button>
                    <button 
                      onClick={() => { setSortBy('recentes'); setIsSortDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-3.5 py-2 text-[11px] transition-colors flex items-center justify-between font-medium",
                        sortBy === 'recentes' ? "bg-primary/10 text-primary font-bold" : "text-text-main hover:bg-surface-muted"
                      )}
                    >
                      <span>Mais Recentes</span>
                      {sortBy === 'recentes' && <Check size={12} />}
                    </button>
                    <button 
                      onClick={() => { setSortBy('atividade'); setIsSortDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-3.5 py-2 text-[11px] transition-colors flex items-center justify-between font-medium",
                        sortBy === 'atividade' ? "bg-primary/10 text-primary font-bold" : "text-text-main hover:bg-surface-muted"
                      )}
                    >
                      <span>Última Atividade</span>
                      {sortBy === 'atividade' && <Check size={12} />}
                    </button>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            {currentClinic && (
              <div className="flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-full border border-white/5 shadow-sm">
                <Users size={12} className="text-primary shrink-0" />
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Psi:</span>
                <select
                  value={selectedPsyFilter}
                  onChange={(e) => setSelectedPsyFilter(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-text-main outline-none cursor-pointer"
                >
                  <option value="all" className="bg-card text-text-main">{isPT ? 'Todos da Clínica' : 'Todos da Clínica'}</option>
                  {clinicMembers.filter(m => m.role === 'psychologist').map(p => (
                    <option key={p.id} value={p.email} className="bg-card text-text-main">
                      {p.name || p.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {isMigrationAllowed && onOpenMigrationModal && (
            <button 
              type="button"
              onClick={onOpenMigrationModal}
              className="w-full sm:w-auto bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-[0.98]"
              title={isPT ? "Importar processos clínicos de outros sistemas" : "Importar prontuários de outros sistemas"}
            >
              <Sparkles size={16} className="text-primary animate-pulse" />
              {isPT ? 'Migrar de Outro Sistema' : 'Migrar de Outro Sistema'}
            </button>
          )}
          {isScheduleAutonomyDisabled ? (
            <div 
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-muted text-text-muted border border-border-ui text-xs font-semibold flex items-center justify-center gap-2 select-none"
              title={isPT ? "A clínica definiu que o registo e agendamento de utentes é gerido pela receção" : "A clínica definiu que o cadastro e agendamento de pacientes é gerenciado pela recepção"}
            >
              <Lock size={14} className="text-amber-500" />
              <span>{isPT ? 'Registos via Receção' : 'Cadastros via Recepção'}</span>
            </div>
          ) : (
            <button 
              onClick={onAddClick}
              className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Plus size={20} />
              {isPT ? 'Novo Utente' : 'Novo Paciente'}
            </button>
          )}
        </div>
      </div>

      {maxPatientsAllowed !== Infinity && (filteredPatients || []).length >= Math.max(1, maxPatientsAllowed - 1) && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-text-main">
            <Sparkles size={14} className="text-primary shrink-0" />
            <span>
              {isPT ? (
                <>A sua clínica cresceu? Já registou <strong>{(filteredPatients || []).length} de {maxPatientsAllowed} utentes</strong> do plano {effectivePlan === 'consultorio' ? 'Consultório' : 'Start'}.</>
              ) : (
                <>Sua clínica cresceu? Você já cadastrou <strong>{(filteredPatients || []).length} de {maxPatientsAllowed} pacientes</strong> do plano {effectivePlan === 'consultorio' ? 'Consultório' : 'Start'}.</>
              )}
            </span>
          </div>
          <button
            onClick={() => onOpenUpgradeModal?.(
              isPT ? (
                effectivePlan === 'consultorio'
                  ? 'Atualize para o plano Ilimitado e atenda utentes sem limites!'
                  : 'Atualize para o plano Consultório ou Ilimitado e atenda mais utentes com robô no WhatsApp!'
              ) : (
                effectivePlan === 'consultorio'
                  ? 'Faça o upgrade para o plano Ilimitado e atenda pacientes sem limites!'
                  : 'Faça o upgrade para o plano Consultório ou Ilimitado e atenda mais pacientes com robô no WhatsApp!'
              )
            )}
            className="px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary-dark transition-all shrink-0 cursor-pointer"
          >
            Subir de Plano
          </button>
        </div>
      )}

      <div className="glass-card rounded-3xl overflow-visible">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-surface-muted text-xs text-text-muted font-bold uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">{isPT ? 'Estado' : 'Status'}</th>
                <th className="px-6 py-4">{isPT ? 'Periodicidade & Agenda' : 'Frequência & Agenda'}</th>
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
                      <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {patient.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{patient.name}</p>
                          {currentClinic && (patient.psychologistName || patient.psychologistId) && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                              <Users size={10} />
                              {patient.psychologistName || patient.psychologistId}
                            </span>
                          )}
                        </div>
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
                  <td className="px-6 py-5">
                    {(() => {
                      const freq = formatPatientFrequency(patient);
                      const lastDate = getPatientLastSessionInfo(patient);
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                            <Clock size={12} className="text-primary shrink-0" />
                            {freq}
                          </span>
                          <span className="text-[10.5px] text-text-muted">
                            {lastDate ? `Última consulta: ${lastDate}` : 'Nenhuma consulta realizada'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
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
                        title={isPT ? "Ver Processo Clínico" : "Ver Prontuário"}
                      >
                        <FileText size={18} />
                      </button>
                      {patient.phone && getWhatsAppLink(patient.phone) && (
                        <a 
                          href={getWhatsAppLink(patient.phone)!}
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-lg hover:bg-green-500/10 text-green-500 hover:text-green-400 transition-all flex items-center justify-center cursor-pointer"
                          title="Falar no WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                          </svg>
                        </a>
                      )}
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
                                  {patient.status === 'Inativo' ? (isPT ? 'Reativar Utente' : 'Reativar Paciente') : (isPT ? 'Inativar Utente' : 'Inativar Paciente')}
                               </button>
                               <button 
                                onClick={() => onDeletePatient(patient.id)}
                                className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                               >
                                  <Trash2 size={14} />
                                  {isPT ? 'Eliminar Definitivamente' : 'Excluir Definitivamente'}
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
                  <td colSpan={4} className="px-6 py-12 text-center text-text-muted">
                    {isPT ? 'Nenhum utente encontrado.' : 'Nenhum paciente encontrado.'}
                  </td>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-sm">{patient.name}</p>
                      {currentClinic && (patient.psychologistName || patient.psychologistId) && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-semibold flex items-center gap-1">
                          <Users size={9} />
                          {patient.psychologistName || patient.psychologistId}
                        </span>
                      )}
                    </div>
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
              
              <div className="grid grid-cols-1 gap-2 text-xs">
                {(() => {
                  const freq = formatPatientFrequency(patient);
                  const lastDate = getPatientLastSessionInfo(patient);
                  return (
                    <div className="space-y-1">
                      <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest">
                        {isPT ? 'Periodicidade' : 'Frequência'}
                      </p>
                      <p className="text-xs font-semibold text-text-main flex items-center gap-1.5 truncate">
                        <Clock size={12} className="text-primary shrink-0" />
                        {freq}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {lastDate ? `Última consulta: ${lastDate}` : 'Sem consultas realizadas'}
                      </p>
                    </div>
                  );
                })()}
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
                  <FileText size={14} /> {isPT ? 'Processo Clínico' : 'Prontuário'}
                </button>
                {patient.phone && getWhatsAppLink(patient.phone) && (
                  <a 
                    href={getWhatsAppLink(patient.phone)!}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                    </svg> Chat
                  </a>
                )}
                <button 
                  onClick={() => setOpenMenuId(openMenuId === patient.id ? null : patient.id)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-muted text-text-muted"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          )) : (
            <div className="px-6 py-12 text-center text-text-muted">
              {isPT ? 'Nenhum utente encontrado.' : 'Nenhum paciente encontrado.'}
            </div>
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
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
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

function formatBirthDate(birthDate: string): string {
  if (!birthDate) return 'Não informada';
  if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    const [y, m, d] = birthDate.split('-');
    return `${d}/${m}/${y}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
    return birthDate;
  }
  if (birthDate.includes('/')) {
    return birthDate;
  }
  try {
    const date = new Date(birthDate + 'T12:00:00');
    if (!isNaN(date.getTime())) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
  } catch (e) {}
  return birthDate;
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
  sessions = [],
  currentUserEmail = '',
  defaultSubTab = 'perfil',
  hasAcceptedExtensionTerms = false,
  onOpenExtensionModal,
  clinicRole,
  currentClinic,
  currentClinicMember,
  clinicMembers = [],
  checkAndConsumeDailyAiUsage = () => true
}: { 
  patientId: string, 
  onBack: () => void, 
  patients: any[], 
  documents: any[], 
  onUpload: (file: File, category: 'prontuario' | 'anexo') => Promise<void>,
  onDeleteDocument: (docId: string) => void,
  onUpdatePatient: (patient: any) => void,
  onDeletePatient: (id: string) => void,
  profileSettings?: any,
  sessions?: any[],
  currentUserEmail?: string,
  defaultSubTab?: 'perfil' | 'prontuario' | 'anamnese' | 'smartnotes' | 'biblioteca' | 'tratamento' | 'reembolso',
  hasAcceptedExtensionTerms?: boolean,
  onOpenExtensionModal?: () => void,
  clinicRole?: ClinicUserRole | null,
  currentClinic?: Clinic | null,
  currentClinicMember?: ClinicMember | null,
  clinicMembers?: ClinicMember[],
  checkAndConsumeDailyAiUsage?: () => boolean
}) {
  const patient = patients.find(p => p.id === patientId);
  const user = auth.currentUser;
  
  const isPT = profileSettings?.country === 'PT' || (typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt')
  ));

  // Regra de Sigilo Ético (CFP / LGPD ou OPP / RGPD):
  // Recepcionista, Gestor/Admin e Supervisor não têm acesso aos prontuários clínicos privados, apenas perfil e reembolso.
  const isRestrictedRole = Boolean(currentClinic && clinicRole && clinicRole !== 'psychologist');

  // Permissões de IA configuradas pela Clínica
  const isAiGloballyDisabled = Boolean(currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.aiSettings?.enabled === false);
  const isTranscriptionDisabled = isAiGloballyDisabled || Boolean(currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.aiSettings?.allowTranscription === false);
  const isConceptualizationDisabled = isAiGloballyDisabled || Boolean(currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.aiSettings?.allowConceptualization === false);
  const isTreatmentPlanDisabled = isAiGloballyDisabled || Boolean(currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.aiSettings?.allowTreatmentPlan === false);
  const isEvolutionDisabled = isAiGloballyDisabled || Boolean(currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.aiSettings?.allowEvolutionAssistant === false);
  const isCfpDisabled = isAiGloballyDisabled || Boolean(currentClinic && clinicRole === 'psychologist' && currentClinic.settings?.aiSettings?.allowCfpDocuments === false);

  // Estados para Envio de Sessão para Supervisão Clínica
  const [isSupervisionModalOpen, setIsSupervisionModalOpen] = useState(false);
  const [supervisionEvo, setSupervisionEvo] = useState<any>(null);
  const [supervisionNote, setSupervisionNote] = useState('');
  const [supervisionDoubts, setSupervisionDoubts] = useState('');
  const [supervisionSupervisorEmail, setSupervisionSupervisorEmail] = useState('');
  const [isSendingSupervision, setIsSendingSupervision] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'perfil' | 'prontuario' | 'anamnese' | 'smartnotes' | 'biblioteca' | 'tratamento' | 'reembolso'>(() => {
    if (isRestrictedRole) {
      return defaultSubTab === 'reembolso' ? 'reembolso' : 'perfil';
    }
    return defaultSubTab;
  });
  const [isAddingEvolution, setIsAddingEvolution] = useState(false);
  const [newEvolutionNote, setNewEvolutionNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleConfirmSupervision = async () => {
    if (!currentClinic || !supervisionEvo) return;
    setIsSendingSupervision(true);
    try {
      const newCase: SupervisionCase = {
        id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        clinicId: currentClinic.id,
        psychologistId: user?.email || '',
        psychologistName: currentClinicMember?.name || profileSettings?.name || user?.displayName || user?.email || 'Psicólogo',
        psychologistEmail: user?.email || '',
        patientId: patient?.id || '',
        patientName: patient?.name || 'Paciente',
        sessionDate: supervisionEvo.date || new Date().toISOString().split('T')[0],
        clinicalNotes: supervisionNote,
        doubts: supervisionDoubts,
        supervisorEmail: supervisionSupervisorEmail || undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      saveClinicSupervisionCase(currentClinic.id, newCase);
      setIsSupervisionModalOpen(false);
      alert('Sessão enviada com sucesso para a supervisão clínica!');
    } catch (err) {
      console.error('Erro ao enviar para supervisão:', err);
      alert('Erro ao enviar para supervisão.');
    } finally {
      setIsSendingSupervision(false);
    }
  };

  // States for Reimbursement tab
  const [patientSessions, setPatientSessions] = useState<any[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [copiedReceiptText, setCopiedReceiptText] = useState(false);

  // Filter sessions from prop for this patient
  useEffect(() => {
    if (activeSubTab === 'reembolso') {
      const list = sessions.filter(s => s.patientId === patientId);
      // Sort by date descending and time descending
      list.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        const timeA = a.time || "";
        const timeB = b.time || "";
        return dateB.localeCompare(dateA) || timeB.localeCompare(timeA);
      });
      setPatientSessions(list);
    }
  }, [activeSubTab, patientId, sessions]);

  const generateReceiptDescription = () => {
    const selected = patientSessions.filter(s => selectedSessionIds.has(s.id));
    const sorted = [...selected].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      const timeA = a.time || "";
      const timeB = b.time || "";
      return dateA.localeCompare(dateB) || timeA.localeCompare(timeB);
    });
    if (sorted.length === 0) return "";
    
    const count = sorted.length;
    const datesStr = sorted.map(s => (s.date || "").split('-').reverse().join('/')).join(', ');
    const totalAmount = sorted.reduce((acc, s) => acc + (s.amount || 0), 0);
    const types = Array.from(new Set(sorted.map(s => s.type)));
    const modalityStr = types.join(' e ');
    
    return `Referente a ${count} ${count === 1 ? 'sessão' : 'sessões'} de atendimento psicoterapêutico clínico individual, realizada${count === 1 ? '' : 's'} nas seguinte${count === 1 ? 's' : 's'} data${count === 1 ? 's' : 's'}: ${datesStr}, na modalidade ${modalityStr.toLowerCase()} (atendimento de psicologia clínica), no valor total de ${formatCurrency(totalAmount)}.`;
  };

  const handleGenerateTherapistReportPDF = () => {
    try {
      const selected = patientSessions.filter(s => selectedSessionIds.has(s.id));
      const sorted = [...selected].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      if (sorted.length === 0) {
        alert("Selecione pelo menos uma sessão.");
        return;
      }

      const doc = new jsPDF();
      let startY = 20;

      const isPT = profileSettings?.country === 'PT';

      // Header logo
      if (profileSettings?.logo) {
        try {
          doc.addImage(profileSettings.logo, 'JPEG', 14, 10, 30, 30);
          startY = 50;
        } catch (e) {
          console.error("Erro ao adicionar logo:", e);
        }
      }

      // Psychologist details on the top right
      if (profileSettings?.name || profileSettings?.opp || profileSettings?.crp) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const rightX = 196;
        let lineY = 15;
        if (profileSettings.name) {
          doc.text(`Psicólogo(a): ${profileSettings.name}`, rightX, lineY, { align: 'right' });
          lineY += 5;
        }
        if (isPT) {
          const oppNum = profileSettings.opp || profileSettings.crp;
          if (oppNum) {
            doc.text(`Cédula OPP: ${oppNum}`, rightX, lineY, { align: 'right' });
            lineY += 5;
          }
          if (profileSettings.nif) {
            doc.text(`NIF: ${profileSettings.nif}`, rightX, lineY, { align: 'right' });
            lineY += 5;
          }
        } else {
          if (profileSettings.crp) {
            doc.text(`CRP: ${profileSettings.crp}`, rightX, lineY, { align: 'right' });
            lineY += 5;
          }
          if (profileSettings.cpfCnpj) {
            doc.text(`CPF/CNPJ: ${profileSettings.cpfCnpj}`, rightX, lineY, { align: 'right' });
            lineY += 5;
          }
        }
        if (profileSettings.phone) {
          doc.text(`Tel: ${profileSettings.phone}`, rightX, lineY, { align: 'right' });
          lineY += 5;
        }
      }

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(isPT ? "DECLARAÇÃO DE COMPARÊNCIA (SEGURO / ADSE)" : "RELATÓRIO DE COMPARECIMENTO (REEMBOLSO)", 14, startY);

      // Section 1: Therapist Info
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS DO PRESTADOR DE SERVIÇOS", 14, startY + 15);
      
      autoTable(doc, {
        startY: startY + 20,
        theme: 'grid',
        body: [
          ['Nome do Profissional', profileSettings?.name || ''],
          ['Conselho de Classe', isPT ? `Ordem dos Psicólogos Portugueses (OPP) - Cédula nº ${profileSettings?.opp || profileSettings?.crp || ''}` : `CRP - Registro: ${profileSettings?.crp || ''}`],
          [isPT ? 'NIF' : 'CPF/CNPJ', (isPT ? profileSettings?.nif : profileSettings?.cpfCnpj) || profileSettings?.cpfCnpj || ''],
          ['Telefone / Contato', profileSettings?.phone || ''],
          ['Endereço do Consultório', profileSettings?.address || '']
        ],
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });

      const finalY1 = (doc as any).lastAutoTable.finalY || startY + 50;

      // Section 2: Patient Info
      doc.setFont("helvetica", "bold");
      doc.text(isPT ? "IDENTIFICAÇÃO DO UTENTE" : "IDENTIFICAÇÃO DO PACIENTE", 14, finalY1 + 15);
      
      autoTable(doc, {
        startY: finalY1 + 20,
        theme: 'grid',
        body: [
          [isPT ? 'Nome do Utente' : 'Nome do Paciente', patient.name || ''],
          [isPT ? 'NIF do Utente' : 'CPF do Paciente', patient.nif || patient.cpf || patient.document || ''],
          [isPT ? 'Telefone / Contacto' : 'Telefone', patient.phone || patient.telefone || ''],
          ['E-mail', patient.email || ''],
          ['Data de Nascimento', patient.birthDate ? (formatBirthDate(patient.birthDate) === 'Não informada' ? patient.birthDate : formatBirthDate(patient.birthDate)) : ''],
          ['Responsável (se menor)', patient.responsible || patient.guardian || '']
        ],
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });

      const finalY2 = (doc as any).lastAutoTable.finalY || finalY1 + 50;

      // Section 3: Declaration statement
      doc.setFont("helvetica", "bold");
      doc.text(isPT ? "DECLARAÇÃO DE CONSULTAS REALIZADAS" : "DECLARAÇÃO DE SESSÕES REALIZADAS", 14, finalY2 + 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const declText = isPT
        ? `Declaramos para os devidos fins de comparticipação de despesas de saúde (ADSE, subsistemas ou companhias de seguros) que o(a) utente acima identificado(a) realizou consultas de psicologia clínica individual, sob nossa responsabilidade profissional, nas datas e modalidades especificadas na tabela abaixo:`
        : `Declaramos para os devidos fins de reembolso de plano de saúde que o(a) paciente acima identificado(a) realizou sessões de psicoterapia clínica individual, sob nossa responsabilidade profissional, nas datas e modalidades especificadas na tabela abaixo:`;
      const splitDecl = doc.splitTextToSize(declText, 180);
      doc.text(splitDecl, 14, finalY2 + 22);

      const textLinesCount = splitDecl.length;
      const finalYDeclaration = finalY2 + 22 + (textLinesCount * 5);

      // Section 4: Sessions Schedule table
      const sessionsRows = sorted.map((s, idx) => {
        const dateStr = s.date.split('-').reverse().join('/');
        const loc = s.type === 'Presencial' 
          ? `Presencial - no consultório: ${profileSettings?.address || 'Consultório'}` 
          : 'A distância / Online';
        return [
          String(idx + 1),
          dateStr,
          s.time,
          s.type,
          loc,
          formatCurrency(s.amount || 0, isPT ? 'EUR' : 'BRL')
        ];
      });

      autoTable(doc, {
        startY: finalYDeclaration + 5,
        theme: 'striped',
        head: [['Nº', 'Data', 'Horário', 'Modalidade', 'Local de Atendimento', 'Valor Cobrado']],
        body: sessionsRows,
        headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 25, halign: 'right' }
        }
      });

      const finalY3 = (doc as any).lastAutoTable.finalY || finalYDeclaration + 50;

      // Section 5: Signature block
      let sigY = finalY3;
      if (sigY + 50 > 280) {
        doc.addPage();
        sigY = 20;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Documento emitido em: ${new Date().toLocaleDateString(isPT ? 'pt-PT' : 'pt-BR')}`, 14, sigY + 15);

      // Draw signature line
      doc.setDrawColor(180, 180, 180);
      doc.line(120, sigY + 35, 190, sigY + 35);
      
      const signatureName = profileSettings?.signatureText || profileSettings?.name || 'Psicólogo(a)';
      doc.setFont("helvetica", "bold");
      doc.text(signatureName, 155, sigY + 40, { align: "center" });
      doc.setFont("helvetica", "normal");
      const signatureReg = isPT
        ? (profileSettings?.opp ? `Cédula OPP nº ${profileSettings.opp}` : (profileSettings?.crp ? `Cédula OPP nº ${profileSettings.crp}` : 'Cédula OPP'))
        : `CRP: ${profileSettings?.crp || ''}`;
      doc.text(signatureReg, 155, sigY + 45, { align: "center" });

      // Save PDF to library
      const pdfBlob = doc.output('blob');
      const fileName = isPT
        ? `Declaracao_Seguro_ADSE_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Relatorio_Reembolso_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      onUpload(file, 'anexo').then(() => {
        alert(isPT
          ? "Declaração para Seguros & ADSE gerada e guardada na Biblioteca de Documentos com sucesso!"
          : "Relatório de Reembolso gerado e salvo na Biblioteca de Documentos com sucesso!"
        );
      }).catch(err => {
        console.error("Erro ao salvar relatório na biblioteca:", err);
        alert("Documento gerado com sucesso, mas ocorreu um erro ao guardá-lo na Biblioteca de Documentos.");
      });

      // Save to local computer downloads
      doc.save(fileName);

    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao gerar o PDF do Relatório.");
    }
  };

  // Novos estados para a evolução aprimorada
  const [evolutionDate, setEvolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [evolutionTime, setEvolutionTime] = useState(patient.sessionTime || new Date().toTimeString().substring(0, 5));
  const [evolutionSessionNumber, setEvolutionSessionNumber] = useState(patient.clinicalData?.evoluções?.length ? patient.clinicalData.evoluções.length + 1 : 1);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isGeneratingEvolution, setIsGeneratingEvolution] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isMeetBannerDismissed, setIsMeetBannerDismissed] = useState<boolean>(() => {
    return localStorage.getItem('simplepsi_dismiss_evolution_meet_banner') === 'true';
  });
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);
  
  const [editingEvolutionId, setEditingEvolutionId] = useState<number | null>(null);
  const [editingEvolutionNote, setEditingEvolutionNote] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  
  const [expandedEvolutions, setExpandedEvolutions] = useState<Set<number>>(new Set());
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const [generatingAllPdfsProgress, setGeneratingAllPdfsProgress] = useState<string | null>(null);
  const [isGeneratingAllPdf, setIsGeneratingAllPdf] = useState(false);
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editingAnamneseField, setEditingAnamneseField] = useState<string | null>(null);

  // Next session plan states
  const [editingNextSession, setEditingNextSession] = useState(false);
  const [tempNextSessionPlan, setTempNextSessionPlan] = useState("");

  // TCC CCD states
  // Local Clinical Forms State
  const [localTccData, setLocalTccData] = useState<any>(null);
  const [lastPatientId, setLastPatientId] = useState<string>('');
  const [localPsychoanalysisData, setLocalPsychoanalysisData] = useState<any>(null);
  const [localGestaltData, setLocalGestaltData] = useState<any>(null);
  const [localActData, setLocalActData] = useState<any>(null);
  const [localHumanistData, setLocalHumanistData] = useState<any>(null);
  const [localTreatmentNotes, setLocalTreatmentNotes] = useState<string>('');
  const [activeBeliefId, setActiveBeliefId] = useState<string | null>(null);
  const [isGeneratingTccAi, setIsGeneratingTccAi] = useState(false);
  const [isGeneratingApproachAi, setIsGeneratingApproachAi] = useState(false);
  const [isGeneratingNextSession, setIsGeneratingNextSession] = useState(false);
  
  // Treatment plan states
  const [newGoalText, setNewGoalText] = useState("");
  const [newInterventionsText, setNewInterventionsText] = useState("");
  const [isGeneratingTreatmentPlanAi, setIsGeneratingTreatmentPlanAi] = useState(false);
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);
  const [dragInsertIndex, setDragInsertIndex] = useState<number | null>(null);

  const getSafeFormulation = (formulation: any) => {
    const situations = formulation?.situations || [];
    const safeSituations = [0, 1, 2].map((idx) => {
      const sit = situations[idx] || {};
      return {
        situation: sit.situation || "",
        automaticThought: sit.automaticThought || "",
        meaning: sit.meaning || "",
        emotion: sit.emotion || "",
        behavior: sit.behavior || ""
      };
    });
    return {
      coreBelief: formulation?.coreBelief || "",
      intermediateBelief: formulation?.intermediateBelief || "",
      activatingSituations: formulation?.activatingSituations || "",
      compensatoryStrategies: formulation?.compensatoryStrategies || "",
      goals: formulation?.goals || "",
      strengths: formulation?.strengths || "",
      situations: safeSituations
    };
  };

  useEffect(() => {
    if (patient && patient.id !== lastPatientId) {
      setLastPatientId(patient.id);
      setLocalTccData(patient.clinicalData?.tccData || {
        lifeHistory: '',
        problemList: '',
        diagnosisAndMeds: '',
        isSplitByBelief: false,
        unifiedFormulation: {
          coreBelief: '',
          intermediateBelief: '',
          activatingSituations: '',
          compensatoryStrategies: '',
          goals: '',
          strengths: '',
          situations: [
            { situation: '', automaticThought: '', meaning: '', emotion: '', behavior: '' },
            { situation: '', automaticThought: '', meaning: '', emotion: '', behavior: '' },
            { situation: '', automaticThought: '', meaning: '', emotion: '', behavior: '' }
          ]
        },
        beliefFormulations: []
      });
      setTempNextSessionPlan(patient.clinicalData?.nextSessionPlan || "");
      setLocalTreatmentNotes(patient.clinicalData?.treatmentNotes || "");
      
      setLocalPsychoanalysisData(patient.clinicalData?.psicanaliseData || patient.clinicalData?.psychoanalysisData || {
        manifestDemand: '',
        latentDemand: '',
        defenses: '',
        transference: '',
        structuralPosition: ''
      });
      setLocalGestaltData(patient.clinicalData?.gestaltData || {
        figureAndGround: '',
        contactCycleBlocks: '',
        awarenessLevel: '',
        supportSystem: ''
      });
      setLocalActData(patient.clinicalData?.actData || {
        fusion: '',
        experientialAvoidance: '',
        values: '',
        committedAction: ''
      });
      setLocalHumanistData(patient.clinicalData?.humanistaData || {
        existentialThemes: '',
        phenomenologicalFocus: '',
        selfCongruence: '',
        therapeuticInsights: ''
      });
    }
  }, [patient, lastPatientId]);

  const handleUpdateTccField = (field: string, value: any) => {
    if (!localTccData) return;
    const updatedTccData = {
      ...localTccData,
      [field]: value
    };
    setLocalTccData(updatedTccData);
  };

  const commitLocalTccData = () => {
    if (!localTccData) return;
    onUpdatePatient({
      ...patient,
      clinicalData: {
        ...patient.clinicalData,
        tccData: localTccData
      }
    });
  };

  const handleUpdatePsychoanalysisField = (field: string, value: any) => {
    if (!localPsychoanalysisData) return;
    setLocalPsychoanalysisData((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleUpdateGestaltField = (field: string, value: any) => {
    if (!localGestaltData) return;
    setLocalGestaltData((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleUpdateActField = (field: string, value: any) => {
    if (!localActData) return;
    setLocalActData((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleUpdateHumanistField = (field: string, value: any) => {
    if (!localHumanistData) return;
    setLocalHumanistData((prev: any) => ({ ...prev, [field]: value }));
  };

  const commitLocalApproachData = (approachKey: string, data: any) => {
    if (!patient) return;
    onUpdatePatient({
      ...patient,
      clinicalData: {
        ...patient.clinicalData,
        [`${approachKey}Data`]: data
      }
    });
  };

  const updateLocalGlobalField = (field: string, value: string) => {
    if (!localTccData) return;
    const updatedTccData = {
      ...localTccData,
      [field]: value
    };
    setLocalTccData(updatedTccData);
  };

  const updateLocalFormulationField = (field: string, value: string) => {
    if (!localTccData) return;
    const currentForm = localTccData.unifiedFormulation || {};
    setLocalTccData({
      ...localTccData,
      unifiedFormulation: { ...currentForm, [field]: value }
    });
  };

  const updateLocalSituationField = (idx: number, field: string, value: string) => {
    if (!localTccData) return;
    const currentForm = localTccData.unifiedFormulation || {};
    const sits = [...(currentForm.situations || [])];
    sits[idx] = { ...sits[idx], [field]: value };
    setLocalTccData({
      ...localTccData,
      unifiedFormulation: { ...currentForm, situations: sits }
    });
  };

  const handleGenerateTccWithAi = async () => {
    if (isConceptualizationDisabled) {
      alert("O uso de Inteligência Artificial para Conceitualização foi desativado pela clínica.");
      return;
    }
    if (!localTccData) return;

    if (!confirm("Deseja usar a IA para gerar a conceitualização cognitiva?")) {
      return;
    }

    const isMaster = user?.email?.toLowerCase() === 'wellcoutinho99@gmail.com';
    if (!isMaster) {
      if (!checkAndConsumeDailyAiUsage()) return;
      const lastAiTccAt = patient?.clinicalData?.lastAiTccAt;
      if (lastAiTccAt) {
        const lastDate = new Date(lastAiTccAt);
        const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          const daysLeft = Math.ceil(7 - diffDays);
          alert(`⏰ Limite de uso: Você já gerou a Conceitualização IA para este paciente nesta semana.\n\nPor favor, aguarde ${daysLeft} dia(s) para gerar uma nova, ou edite manualmente.`);
          return;
        }
      }
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    setIsGeneratingTccAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const patientContext = `
        PACIENTE: ${patient.name}
        HISTÓRIA DE VIDA (ANAMNESE): ${localTccData?.lifeHistory || patient?.clinicalData?.anamnese?.lifeHistory || 'Não preenchido'}
        LISTA DE PROBLEMAS: ${localTccData?.problemList || 'Não preenchido'}
        DIAGNÓSTICO E MEDICAMENTOS: ${localTccData?.diagnosisAndMeds || patient?.clinicalData?.anamnese?.currentMedication || 'Não preenchido'}
        EVOLUÇÕES CLÍNICAS RECENTES:
        ${(patient?.clinicalData?.evoluções || []).slice(-5).map((e: any) => `${e.date}: ${e.note}`).join('\n')}
      `;

      const prompt = `
        Você é um terapeuta TCC sênior especialista em conceitualização cognitiva de Judith Beck.
        Gere uma Conceitualização Cognitiva completa em português com base no contexto clínico abaixo.

        CONTEXTO CLÍNICO DO PACIENTE:
        ${patientContext}

        ---
        INSTRUÇÕES — retorne SOMENTE o JSON, sem markdown, sem texto extra:

        1. lifeHistory: narrativa em 4-6 parágrafos densos (mín. 500 palavras) separados por \\n, cobrindo infância, dinâmica familiar, adolescência, vida afetiva, carreira e estressores atuais.
        2. problemList: mín. 8 problemas clínicos específicos separados por ";\\n".
        3. diagnosisAndMeds: "Hipótese diagnóstica de..." — NUNCA diagnóstico definitivo.
        4. coreBelief: "Nome da Crença.\\nSobre si mesmo: \\"frase1\\".\\nSobre os outros: \\"frase1\\".\\nSobre o futuro: \\"frase\\"."
        5. intermediateBelief: "Regras:\\n\\"Regra 1.\\"\\n\\"Regra 2.\\"\\n\\"Regra 3.\\"\\n\\"Regra 4.\\"\\n\\"Regra 5.\\"\\nPressupostos:\\n\\"Se... então....\\"\\n\\"Se... então....\\"\\n\\"Se... então....\\"\\n\\"Se... então....\\"\\n\\"Se... então....\\""
        6. activatingSituations: 5+ gatilhos separados por "\\n".
        7. compensatoryStrategies: 4+ estratégias "Nome: Descrição." separadas por "\\n".
        8. goals: metas terapêuticas separadas por " / ".
        9. strengths: recursos e pontos fortes do paciente.
        10. situations: array JSON com EXATAMENTE 3 objetos com: situation, automaticThought, meaning, emotion, behavior.

        Retorne SOMENTE o JSON válido. Nenhum texto antes ou depois.
      `;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        }
      });

      const rawText = response?.text || '{}';
      let parsedData: any = {};
      try {
        parsedData = safeJsonParse(rawText);
      } catch (jsonErr: any) {
        console.error('Raw AI response that failed to parse:', rawText);
        throw new Error('JSON_PARSE_FAILED');
      }
      
      let updatedTccData = { 
        ...localTccData,
        lifeHistory: parsedData.lifeHistory || localTccData.lifeHistory,
        problemList: parsedData.problemList || localTccData.problemList,
        diagnosisAndMeds: parsedData.diagnosisAndMeds || localTccData.diagnosisAndMeds,
        unifiedFormulation: parsedData
      };

      setLocalTccData(updatedTccData);

      onUpdatePatient({
        ...patient,
        clinicalData: {
          ...patient.clinicalData,
          tccData: updatedTccData,
          lastAiTccAt: new Date().toISOString()
        }
      });

      if (profileSettings?.isTrial) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          await updateDoc(profileRef, { aiTccCount: (profileSettings.aiTccCount || 0) + 1 });
        } catch (e) {
          console.error("Failed to update AI count", e);
        }
      }

      alert("Conceitualização TCC gerada com IA e salva com sucesso!");
    } catch (err: any) {
      console.error("Erro ao gerar TCC com IA:", err);
      const rawMsg = String(err?.message || err);
      let friendlyMsg = "Erro ao gerar conceitualização com IA. Tente novamente.";
      if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
        friendlyMsg = "O servidor de IA está sobrecarregado no momento. Aguarde alguns instantes e tente novamente.";
      } else if (rawMsg.includes('JSON_PARSE_FAILED') || rawMsg.includes('JSON Parse') || rawMsg.includes('parse')) {
        friendlyMsg = "A IA retornou uma resposta em formato inválido. Tente novamente — normalmente funciona na segunda tentativa.";
      } else if (rawMsg.includes('API_KEY') || rawMsg.includes('api_key') || rawMsg.includes('401')) {
        friendlyMsg = "Chave da API inválida ou ausente. Verifique as configurações.";
      } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota')) {
        friendlyMsg = "A API atingiu o limite de requisições por minuto (não é cota diária). Aguarde 1 minuto e tente novamente.";
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch')) {
        friendlyMsg = "Sem conexão com a internet. Verifique sua rede e tente novamente.";
      }
      alert(friendlyMsg);
    } finally {
      setIsGeneratingTccAi(false);
    }
  };

  const handleGenerateApproachWithAi = async (approachKey: string) => {
    if (isConceptualizationDisabled) {
      alert("O uso de Inteligência Artificial para Conceitualização foi desativado pela clínica.");
      return;
    }
    if (!patient) return;
    const user = auth.currentUser;
    const isMaster = user?.email?.toLowerCase() === 'wellcoutinho99@gmail.com';
    if (!isMaster) {
      if (!checkAndConsumeDailyAiUsage()) return;
      const lastAiAt = patient?.clinicalData?.[`lastAi${approachKey}At`];
      if (lastAiAt) {
        const lastDate = new Date(lastAiAt);
        const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          const daysLeft = Math.ceil(7 - diffDays);
          alert(`⏰ Limite de uso: Você já gerou a formulação IA para este paciente nesta semana.\n\nPor favor, aguarde ${daysLeft} dia(s) para gerar uma nova, ou edite manualmente.`);
          return;
        }
      }
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada.");
      return;
    }

    if (!confirm("Deseja usar a IA para gerar a formulação de caso com base no histórico recente?")) {
      return;
    }

    setIsGeneratingApproachAi(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      let schemaString = '';
      let schemaKeys: string[] = [];
      let modelPrompt = '';

      if (approachKey === 'psicanalise') {
        schemaString = `{"manifestDemand": "...", "latentDemand": "...", "defenses": "...", "transference": "...", "structuralPosition": "..."}`;
        schemaKeys = ['manifestDemand', 'latentDemand', 'defenses', 'transference', 'structuralPosition'];
        modelPrompt = `Analise o histórico e as evoluções clínicas sob a ótica da Psicanálise. Preencha os campos estruturais considerando os mecanismos de defesa, posição do sujeito, e dinâmicas transferenciais latentes.`;
      } else if (approachKey === 'gestalt') {
        schemaString = `{"figureAndGround": "...", "contactCycleBlocks": "...", "awarenessLevel": "...", "supportSystem": "..."}`;
        schemaKeys = ['figureAndGround', 'contactCycleBlocks', 'awarenessLevel', 'supportSystem'];
        modelPrompt = `Analise o histórico sob a ótica da Gestalt-Terapia. Identifique a figura principal emergente, bloqueios no ciclo de contato, nível de awareness e sistemas de suporte.`;
      } else if (approachKey === 'act') {
        schemaString = `{"fusion": "...", "experientialAvoidance": "...", "values": "...", "committedAction": "..."}`;
        schemaKeys = ['fusion', 'experientialAvoidance', 'values', 'committedAction'];
        modelPrompt = `Analise o caso clínico sob a ótica da Terapia de Aceitação e Compromisso (ACT). Foque nos componentes do Hexaflex: fusão cognitiva, evitação experiencial, valores e ações comprometidas.`;
      } else if (approachKey === 'humanista') {
        schemaString = `{"existentialThemes": "...", "phenomenologicalFocus": "...", "selfCongruence": "...", "therapeuticInsights": "..."}`;
        schemaKeys = ['existentialThemes', 'phenomenologicalFocus', 'selfCongruence', 'therapeuticInsights'];
        modelPrompt = `Analise o histórico e as evoluções clínicas sob a ótica da Abordagem Centrada na Pessoa (ACP) e da Psicologia Existencialista. Identifique e analise o caso clínico fundamentando-se nos referenciais teóricos de Carl Rogers, Søren Kierkegaard, Martin Heidegger e Jean-Paul Sartre. Preencha os campos estruturais considerando: temas existenciais de angústia, isolamento, liberdade e morte; o foco fenomenológico na percepção e vivência imediata no momento presente; a congruência do self (aceitação e autoatualização de Rogers); e os direcionamentos clínicos para as sessões futuras.`;
      }

      const prompt = `
        Você é um assistente sênior em psicologia clínica.
        Analise o caso e retorne ESTRITAMENTE em formato JSON. NÃO use marcação markdown.
        
        ${modelPrompt}
        
        HISTÓRIA DE VIDA (ANAMNESE): ${patient.clinicalData?.anamnese?.lifeHistory || 'Não preenchido'}
        DIAGNÓSTICO E MEDICAMENTOS: ${patient.clinicalData?.anamnese?.currentMedication || 'Não preenchido'}
        EVOLUÇÕES CLÍNICAS RECENTES:
        ${(patient.clinicalData?.evoluções || []).slice(-5).map((e: any) => `${e.date}: ${e.note}`).join('\n')}
        
        Responda APENAS com um objeto JSON válido, neste exato formato:
        ${schemaString}
      `;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        }
      });

      const rawText = response?.text || '{}';
      const parsedData = safeJsonParse(rawText);

      const isValid = schemaKeys.every(k => Object.keys(parsedData).includes(k));
      if (!isValid) {
        throw new Error('JSON_PARSE_FAILED');
      }

      let updatedData;
      if (approachKey === 'psicanalise') {
        updatedData = { ...localPsychoanalysisData, ...parsedData };
        setLocalPsychoanalysisData(updatedData);
      } else if (approachKey === 'gestalt') {
        updatedData = { ...localGestaltData, ...parsedData };
        setLocalGestaltData(updatedData);
      } else if (approachKey === 'act') {
        updatedData = { ...localActData, ...parsedData };
        setLocalActData(updatedData);
      } else if (approachKey === 'humanista') {
        updatedData = { ...localHumanistData, ...parsedData };
        setLocalHumanistData(updatedData);
      }

      onUpdatePatient({
        ...patient,
        clinicalData: {
          ...patient.clinicalData,
          [`${approachKey}Data`]: updatedData,
          [`lastAi${approachKey}At`]: new Date().toISOString()
        }
      });

      if (profileSettings?.isTrial && user) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          await updateDoc(profileRef, { [`ai${approachKey}Count`]: (profileSettings[`ai${approachKey}Count`] || 0) + 1 });
        } catch (e) {
          console.error("Failed to update AI count", e);
        }
      }

      alert("Formulação gerada com IA e salva com sucesso!");
    } catch (err: any) {
      console.error("Erro ao gerar formulação com IA:", err);
      alert("Erro ao gerar formulação com IA. Tente novamente.");
    } finally {
      setIsGeneratingApproachAi(false);
    }
  };

  const handleUpdateTreatmentPlan = (newPlan: any) => {
    onUpdatePatient({
      ...patient,
      clinicalData: {
        ...patient.clinicalData,
        treatmentPlan: newPlan
      }
    });
  };

  const handleUpdateTreatmentNotes = (val: string) => {
    setLocalTreatmentNotes(val);
  };

  const commitTreatmentNotes = () => {
    if (!patient) return;
    onUpdatePatient({
      ...patient,
      clinicalData: {
        ...patient.clinicalData,
        treatmentNotes: localTreatmentNotes
      }
    });
  };

  const handleGenerateTreatmentPlanWithAi = async () => {
    if (isTreatmentPlanDisabled) {
      alert("O uso de Inteligência Artificial para Planejamento de Tratamento foi desativado pela clínica.");
      return;
    }
    if (!patient) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    if (!confirm("Deseja usar a IA para gerar um Plano de Tratamento estruturado baseado no histórico do paciente? Isso irá substituir as metas atuais.")) {
      return;
    }

    const isMaster = user?.email?.toLowerCase() === 'wellcoutinho99@gmail.com';
    if (!isMaster) {
      if (!checkAndConsumeDailyAiUsage()) return;
      const lastAiPlanAt = patient?.clinicalData?.lastAiPlanAt;
      if (lastAiPlanAt) {
        const lastDate = new Date(lastAiPlanAt);
        const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          const daysLeft = Math.ceil(7 - diffDays);
          alert(`⏰ Limite de uso: Você já gerou um Plano de Tratamento IA para este paciente nesta semana.\n\nPor favor, aguarde ${daysLeft} dia(s) para gerar um novo, ou adicione metas manualmente.`);
          return;
        }
      }
    }

    const approachKey = profileSettings?.clinicalApproach || 'tcc';
    const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

    setIsGeneratingTreatmentPlanAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const formulationText = localTccData?.isSplitByBelief 
        ? (localTccData?.beliefFormulations || []).map((bf: any) => 
            `Crença: ${bf.formulation?.coreBelief}\nRegras: ${bf.formulation?.intermediateBelief}\nMetas: ${bf.formulation?.goals}`
          ).join('\n\n')
        : `Crença Central: ${localTccData?.unifiedFormulation?.coreBelief}\nRegras: ${localTccData?.unifiedFormulation?.intermediateBelief}\nMetas: ${localTccData?.unifiedFormulation?.goals}`;

      const patientContext = `
        PACIENTE: ${patient.name}
        ABORDAGEM CLÍNICA: ${approachInfo.name}
        HISTÓRIA DE VIDA DO PACIENTE: ${localTccData?.lifeHistory || patient?.clinicalData?.anamnese?.lifeHistory || 'Não preenchido'}
        LISTA DE PROBLEMAS: ${localTccData?.problemList || 'Não preenchido'}
        DIAGNÓSTICO E MEDICAMENTOS: ${localTccData?.diagnosisAndMeds || patient?.clinicalData?.anamnese?.currentMedication || 'Não preenchido'}
        
        CONCEITUALIZAÇÃO COGNITIVA:
        ${formulationText}
        
        EVOLUÇÕES CLÍNICAS RECENTES:
        ${(patient?.clinicalData?.evoluções || []).slice(-5).map((e: any) => `${e.date}: ${e.note}`).join('\n')}
      `;

      const prompt = `
        Você é um terapeuta sênior especialista em planejamento de tratamento clínico na abordagem ${approachInfo.name}.
        Sua tarefa é analisar a conceitualização, histórico de problemas e evoluções clínicas recentes do paciente, e propor um plano de tratamento estruturado e progressivo, dividido em fases lógicas apropriadas para a abordagem ${approachInfo.name}.

        CONTEXTO DO PACIENTE:
        ${patientContext}

        Retorne um array JSON contendo metas detalhadas de tratamento para cada fase do processo clínico. A resposta deve ser EXCLUSIVAMENTE um array JSON válido sem marcações markdown extra ou texto, com o seguinte formato:
        [
          {
            "goal": "Fase 1 — Psicoeducação: [Breve descrição da meta, ex: Psicoeducação sobre o funcionamento do estresse crônico]",
            "interventions": "[Técnicas/Intervenções específicas, ex: Questionamento socrático, RPD]",
            "status": "pending"
          },
          ...
        ]

        Diretrizes de Estruturação:
        - O plano deve ter de 12 a 20 metas, divididas sequencialmente por fases (ex: Fase 1, Fase 2, Fase 3, etc.).
        - Se com base no histórico de evoluções recentes, certas metas iniciais (como consolidação de aliança, mapeamento inicial, etc.) já tiverem sido trabalhadas e concluídas, marque o status delas como "completed"; caso contrário, use "pending" ou "in_progress".
        - Use linguagem clara, altamente técnica e específica para a abordagem ${approachInfo.name}.
      `;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsedPlan = safeJsonParse(response.text || '[]');
      if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
        const formattedPlan = parsedPlan.map((item: any, idx: number) => ({
          id: 'goal_ai_' + Date.now() + '_' + idx,
          goal: item.goal || '',
          interventions: item.interventions || '',
          status: item.status || 'pending'
        }));

        onUpdatePatient({
          ...patient,
          clinicalData: {
            ...patient.clinicalData,
            treatmentPlan: formattedPlan,
            lastAiPlanAt: new Date().toISOString()
          }
        });
        
        if (profileSettings?.isTrial) {
          try {
            const profileRef = doc(db, 'profiles', user.uid);
            await updateDoc(profileRef, { aiPlanCount: (profileSettings.aiPlanCount || 0) + 1 });
          } catch (e) {
            console.error("Failed to update AI plan count", e);
          }
        }
        
        alert("Plano de tratamento gerado com IA e salvo com sucesso!");
      } else {
        throw new Error("Resposta da IA não é um array válido.");
      }
    } catch (err) {
      console.error("Erro ao gerar plano de tratamento com IA:", err);
      alert("Erro no plano de tratamento: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingTreatmentPlanAi(false);
    }
  };

  const handleAddTreatmentGoal = () => {
    if (!newGoalText.trim()) return;
    const plan = patient.clinicalData?.treatmentPlan || [];
    const newGoal = {
      id: 'goal_' + Date.now(),
      goal: newGoalText,
      interventions: newInterventionsText,
      status: 'pending' as const
    };
    
    const updatedPlan = [...plan, newGoal];
    handleUpdateTreatmentPlan(updatedPlan);
    setNewGoalText("");
    setNewInterventionsText("");
  };

  const handleUpdateTreatmentGoalField = (goalId: string, field: string, value: any) => {
    const plan = patient.clinicalData?.treatmentPlan || [];
    const updatedPlan = plan.map((g: any) => {
      if (g.id === goalId) {
        return { ...g, [field]: value };
      }
      return g;
    });
    handleUpdateTreatmentPlan(updatedPlan);
  };

  const handleDeleteTreatmentGoal = (goalId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta terapêutica?")) return;
    const plan = patient.clinicalData?.treatmentPlan || [];
    const updatedPlan = plan.filter((g: any) => g.id !== goalId);
    handleUpdateTreatmentPlan(updatedPlan);
  };

  const handleGoalReorder = (fromId: string, insertAt: number) => {
    const plan = [...(patient.clinicalData?.treatmentPlan || [])];
    const fromIdx = plan.findIndex((g: any) => g.id === fromId);
    if (fromIdx === -1) return;
    const [moved] = plan.splice(fromIdx, 1);
    // Adjust index because removing shifts elements after fromIdx left by 1
    const adjustedIdx = insertAt > fromIdx ? insertAt - 1 : insertAt;
    plan.splice(adjustedIdx, 0, moved);
    handleUpdateTreatmentPlan(plan);
  };

  const handleGenerateNextSessionPlanWithAi = async () => {
    if (isTreatmentPlanDisabled) {
      alert("O uso de Inteligência Artificial para Planejamento de Sessões foi desativado pela clínica.");
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    setIsGeneratingNextSession(true);
    try {
      const ai = new GoogleGenAI({ apiKey });

      const formulationText = localTccData?.isSplitByBelief 
        ? (localTccData?.beliefFormulations || []).map((bf: any) => 
            `Crença: ${bf.formulation?.coreBelief}\nRegras: ${bf.formulation?.intermediateBelief}\nMetas: ${bf.formulation?.goals}`
          ).join('\n\n')
        : `Crença Central: ${localTccData?.unifiedFormulation?.coreBelief}\nRegras: ${localTccData?.unifiedFormulation?.intermediateBelief}\nMetas: ${localTccData?.unifiedFormulation?.goals}`;

      const plan = patient.clinicalData?.treatmentPlan || [];
      const planText = plan.map((g: any) => `- Meta: ${g.goal} (${g.status === 'completed' ? 'Alcançada' : g.status === 'in_progress' ? 'Em Progresso' : 'Pendente'})${g.interventions ? ` | Intervenções: ${g.interventions}` : ''}`).join('\n');

      const prompt = `
        Aja como um assistente clínico de psicologia experiente na abordagem do paciente.
        Com base na Conceitualização Cognitiva do paciente ${patient.name}, no Plano de Tratamento atualizado e nas evoluções recentes, proponha um planejamento prático, estruturado e muito objetivo de intervenções, tópicos e planos de ação para serem trabalhados na PRÓXIMA SESSÃO.
        
        CONCEITUALIZAÇÃO COGNITIVA:
        ${formulationText}
        
        PLANO DE TRATAMENTO / METAS:
        ${planText}
        
        EVOLUÇÕES RECENTES:
        ${clinicalData.evoluções.slice(-3).map((e: any) => `${e.date}: ${e.note}`).join('\n')}
        
        DIRETRIZES DE FORMATAÇÃO E CONTEÚDO (SIGA À RISCA):
        1. Divida o planejamento em tópicos numerados cronológicos da sessão (ex: 1. Checagem..., 2. Intervenção/Foco..., 3. Fechamento...).
        2. Para cada tópico, estime a duração em minutos (ex: "5-10 min", "15-20 min").
        3. Para cada tópico, adicione itens de lista usando apenas o caractere "*" como marcador.
        4. O texto deve ser extremamente limpo. NÃO utilize nenhum tipo de negrito ou itálico com asteriscos (como **texto** ou ***texto***). Não envie os caracteres asteriscos extras a não ser o marcador de lista. Se quiser enfatizar algo, faça apenas no texto de forma natural.
        5. Remova saudações, introduções ou comentários iniciais/finais. Devolva apenas o planejamento limpo no formato do exemplo abaixo:

        Exemplo de formato esperado:
        1. Título do Tópico (5-10 min)
        * Item de orientação clínica ou pergunta prática para fazer ao paciente.
        * Outro item de acompanhamento.

        2. Título do Tópico (15-20 min)
        * Item descrevendo o foco principal e intervenções baseadas na abordagem do paciente.
        `;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const generatedPlan = response.text || '';
      setTempNextSessionPlan(generatedPlan);

      onUpdatePatient({
        ...patient,
        clinicalData: {
          ...patient.clinicalData,
          nextSessionPlan: generatedPlan
        }
      });

      alert("Planejamento da próxima sessão gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar plano da próxima sessão:", err);
      alert("Houve um erro ao processar a geração do planejamento da sessão.");
    } finally {
      setIsGeneratingNextSession(false);
    }
  };

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
        cpf: patient.cpf || patient.nif || patient.document || '',
        nif: patient.nif || patient.cpf || patient.document || '',
        document: patient.document || patient.nif || patient.cpf || '',
        birthDate: patient.birthDate || '',
        profession: patient.profession || patient.occupation || '',
        gender: patient.gender || '',
        address: patient.address || '',
        phone: patient.phone || '',
        email: patient.email || '',
        emergencyName: patient.emergencyName || '',
        emergencyRelation: patient.emergencyRelation || '',
        emergencyPhone: patient.emergencyPhone || '',
        amount: patient.amount || '',
        sessions: typeof patient.sessions === 'number' ? patient.sessions : (parseInt(patient.sessions) || 0),
        status: patient.status || 'Ativo',
        paymentNotes: patient.paymentNotes || '',
        paymentPeriodicity: patient.paymentPeriodicity || 'Por Sessão',
        paymentValue: patient.paymentValue !== undefined && patient.paymentValue !== null ? patient.paymentValue : (patient.amount || ''),
        paymentDay1: patient.paymentDay1 !== undefined && patient.paymentDay1 !== null ? patient.paymentDay1 : 5,
        paymentDay2: patient.paymentDay2 !== undefined && patient.paymentDay2 !== null ? patient.paymentDay2 : 20,
        paymentWeekday: patient.paymentWeekday || patient.sessionDay || 'Segunda-feira'
      });
    }
  }, [patient]);

  if (!patient || !editForm) return null;

  const handleSaveProfile = () => {
    const updated = {
      ...editForm,
      document: editForm.nif || editForm.cpf || editForm.document || '',
      cpf: editForm.cpf || editForm.nif || editForm.document || '',
      nif: editForm.nif || editForm.cpf || editForm.document || '',
    };
    onUpdatePatient(updated);
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
        setRecordedAudioBlob(finalBlob);
        if (audioBlobUrl) {
          URL.revokeObjectURL(audioBlobUrl);
        }
        const url = URL.createObjectURL(finalBlob);
        setAudioBlobUrl(url);
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

    setRecordedAudioBlob(blob);
    if (!audioBlobUrl) {
      const url = URL.createObjectURL(blob);
      setAudioBlobUrl(url);
    }
    setTranscriptionError(null);
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
          const prompt = "Transcreva o áudio clínico acima na íntegra, com máxima precisão. Escreva exatamente o que foi falado (em português), palavra por palavra, de forma corrida, sem omitir relatos e com pontuação clara. Não adicione resumos, comentários, introduções ou explicações. Apenas retorne o texto transcrito.";

          const response = await generateContentWithFallback(ai, {
            model: "gemini-3.8-flash",
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

          if (response?.text) {
            setTranscriptionText(prev => prev ? prev.trim() + "\n\n" + response.text.trim() : response.text.trim());
            setTranscriptionError(null);
          } else {
            setTranscriptionError("A IA não identificou falas claras no áudio. Você pode ouvir ou baixar o áudio salvo abaixo.");
          }
        } catch (err: any) {
          console.error("Erro ao transcrever com Gemini:", err);
          setTranscriptionError(err?.message || "Erro durante a transcrição do áudio com a IA.");
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.onerror = () => {
        setTranscriptionError("Falha na leitura local do arquivo de áudio.");
        setIsTranscribing(false);
      };
    } catch (err: any) {
      console.error("Erro ao processar blob do gravador:", err);
      setTranscriptionError("Erro ao processar o arquivo de áudio.");
      setIsTranscribing(false);
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validExtensions = /\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i;
    if (!file.type.startsWith('audio/') && !file.name.match(validExtensions)) {
      alert("Por favor, selecione um arquivo de áudio válido (.mp3, .m4a, .wav, .ogg, .webm, .aac).");
      return;
    }
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
    }
    const url = URL.createObjectURL(file);
    setAudioBlobUrl(url);
    setRecordedAudioBlob(file);
    transcribeAudio(file);
    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = "";
    }
  };

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAudio(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const validExtensions = /\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i;
    if (!file.type.startsWith('audio/') && !file.name.match(validExtensions)) {
      alert("Por favor, solte um arquivo de áudio válido (.mp3, .m4a, .wav, .ogg, .webm, .aac).");
      return;
    }
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
    }
    const url = URL.createObjectURL(file);
    setAudioBlobUrl(url);
    setRecordedAudioBlob(file);
    transcribeAudio(file);
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
      setRecordedAudioBlob(null);
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
      setAudioBlobUrl(null);
      setTranscriptionError(null);
      setEvolutionSessionNumber(prev => prev + 1);
      setIsAddingEvolution(false);
    } finally {
      setIsSavingEvolution(false);
    }
  };

  const handleGenerateEvolution = async () => {
    if (isEvolutionDisabled) {
      alert("O uso de Inteligência Artificial para Relato de Evolução foi desativado pela clínica.");
      return;
    }
    if (!transcriptionText.trim()) return;
    if (!checkAndConsumeDailyAiUsage()) return;
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    setIsGeneratingEvolution(true);
    try {
      const approachKey = profileSettings.clinicalApproach || 'tcc';
      const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

      const isPT = profileSettings.country === 'PT';
      const regulatoryGuidelines = isPT
        ? 'CÓDIGO DEONTOLÓGICO DA ORDEM DOS PSICÓLOGOS PORTUGUESES (OPP) E RGPD'
        : 'RESOLUÇÕES CFP Nº 001/2009 E 004/2020';
      const personTerm = isPT ? 'utente' : 'paciente';
      const docTerm = isPT ? 'processo clínico' : 'prontuário';

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um psicólogo clínico experiente cuja abordagem teórica principal é a ${approachInfo.name}.
Sua tarefa é redigir um RELATO DE EVOLUÇÃO CLÍNICA aprofundado, técnico, fluido e completo a partir das anotações/transcrição da sessão de atendimento psicológico.

DIRETRIZES DA SUA ABORDAGEM CLÍNICA (${approachInfo.name}):
${approachInfo.rules}

ESTRUTURA OBRIGATÓRIA DA EVOLUÇÃO CLÍNICA (${regulatoryGuidelines}):
Estruture o texto de forma profissional, rica em detalhes clínicos, dividindo-o estritamente nas seguintes 4 seções com seus respectivos títulos em caixa alta e negrito:

1. DEMANDA E TEMAS CENTRAIS DA SESSÃO
Descreva de forma rica e aprofundada os assuntos trazidos pelo ${personTerm}, o contexto de vida relatado, os eventos recentes e as principais queixas ou conflitos apresentados no encontro.

2. COMPREENSÃO CLÍNICA E DINÂMICA PSICOEMOCIONAL
Analise detalhadamente o funcionamento do ${personTerm} sob a perspectiva da ${approachInfo.name}. Descreva o estado afetivo/humor, padrões cognitivos/comportamentais, dinâmicas inconscientes ou vivências emocionais identificadas, crenças, defesas ou esquemas em operação.

3. MANEJO CLÍNICO E INTERVENÇÕES DO TERAPEUTA
Descreva em primeira pessoa da condução do terapeuta (ex.: "Acolhi a angústia inicial...", "Conduzi intervenção...", "Apliquei a técnica de...", "Questionei socraticamente...") todas as intervenções realizadas, as reflexões provocadas e como o ${personTerm} respondeu a cada manejo.

4. ENCAMINHAMENTOS E PLANO DE AÇÃO
Registre os combinados intersessões, tarefas terapêuticas (se aplicável à abordagem) e os focos de continuidade prioritários para o próximo encontro clínico.

DIRETRIZES ÉTICAS E DE ESTILO IMPRESCINDÍVEIS:
- ANONIMIZAÇÃO TOTAL: Substitua qualquer nome próprio mencionado na transcrição (${personTerm}, familiares, terceiros) pela letra inicial seguida de ponto (exemplo: Mariana -> M., Rafael -> R., Carlos -> C.).
- TOM CLÍNICO IMPECÁVEL: Escreva como um psicólogo clínico de alto nível, com vocabulário técnico preciso${isPT ? ' em Português de Portugal com rigor deontológico da OPP' : ''}, texto corrido bem articulado em cada seção, sem frases genéricas ou robóticas.
- FIDELIDADE: Baseie-se estritamente no conteúdo trazido na transcrição e faça inferências clínicas legítimas baseadas na teoria. Não invente fatos externos não ditos.
- Sem introduções ou saudações. Devolva apenas o texto da evolução pronto para o ${docTerm}.

TRANSCRIÇÃO / ANOTAÇÕES BRUTAS DA SESSÃO:
"${transcriptionText}"
`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      if (response?.text) {
        setNewEvolutionNote(response.text);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('API key')) {
        alert("Chave da API inválida ou não configurada corretamente.");
      } else {
        alert("Erro ao gerar relato com IA. Tente novamente.");
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
    if (isCfpDisabled) {
      alert("A geração de Prontuários CFP com IA foi desativada pela clínica.");
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    const approachKey = profileSettings.clinicalApproach || 'tcc';
    const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

    setGeneratingPdfId(evo.id);
    try {
      const isPT = profileSettings.country === 'PT';
      const personTerm = isPT ? 'utente' : 'paciente';
      const docTerm = isPT ? 'processo clínico formal (conforme Código Deontológico da OPP)' : 'prontuário formal';

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Atue como um psicólogo clínico da abordagem ${approachInfo.name} extraindo informações de um relato de evolução para um ${docTerm}.
Leia o seguinte relato de sessão e extraia as informações dividindo-as nestes 4 tópicos:
1. ${approachInfo.pdfTopics[0]} (Breve resumo do que o ${personTerm} trouxe para a sessão).
2. ${approachInfo.pdfTopics[1]} (Intervenções e técnicas específicas utilizadas na sessão).
3. ${approachInfo.pdfTopics[2]} (Como o ${personTerm} reagiu e qual o progresso observado).
4. ${approachInfo.pdfTopics[3]} (Acordos ou orientações inter-sessões).

Seja muito sucinto, formal, ético e direto de acordo com as diretrizes da sua abordagem. Não adicione saudações, asteriscos ou introduções, retorne APENAS um objeto JSON válido com as seguintes chaves exatas (tudo minúsculo, sem acentos): "demanda", "intervencoes", "evolucao", "tarefa".

Relato:
"${evo.note}"`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = safeJsonParse(response.text || '{}');

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

      if (profileSettings?.name || profileSettings?.opp || profileSettings?.crp) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const rightX = 196; // 210mm (A4) - 14mm de margem
        if (profileSettings.name) {
          doc.text(`Psicólogo(a): ${profileSettings.name}`, rightX, 15, { align: 'right' });
        }
        if (isPT) {
          const oppNum = profileSettings.opp || profileSettings.crp;
          if (oppNum) doc.text(`Cédula OPP: ${oppNum}`, rightX, 20, { align: 'right' });
        } else if (profileSettings.crp) {
          doc.text(`CRP: ${profileSettings.crp}`, rightX, 20, { align: 'right' });
        }
      }

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(isPT ? "Processo Clínico Psicológico" : "Prontuário Psicológico", 14, startY);

      // 1. Identificação do Utente / Paciente
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(isPT ? "1. Identificação do Utente" : "1. Identificação do Paciente", 14, startY + 15);
      
      autoTable(doc, {
        startY: startY + 20,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        body: [
          ['Nome Completo', patient.name || ''],
          ['Data de Nascimento', patient.birthDate || ''],
          [isPT ? 'NIF' : 'CPF/RG', patient.nif || patient.cpf || patient.document || ''],
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
      const profReg = isPT
        ? (profileSettings.opp ? `Cédula OPP nº ${profileSettings.opp}` : (profileSettings.crp ? `Cédula OPP nº ${profileSettings.crp}` : 'Cédula OPP'))
        : (profileSettings.crp ? `CRP ${profileSettings.crp}` : "CRP não cadastrado");
      doc.text(`${profName}\nPsicólogo(a) Clínico(a) | ${profReg}`, 140, finalY3 + 30, { align: "center" });

      const pdfBlob = doc.output('blob');
      const safeDate = (evo.date || 'data').replace(/[\/\\]/g, '-');
      const fileName = isPT
        ? `Processo_Clinico_Sessao_${evo.sessionNumber || evo.id}_${safeDate}.pdf`
        : `Prontuario_Sessao_${evo.sessionNumber || evo.id}_${safeDate}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      await onUpload(file, 'prontuario');
      alert(isPT
        ? "Processo clínico gerado e guardado na Biblioteca de Documentos com sucesso!"
        : "Prontuário gerado e salvo na Biblioteca de Documentos com sucesso!"
      );

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

  const handleGenerateAllIndividualPDFs = async () => {
    if (isCfpDisabled) {
      alert("A geração de Prontuários CFP com IA foi desativada pela clínica.");
      return;
    }
    if (!clinicalData.evoluções || clinicalData.evoluções.length === 0) {
      alert("Não há relatos salvos para gerar prontuários.");
      return;
    }

    if (!window.confirm(`Deseja gerar os prontuários individuais de todos os ${clinicalData.evoluções.length} relatos salvos? Isso processará cada relato e os adicionará automaticamente à Biblioteca de Documentos.`)) {
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API do Gemini não configurada. Verifique o arquivo .env.");
      return;
    }

    const approachKey = profileSettings.clinicalApproach || 'tcc';
    const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

    setGeneratingAllPdfsProgress("Iniciando...");

    try {
      const ai = new GoogleGenAI({ apiKey });
      const sortedEvolutions = [...clinicalData.evoluções].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return dateA.localeCompare(dateB);
      });

      for (let i = 0; i < sortedEvolutions.length; i++) {
        const evo = sortedEvolutions[i];
        setGeneratingAllPdfsProgress(`Gerando ${i + 1} de ${sortedEvolutions.length}...`);

        try {
          const isPT = profileSettings.country === 'PT';
          const personTerm = isPT ? 'utente' : 'paciente';
          const docTerm = isPT ? 'processo clínico formal (conforme Código Deontológico da OPP)' : 'prontuário formal';

          const prompt = `Atue como um psicólogo clínico da abordagem ${approachInfo.name} extraindo informações de um relato de evolução para um ${docTerm}.
Leia o seguinte relato de sessão e extraia as informações dividindo-as nestes 4 tópicos:
1. ${approachInfo.pdfTopics[0]} (Breve resumo do que o ${personTerm} trouxe para a sessão).
2. ${approachInfo.pdfTopics[1]} (Intervenções e técnicas específicas utilizadas na sessão).
3. ${approachInfo.pdfTopics[2]} (Como o ${personTerm} reagiu e qual o progresso observado).
4. ${approachInfo.pdfTopics[3]} (Acordos ou orientações inter-sessões).

Seja muito sucinto, formal, ético e direto de acordo com as diretrizes da sua abordagem. Não adicione saudações, asteriscos ou introduções, retorne APENAS um objeto JSON válido com as seguintes chaves exatas (tudo minúsculo, sem acentos): "demanda", "intervencoes", "evolucao", "tarefa".

Relato:
"${evo.note}"`;

          const response = await generateContentWithFallback(ai, {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            }
          });

          const data = safeJsonParse(response.text || '{}');

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

          if (profileSettings?.name || profileSettings?.opp || profileSettings?.crp) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const rightX = 196;
            if (profileSettings.name) {
              doc.text(`Psicólogo(a): ${profileSettings.name}`, rightX, 15, { align: 'right' });
            }
            if (isPT) {
              const oppNum = profileSettings.opp || profileSettings.crp;
              if (oppNum) doc.text(`Cédula OPP: ${oppNum}`, rightX, 20, { align: 'right' });
            } else if (profileSettings.crp) {
              doc.text(`CRP: ${profileSettings.crp}`, rightX, 20, { align: 'right' });
            }
          }

          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text(isPT ? "Processo Clínico Psicológico" : "Prontuário Psicológico", 14, startY);

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(isPT ? "1. Identificação do Utente" : "1. Identificação do Paciente", 14, startY + 15);
          
          autoTable(doc, {
            startY: startY + 20,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            body: [
              ['Nome Completo', patient.name || ''],
              ['Data de Nascimento', patient.birthDate || ''],
              [isPT ? 'NIF' : 'CPF/RG', patient.nif || patient.cpf || patient.document || ''],
              ['Contatos (Telefone/E-mail)', `${patient.phone || ''} / ${patient.email || ''}`],
              ['Responsável Legal (se menor)', '']
            ],
            columnStyles: {
              0: { cellWidth: 70, fontStyle: 'bold' },
              1: { cellWidth: 'auto' }
            }
          });

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

          const finalY3 = (doc as any).lastAutoTable.finalY || finalY2;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          const profName = profileSettings.name || "Profissional não cadastrado";
          const profReg = isPT
            ? (profileSettings.opp ? `Cédula OPP nº ${profileSettings.opp}` : (profileSettings.crp ? `Cédula OPP nº ${profileSettings.crp}` : 'Cédula OPP'))
            : (profileSettings.crp ? `CRP ${profileSettings.crp}` : "CRP não cadastrado");
          doc.text(`${profName}\nPsicólogo(a) Clínico(a) | ${profReg}`, 140, finalY3 + 30, { align: "center" });

          const pdfBlob = doc.output('blob');
          const safeDate = (evo.date || 'data').replace(/[\/\\]/g, '-');
          const fileName = isPT
            ? `Processo_Clinico_Sessao_${evo.sessionNumber || evo.id}_${safeDate}.pdf`
            : `Prontuario_Sessao_${evo.sessionNumber || evo.id}_${safeDate}.pdf`;
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          
          await onUpload(file, 'prontuario');

          if (i < sortedEvolutions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }

        } catch (err: any) {
          console.error(`Erro ao gerar PDF da evolução ${evo.id}:`, err);
        }
      }

      alert(profileSettings.country === 'PT'
        ? "Todos os processos clínicos individuais foram gerados e guardados na Biblioteca de Documentos com sucesso!"
        : "Todos os prontuários individuais foram gerados e salvos na Biblioteca de Documentos com sucesso!"
      );

    } catch (err: any) {
      console.error(err);
      alert("Erro ao processar a geração em lote.");
    } finally {
      setGeneratingAllPdfsProgress(null);
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

      const isPT = profileSettings.country === 'PT';
      if (profileSettings?.name || profileSettings?.opp || profileSettings?.crp) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const rightX = 196;
        if (profileSettings.name) {
          doc.text(`Psicólogo(a): ${profileSettings.name}`, rightX, 15, { align: 'right' });
        }
        if (isPT) {
          const oppNum = profileSettings.opp || profileSettings.crp;
          if (oppNum) doc.text(`Cédula OPP: ${oppNum}`, rightX, 20, { align: 'right' });
        } else if (profileSettings.crp) {
          doc.text(`CRP: ${profileSettings.crp}`, rightX, 20, { align: 'right' });
        }
      }

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(isPT ? "Processo Clínico Psicológico Completo" : "Prontuário Psicológico Completo", 14, startY);

      doc.setFontSize(12);
      doc.text(isPT ? "1. Identificação do Utente" : "1. Identificação do Paciente", 14, startY + 15);
      
      autoTable(doc, {
        startY: startY + 20,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        body: [
          ['Nome Completo', patient.name || ''],
          ['Data de Nascimento', patient.birthDate || ''],
          [isPT ? 'NIF' : 'CPF/RG', patient.nif || patient.cpf || patient.document || ''],
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
      const fileName = isPT
        ? `Processo_Clinico_Completo_${patient.name.replace(/\s+/g, '_')}.pdf`
        : `Prontuario_Completo_${patient.name.replace(/\s+/g, '_')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      onUpload(file, 'prontuario');
      alert(isPT
        ? "Processo clínico completo gerado e guardado na Biblioteca de Documentos com sucesso!"
        : "Prontuário completo gerado e salvo na Biblioteca de Documentos com sucesso!"
      );

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
    if (isEvolutionDisabled) {
      alert("O uso de Inteligência Artificial para Resumo de Sessões foi desativado pela clínica.");
      return;
    }
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

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = safeJsonParse(response.text || '{}');
      
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
          <div id="simplepsi-active-patient" data-id={patient.id} data-name={patient.name} style={{ display: 'none' }} />
          <h2 className="text-2xl font-bold uppercase text-text-main">{patient.name}</h2>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Users size={14} /> {(() => {
                if (!patient.createdAt) return 'Ativo';
                try {
                  const date = new Date(patient.createdAt);
                  if (isNaN(date.getTime())) return 'Ativo';
                  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  return `Ativo desde ${months[date.getMonth()]} de ${date.getFullYear()}`;
                } catch {
                  return 'Ativo';
                }
              })()}
            </span>
            {patient.sessionDay ? (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <CalendarIcon size={14} /> {isPT ? 'Consulta Habitual:' : 'Sessão Padrão:'} {isPT ? `Todas as ${patient.sessionDay}s` : `Toda ${patient.sessionDay}`} {patient.sessionTime ? `às ${patient.sessionTime}` : ''}
              </span>
            ) : (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <CalendarIcon size={14} /> {isPT ? 'Agendamento Flexível' : 'Agendamento Flexível'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Nav with overflow for mobile */}
        <div className="lg:col-span-3">
          <div className="flex flex-row overflow-x-auto pb-4 lg:flex-col lg:overflow-visible gap-2 no-scrollbar">
            {isRestrictedRole && (
              <div className="p-3 mb-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isPT ? (
                    <><strong>Sigilo Profissional (OPP/RGPD):</strong> Os processos clínicos e as notas são confidenciais e de acesso exclusivo do(a) psicólogo(a) assistente.</>
                  ) : (
                    <><strong>Sigilo Profissional (CFP/LGPD):</strong> Prontuários e anotações clínicas são confidenciais e de acesso exclusivo do psicólogo assistente.</>
                  )}
                </span>
              </div>
            )}
            {(isRestrictedRole ? [
              { id: 'perfil', label: isPT ? 'Dados do Utente (Perfil)' : 'Dados do Paciente (Perfil)', icon: Users },
              { id: 'reembolso', label: isPT ? 'Declarações & Seguros' : 'Recibos & Reembolso', icon: Receipt },
            ] : [
              { id: 'perfil', label: isPT ? 'Perfil' : 'Perfil', icon: Users },
              { id: 'prontuario', label: isPT ? 'Evoluções Clínicas' : 'Evoluções', icon: FileText, badge: 'NOVO' },
              { 
                id: 'anamnese', 
                label: profileSettings?.clinicalApproach === 'tcc' ? (isPT ? 'Concetualização TCC' : 'Conceitualização TCC') : 
                       profileSettings?.clinicalApproach === 'psicanalise' ? 'Estruturação Analítica' :
                       profileSettings?.clinicalApproach === 'gestalt' ? 'Mapa Gestáltico' :
                       profileSettings?.clinicalApproach === 'act' ? 'Matriz ACT' :
                       profileSettings?.clinicalApproach === 'humanista' ? 'Análise Existencial / ACP' :
                       (isPT ? 'Anamnese Clínica' : 'Anamnese'), 
                icon: FileText 
              },
              { id: 'biblioteca', label: isPT ? 'Biblioteca / Processos Clínicos' : 'Biblioteca / Prontuários', icon: FolderOpen },
              { 
                id: 'tratamento', 
                label: ['psicanalise', 'junguiana', 'gestalt', 'humanista'].includes(profileSettings?.clinicalApproach)
                  ? 'Organização do Caso' 
                  : (isPT ? 'Plano de Intervenção' : 'Plano de Tratamento'), 
                icon: CheckCircle2 
              },
              { id: 'smartnotes', label: isPT ? 'Resumo Clínico' : 'Resumo', icon: BarChart3 },
              { id: 'reembolso', label: isPT ? 'Declarações & Seguros' : 'Reembolso', icon: Receipt },
            ]).map(item => (
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
           <section className="glass-card rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 min-h-[500px] sm:min-h-[600px] overflow-hidden">
              <AnimatePresence mode="wait">
                {isRestrictedRole && activeSubTab !== 'perfil' && activeSubTab !== 'reembolso' && (
                  <motion.div 
                    key="restricted-notice"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-12 text-center space-y-4 max-w-md mx-auto my-auto"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                      <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-text-main">
                      {isPT ? 'Acesso Clínico Reservado' : 'Acesso Clínico Restrito'}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {isPT 
                        ? 'Em estrita conformidade com o Código Deontológico da Ordem dos Psicólogos Portugueses (OPP) e o RGPD, o acesso a processos clínicos, notas de evolução, anamneses e relatórios confidenciais é de acesso exclusivo do(a) psicólogo(a) responsável pelo utente.' 
                        : 'Em estrita conformidade com o Código de Ética Profissional do Psicólogo (Resolução CFP nº 01/2009) e a LGPD, o acesso a prontuários, evoluções clínicas, anamneses e anotações confidenciais é de acesso exclusivo do(a) psicólogo(a) responsável pelo paciente.'}
                    </p>
                    <button
                      onClick={() => setActiveSubTab('perfil')}
                      className="px-5 py-2.5 rounded-xl bg-primary text-text-main font-bold text-xs hover:opacity-90 transition-all shadow-md shadow-primary/20"
                    >
                      {isPT ? 'Voltar aos Dados do Utente' : 'Voltar aos Dados do Paciente'}
                    </button>
                  </motion.div>
                )}
                {activeSubTab === 'perfil' && (
                  <motion.div 
                    key="perfil"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-border-ui">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-2xl sm:text-4xl font-bold italic border border-primary/20 flex-shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          {isEditing ? (
                            <input 
                              value={editForm.name} 
                              onChange={(e) => setEditForm({...editForm, name: e.target.value.toUpperCase()})}
                              className="text-xl sm:text-2xl font-bold bg-surface-muted border border-border-ui rounded-lg px-2 py-1 outline-none focus:border-primary text-text-main w-full"
                            />
                          ) : (
                            <h3 className="text-xl sm:text-2xl font-bold text-text-main uppercase">{patient.name}</h3>
                          )}
                          
                          <p className="text-xs sm:text-sm text-text-muted truncate max-w-[180px] sm:max-w-none">{isEditing ? editForm.email : patient.email}</p>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] sm:text-xs bg-surface-muted px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-border-ui">{isEditing ? editForm.phone : patient.phone}</span>
                              {(isEditing ? editForm.phone : patient.phone) && getWhatsAppLink(isEditing ? editForm.phone : patient.phone) && (
                                <a 
                                  href={getWhatsAppLink(isEditing ? editForm.phone : patient.phone)!}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 hover:bg-green-500/20 transition-all flex items-center justify-center cursor-pointer"
                                  title="Conversar no WhatsApp"
                                >
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                                  </svg>
                                </a>
                              )}
                            </div>
                            {isEditing ? (
                              <select 
                                value={editForm.status || 'Ativo'}
                                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                className="text-xs bg-surface-muted px-2 py-1 rounded-lg border border-border-ui outline-none focus:border-primary font-bold"
                              >
                                <option value="Ativo">ATIVO</option>
                                <option value="Inativo">INATIVO</option>
                              </select>
                            ) : (
                              <span className={cn(
                                "text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border font-bold uppercase tracking-widest",
                                patient.status === 'Inativo' ? "bg-orange-500/10 text-orange-500 border-orange-500/10" : "bg-green-500/10 text-green-500 border-green-500/10"
                              )}>
                                {(isPT ? 'Utente ' : 'Paciente ') + (patient.status || 'Ativo')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                        className={cn(
                          "px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-sm w-full sm:w-auto",
                          isEditing ? "bg-primary text-white" : "bg-surface-muted text-text-main border border-border-ui hover:bg-border-ui"
                        )}
                      >
                        {isEditing ? (isPT ? 'Guardar Alterações' : 'Salvar Alterações') : (isPT ? 'Editar Perfil' : 'Editar Perfil')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{isPT ? 'Informações Pessoais' : 'Informações Pessoais'}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          
                          {/* CPF / NIF */}
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">{isPT ? 'NIF' : 'CPF'}</span>
                            {isEditing ? (
                              <input 
                                placeholder={isPT ? 'Ex: 123456789' : '000.000.000-00'}
                                value={editForm.cpf} 
                                onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">{patient.nif || patient.cpf || patient.document || (isPT ? 'Não informado' : 'Não informado')}</span>
                            )}
                          </div>

                          {/* Data de Nasc */}
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">{isPT ? 'Data de Nasc.' : 'Data de Nasc.'}</span>
                            {isEditing ? (
                              <input 
                                type="date"
                                value={editForm.birthDate} 
                                onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none w-full cursor-pointer"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">
                                {formatBirthDate(patient.birthDate)}
                              </span>
                            )}
                          </div>

                          {/* Gênero/Pronome */}
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">{isPT ? 'Género / Pronome' : 'Gênero/Pronome'}</span>
                            {isEditing ? (
                              <input 
                                placeholder={isPT ? 'Ex: Feminino, Ela/Dela' : 'Ex: Feminino, Ela/Dela'}
                                value={editForm.gender} 
                                onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">{patient.gender || 'Não informado'}</span>
                            )}
                          </div>

                          {/* Profissão */}
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">{isPT ? 'Profissão' : 'Profissão'}</span>
                            {isEditing ? (
                              <input 
                                placeholder="Ex: Designer Gráfico"
                                value={editForm.profession} 
                                onChange={(e) => setEditForm({...editForm, profession: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">{patient.profession || patient.occupation || 'Não informada'}</span>
                            )}
                          </div>

                          {/* Telefone / Telemóvel */}
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">{isPT ? 'Telemóvel / Telefone' : 'Telefone'}</span>
                            {isEditing ? (
                              <input 
                                placeholder={isPT ? '912 345 678 ou +351...' : '(00) 00000-0000'}
                                value={editForm.phone} 
                                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">{patient.phone || 'Não informado'}</span>
                            )}
                          </div>

                          {/* E-mail */}
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                            <span className="text-xs text-text-muted">E-mail</span>
                            {isEditing ? (
                              <input 
                                placeholder="email@exemplo.com"
                                value={editForm.email} 
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main truncate">{patient.email || 'Não informado'}</span>
                            )}
                          </div>

                          {/* Endereço / Morada */}
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui sm:col-span-2">
                            <span className="text-xs text-text-muted">{isPT ? 'Morada' : 'Endereço'}</span>
                            {isEditing ? (
                              <input 
                                placeholder={isPT ? 'Rua, Número, Código Postal, Localidade' : 'Rua, Número, Bairro, Cidade - UF'}
                                value={editForm.address} 
                                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs font-bold text-text-main">{patient.address || 'Não informado'}</span>
                            )}
                          </div>

                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{isPT ? 'Contactos de Emergência' : 'Contatos de Emergência'}</h4>
                        <div className="p-4 rounded-2xl bg-surface-muted border border-border-ui space-y-3">
                          {isEditing ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] text-text-muted uppercase">{isPT ? 'Nome do Contacto' : 'Nome do Contato'}</label>
                                <input 
                                  value={editForm.emergencyName} 
                                  onChange={(e) => setEditForm({...editForm, emergencyName: e.target.value})}
                                  className="w-full text-sm font-bold text-text-main bg-white/5 border border-border-ui rounded-lg px-3 py-2 outline-none focus:border-primary uppercase"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-text-muted uppercase">{isPT ? 'Parentesco / Relação' : 'Parentesco'}</label>
                                <input 
                                  value={editForm.emergencyRelation} 
                                  onChange={(e) => setEditForm({...editForm, emergencyRelation: e.target.value})}
                                  className="w-full text-xs text-text-main bg-white/5 border border-border-ui rounded-lg px-3 py-2 outline-none focus:border-primary"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-text-muted uppercase">{isPT ? 'Telemóvel / Telefone' : 'Telefone'}</label>
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
                                {patient.emergencyName || (isPT ? 'Nenhum contacto' : 'Nenhum contato')} {patient.emergencyRelation && `(${patient.emergencyRelation})`}
                              </p>
                              <p className="text-xs text-text-muted mt-1">{patient.emergencyPhone || (isPT ? 'Contacto não informado' : 'Telefone não informado')}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border-ui space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{isPT ? 'Agendamento Habitual' : 'Agendamento Padrão'}</h4>
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
                          <span className="text-xs text-text-muted">{isPT ? 'Periodicidade' : 'Recorrência'}</span>
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

                        {editForm && editForm.recurrence && editForm.recurrence !== 'Nenhuma' && (
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui col-span-2 lg:col-span-2">
                            <span className="text-xs text-text-muted">{isPT ? 'Data de Início da Periodicidade' : 'Data de Início da Recorrência'}</span>
                            {isEditing ? (
                              <div className="space-y-1">
                                <input 
                                  type="date" 
                                  value={editForm.recurrenceStart || (editForm.createdAt ? editForm.createdAt.split('T')[0] : '')} 
                                  onChange={(e) => {
                                    const date = new Date(e.target.value + 'T12:00:00');
                                    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                                    setEditForm({
                                      ...editForm, 
                                      recurrenceStart: e.target.value,
                                      sessionDay: days[date.getDay()]
                                    });
                                  }} 
                                  className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer w-full focus:border-primary"
                                />
                                <p className="text-[10px] text-primary font-bold uppercase tracking-tighter opacity-70">
                                  {isPT ? `Define o dia da semana e o ciclo ${editForm.recurrence.toLowerCase()}.` : `Define o dia da semana e o ciclo de ${editForm.recurrence.toLowerCase()}.`}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-text-main">
                                {(() => {
                                  try {
                                    if (patient.recurrenceStart) {
                                      return format(new Date(patient.recurrenceStart + 'T12:00:00'), "dd/MM/yyyy");
                                    }
                                    if (patient.createdAt) {
                                      return format(new Date(patient.createdAt), "dd/MM/yyyy");
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                  return 'Não definida';
                                })()}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="col-span-2 lg:col-span-4 flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">{isPT ? 'Hiperligação da Consulta (ex: Google Meet, Zoom)' : 'Link de Atendimento (ex: Google Meet, Zoom)'}</span>
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
                                href={(() => {
                                  if (!patient.meetingLink) return '';
                                  if (!patient.meetingLink.includes('meet.google.com')) return patient.meetingLink;
                                  try {
                                    const url = new URL(patient.meetingLink);
                                    url.hash = `patientId=${encodeURIComponent(patient.id)}&patientName=${encodeURIComponent(patient.name)}`;
                                    return url.toString();
                                  } catch {
                                    return `${patient.meetingLink}#patientId=${encodeURIComponent(patient.id)}&patientName=${encodeURIComponent(patient.name)}`;
                                  }
                                })()}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-0.5 break-all"
                              >
                                {patient.meetingLink}
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-text-muted italic">{isPT ? 'Nenhuma registada' : 'Nenhum cadastrado'}</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border-ui space-y-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{isPT ? 'Informações Financeiras e Faturação' : 'Informações Financeiras e de Pagamento'}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Valor da Sessão / Consulta */}
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">{isPT ? 'Valor da Consulta (€)' : 'Valor da Sessão (R$)'}</span>
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.amount || ''} 
                              onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                              className="text-xs font-bold text-text-main bg-transparent outline-none w-full"
                            />
                          ) : (
                            <span className="text-xs font-bold text-text-main">{patient.amount ? (isPT ? `€ ${patient.amount}` : `R$ ${patient.amount}`) : 'Não informado'}</span>
                          )}
                        </div>

                        {/* Frequência de Pagamento */}
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                          <span className="text-xs text-text-muted">Frequência de Pagamento</span>
                          {isEditing ? (
                            <select 
                              value={editForm.paymentPeriodicity || 'Por Sessão'} 
                              onChange={(e) => setEditForm({...editForm, paymentPeriodicity: e.target.value})} 
                              className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer w-full"
                            >
                              <option value="Mensal">Mensal</option>
                              <option value="Quinzenal">Quinzenal</option>
                              <option value="Semanal">Semanal</option>
                              <option value="Por Sessão">{isPT ? 'Por Consulta (Avulso)' : 'Por Sessão (Avulso)'}</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold text-text-main">
                              {patient.paymentPeriodicity === 'Por Sessão' ? (isPT ? 'Por Consulta' : 'Por Sessão') : (patient.paymentPeriodicity || (isPT ? 'Por Consulta' : 'Por Sessão'))}
                            </span>
                          )}
                        </div>


                        {/* Configuração de datas dependendo da Frequência */}
                        
                        {/* Se MENSAL */}
                        {(isEditing ? editForm.paymentPeriodicity : patient.paymentPeriodicity) === 'Mensal' && (
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui sm:col-span-2">
                            <span className="text-xs text-text-muted">{isPT ? 'Dia do Vencimento do Mês (1 a 31)' : 'Dia do Vencimento do Mês (1 a 31)'}</span>
                            {isEditing ? (
                              <select 
                                value={editForm.paymentDay1 || 5} 
                                onChange={(e) => setEditForm({...editForm, paymentDay1: parseInt(e.target.value)})}
                                className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer w-full"
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>Dia {day}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-bold text-text-main">
                                Todo dia {patient.paymentDay1 || 5}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Se QUINZENAL */}
                        {(isEditing ? editForm.paymentPeriodicity : patient.paymentPeriodicity) === 'Quinzenal' && (
                          <>
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                              <span className="text-xs text-text-muted">Primeiro Dia de Vencimento (1 a 31)</span>
                              {isEditing ? (
                                <select 
                                  value={editForm.paymentDay1 || 5} 
                                  onChange={(e) => setEditForm({...editForm, paymentDay1: parseInt(e.target.value)})}
                                  className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer w-full"
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Dia {day}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs font-bold text-text-main">
                                  Dia {patient.paymentDay1 || 5}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui">
                              <span className="text-xs text-text-muted">Segundo Dia de Vencimento (1 a 31)</span>
                              {isEditing ? (
                                <select 
                                  value={editForm.paymentDay2 || 20} 
                                  onChange={(e) => setEditForm({...editForm, paymentDay2: parseInt(e.target.value)})}
                                  className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer w-full"
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Dia {day}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs font-bold text-text-main">
                                  Dia {patient.paymentDay2 || 20}
                                </span>
                              )}
                            </div>
                          </>
                        )}

                        {/* Se SEMANAL */}
                        {(isEditing ? editForm.paymentPeriodicity : patient.paymentPeriodicity) === 'Semanal' && (
                          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui sm:col-span-2">
                            <span className="text-xs text-text-muted">Dia da Semana do Pagamento</span>
                            {isEditing ? (
                              <select 
                                value={editForm.paymentWeekday || 'Segunda-feira'} 
                                onChange={(e) => setEditForm({...editForm, paymentWeekday: e.target.value})} 
                                className="text-xs font-bold text-text-main bg-transparent outline-none cursor-pointer w-full"
                              >
                                <option value="Segunda-feira">Segunda-feira</option>
                                <option value="Terça-feira">Terça-feira</option>
                                <option value="Quarta-feira">Quarta-feira</option>
                                <option value="Quinta-feira">Quinta-feira</option>
                                <option value="Sexta-feira">Sexta-feira</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                              </select>
                            ) : (
                              <span className="text-xs font-bold text-text-main">
                                Toda {patient.paymentWeekday || 'Segunda-feira'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notas de Pagamento */}
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-muted/50 border border-border-ui sm:col-span-2">
                          <span className="text-xs text-text-muted font-bold uppercase tracking-wider">{isPT ? 'Notas e Observações de Faturação' : 'Notas e Observações de Pagamento'}</span>
                          {isEditing ? (
                            <textarea 
                              placeholder={isPT ? 'Adicione observações sobre a faturação (Ex: Paga por MB WAY todo o dia 5)' : 'Adicione observações sobre a cobrança (Ex: Paga por Pix todo dia 5)'}
                              value={editForm.paymentNotes || ''} 
                              onChange={(e) => setEditForm({...editForm, paymentNotes: e.target.value})}
                              className="text-xs font-bold text-text-main bg-transparent outline-none w-full min-h-[60px] resize-none"
                            />
                          ) : (
                            <p className="text-xs font-bold text-text-main whitespace-pre-wrap">{patient.paymentNotes || (isPT ? 'Nenhuma observação interna.' : 'Nenhuma observação interna.')}</p>
                          )}
                        </div>

                      </div>
                    </div>



                    <div className="pt-8 border-t border-border-ui space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-text-main flex items-center gap-2">
                          <FileText size={18} className="text-primary" />
                          {isPT ? 'Resumo das Consultas' : 'Resumo das Sessões'}
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
                              {isPT ? 'A analisar...' : 'Analisando...'}
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
                            <p className="text-[10px] text-text-muted mt-1">{isPT ? 'Ao eliminar este utente, todos os seus dados e históricos serão removidos permanentemente.' : 'Ao apagar este paciente, todos os seus dados e históricos serão removidos permanentemente.'}</p>
                          </div>
                          <button 
                            onClick={() => {
                              onDeletePatient(patient.id);
                              onBack();
                            }}
                            className="px-6 py-2 rounded-xl bg-red-500 text-white text-[10px] font-bold uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                          >
                            {isPT ? 'Eliminar Utente' : 'Apagar Paciente'}
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <FileText size={20} />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-text-main">Evoluções Clínicas</h3>
                      </div>
                      {!isAddingEvolution && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                          {clinicalData.evoluções.length > 0 && (
                            <button 
                              onClick={handleGenerateAllIndividualPDFs}
                              disabled={generatingAllPdfsProgress !== null}
                              className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-blue-500 hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
                            >
                              {generatingAllPdfsProgress ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  <span>{generatingAllPdfsProgress}</span>
                                </>
                              ) : (
                                <>
                                  <FileDown size={16} />
                                  <span>{isPT ? 'Gerar Todos os Processos Clínicos' : 'Gerar Todos os Prontuários'}</span>
                                </>
                              )}
                            </button>
                          )}
                          <button 
                            onClick={() => setIsAddingEvolution(true)}
                            className="bg-primary text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:opacity-90 shadow-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            <Plus size={16} /> {isPT ? 'Nova Evolução' : 'Nova Evolução'}
                          </button>
                        </div>
                      )}
                    </div>

                    {isAddingEvolution && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 rounded-3xl border border-primary/20 space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{isPT ? 'Registar Nova Consulta' : 'Registrar Nova Sessão'}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{isPT ? 'Número da Consulta' : 'Número da Sessão'}</label>
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

                            {/* Hidden file input for audio upload */}
                            <input
                              type="file"
                              ref={audioFileInputRef}
                              onChange={handleAudioFileUpload}
                              accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac,.flac"
                              className="hidden"
                            />

                            {/* Audio Recorder & Upload Safe Hub */}
                            <div 
                              onDragOver={(e) => { e.preventDefault(); setIsDraggingAudio(true); }}
                              onDragLeave={() => setIsDraggingAudio(false)}
                              onDrop={handleAudioDrop}
                              className={cn(
                                "glass-card p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                                isDraggingAudio 
                                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" 
                                  : "border-border-ui bg-card"
                              )}
                            >
                              {isTranscribing ? (
                                <div className="flex flex-col items-center justify-center py-5 space-y-3">
                                  <Loader2 size={26} className="text-primary animate-spin" />
                                  <div className="text-center">
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest">
                                      Transcrevendo áudio com Inteligência Artificial...
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-1">
                                      Processando falas com alta precisão e segurança. Seu áudio já está protegido.
                                    </p>
                                  </div>
                                </div>
                              ) : isRecording ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 w-full">
                                  <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
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

                                  <div className="flex items-center justify-center gap-4 w-full sm:w-auto flex-wrap">
                                    <span className="text-base font-bold text-text-main font-mono tracking-wider bg-surface-muted px-3 py-1 rounded-xl border border-white/5">
                                      {formatDuration(recordingDuration)}
                                    </span>

                                    <div className="flex items-center gap-2">
                                      {isPaused ? (
                                        <button
                                          type="button"
                                          onClick={resumeAudioRecording}
                                          className="p-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-xl transition-all border border-green-500/20"
                                          title="Retomar Gravação"
                                        >
                                          <Play size={16} />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={pauseAudioRecording}
                                          className="p-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 rounded-xl transition-all border border-yellow-500/20"
                                          title="Pausar Gravação"
                                        >
                                          <Pause size={16} />
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={stopAudioRecording}
                                        className="p-2.5 bg-primary text-white rounded-xl transition-all hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 px-4 font-bold text-xs uppercase tracking-widest"
                                        title="Parar e Salvar/Transcrever"
                                      >
                                        <Square size={12} className="fill-white" />
                                        Concluir
                                      </button>

                                      <button
                                        type="button"
                                        onClick={cancelAudioRecording}
                                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-500 rounded-xl transition-all border border-red-500/10"
                                        title="Descartar Áudio"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : recordedAudioBlob ? (
                                <div className="space-y-3 py-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                      <span className="text-xs font-bold text-text-main">
                                        Gravação Salva com Sucesso
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {audioBlobUrl && (
                                        <a
                                          href={audioBlobUrl}
                                          download={`relato-sessao-${evolutionSessionNumber}-${(patient.name || 'paciente').replace(/\s+/g, '_')}.webm`}
                                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                          title="Baixar uma cópia do arquivo de áudio no seu computador"
                                        >
                                          <Download size={13} />
                                          Baixar Áudio (.webm)
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        disabled={isTranscribing}
                                        onClick={() => recordedAudioBlob && transcribeAudio(recordedAudioBlob)}
                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                                        title="Processar transcrição novamente com IA"
                                      >
                                        <RefreshCw size={13} className={isTranscribing ? "animate-spin" : ""} />
                                        Transcrever Novamente
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm("Deseja descartar este áudio para gravar outro?")) {
                                            setRecordedAudioBlob(null);
                                            if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
                                            setAudioBlobUrl(null);
                                            setTranscriptionError(null);
                                          }
                                        }}
                                        className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Descartar áudio e gravar outro"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </div>

                                  {audioBlobUrl && (
                                    <audio controls src={audioBlobUrl} className="w-full h-9 rounded-xl outline-none" />
                                  )}

                                  {transcriptionError && (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                                      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                                      <div>
                                        <p className="font-bold">Aviso na transcrição automática</p>
                                        <p className="text-[11px] opacity-90 mt-0.5">{transcriptionError}</p>
                                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                          🛡️ Fique tranquilo: seu áudio está 100% seguro no player acima! Você pode ouvi-lo, baixá-lo ou tentar transcrever novamente.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
                                  <div className="flex items-center gap-3 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                      <Mic size={20} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-text-main uppercase tracking-tight">{isPT ? 'Gravador de Consultas & Carregamento' : 'Gravador de Relatos & Upload'}</p>
                                      <p className="text-[11px] text-text-muted">{isPT ? 'Grave pelo microfone ou arraste um ficheiro de áudio gravado no telemóvel.' : 'Grave pelo microfone ou arraste um arquivo de áudio gravado no celular.'}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                      type="button"
                                      onClick={() => audioFileInputRef.current?.click()}
                                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-surface-muted hover:bg-surface-muted/80 border border-border-ui text-text-main rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                      title={isPT ? 'Carregar ficheiro de áudio gravado no telemóvel ou computador' : 'Fazer upload de arquivo de áudio gravado no celular ou computador'}
                                    >
                                      <Upload size={15} />
                                      {isPT ? 'Carregar Áudio' : 'Subir Áudio'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={startAudioRecording}
                                      className="flex-1 sm:flex-initial bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
                                    >
                                      <Mic size={16} />
                                      {isPT ? 'Gravar Agora' : 'Gravar Agora'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Banner Extensão do Google Meet (Opcional & Dispensável) */}
                            {!isMeetBannerDismissed && !hasAcceptedExtensionTerms && (
                              <div className="relative p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsMeetBannerDismissed(true);
                                    localStorage.setItem('simplepsi_dismiss_evolution_meet_banner', 'true');
                                  }}
                                  className="absolute top-2.5 right-2.5 p-1 text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all"
                                  title="Dispensar este aviso"
                                >
                                  <X size={14} />
                                </button>
                                <div className="flex items-center gap-3 text-left pr-6 sm:pr-0">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                    <Video size={20} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-xs font-bold text-text-main">{isPT ? 'Dá consultas pelo Google Meet?' : 'Atende pelo Google Meet?'}</h5>
                                    </div>
                                    <p className="text-[10px] text-text-muted">
                                      {isPT ? 'Instale a nossa extensão oficial para transcrever e enviar a consulta num só clique.' : 'Instale nossa extensão oficial para transcrever e enviar a sessão em 1 clique.'}
                                    </p>
                                    <p className="text-[9.5px] text-primary/90 mt-0.5 font-medium">
                                      ⭐ * Requer legendas ativadas em Português no Google Meet.
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={onOpenExtensionModal}
                                  className="w-full sm:w-auto bg-primary text-white hover:opacity-90 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                                >
                                  <Chrome size={14} />
                                  Ativar Extensão
                                </button>
                              </div>
                            )}

                            <textarea 
                              id="transcription-textarea"
                              value={transcriptionText}
                              onChange={(e) => setTranscriptionText(e.target.value)}
                              placeholder={isPT ? 'Grave no microfone acima, carregue o ficheiro de áudio ou cole a transcrição da consulta aqui...' : 'Fale no gravador acima, faça upload do áudio ou cole a transcrição bruta da sessão aqui...'}
                              className="w-full bg-surface-muted border border-border-ui rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary min-h-[120px] resize-none"
                            />

                            {/* Gerador de Evolução Clínica com IA - Padrão CFP / OPP */}
                            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3 text-left">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                  <Sparkles size={20} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-xs font-bold text-text-main">{isPT ? 'Evolução Clínica com IA (Padrão OPP)' : 'Evolução Clínica com IA (Padrão CFP)'}</h5>
                                    <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-bold">
                                      {CLINICAL_APPROACHES[profileSettings.clinicalApproach || 'tcc']?.name || 'TCC'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-text-muted mt-0.5">
                                    Estruturação completa: Demanda, Compreensão Clínica, Manejo do Terapeuta e Encaminhamentos.
                                  </p>
                                </div>
                              </div>

                              <button 
                                type="button"
                                onClick={handleGenerateEvolution}
                                disabled={isGeneratingEvolution || !transcriptionText.trim()}
                                className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                              >
                                {isGeneratingEvolution ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>{isPT ? 'A estruturar com IA...' : 'Estruturando com IA...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={16} />
                                    <span>Gerar Evolução Clínica</span>
                                  </>
                                )}
                              </button>
                            </div>
                         </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{isPT ? 'Registo Final da Consulta' : 'Relato Final da Sessão'}</label>
                           <textarea 
                             value={newEvolutionNote}
                             onChange={(e) => setNewEvolutionNote(e.target.value)}
                             placeholder={isPT ? 'O registo gerado pela IA aparecerá aqui. Também pode digitar manualmente...' : 'O relato gerado pela IA aparecerá aqui. Você também pode digitar manualmente...'}
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
                            {isSavingEvolution ? (isPT ? 'A guardar...' : 'Salvando...') : (isPT ? 'Guardar Evolução' : 'Salvar Evolução')}
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
                                <button onClick={() => handleSaveEditEvolution(evo.id)} className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all">{isPT ? 'Guardar' : 'Salvar'}</button>
                              </div>
                            </div>
                          ) : (
                            <div className="glass-card p-6 rounded-2xl border border-border-ui hover:border-primary/30 transition-colors">
                               <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase tracking-widest",
                                      idx === 0 ? "text-primary" : "text-text-muted"
                                    )}>{isPT ? 'Consulta #' : 'Sessão #'}{evo.sessionNumber || (clinicalData.evoluções.length - idx)}</span>
                                    <span className="text-[10px] font-bold text-text-muted/50 uppercase tracking-widest">• {evo.date} {evo.time && `às ${evo.time}`}</span>
                                  </div>
                                  <div className="relative">
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenDropdownId(openDropdownId === evo.id ? null : evo.id); }} className="text-text-muted hover:text-text-main p-1"><MoreVertical size={14} /></button>
                                    {openDropdownId === evo.id && (
                                      <div className="absolute right-0 mt-2 w-48 glass-card rounded-xl border border-border-ui shadow-xl overflow-hidden z-20">
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingEvolutionId(evo.id); setEditingEvolutionNote(evo.note); setOpenDropdownId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold text-text-main hover:bg-surface-muted transition-colors flex items-center gap-2"><PenTool size={12}/> {isPT ? 'Editar' : 'Editar'}</button>
                                        {currentClinic && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setSupervisionEvo(evo);
                                              setSupervisionNote(evo.note);
                                              setSupervisionDoubts('');
                                              setIsSupervisionModalOpen(true);
                                              setOpenDropdownId(null);
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs font-bold text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center gap-2 border-t border-border-ui"
                                          >
                                            <UserCheck size={12} /> Enviar para Supervisão
                                          </button>
                                        )}
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteEvolution(evo.id); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-border-ui"><Trash2 size={12}/> {isPT ? 'Eliminar' : 'Excluir'}</button>
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
                               <div className="mt-4 pt-4 border-t border-border-ui/50 flex flex-wrap items-center justify-between gap-3">
                                 <button
                                   onClick={() => handleGeneratePDFRecord(evo)}
                                   disabled={generatingPdfId === evo.id}
                                   className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                                 >
                                   {generatingPdfId === evo.id ? (
                                     <>
                                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                      {isPT ? 'A gerar...' : 'Gerando...'}
                                     </>
                                   ) : (
                                     <>
                                      <FileDown size={14} />
                                      {isPT ? 'Gerar Processo Clínico (PDF)' : 'Gerar Prontuário (PDF)'}
                                     </>
                                   )}
                                 </button>
                                 
                                 {currentClinic && (
                                   <button
                                     type="button"
                                     onClick={() => {
                                       setSupervisionEvo(evo);
                                       setSupervisionNote(evo.note);
                                       setSupervisionDoubts('');
                                       setIsSupervisionModalOpen(true);
                                     }}
                                     className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                                     title="Enviar sessão para discussão em supervisão clínica"
                                   >
                                     <UserCheck size={14} />
                                     <span>Enviar para Supervisão</span>
                                   </button>
                                 )}
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
                    {profileSettings?.clinicalApproach === 'tcc' ? (
                      /* RENDER JUDITH BECK CCD */
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-text-main">Conceitualização Cognitiva (Beck CCD)</h3>
                              <p className="text-xs text-text-muted">Mapeamento de crenças, regras e loops cognitivos</p>
                            </div>
                          </div>
                          
                           <div className="flex items-center gap-3">
                            <button 
                              onClick={handleGenerateTccWithAi}
                              disabled={isGeneratingTccAi}
                              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                            >
                              {isGeneratingTccAi ? "Processando..." : "✨ Gerar com IA"}
                            </button>
                          </div>
                        </div>

                        {/* Warning Banner */}
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 flex items-start gap-2">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" />
                          <p>
                            <strong>{isPT ? 'Validação Ética Profissional:' : 'Validação Ética Profissional:'}</strong> {isPT ? 'Os rascunhos e sugestões gerados por inteligência artificial são apenas orientações e hipóteses clínicas de suporte. O psicólogo é inteiramente responsável pela validação ética, técnica e clínica das informações registadas no processo clínico.' : 'Os rascunhos e sugestões gerados por inteligência artificial são apenas orientações e hipóteses clínicas de suporte. O psicólogo é inteiramente responsável pela validação ética, técnica e clínica das informações registradas no prontuário.'}
                          </p>
                        </div>

                        {/* Papel de Conceitualização (Verticamente Empilhado) */}
                        <div className="space-y-6">
                          {/* História de Vida (Quadradão maior) */}
                          <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                            <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">História de Vida</label>
                            <textarea
                              value={localTccData?.lifeHistory || ""}
                              onChange={(e) => updateLocalGlobalField('lifeHistory', e.target.value)}
                              onBlur={commitLocalTccData}
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[160px] transition-colors resize-y"
                              placeholder="Histórico pessoal, infância, dinâmicas familiares, eventos traumáticos ou marcos importantes de desenvolvimento..."
                            />
                          </div>

                          {/* Lista de Problemas - Questões situacionais */}
                          <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                            <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Lista de Problemas - Questões situacionais</label>
                            <textarea
                              value={localTccData?.problemList || ""}
                              onChange={(e) => updateLocalGlobalField('problemList', e.target.value)}
                              onBlur={commitLocalTccData}
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y"
                              placeholder="Queixas principais, dificuldades atuais, situações-problema ou sintomas recorrentes..."
                            />
                          </div>

                          {/* Diagnóstico e medicações */}
                          <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                            <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Diagnóstico e medicações</label>
                            <textarea
                              value={localTccData?.diagnosisAndMeds || ""}
                              onChange={(e) => updateLocalGlobalField('diagnosisAndMeds', e.target.value)}
                              onBlur={commitLocalTccData}
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y"
                              placeholder="Hipóteses diagnósticas, CID-10/DSM-5 e tratamentos farmacológicos em uso (com dosagem e frequência)..."
                            />
                          </div>

                          {/* Conteúdo da Formulação */}
                          {(() => {
                            const safeForm = getSafeFormulation(localTccData?.unifiedFormulation);

                            return (
                              <div className="space-y-6">
                                {/* Crença Central */}
                                <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                                  <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Crença Central</label>
                                  <textarea
                                    value={safeForm.coreBelief}
                                    onChange={(e) => updateLocalFormulationField('coreBelief', e.target.value)}
                                    onBlur={commitLocalTccData}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y font-bold"
                                    placeholder="Crenças nucleares profundas sobre si mesmo, os outros e o mundo (Ex: 'Sou inadequado')..."
                                  />
                                </div>

                                {/* Crença Intermediária/Regras */}
                                <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                                  <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Crença Intermediária / Regras e Pressupostos</label>
                                  <textarea
                                    value={safeForm.intermediateBelief}
                                    onChange={(e) => updateLocalFormulationField('intermediateBelief', e.target.value)}
                                    onBlur={commitLocalTccData}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y"
                                    placeholder="Atitudes, regras e pressupostos subjacentes (Ex: 'Se eu não fizer tudo perfeito, então serei aceito')..."
                                  />
                                </div>

                                {/* Situações ativadoras das crenças */}
                                <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                                  <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Situações ativadoras das crenças</label>
                                  <textarea
                                    value={safeForm.activatingSituations}
                                    onChange={(e) => updateLocalFormulationField('activatingSituations', e.target.value)}
                                    onBlur={commitLocalTccData}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y"
                                    placeholder="Eventos cotidianos, lembranças ou contextos específicos que ativam as crenças centrais..."
                                  />
                                </div>

                                {/* Comportamentos/estratégias compensatórias */}
                                <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                                  <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Comportamentos / estratégias compensatórias</label>
                                  <textarea
                                    value={safeForm.compensatoryStrategies}
                                    onChange={(e) => updateLocalFormulationField('compensatoryStrategies', e.target.value)}
                                    onBlur={commitLocalTccData}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y"
                                    placeholder="Comportamentos que o paciente utiliza para se proteger da ativação da crença central (Ex: Perfeccionismo, esquiva)..."
                                  />
                                </div>

                                {/* Metas de terapia */}
                                <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                                  <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Metas de terapia</label>
                                  <textarea
                                    value={safeForm.goals}
                                    onChange={(e) => updateLocalFormulationField('goals', e.target.value)}
                                    onBlur={commitLocalTccData}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y"
                                    placeholder="Metas cognitivas, comportamentais e emocionais associadas a esta formulação..."
                                  />
                                </div>

                                {/* Pontos fortes */}
                                <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui flex flex-col gap-2">
                                  <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Pontos fortes</label>
                                  <textarea
                                    value={safeForm.strengths}
                                    onChange={(e) => updateLocalFormulationField('strengths', e.target.value)}
                                    onBlur={commitLocalTccData}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 min-h-[80px] transition-colors resize-y"
                                    placeholder="Recursos psicológicos saudáveis, resiliência, rede de apoio, hobbies ou qualidades do paciente..."
                                  />
                                </div>

                                {/* Loops Cognitivos */}
                                <div className="space-y-4 pt-4">
                                  <div className="border-t border-white/5 pt-6">
                                    <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-1 font-sans">Loops Cognitivos (Tríade / 3 Situações)</h4>
                                    <p className="text-xs text-text-muted mb-4">Análise funcional das três situações ativadoras mais frequentes</p>
                                  </div>

                                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {[0, 1, 2].map((idx) => {
                                      const sit: any = safeForm.situations[idx] || {};
                                      return (
                                        <div key={idx} className="p-6 rounded-[28px] bg-surface-muted border border-border-ui space-y-4 relative font-sans">
                                          <div className="absolute top-4 right-6 text-[10px] font-bold text-primary/30 uppercase tracking-wider">
                                            Situação {idx + 1}
                                          </div>
                                          
                                          <div className="flex flex-col gap-1 pt-2">
                                            <label className="text-[10px] font-bold text-primary uppercase">Situação Real</label>
                                            <textarea
                                              value={sit.situation || ""}
                                              onChange={(e) => updateLocalSituationField(idx, 'situation', e.target.value)}
                                              onBlur={commitLocalTccData}
                                              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-text-main outline-none focus:border-primary/50 min-h-[60px] transition-colors resize-y"
                                              placeholder="O que aconteceu? Onde? Com quem?"
                                            />
                                          </div>

                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-primary uppercase">Pensamento Automático (PA)</label>
                                            <textarea
                                              value={sit.automaticThought || ""}
                                              onChange={(e) => updateLocalSituationField(idx, 'automaticThought', e.target.value)}
                                              onBlur={commitLocalTccData}
                                              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-text-main outline-none focus:border-primary/50 min-h-[60px] transition-colors resize-y"
                                              placeholder="Que pensamentos surgiram imediatamente?"
                                            />
                                          </div>

                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-primary uppercase">Significado do Pensamento</label>
                                            <textarea
                                              value={sit.meaning || ""}
                                              onChange={(e) => updateLocalSituationField(idx, 'meaning', e.target.value)}
                                              onBlur={commitLocalTccData}
                                              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-text-main outline-none focus:border-primary/50 min-h-[60px] transition-colors resize-y"
                                              placeholder="O que isso significa de pior sobre você?"
                                            />
                                          </div>

                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-primary uppercase">Emoção & Intensidade</label>
                                            <textarea
                                              value={sit.emotion || ""}
                                              onChange={(e) => updateLocalSituationField(idx, 'emotion', e.target.value)}
                                              onBlur={commitLocalTccData}
                                              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-text-main outline-none focus:border-primary/50 min-h-[60px] transition-colors resize-y"
                                              placeholder="O que sentiu no corpo? (Ex: Ansiedade 90%)"
                                            />
                                          </div>

                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-primary uppercase">Comportamento Resultante</label>
                                            <textarea
                                              value={sit.behavior || ""}
                                              onChange={(e) => updateLocalSituationField(idx, 'behavior', e.target.value)}
                                              onBlur={commitLocalTccData}
                                              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-text-main outline-none focus:border-primary/50 min-h-[60px] transition-colors resize-y"
                                              placeholder="O que fez? Como agiu em resposta?"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : profileSettings?.clinicalApproach === 'psicanalise' ? (
                      /* RENDER PSICANALISE */
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-text-main">Estruturação Analítica (Psicanálise)</h3>
                              <p className="text-xs text-text-muted">Mapeamento estrutural, defesas e transferência</p>
                            </div>
                          </div>
                          
                           <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleGenerateApproachWithAi('psicanalise')}
                              disabled={isGeneratingApproachAi}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                            >
                              {isGeneratingApproachAi ? "Processando..." : "✨ Gerar com IA"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 shadow-sm col-span-1 md:col-span-2">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">1</span>
                              Demanda Clínica
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Demanda Manifesta</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                                  value={localPsychoanalysisData?.manifestDemand || ''}
                                  onChange={e => handleUpdatePsychoanalysisField('manifestDemand', e.target.value)}
                                  onBlur={() => commitLocalApproachData('psychoanalysis', localPsychoanalysisData)}
                                  placeholder="O que o paciente diz que quer..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Demanda Latente</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                                  value={localPsychoanalysisData?.latentDemand || ''}
                                  onChange={e => handleUpdatePsychoanalysisField('latentDemand', e.target.value)}
                                  onBlur={() => commitLocalApproachData('psychoanalysis', localPsychoanalysisData)}
                                  placeholder="O que emerge através da escuta..."
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">2</span>
                              Dinâmica Inconsciente
                            </h4>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-text-main flex items-center gap-2">Mecanismos de Defesa Principais</label>
                              <textarea 
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
                                value={localPsychoanalysisData?.defenses || ''}
                                onChange={e => handleUpdatePsychoanalysisField('defenses', e.target.value)}
                                onBlur={() => commitLocalApproachData('psychoanalysis', localPsychoanalysisData)}
                                placeholder="Recalque, projeção, denegação..."
                              />
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">3</span>
                              Posição Estrutural & Transferência
                            </h4>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Hipótese Estrutural</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] resize-none"
                                  value={localPsychoanalysisData?.structuralPosition || ''}
                                  onChange={e => handleUpdatePsychoanalysisField('structuralPosition', e.target.value)}
                                  onBlur={() => commitLocalApproachData('psychoanalysis', localPsychoanalysisData)}
                                  placeholder="Neurose, Psicose, Perversão..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Transferência</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] resize-none"
                                  value={localPsychoanalysisData?.transference || ''}
                                  onChange={e => handleUpdatePsychoanalysisField('transference', e.target.value)}
                                  onBlur={() => commitLocalApproachData('psychoanalysis', localPsychoanalysisData)}
                                  placeholder="Como o paciente aloca o analista..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : profileSettings?.clinicalApproach === 'gestalt' ? (
                      /* RENDER GESTALT */
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-text-main">Mapa Gestáltico</h3>
                              <p className="text-xs text-text-muted">Mapeamento fenomênico, awareness e contato</p>
                            </div>
                          </div>
                          
                           <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleGenerateApproachWithAi('gestalt')}
                              disabled={isGeneratingApproachAi}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                            >
                              {isGeneratingApproachAi ? "Processando..." : "✨ Gerar com IA"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm col-span-1 md:col-span-2">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">1</span>
                              Figura e Fundo
                            </h4>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-text-main flex items-center gap-2">O que emerge no campo fenomenológico?</label>
                              <textarea 
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px] resize-none"
                                value={localGestaltData?.figureAndGround || ''}
                                onChange={e => handleUpdateGestaltField('figureAndGround', e.target.value)}
                                onBlur={() => commitLocalApproachData('gestalt', localGestaltData)}
                                placeholder="Descreva a queixa no aqui-e-agora..."
                              />
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">2</span>
                              Dinâmica de Contato
                            </h4>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Bloqueios no Ciclo de Contato</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px] resize-none"
                                  value={localGestaltData?.contactCycleBlocks || ''}
                                  onChange={e => handleUpdateGestaltField('contactCycleBlocks', e.target.value)}
                                  onBlur={() => commitLocalApproachData('gestalt', localGestaltData)}
                                  placeholder="Introjeção, projeção, retroflexão, confluência..."
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">3</span>
                              Auto-Suporte e Consciência
                            </h4>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Nível de Awareness</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[60px] resize-none"
                                  value={localGestaltData?.awarenessLevel || ''}
                                  onChange={e => handleUpdateGestaltField('awarenessLevel', e.target.value)}
                                  onBlur={() => commitLocalApproachData('gestalt', localGestaltData)}
                                  placeholder="Consciência corporal, emocional, cognitiva..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Sistemas de Suporte</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[60px] resize-none"
                                  value={localGestaltData?.supportSystem || ''}
                                  onChange={e => handleUpdateGestaltField('supportSystem', e.target.value)}
                                  onBlur={() => commitLocalApproachData('gestalt', localGestaltData)}
                                  placeholder="Auto-suporte vs Hetero-suporte..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : profileSettings?.clinicalApproach === 'act' ? (
                      /* RENDER ACT */
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-text-main">Matriz ACT (Hexaflex)</h3>
                              <p className="text-xs text-text-muted">Mapeamento de flexibilidade, valores e compromissos</p>
                            </div>
                          </div>
                          
                           <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleGenerateApproachWithAi('act')}
                              disabled={isGeneratingApproachAi}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                            >
                              {isGeneratingApproachAi ? "Processando..." : "✨ Gerar com IA"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">1</span>
                              Processos de Inflexibilidade
                            </h4>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Fusão Cognitiva</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-none"
                                  value={localActData?.fusion || ''}
                                  onChange={e => handleUpdateActField('fusion', e.target.value)}
                                  onBlur={() => commitLocalApproachData('act', localActData)}
                                  placeholder="Pensamentos rígidos dos quais o paciente não desgarra..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Evitação Experiencial</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-none"
                                  value={localActData?.experientialAvoidance || ''}
                                  onChange={e => handleUpdateActField('experientialAvoidance', e.target.value)}
                                  onBlur={() => commitLocalApproachData('act', localActData)}
                                  placeholder="Emoções ou sensações que o paciente luta para evitar..."
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">2</span>
                              Processos de Flexibilidade
                            </h4>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Valores Pessoais</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-none"
                                  value={localActData?.values || ''}
                                  onChange={e => handleUpdateActField('values', e.target.value)}
                                  onBlur={() => commitLocalApproachData('act', localActData)}
                                  placeholder="O que é verdadeiramente importante para ele..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main flex items-center gap-2">Ação Comprometida</label>
                                <textarea 
                                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-none"
                                  value={localActData?.committedAction || ''}
                                  onChange={e => handleUpdateActField('committedAction', e.target.value)}
                                  onBlur={() => commitLocalApproachData('act', localActData)}
                                  placeholder="Comportamentos em direção aos valores escolhidos..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : profileSettings?.clinicalApproach === 'humanista' ? (
                      /* RENDER HUMANISTA / EXISTENCIAL / ACP */
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                              <Sparkles size={20} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-text-main">Análise Existencial / ACP</h3>
                              <p className="text-xs text-text-muted">Conceitualização fundamentada em Rogers, Sartre, Heidegger e Kierkegaard</p>
                            </div>
                          </div>
                          
                           <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleGenerateApproachWithAi('humanista')}
                              disabled={isGeneratingApproachAi}
                              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                            >
                              {isGeneratingApproachAi ? "Processando..." : "✨ Gerar com IA"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-mono text-xs">1</span>
                              Temas Existenciais
                            </h4>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-text-main flex items-center gap-2">Tensões, Liberdade, Vazio & Sentido (Kierkegaard, Heidegger, Sartre)</label>
                              <textarea 
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[140px] resize-none"
                                value={localHumanistData?.existentialThemes || ''}
                                onChange={e => handleUpdateHumanistField('existentialThemes', e.target.value)}
                                onBlur={() => commitLocalApproachData('humanista', localHumanistData)}
                                placeholder="Descreva as tensões existenciais e angústias trazidas pelo cliente..."
                              />
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-mono text-xs">2</span>
                              Foco Fenomenológico
                            </h4>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-text-main flex items-center gap-2">Experiência Imediata & Percepção Subjetiva do Cliente</label>
                              <textarea 
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[140px] resize-none"
                                value={localHumanistData?.phenomenologicalFocus || ''}
                                onChange={e => handleUpdateHumanistField('phenomenologicalFocus', e.target.value)}
                                onBlur={() => commitLocalApproachData('humanista', localHumanistData)}
                                placeholder="A percepção do aqui-e-agora sob o ponto de vista exclusivo do cliente..."
                              />
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-mono text-xs">3</span>
                              Congruência do Self
                            </h4>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-text-main flex items-center gap-2">Autoatualização, Aceitação Incondicional & Congruência (Carl Rogers)</label>
                              <textarea 
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[140px] resize-none"
                                value={localHumanistData?.selfCongruence || ''}
                                onChange={e => handleUpdateHumanistField('selfCongruence', e.target.value)}
                                onBlur={() => commitLocalApproachData('humanista', localHumanistData)}
                                placeholder="Análise do self, congruência da experiência vivida e autoatualização..."
                              />
                            </div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-mono text-xs">4</span>
                              Direcionamentos Clínicos
                            </h4>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-text-main flex items-center gap-2">Insights Existenciais e Acolhimento Terapêutico</label>
                              <textarea 
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[140px] resize-none"
                                value={localHumanistData?.therapeuticInsights || ''}
                                onChange={e => handleUpdateHumanistField('therapeuticInsights', e.target.value)}
                                onBlur={() => commitLocalApproachData('humanista', localHumanistData)}
                                placeholder="Direcionamento sugerido para as próximas sessões..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* RENDER STANDARD ANAMNESE */
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <h3 className="text-xl font-bold text-text-main font-sans">Anamnese Psicológica</h3>
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
                      </>
                    )}
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

                    {/* Planejamento da Próxima Sessão */}
                    <div className="p-8 rounded-[32px] bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 mt-6 space-y-6 font-sans">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                            <span className="text-xs font-bold">🎯</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-text-main font-sans">Planejamento da Próxima Sessão</h4>
                            <p className="text-xs text-text-muted italic">Foco e intervenções sugeridas ou personalizadas para a próxima sessão</p>
                          </div>
                        </div>
                        <button
                          onClick={handleGenerateNextSessionPlanWithAi}
                          disabled={isGeneratingNextSession}
                          className="bg-orange-500 hover:opacity-90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-center"
                        >
                          {isGeneratingNextSession ? "Planejando..." : "✨ Planejar com IA"}
                        </button>
                      </div>

                      {/* Warning Banner */}
                      <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>
                          <strong>Validação Ética Profissional:</strong> Os rascunhos e sugestões gerados por inteligência artificial são apenas orientações e hipóteses clínicas de suporte. O psicólogo é inteiramente responsável pela validação ética, técnica e clínica das informações registradas no prontuário.
                        </p>
                      </div>

                      <div className="p-6 rounded-2xl bg-surface-muted border border-border-ui">
                        {editingNextSession ? (
                          <textarea
                            autoFocus
                            value={tempNextSessionPlan}
                            onChange={(e) => setTempNextSessionPlan(e.target.value)}
                            onBlur={() => {
                              onUpdatePatient({
                                ...patient,
                                clinicalData: {
                                  ...patient.clinicalData,
                                  nextSessionPlan: tempNextSessionPlan
                                }
                              });
                              setEditingNextSession(false);
                            }}
                            className="w-full bg-white/5 border border-primary/20 rounded-lg p-3 text-sm text-text-main outline-none min-h-[150px]"
                            placeholder="Descreva o plano para a próxima sessão..."
                          />
                        ) : (
                          <div 
                            onClick={() => {
                              setTempNextSessionPlan(patient.clinicalData?.nextSessionPlan || "");
                              setEditingNextSession(true);
                            }}
                            className="text-sm text-text-main cursor-pointer hover:border-primary/30 border border-transparent p-2 rounded transition-all min-h-[100px] whitespace-pre-wrap leading-relaxed"
                          >
                            {patient.clinicalData?.nextSessionPlan ? (
                              patient.clinicalData.nextSessionPlan
                            ) : (
                              <span className="text-text-muted italic">Nenhum planejamento gerado ainda. Clique para escrever manualmente ou use a IA acima.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'tratamento' && (() => {
                  const isNotesOnly = ['psicanalise', 'junguiana', 'gestalt', 'humanista'].includes(profileSettings?.clinicalApproach);

                  if (isNotesOnly) {
                    return (
                      <motion.div 
                        key="organizacao_caso"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 font-sans"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <FolderOpen size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-text-main font-sans">Organização do Caso & Bloco de Notas</h3>
                            <p className="text-xs text-text-muted">Espaço livre e confidencial para organizar hipóteses clínicas, insights teóricos e apontamentos gerais.</p>
                          </div>
                        </div>

                        <div className="p-6 rounded-[28px] bg-surface-muted border border-border-ui space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-primary uppercase tracking-widest font-sans">Anotações do Terapeuta</label>
                            <span className="text-[10px] text-text-muted flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Salvo automaticamente ao clicar fora
                            </span>
                          </div>
                          <textarea
                            value={localTreatmentNotes}
                            onChange={(e) => handleUpdateTreatmentNotes(e.target.value)}
                            onBlur={commitTreatmentNotes}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary/50 min-h-[380px] transition-colors resize-y leading-relaxed font-sans"
                            placeholder="Escreva livremente aqui suas hipóteses, insights, temas a serem trabalhados, análises de transferência ou observações gerais sobre o andamento do caso..."
                          />
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div 
                      key="tratamento"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-text-main font-sans">Plano de Tratamento</h3>
                            <p className="text-xs text-text-muted">Acompanhe as metas e intervenções terapêuticas pactuadas</p>
                          </div>
                        </div>
                        <button
                          onClick={handleGenerateTreatmentPlanWithAi}
                          disabled={isGeneratingTreatmentPlanAi}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-center font-sans"
                        >
                          {isGeneratingTreatmentPlanAi ? "Gerando..." : "✨ Gerar Plano com IA"}
                        </button>
                      </div>

                      {/* Formulário de Nova Meta */}
                      <div className="p-6 rounded-[28px] bg-surface-muted border border-border-ui space-y-4">
                        <h4 className="text-sm font-bold text-primary uppercase tracking-widest font-sans">Nova Meta Terapêutica</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-primary uppercase">Meta / Objetivo</label>
                            <input
                              type="text"
                              value={newGoalText}
                              onChange={(e) => setNewGoalText(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 transition-colors"
                              placeholder="Ex: Reduzir a ansiedade social em situações de trabalho"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-primary uppercase">Intervenções Associadas</label>
                            <input
                              type="text"
                              value={newInterventionsText}
                              onChange={(e) => setNewInterventionsText(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-main outline-none focus:border-primary/50 transition-colors"
                              placeholder="Ex: Exposição sistemática, questionamento socrático, role-play"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddTreatmentGoal}
                            className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Plus size={16} /> Adicionar Meta
                          </button>
                        </div>
                      </div>

                      {/* Tabela/Lista de Metas Cadastradas */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-primary uppercase tracking-widest font-sans">Metas e Intervenções Atuais</h4>
                        {(() => {
                          const plan = patient.clinicalData?.treatmentPlan || [];
                          if (plan.length === 0) {
                            return (
                              <div className="p-8 rounded-[28px] border border-dashed border-white/10 text-center">
                                <p className="text-sm text-text-muted italic">Nenhuma meta adicionada ao plano de tratamento ainda.</p>
                              </div>
                            );
                          }

                          return (
                            <div
                              className="flex flex-col"
                              onDragLeave={(e) => {
                                // Only clear if leaving the entire list container
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                  setDragInsertIndex(null);
                                }
                              }}
                            >
                              {plan.map((item: any, index: number) => (
                                <div key={item.id}>
                                  {/* Drop zone line — appears ABOVE this card */}
                                  <div
                                    onDragOver={(e) => { e.preventDefault(); setDragInsertIndex(index); }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (draggedGoalId) handleGoalReorder(draggedGoalId, index);
                                      setDraggedGoalId(null);
                                      setDragInsertIndex(null);
                                    }}
                                    style={{
                                      height: dragInsertIndex === index && draggedGoalId ? '20px' : '8px',
                                      transition: 'height 0.15s',
                                    }}
                                    className="relative flex items-center"
                                  >
                                    {dragInsertIndex === index && draggedGoalId && (
                                      <div className="w-full h-0.5 rounded-full bg-primary shadow-[0_0_8px_2px] shadow-primary/60 mx-1" />
                                    )}
                                  </div>

                                  {/* The card itself */}
                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      setDraggedGoalId(item.id);
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Determine if mouse is in top or bottom half of this card
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const midY = rect.top + rect.height / 2;
                                      setDragInsertIndex(e.clientY < midY ? index : index + 1);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const midY = rect.top + rect.height / 2;
                                      const insertAt = e.clientY < midY ? index : index + 1;
                                      if (draggedGoalId) handleGoalReorder(draggedGoalId, insertAt);
                                      setDraggedGoalId(null);
                                      setDragInsertIndex(null);
                                    }}
                                    onDragEnd={() => { setDraggedGoalId(null); setDragInsertIndex(null); }}
                                    style={{
                                      opacity: draggedGoalId === item.id ? 0.35 : 1,
                                      transition: 'opacity 0.15s',
                                    }}
                                    className="p-5 rounded-2xl bg-surface-muted border border-border-ui flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans"
                                  >
                                    {/* Drag Handle */}
                                    <div
                                      className="hidden md:flex items-center self-stretch pr-2 cursor-grab active:cursor-grabbing text-text-muted hover:text-primary transition-colors select-none"
                                      title="Arrastar para reordenar"
                                    >
                                      <svg width="14" height="22" viewBox="0 0 14 22" fill="currentColor">
                                        <circle cx="4" cy="4" r="2"/><circle cx="10" cy="4" r="2"/>
                                        <circle cx="4" cy="11" r="2"/><circle cx="10" cy="11" r="2"/>
                                        <circle cx="4" cy="18" r="2"/><circle cx="10" cy="18" r="2"/>
                                      </svg>
                                    </div>

                                    <div className="space-y-2 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                          item.status === 'completed' 
                                            ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                                            : item.status === 'in_progress'
                                              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                              : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                        )}>
                                          {item.status === 'completed' ? 'Alcançada' : item.status === 'in_progress' ? 'Em Progresso' : 'Aguardando'}
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-[10px] font-bold text-primary uppercase">Meta</p>
                                          <input
                                            type="text"
                                            value={item.goal}
                                            onChange={(e) => handleUpdateTreatmentGoalField(item.id, 'goal', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-primary/30 py-0.5 text-sm text-text-main outline-none transition-colors"
                                          />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-bold text-primary uppercase">Intervenções</p>
                                          <input
                                            type="text"
                                            value={item.interventions || ""}
                                            onChange={(e) => handleUpdateTreatmentGoalField(item.id, 'interventions', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-primary/30 py-0.5 text-sm text-text-main outline-none transition-colors"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center">
                                      <select
                                        value={item.status}
                                        onChange={(e) => handleUpdateTreatmentGoalField(item.id, 'status', e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-text-main outline-none focus:border-primary/30 font-sans"
                                      >
                                        <option value="pending" className="bg-background-dark">Aguardando</option>
                                        <option value="in_progress" className="bg-background-dark">Em Progresso</option>
                                        <option value="completed" className="bg-background-dark">Alcançada</option>
                                      </select>
                                      
                                      <button
                                        onClick={() => handleDeleteTreatmentGoal(item.id)}
                                        className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all"
                                        title="Excluir Meta"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Drop zone after the last card */}
                              <div
                                onDragOver={(e) => { e.preventDefault(); setDragInsertIndex(plan.length); }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedGoalId) handleGoalReorder(draggedGoalId, plan.length);
                                  setDraggedGoalId(null);
                                  setDragInsertIndex(null);
                                }}
                                style={{
                                  height: dragInsertIndex === plan.length && draggedGoalId ? '20px' : '8px',
                                  transition: 'height 0.15s',
                                }}
                                className="relative flex items-center"
                              >
                                {dragInsertIndex === plan.length && draggedGoalId && (
                                  <div className="w-full h-0.5 rounded-full bg-primary shadow-[0_0_8px_2px] shadow-primary/60 mx-1" />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  );
                })()}

                {activeSubTab === 'biblioteca' && (
                  <motion.div 
                    key="biblioteca"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                          <FolderOpen size={20} />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-text-main uppercase tracking-tight">Biblioteca de Documentos</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                          onClick={() => { setUploadCategory('prontuario'); setTimeout(() => fileInputRef.current?.click(), 0); }}
                          className="flex-1 sm:flex-initial bg-primary/20 text-primary px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all border border-primary/20 uppercase"
                        >
                           {isPT ? '+ Processo Clínico' : '+ Prontuário'}
                        </button>
                        <button 
                          onClick={() => { setUploadCategory('anexo'); setTimeout(() => fileInputRef.current?.click(), 0); }}
                          className="flex-1 sm:flex-initial bg-surface-muted text-text-main border border-border-ui px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-border-ui transition-all uppercase"
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
                          <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">{isPT ? 'Processos Clínicos' : 'Prontuários'}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Uploaded/Generated Prontuários */}
                          {documents.filter(d => d.category === 'prontuario').map((doc) => (
                            <DocCard key={doc.id} doc={doc} onDelete={onDeleteDocument} />
                          ))}

                          {documents.filter(d => d.category === 'prontuario').length === 0 && (
                            <div className="col-span-2 py-10 text-center text-[10px] text-text-muted uppercase tracking-widest border border-dashed border-border-ui rounded-2xl opacity-50">
                              {isPT ? 'Nenhum processo clínico registado' : 'Nenhum prontuário registrado'}
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

                {activeSubTab === 'reembolso' && (
                  <motion.div
                    key="reembolso"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 text-left"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-text-main">{isPT ? 'Auxiliar de Reembolso & Seguros' : 'Auxiliar de Reembolso'}</h3>
                        <p className="text-xs text-text-muted mt-1">{isPT ? 'Gere declarações de comparência e copie textos de descrição para o recibo ou seguradora de saúde.' : 'Gere relatórios de comparecimento e copie textos de descrição para o recibo do plano de saúde.'}</p>
                      </div>
                    </div>

                    {/* Alertas de Dados Faltando */}
                    <div className="space-y-3">
                      {/* Profissional */}
                      {(!profileSettings?.cpfCnpj || !profileSettings?.address || !profileSettings?.phone) && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-2xl text-xs space-y-2">
                          <p className="font-bold uppercase tracking-wider">{isPT ? '⚠️ Dados do Profissional Incompletos' : '⚠️ Dados do Profissional Incompletos'}</p>
                          <p className="text-[11px] text-yellow-600 dark:text-yellow-400">
                            {isPT 
                              ? 'Para gerar a Declaração oficial para reembolso/seguro, precisa de registar o seu NIF, Morada e Telemóvel nas definições de perfil.'
                              : 'Para gerar o Relatório do Terapeuta oficial para reembolso, você precisa cadastrar seu **CPF/CNPJ, Endereço e Telefone** nas configurações de perfil.'}
                          </p>
                        </div>
                      )}

                      {/* Paciente / Utente */}
                      {!(patient.nif || patient.cpf) && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-2xl text-xs space-y-2">
                          <p className="font-bold uppercase tracking-wider">{isPT ? '⚠️ NIF do Utente não Registado' : '⚠️ CPF do Paciente não Cadastrado'}</p>
                          <p className="text-[11px] text-yellow-600 dark:text-yellow-400">
                            {isPT 
                              ? 'O NIF do utente é obrigatório para reembolso/seguro. Vá ao separador "Perfil" e adicione o NIF do utente.'
                              : 'O CPF do paciente é obrigatório para reembolso. Vá na aba "Perfil" e adicione o CPF do paciente.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Seleção de Sessões / Consultas */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">{isPT ? '1. Selecione as Consultas Realizadas' : '1. Selecione as Sessões Realizadas'}</h4>
                        <div className="flex gap-2 text-[10px]">
                          <button 
                            onClick={() => {
                              const allIds = patientSessions.filter(s => s.status !== 'Cancelada').map(s => s.id);
                              setSelectedSessionIds(new Set(allIds));
                            }}
                            className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Selecionar Todas
                          </button>
                          <span className="text-text-muted">|</span>
                          <button 
                            onClick={() => setSelectedSessionIds(new Set())}
                            className="text-text-muted font-bold hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>

                      {patientSessions.filter(s => s.status !== 'Cancelada').length === 0 ? (
                        <div className="py-10 text-center text-xs text-text-muted border border-dashed border-border-ui rounded-2xl">
                          {isPT ? 'Nenhum agendamento não-cancelado encontrado para este utente.' : 'Nenhum agendamento não-cancelado encontrado para este paciente.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                          {patientSessions.filter(s => s.status !== 'Cancelada').map((session, index) => {
                            const isSelected = selectedSessionIds.has(session.id);
                            const formattedDate = (session.date || "").split('-').reverse().join('/');
                            
                            return (
                              <div 
                                key={session.id}
                                onClick={() => {
                                  const newSet = new Set(selectedSessionIds);
                                  if (newSet.has(session.id)) {
                                    newSet.delete(session.id);
                                  } else {
                                    newSet.add(session.id);
                                  }
                                  setSelectedSessionIds(newSet);
                                }}
                                className={cn(
                                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                                  isSelected 
                                    ? "bg-primary/10 border-primary text-primary" 
                                    : "bg-surface-muted border-border-ui text-text-main hover:border-primary/40"
                                )}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by div click
                                  className="rounded border-border-ui text-primary focus:ring-primary"
                                />
                                <div className="text-left flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate">{isPT ? 'Consulta ' : 'Sessão '}{patientSessions.filter(s => s.status !== 'Cancelada').length - index}</p>
                                  <p className="text-[10px] text-text-muted mt-0.5">{formattedDate} às {session.time} • {session.type}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-mono font-bold">{formatCurrency(session.amount || 0)}</p>
                                  <p className={`text-[8px] font-bold uppercase tracking-wider ${session.paid ? 'text-green-500' : 'text-yellow-500'}`}>
                                    {session.paid ? 'Pago' : 'Pendente'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Resultados / Ações */}
                    {selectedSessionIds.size > 0 && (
                      <div className="space-y-6 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Ação 1: Texto de Descrição do Recibo */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">{isPT ? '2. Descrição para o seu Recibo (Copiar)' : '2. Descrição para o seu Recibo (Copiar)'}</h4>
                          <p className="text-[10px] text-text-muted">{isPT ? 'Use este texto no campo de descrição dos serviços prestados do seu recibo (ex: Autoridade Tributária / Fatura-Recibo Verde, etc.):' : 'Use este texto no campo de descrição dos serviços prestados do seu recibo externo (ex: Receita Federal, Nota Fiscal, etc.):'}</p>
                          <div className="relative mt-2">
                            <textarea 
                              readOnly 
                              value={generateReceiptDescription()} 
                              className="w-full bg-surface-muted border border-border-ui rounded-xl p-3 text-xs text-text-main outline-none min-h-[90px] font-mono leading-relaxed"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(generateReceiptDescription());
                                setCopiedReceiptText(true);
                                setTimeout(() => setCopiedReceiptText(false), 2000);
                              }}
                              className="absolute bottom-3 right-3 bg-primary text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase hover:opacity-90 transition-all flex items-center gap-1 shadow-md cursor-pointer"
                            >
                              {copiedReceiptText ? <CheckCircle2 size={10} /> : <Copy size={10} />}
                              {copiedReceiptText ? 'Copiado!' : 'Copiar Texto'}
                            </button>
                          </div>
                        </div>

                        {/* Ação 2: Relatório do Terapeuta PDF */}
                        <div className="space-y-2 pt-2 text-left">
                          <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">{isPT ? '3. Declaração do Terapeuta (PDF)' : '3. Relatório do Terapeuta (PDF)'}</h4>
                          <p className="text-[10px] text-text-muted">{isPT ? 'Gere o documento oficial exigido pela seguradora/subsistema de saúde contendo a declaração de acompanhamento e o cronograma de consultas assinados digitalmente.' : 'Gere o documento oficial exigido pelo plano contendo a declaração de acompanhamento e o cronograma de sessões assinados digitalmente.'}</p>
                          
                          <button
                            onClick={handleGenerateTherapistReportPDF}
                            className="bg-primary text-white px-6 py-3.5 rounded-2xl text-xs font-bold uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
                          >
                            <FileDown size={16} />
                            <span>{isPT ? 'Gerar Declaração do Terapeuta' : 'Gerar Relatório do Terapeuta'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
           </section>
        </div>
      </div>

      {/* Modal: Enviar Sessão para Supervisão Clínica */}
      <AnimatePresence>
        {isSupervisionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border-ui flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main">
                      Enviar Sessão para Supervisão Clínica
                    </h3>
                    <p className="text-xs text-text-muted">
                      Revise ou edite as informações clínicas da sessão antes de compartilhar com o supervisor.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSupervisionModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-surface-muted text-text-muted hover:text-text-main transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Paciente e Sessão info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-surface-muted rounded-2xl border border-border-ui text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Paciente</span>
                    <span className="font-bold text-text-main uppercase">{patient?.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Data da Sessão</span>
                    <span className="font-bold text-text-main">{supervisionEvo?.date} {supervisionEvo?.time && `às ${supervisionEvo?.time}`}</span>
                  </div>
                </div>

                {/* Seletor de Supervisor (caso haja supervisores na equipe) */}
                {clinicMembers.some(m => m.role === 'supervisor' || m.role === 'clinic_admin') && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      Direcionar para um Supervisor Específico (Opcional)
                    </label>
                    <select
                      value={supervisionSupervisorEmail}
                      onChange={(e) => setSupervisionSupervisorEmail(e.target.value)}
                      className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">Todos os Supervisores da Clínica</option>
                      {clinicMembers.filter(m => m.role === 'supervisor' || m.role === 'clinic_admin').map(s => (
                        <option key={s.id} value={s.email}>
                          {s.name} ({s.role === 'supervisor' ? 'Supervisor(a)' : 'Coordenação'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Relato Clínico Editável */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                      Relato / Anotação da Sessão para o Supervisor
                    </label>
                    <span className="text-[10px] text-text-muted">Você pode anonimizar ou resumir trechos confidenciais</span>
                  </div>
                  <textarea
                    value={supervisionNote}
                    onChange={(e) => setSupervisionNote(e.target.value)}
                    rows={6}
                    placeholder="Conteúdo da sessão que será compartilhado na supervisão..."
                    className="w-full bg-surface-muted border border-border-ui rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary resize-none leading-relaxed"
                  />
                </div>

                {/* Dúvidas ou Pontos para Discutir */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                    Pontos & Dúvidas a Serem Discutidos na Supervisão
                  </label>
                  <textarea
                    value={supervisionDoubts}
                    onChange={(e) => setSupervisionDoubts(e.target.value)}
                    rows={3}
                    placeholder="Ex: Dificuldade no manejo de resistência ao tema familiar; dúvidas sobre qual técnica aplicar; etc."
                    className="w-full bg-surface-muted border border-border-ui rounded-xl p-4 text-sm text-text-main outline-none focus:border-primary resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border-ui flex items-center justify-end gap-3 bg-surface-muted/50">
                <button
                  type="button"
                  onClick={() => setIsSupervisionModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-text-main transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSupervision}
                  disabled={isSendingSupervision || !supervisionNote.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSendingSupervision ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Confirmar e Enviar para Supervisão</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FinanceView({ 
  sessions, 
  transactions, 
  patients, 
  onUpdateSession, 
  onAddTransaction, 
  onDeleteTransaction, 
  onDeleteSession,
  isPT: isPTProp
}: { 
  sessions: any[], 
  transactions: any[], 
  patients: any[],
  onUpdateSession: (session: any) => void,
  onAddTransaction: (data: any) => void,
  onDeleteTransaction: (id: string) => void,
  onDeleteSession: (id: string) => void,
  isPT?: boolean
}) {
  const isPT = isPTProp ?? (typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt')
  ));
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [currentFinanceDate, setCurrentFinanceDate] = useState(new Date());
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all');
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
      const d = safeDateParse(s.date);
      return isSameMonth(d, new Date()) && s.paid;
    }).reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [sessions]);

  const prevMonthlyReceived = useMemo(() => {
    const lastMonth = subMonths(new Date(), 1);
    return sessions.filter(s => {
      const d = safeDateParse(s.date);
      return isSameMonth(d, lastMonth) && s.paid;
    }).reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [sessions]);

  const monthlyPending = useMemo(() => {
    return sessions.filter(s => {
      const d = safeDateParse(s.date);
      return isSameMonth(d, new Date()) && !s.paid && s.status !== 'Cancelada';
    }).reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [sessions]);

  const manualExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'Despesa' && isSameMonth(safeDateParse(t.date), new Date()))
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transactions]);

  const prevManualExpenses = useMemo(() => {
    const lastMonth = subMonths(new Date(), 1);
    return transactions.filter(t => t.type === 'Despesa' && isSameMonth(safeDateParse(t.date), lastMonth))
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
    const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

    let list = [...sessions.filter(s => s.status !== 'Cancelada')];
    
    patients.filter(p => p.status !== 'Inativo').forEach(p => {
      if (selectedPatientId !== 'all' && p.id !== selectedPatientId) return;

      if (p.sessionDay && p.recurrence && p.recurrence !== 'Nenhuma') {
        const genStart = selectedPatientId === 'all' ? start : safeDateParse(p.recurrenceStart || p.createdAt, new Date('2024-01-01T12:00:00'));
        const genEnd = selectedPatientId === 'all' ? end : currentWeekEnd;

        if (genStart <= genEnd) {
          const daysInInterval = eachDayOfInterval({ start: genStart, end: genEnd });
          daysInInterval.forEach(d => {
            const dayName = format(d, 'eeee', { locale: ptBR });
            const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            if (capitalized !== p.sessionDay) return;
            
            const pRecurrenceStart = safeDateParse(p.recurrenceStart || p.createdAt || p.birthDate, new Date('2024-01-01T12:00:00'));
            if (startOfDay(d) < startOfDay(pRecurrenceStart)) return;

            const weeksDiff = Math.abs(differenceInWeeks(startOfDay(d), startOfDay(pRecurrenceStart)));
            let isRecurrenceDay = false;
            if (p.recurrence === 'Semanal') isRecurrenceDay = true;
            else if (p.recurrence === 'Quinzenal') isRecurrenceDay = weeksDiff % 2 === 0;
            else if (p.recurrence === 'Mensal') isRecurrenceDay = weeksDiff % 4 === 0;

            if (!isRecurrenceDay) return;

            const hasRecorded = list.some(s => s.patientId === p.id && isSameDay(safeDateParse(s.date), d));
            const hasCancelled = sessions.some(s => s.patientId === p.id && s.status === 'Cancelada' && isSameDay(safeDateParse(s.date), d));

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
      }
    });

    if (selectedPatientId !== 'all') {
      list = list.filter(s => s.patientId === selectedPatientId);
    }

    list = list.filter(s => {
      const d = safeDateParse(s.date);
      
      if (selectedPatientId === 'all') {
        const isSelectedWeek = d >= start && d <= end;
        const isCurrentWeek = isSameDay(startOfWeek(new Date(), { weekStartsOn: 0 }), start);
        const isPastOrCurrent = d <= end;
        const isUnpaid = !s.paid;
        
        if (isCurrentWeek) {
          return isSelectedWeek || (isUnpaid && isPastOrCurrent);
        } else {
          return isSelectedWeek;
        }
      } else {
        return d <= currentWeekEnd;
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
  }, [sessions, patients, filter, currentFinanceDate, selectedPatientId]);

  const displayExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'Despesa').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions]);

  const handleSaveExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) return alert('Preencha todos os campos');
    onAddTransaction({
      patientId: '',
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
          val = transactions.filter(t => t.type === 'Despesa' && isSameMonth(safeDateParse(t.date), m)).reduce((acc, t) => acc + (t.amount || 0), 0);
        } else if (type === 'lucro') {
          const rec = sessions.filter(x => isSameMonth(safeDateParse(x.date), m) && x.paid).reduce((acc, x) => acc + (x.amount || 0), 0);
          const desp = transactions.filter(t => t.type === 'Despesa' && isSameMonth(safeDateParse(t.date), m)).reduce((acc, t) => acc + (t.amount || 0), 0);
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsAddingExpense(true)}
            className="w-full sm:w-auto justify-center bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
          >
            <Plus size={16} />
            Nova Despesa
          </button>
          <div className="flex gap-1 p-1 bg-surface-muted rounded-2xl border border-border-ui w-full sm:w-auto justify-between">
            <button 
              onClick={() => setFilter('all')}
              className={cn(
                "flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === 'all' ? "bg-card text-primary shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('paid')}
              className={cn(
                "flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === 'paid' ? "bg-card text-green-500 shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              Recebidos
            </button>
            <button 
              onClick={() => setFilter('pending')}
              className={cn(
                "flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h4 className="font-bold text-lg text-text-main uppercase tracking-widest">{isPT ? 'Controlo de Consultas' : 'Controle de Atendimentos'}</h4>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="text-xs font-bold bg-card border border-border-ui rounded-xl px-4 py-2 text-text-main outline-none focus:border-primary cursor-pointer shadow-sm"
            >
              <option value="all" className="bg-card text-text-main font-bold">{isPT ? 'TODOS OS UTENTES' : 'TODOS OS PACIENTES'}</option>
              {patients.map(p => (
                <option key={p.id} value={p.id} className="bg-card text-text-main">{p.name}</option>
              ))}
            </select>
          </div>
          
          {selectedPatientId === 'all' ? (
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
          ) : (
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl">
              Histórico Completo
            </div>
          )}

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
                <th className="px-8 py-4">{isPT ? 'Utente / Consulta' : 'Paciente / Sessão'}</th>
                <th className="px-8 py-4">{isPT ? 'Data / Hora' : 'Data / Horário'}</th>
                <th className="px-8 py-4">Valor</th>
                <th className="px-8 py-4">{isPT ? 'Estado Pagamento' : 'Status Pagamento'}</th>
                <th className="px-8 py-4">{isPT ? 'Recibo' : 'Nota Fiscal'}</th>
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
                          {session.isTriage ? 'T' : (p?.name?.[0] || (isPT ? 'U' : 'P'))}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-main uppercase">{p?.name || session.triageName || (isPT ? 'Utente' : 'Paciente')}</p>
                          <p className="text-[10px] text-text-muted uppercase tracking-tighter">{session.type} • {p?.cpf || p?.document || p?.nif ? `${isPT ? 'NIF' : 'CPF'}: ${p.nif || p.cpf || p.document}` : (isPT ? 'SEM NIF' : 'SEM CPF')}</p>
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
                        title={session.nfIssued ? (isPT ? "Recibo Emitido" : "NF Emitida") : (isPT ? "Emitir Recibo" : "Marcar NF Emitida")}
                      >
                        <Receipt size={18} />
                      </button>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => {
                          if (confirm(isPT ? 'Tem a certeza que deseja eliminar este registo de consulta? Esta ação é irreversível.' : 'Tem certeza que deseja excluir este registro de atendimento? Esta ação é irreversível.')) {
                            onDeleteSession(session.id);
                          }
                        }}
                        className="p-2 rounded-xl text-text-muted hover:text-red-500 transition-colors"
                        title={isPT ? "Eliminar Consulta" : "Excluir Atendimento"}
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
                    {isPT ? 'Nenhum registo encontrado para este filtro.' : 'Nenhum registro encontrado para este filtro.'}
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
                      <p className="text-sm font-bold text-text-main uppercase">{p?.name || session.triageName || (isPT ? 'Utente' : 'Paciente')}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-tighter">{format(new Date(session.date + 'T12:00:00'), 'dd/MM/yyyy')} • {session.time} • {session.type} • {p?.cpf || p?.document || p?.nif ? `${isPT ? 'NIF' : 'CPF'}: ${p.nif || p.cpf || p.document}` : (isPT ? 'SEM NIF' : 'SEM CPF')}</p>
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
                      title={session.nfIssued ? (isPT ? "Recibo Emitido" : "NF Emitida") : (isPT ? "Emitir Recibo" : "Marcar NF Emitida")}
                    >
                      <Receipt size={18} />
                    </button>
                    <button 
                      onClick={() => onDeleteSession(session.id)}
                      className="w-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500"
                      title={isPT ? "Eliminar Consulta" : "Excluir Atendimento"}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
            {displaySessions.length === 0 && (
              <div className="p-12 text-center text-text-muted uppercase text-[10px] tracking-widest opacity-50">
                {isPT ? 'Nenhum registo.' : 'Nenhum registro.'}
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
                    <Trash2 size={14} /> {isPT ? 'Eliminar Despesa' : 'Excluir Despesa'}
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
                    placeholder={isPT ? "Ex: Renda, Eletricidade, Software..." : "Ex: Aluguel, Luz, Software..."}
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-red-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{isPT ? 'Valor (€)' : 'Valor (R$)'}</label>
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
                    {isPT ? 'Guardar Despesa' : 'Salvar Despesa'}
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
  onOpenSettings,
  onSyncGoogleCalendar,
  onConnectGoogleCalendar,
  isScheduleAutonomyDisabled = false,
  onOpenWhatsAppReminders,
  isWhatsAppAdmin = false,
  isPT: isPTProp
}: { 
  sessions: any[], 
  patients: any[], 
  onAddSession: (data: any) => void,
  onDeleteSession: (id: string) => void,
  onTriageToPatient: (name: string, day: string, time: string, sessionId?: string) => void,
  onUndo?: () => void,
  lastAction?: any,
  isGoogleCalendarEnabled?: boolean,
  googleAccessToken?: string | null,
  onOpenSettings?: () => void,
  onSyncGoogleCalendar?: () => void,
  onConnectGoogleCalendar?: () => void,
  isScheduleAutonomyDisabled?: boolean,
  onOpenWhatsAppReminders?: () => void,
  isWhatsAppAdmin?: boolean,
  isPT?: boolean
}) {
  const isPT = isPTProp ?? (typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt')
  ));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewModeState] = useState<'day' | 'week' | 'month'>(() => {
    return (localStorage.getItem('simplepsi_calendar_view') as any) || 'week';
  });
  const setViewMode = (mode: 'day' | 'week' | 'month') => {
    localStorage.setItem('simplepsi_calendar_view', mode);
    setViewModeState(mode);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: weekEnd
  });

  const DAY_HOURS = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00'
  ];

  const getDaySessions = (day: Date) => {
    const dayName = format(day, 'eeee', { locale: ptBR });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dateStr = format(day, 'yyyy-MM-dd');
    
    const daySessions: any[] = [];

    // 1. Recorded Sessions from 'sessions' collection
    const recordedSessions = sessions.filter(s => s.status !== 'Cancelada' && isSameDay(safeDateParse(s.date), day));
    recordedSessions.forEach(s => {
      // Show cancelled sessions but with distinct style (handled by CSS)
      const p = patients.find(pat => pat.id === s.patientId);
      daySessions.push({
        ...s,
        patientName: s.isTriage ? s.triageName : (p?.name || 'Paciente'),
        patientPhone: p?.phone || '',
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
        const hasCancelled = sessions.some(s => s.patientId === p.id && s.status === 'Cancelada' && isSameDay(safeDateParse(s.date), day));
        
        if (hasRecorded || hasCancelled) return;

        const pRecurrenceStart = safeDateParse(p.recurrenceStart || p.createdAt || p.birthDate, new Date('2024-01-01T12:00:00'));
        if (startOfDay(day) < startOfDay(pRecurrenceStart)) return;
        const weeksDiff = Math.abs(differenceInWeeks(startOfDay(day), startOfDay(pRecurrenceStart)));
        
        let shouldRender = false;
        if (!p.recurrence || p.recurrence === 'Semanal') shouldRender = true;
        else if (p.recurrence === 'Quinzenal') shouldRender = weeksDiff % 2 === 0;
        else if (p.recurrence === 'Mensal') shouldRender = weeksDiff % 4 === 0;
        if (shouldRender) {
          daySessions.push({
            id: `virtual-${p.id}-${dateStr}`,
            patientId: p.id,
            patientName: p.name,
            patientPhone: p.phone || '',
            time: p.sessionTime,
            type: p.modality || 'Online',
            status: 'Recorrente',
            isTriage: false,
            dayName: capitalizedDayName,
            sessionNumber: calculateSessionNumber(p, day),
            amount: p.amount || 0,
            sessionValue: p.amount || 0
          });
        }
      }
    });

    return daySessions.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  const calculateSessionNumber = (patient: any, targetDay: Date) => {
    const baseCount = parseInt(patient?.sessions) || 0;
    if (!patient?.sessionDay || patient.sessionDay === 'Nenhum') return baseCount;

    const pRecurrenceStart = safeDateParse(patient.recurrenceStart || patient.createdAt || '2024-01-01T12:00:00');
    const start = startOfDay(pRecurrenceStart);
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

  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(prev => subDays(prev, 1));
    else if (viewMode === 'week') setCurrentDate(prev => subWeeks(prev, 1));
    else setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(prev => addDays(prev, 1));
    else if (viewMode === 'week') setCurrentDate(prev => addWeeks(prev, 1));
    else setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Current day sessions summary
  const currentDaySessions = useMemo(() => {
    return getDaySessions(currentDate);
  }, [currentDate, sessions, patients]);

  const currentDayTotalRevenue = useMemo(() => {
    return currentDaySessions.reduce((acc, s) => {
      if (s.status === 'Cancelada') return acc;
      return acc + (parseFloat(s.amount) || parseFloat(s.sessionValue) || 0);
    }, 0);
  }, [currentDaySessions]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Top Header & Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">
              {viewMode === 'day' ? 'Agenda do Dia' : viewMode === 'week' ? 'Agenda da Semana' : 'Agenda Mensal'}
            </h2>
            {isGoogleCalendarEnabled && googleAccessToken ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Google Sincronizado
                </span>
                {onSyncGoogleCalendar && (
                  <button
                    type="button"
                    onClick={onSyncGoogleCalendar}
                    className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                    title="Forçar sincronização de todas as consultas futuras com o Google Agenda"
                  >
                    <RefreshCw size={11} />
                    Sincronizar Agora
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectGoogleCalendar || onOpenSettings}
                className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
                title="Conectar ou renovar token da Google Agenda"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                {isGoogleCalendarEnabled ? 'Reconectar Google Agenda' : 'Conectar Google Agenda'}
              </button>
            )}
            {onOpenWhatsAppReminders && (
              <button
                type="button"
                onClick={onOpenWhatsAppReminders}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
                title="Abrir Central de Lembretes WhatsApp"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Lembretes WhatsApp
              </button>
            )}
          </div>
          <p className="text-text-muted mt-1 text-xs sm:text-sm">
            {viewMode === 'day' 
              ? 'Visualização horária detalhada estilo Google Agenda.' 
              : viewMode === 'week' 
                ? 'Planejamento semanal completo com todas as sessões e recorrências.'
                : 'Visão panorâmica do seu consultório e recorrências.'}
          </p>
        </div>

        {/* Controls: Mode Switcher, Date Navigation, New Appointment */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
          
          {/* View Mode Switcher */}
          <div className="bg-card/70 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex items-center gap-1 shadow-sm">
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'day'
                  ? "bg-primary text-white shadow-md"
                  : "text-text-muted hover:text-text-main"
              )}
              title="Visão diária vertical estilo Google Agenda"
            >
              <Clock size={14} />
              <span>Dia</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'week'
                  ? "bg-primary text-white shadow-md"
                  : "text-text-muted hover:text-text-main"
              )}
              title="Visão de 7 colunas da semana"
            >
              <CalendarDays size={14} />
              <span>Semana</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'month'
                  ? "bg-primary text-white shadow-md"
                  : "text-text-muted hover:text-text-main"
              )}
              title="Visão mensal completa"
            >
              <CalendarIcon size={14} />
              <span>Mês</span>
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-2 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-sm">
            <button 
              onClick={handlePrev}
              className="p-1.5 rounded-xl hover:bg-white/10 transition-all text-text-muted hover:text-primary cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-[11px] font-bold text-text-main hover:text-primary bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
            >
              Hoje
            </button>
            <div className="px-2 text-center min-w-[130px] sm:min-w-[160px]">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-0.5">
                {viewMode === 'day' 
                  ? format(currentDate, 'yyyy') 
                  : viewMode === 'week' 
                    ? `${format(weekStart, 'dd/MM')} a ${format(weekEnd, 'dd/MM/yyyy')}`
                    : format(currentDate, 'yyyy')}
              </p>
              <h3 className="text-xs sm:text-sm font-bold text-text-main capitalize truncate leading-tight">
                {viewMode === 'day'
                  ? format(currentDate, "EEEE, d 'de' MMM", { locale: ptBR })
                  : viewMode === 'week'
                    ? `Semana ${format(weekStart, 'w')}`
                    : format(currentDate, 'MMMM', { locale: ptBR })}
              </h3>
            </div>
            <button 
              onClick={handleNext}
              className="p-1.5 rounded-xl hover:bg-white/10 transition-all text-text-muted hover:text-primary cursor-pointer"
              title="Próximo"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {lastAction && onUndo && (
               <button 
                 onClick={onUndo}
                 className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-4 py-2 rounded-2xl font-bold flex items-center justify-center gap-1.5 hover:bg-orange-500 hover:text-white transition-all text-xs cursor-pointer"
               >
                 <ChevronLeft className="rotate-180" size={14} />
                 <span>Desfazer</span>
               </button>
            )}
            {isScheduleAutonomyDisabled ? (
              <div 
                className="px-3.5 py-2 rounded-2xl bg-surface-muted border border-border-ui text-text-muted text-xs font-semibold flex items-center gap-1.5 select-none"
                title="A agenda é controlada centralmente pela recepção"
              >
                <Lock size={14} className="text-amber-500" />
                <span>Agenda via Recepção</span>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setEditingSession({
                    date: format(currentDate, 'yyyy-MM-dd')
                  });
                  setIsModalOpen(true);
                }}
                className="bg-primary text-white px-4 sm:px-5 py-2 rounded-2xl font-bold flex items-center justify-center gap-1.5 hover:opacity-90 shadow-lg shadow-primary/20 transition-all text-xs sm:text-sm whitespace-nowrap cursor-pointer"
              >
                <Plus size={18} />
                <span>Novo Agendamento</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isScheduleAutonomyDisabled && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-600 dark:text-amber-400 text-xs font-semibold">
          <Lock size={18} className="shrink-0 text-amber-500" />
          <span>A sua clínica configurou o controle centralizado da agenda. Novos agendamentos, edições e cancelamentos são gerenciados diretamente pela recepção.</span>
        </div>
      )}

      {/* 1. AGENDA DO DIA (GOOGLE CALENDAR STYLE) */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Day Summary Header Bar */}
          <div className="bg-card/70 border border-border-ui rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 border",
                isToday(currentDate) 
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/30" 
                  : "bg-surface-muted text-text-main border-border-ui"
              )}>
                <span className="text-[10px] uppercase font-bold tracking-wider leading-none">
                  {format(currentDate, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-lg font-extrabold leading-none mt-0.5">
                  {format(currentDate, 'd')}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-text-main capitalize">
                  {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {isToday(currentDate) ? 'Hoje • ' : ''}
                  {currentDaySessions.length === 0 
                    ? 'Nenhum atendimento agendado para este dia.' 
                    : `${currentDaySessions.length} ${currentDaySessions.length === 1 ? 'consulta agendada' : 'consultas agendadas'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Previsão do Dia</span>
                <span className="text-sm font-bold text-emerald-500">
                  R$ {currentDayTotalRevenue.toFixed(2)}
                </span>
              </div>
              {!isScheduleAutonomyDisabled && (
                <button
                  onClick={() => {
                    setEditingSession({ date: format(currentDate, 'yyyy-MM-dd') });
                    setIsModalOpen(true);
                  }}
                  className="py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Adicionar</span>
                </button>
              )}
            </div>
          </div>

          {/* Vertical Hourly Timeline */}
          <div className="glass-card rounded-[28px] overflow-hidden border border-white/5 shadow-2xl relative">
            <div className="relative divide-y divide-white/5">
              {/* Real-time Current Time Line (Google Calendar Red Line) */}
              {isToday(currentDate) && (() => {
                const h = now.getHours();
                const m = now.getMinutes();
                if (h >= 7 && h <= 22) {
                  const minsFrom7 = (h - 7) * 60 + m;
                  const totalGridMins = 16 * 60; // 07:00 to 23:00 (16 hrs)
                  const topPct = (minsFrom7 / totalGridMins) * 100;
                  return (
                    <div 
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                      style={{ top: `${topPct}%` }}
                    >
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-md shadow-rose-500/50 -ml-1.5 ring-4 ring-rose-500/20 animate-pulse" />
                      <div className="h-[2px] bg-rose-500 flex-1 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                      <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full mr-2 shadow font-mono">
                        {format(now, 'HH:mm')}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {DAY_HOURS.map((hour) => {
                const hourPrefix = hour.slice(0, 2);
                const hourNum = parseInt(hourPrefix, 10);
                const slotSessions = currentDaySessions.filter(s => {
                  if (!s.time) return false;
                  const sH = parseInt(s.time.split(':')[0], 10);
                  return sH === hourNum;
                });

                return (
                  <div 
                    key={hour}
                    className="flex min-h-[96px] relative group hover:bg-white/[0.015] transition-colors"
                  >
                    {/* Hour Column */}
                    <div className="w-16 sm:w-20 p-3 border-r border-white/5 text-right shrink-0 select-none flex flex-col justify-between">
                      <span className="text-xs font-bold text-text-muted font-mono block -mt-1 group-hover:text-primary transition-colors">
                        {hour}
                      </span>
                      <span className="text-[9px] text-text-muted/40 font-mono">
                        :30
                      </span>
                    </div>

                    {/* Hour Content Slot */}
                    <div className="flex-1 p-2 flex flex-col justify-center relative">
                      {/* Subtle 30-minute guide line */}
                      <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-white/[0.04] pointer-events-none" />

                      {slotSessions.length === 0 ? (
                        <div className="h-full flex items-center">
                          {!isScheduleAutonomyDisabled && (
                            <button
                              onClick={() => {
                                setEditingSession({
                                  date: format(currentDate, 'yyyy-MM-dd'),
                                  time: hour
                                });
                                setIsModalOpen(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-primary/80 hover:text-primary flex items-center gap-1.5 py-1 px-3 rounded-xl hover:bg-primary/10 cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>Agendar às {hour}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full z-10">
                          {slotSessions.map((session) => (
                            <div
                              key={session.id}
                              className={cn(
                                "p-3 rounded-2xl border text-xs relative transition-all shadow-sm flex flex-col justify-between gap-2.5",
                                session.status === 'Cancelada'
                                  ? "bg-red-500/10 border-red-500/20 text-red-300 opacity-60 line-through"
                                  : session.status === 'Desmarcou'
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                    : session.status === 'Confirmada'
                                      ? "bg-emerald-500/10 border-emerald-500/40 text-text-main ring-1 ring-emerald-500/30 shadow-emerald-500/5"
                                      : session.isTriage
                                        ? "bg-orange-500/10 border-orange-500/30 text-text-main"
                                        : session.status === 'Realizada'
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-text-main"
                                          : "bg-primary/10 border-primary/30 text-text-main"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono bg-black/25 text-text-main">
                                      {session.time}
                                    </span>
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                                      session.status === 'Realizada' ? "bg-emerald-500/20 text-emerald-400" :
                                      session.status === 'Confirmada' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold" :
                                      session.status === 'Desmarcou' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                      session.status === 'Cancelada' ? "bg-red-500/20 text-red-400" :
                                      session.isTriage ? "bg-orange-500/20 text-orange-400" :
                                      "bg-primary/20 text-primary"
                                    )}>
                                      {session.status === 'Cancelada' ? 'Cancelada' : 
                                       session.status === 'Confirmada' ? '✓ Confirmada' : 
                                       session.status === 'Desmarcou' ? 'Desmarcou' : 
                                       session.isTriage ? 'Triagem' : session.type || 'Sessão'}
                                    </span>
                                    {session.reminderD1Sent && (
                                      <span className="text-[8px] bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-0.5" title="Lembrete de confirmação D-1 enviado pelo WhatsApp">
                                        <CheckCircle2 size={9} /> D-1
                                      </span>
                                    )}
                                    {session.reminderD0Sent && (
                                      <span className="text-[8px] bg-indigo-500/15 text-indigo-400 font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-0.5" title="Lembrete imediato D-0 enviado pelo WhatsApp">
                                        <CheckCircle2 size={9} /> D-0
                                      </span>
                                    )}
                                    {session.sessionNumber && (
                                      <span className="text-[9px] text-text-muted font-bold">
                                        #{session.sessionNumber}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-sm text-text-main truncate uppercase tracking-tight">
                                    {session.patientName || 'Paciente'}
                                  </h4>
                                </div>

                                {session.patientPhone && getWhatsAppLink(session.patientPhone) && (
                                  <a
                                    href={getWhatsAppLink(session.patientPhone)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500 hover:text-white transition-all shrink-0 cursor-pointer"
                                    title="Conversar no WhatsApp"
                                  >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                                    </svg>
                                  </a>
                                )}
                              </div>

                              {/* Action buttons */}
                              {!isScheduleAutonomyDisabled && (
                                <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                                  {session.isTriage && session.status !== 'Cancelada' && (
                                    <button
                                      onClick={() => onTriageToPatient(session.patientName, session.dayName, session.time, session.id)}
                                      className="px-2 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer"
                                    >
                                      Efetivar
                                    </button>
                                  )}
                                  {session.status !== 'Cancelada' && (
                                    <>
                                      {session.status === 'Desmarcou' && (
                                        <button
                                          onClick={() => {
                                            onAddSession({
                                              ...session,
                                              id: session.id,
                                              status: 'Agendada',
                                              date: format(currentDate, 'yyyy-MM-dd'),
                                              time: session.time
                                            });
                                          }}
                                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-400 text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                                          title="Reativar sessão como Agendada (Ativa)"
                                        >
                                          <Check size={11} />
                                          <span>Reativar</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setEditingSession({
                                            ...session,
                                            date: format(currentDate, 'yyyy-MM-dd'),
                                            originalDate: format(currentDate, 'yyyy-MM-dd'),
                                            originalTime: session.time
                                          });
                                          setIsModalOpen(true);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[10px] font-bold uppercase transition-all cursor-pointer"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm('Deseja cancelar este atendimento?')) {
                                            onAddSession({
                                              id: session.id,
                                              patientId: session.patientId || '',
                                              triageName: session.triageName || session.patientName || '',
                                              date: format(currentDate, 'yyyy-MM-dd'),
                                              originalDate: format(currentDate, 'yyyy-MM-dd'),
                                              time: session.time,
                                              originalTime: session.time,
                                              status: 'Cancelada',
                                              isTriage: session.isTriage,
                                              type: session.type
                                            });
                                          }
                                        }}
                                        className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 text-[10px] font-bold uppercase transition-all cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  )}
                                  {!session.id?.toString().startsWith('virtual-') && (
                                    <button
                                      onClick={() => {
                                        if (confirm('Deseja excluir permanentemente este registro da agenda?')) {
                                          onDeleteSession(session.id);
                                        }
                                      }}
                                      className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition-all ml-auto cursor-pointer"
                                      title="Excluir Registro"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. AGENDA DA SEMANA (7 COLUNAS DE DIAS) */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const daySess = getDaySessions(day);
              const isTodayDay = isToday(day);
              const dateStr = format(day, 'yyyy-MM-dd');

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "glass-card rounded-2xl border flex flex-col justify-between transition-all overflow-hidden",
                    isTodayDay ? "border-primary/50 shadow-lg shadow-primary/10 bg-primary/[0.03]" : "border-white/5 bg-card/40"
                  )}
                >
                  {/* Day Column Header */}
                  <div 
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode('day');
                    }}
                    className={cn(
                      "p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between",
                      isTodayDay && "bg-primary/10"
                    )}
                    title="Clique para ver a agenda detalhada deste dia"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        {format(day, 'EEEE', { locale: ptBR })}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "text-sm font-extrabold flex items-center justify-center w-6 h-6 rounded-lg",
                          isTodayDay ? "bg-primary text-white" : "text-text-main"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {isTodayDay && (
                          <span className="text-[9px] bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-full uppercase">
                            Hoje
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted bg-white/5 px-2 py-1 rounded-lg">
                      {daySess.length}
                    </span>
                  </div>

                  {/* Sessions List */}
                  <div className="p-2 space-y-2 flex-1 min-h-[160px] max-h-[450px] overflow-y-auto custom-scrollbar">
                    {daySess.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-8 text-center text-[11px] text-text-muted/60">
                        Livre
                      </div>
                    ) : (
                      daySess.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => {
                            if (!isScheduleAutonomyDisabled && session.status !== 'Cancelada') {
                              setEditingSession({
                                ...session,
                                date: session.date || dateStr,
                                originalDate: session.date || dateStr,
                                originalTime: session.time
                              });
                              setIsModalOpen(true);
                            }
                          }}
                          className={cn(
                            "p-2 rounded-xl border text-[10px] font-semibold flex flex-col gap-1 transition-all cursor-pointer hover:border-primary/40 hover:scale-[1.01]",
                            session.status === 'Cancelada'
                              ? "bg-red-500/10 border-red-500/20 text-red-400 opacity-60 line-through"
                              : session.status === 'Desmarcou'
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                : session.status === 'Confirmada'
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-text-main ring-1 ring-emerald-500/30 shadow-emerald-500/5"
                                  : session.isTriage
                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                                    : session.status === 'Realizada'
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                      : "bg-primary/10 border-primary/20 text-text-main"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-primary">{session.time}</span>
                            <span className={cn(
                              "text-[8px] uppercase tracking-wider font-extrabold truncate px-1.5 py-0.5 rounded",
                              session.status === 'Confirmada' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                              session.status === 'Desmarcou' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                              "opacity-75"
                            )}>
                              {session.status === 'Cancelada' ? 'Cancelada' : 
                               session.status === 'Confirmada' ? '✓ Confirmada' : 
                               session.status === 'Desmarcou' ? 'Desmarcou' : 
                               session.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate text-text-main uppercase">
                              {session.patientName || 'Paciente'}
                            </span>
                            {session.patientPhone && getWhatsAppLink(session.patientPhone) && (
                              <a
                                href={getWhatsAppLink(session.patientPhone)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-green-500 hover:text-green-400 p-0.5 rounded transition-colors shrink-0"
                                title="WhatsApp"
                              >
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add appointment on day button */}
                {!isScheduleAutonomyDisabled && (
                  <div className="p-2 border-t border-white/5 bg-white/[0.02]">
                    <button
                      onClick={() => {
                        setEditingSession({ date: dateStr });
                        setIsModalOpen(true);
                      }}
                      className="w-full py-1.5 text-[10px] font-bold text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Agendar</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 3. AGENDA DO MÊS (GRADE COMPLETA) */}
      {viewMode === 'month' && (
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
              const daySess = getDaySessions(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDay = isToday(day);
              const dateStr = format(day, 'yyyy-MM-dd');

              return (
                <div 
                  key={day.toString()} 
                  onClick={() => {
                    setCurrentDate(day);
                    if (window.innerWidth < 768) {
                      setSelectedMobileDay(day);
                    } else {
                      setViewMode('day');
                    }
                  }}
                  className={cn(
                    "p-2 border-r border-b border-white/5 relative group transition-colors cursor-pointer",
                    !isCurrentMonth && "bg-white/[0.02] opacity-30",
                    idx % 7 === 6 && "border-r-0",
                    isTodayDay && "bg-primary/5",
                    "min-h-[80px] md:min-h-[120px]"
                  )}
                  title="Clique para abrir a agenda deste dia"
                >
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className={cn(
                      "text-xs font-bold flex items-center justify-center w-6 h-6 rounded-lg",
                      isTodayDay ? "bg-primary text-white" : "text-text-muted"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {daySess.length > 0 && (
                      <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-70 hidden md:inline">
                        {daySess.length} {daySess.length === 1 ? 'Sessão' : 'Sessões'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar pr-1 hidden md:block">
                    {daySess.map(session => (
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
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span className="truncate uppercase tracking-tight">{session.patientName || 'Paciente'}</span>
                          </div>
                          <span className="shrink-0 opacity-70 font-mono">{session.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile indicators (dots/bars) */}
                  <div className="md:hidden flex flex-col gap-1 mt-1">
                    {daySess.slice(0, 3).map(session => (
                      <div 
                        key={`mob-${session.id}`} 
                        className={cn(
                          "h-1.5 w-full rounded-full",
                          session.status === 'Cancelada' ? "bg-red-500/50" : session.isTriage ? "bg-orange-500" : "bg-primary"
                        )} 
                      />
                    ))}
                    {daySess.length > 3 && (
                      <div className="text-[8px] text-center text-text-muted font-bold">+{daySess.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
                          : session.status === 'Desmarcou'
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : session.status === 'Confirmada'
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/30 shadow-emerald-500/5"
                              : session.isTriage 
                                ? "bg-orange-500/10 border-orange-500/20 text-orange-400" 
                                : "bg-primary/10 border-primary/20 text-primary"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <span className="uppercase tracking-tight text-lg truncate">{session.patientName || 'Paciente'}</span>
                          {session.patientPhone && getWhatsAppLink(session.patientPhone) && (
                            <a 
                              href={getWhatsAppLink(session.patientPhone)!} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-500 hover:text-green-400 p-1 transition-colors flex items-center justify-center rounded-lg hover:bg-green-500/10 cursor-pointer shrink-0"
                              title="Conversar no WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.883-6.962C16.59 1.878 14.12 .853 11.493.853 6.059.853 1.633 5.272 1.63 10.718c-.001 1.639.429 3.236 1.247 4.678L1.87 20.89l5.656-1.482c1.399.763 2.94 1.168 4.542 1.171z M17.07 14.543c-.275-.138-1.62-.8-1.873-.892-.253-.093-.437-.138-.62.138-.184.276-.713.892-.873 1.077-.16.184-.32.207-.595.069-.275-.138-1.163-.429-2.215-1.366-.817-.729-1.37-1.629-1.53-1.905-.16-.276-.017-.424.12-.562.124-.125.276-.322.414-.483.138-.161.184-.276.276-.46.09-.184.046-.345-.023-.483-.069-.138-.62-1.494-.85-2.046-.223-.538-.45-.465-.62-.474-.16-.008-.344-.01-.527-.01-.184 0-.483.069-.736.345-.253.276-.966.943-.966 2.3 0 1.356.988 2.666 1.126 2.85.138.184 1.944 2.969 4.71 4.16.657.283 1.17.453 1.57.58.66.21 1.26.18 1.73.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.53-.32z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                        <span className="shrink-0 text-base">{session.time}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold mb-4 opacity-80">
                        <span className={cn(
                          session.status === 'Confirmada' ? "text-emerald-400 font-extrabold" :
                          session.status === 'Desmarcou' ? "text-amber-400 font-extrabold" : ""
                        )}>
                          {session.status === 'Cancelada' ? 'Cancelada' : 
                           session.status === 'Confirmada' ? '✓ Confirmada' : 
                           session.status === 'Desmarcou' ? 'Desmarcou' : 
                           session.type}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {session.reminderD1Sent && (
                            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 size={10} /> D-1 Enviado
                            </span>
                          )}
                          {session.reminderD0Sent && (
                            <span className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                              <CheckCircle2 size={10} /> D-0 Enviado
                            </span>
                          )}
                        </div>
                      </div>

                      {!isScheduleAutonomyDisabled && (
                        <div className="flex flex-wrap gap-2">
                          {session.isTriage && session.status !== 'Cancelada' && (
                            <button 
                              onClick={() => { setSelectedMobileDay(null); onTriageToPatient(session.patientName, session.dayName, session.time, session.id); }}
                              className="flex-1 bg-primary/20 text-primary py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all border border-primary/20 uppercase"
                            >Efetivar</button>
                          )}
                          
                          {session.status !== 'Cancelada' && (
                            <>
                              {session.status === 'Desmarcou' && (
                                <button 
                                  onClick={() => {
                                    setSelectedMobileDay(null);
                                    onAddSession({
                                      ...session,
                                      id: session.id,
                                      status: 'Agendada',
                                      date: format(selectedMobileDay, 'yyyy-MM-dd'),
                                      time: session.time
                                    });
                                  }}
                                  className="flex-1 bg-emerald-500/20 text-emerald-400 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/30 uppercase flex items-center justify-center gap-1"
                                >
                                  <Check size={12} />
                                  <span>Reativar</span>
                                </button>
                              )}
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
                      )}
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
            isPT={isPT}
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

function ScheduleModal({ onClose, patients, onSave, initialData, isPT: isPTProp }: { 
  onClose: () => void, 
  patients: any[], 
  onSave: (data: any) => void,
  initialData?: any,
  isPT?: boolean
}) {
  const isPT = isPTProp ?? (typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt')
  ));
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
    status: initialData?.status === 'Recorrente' ? 'Agendada' : (initialData?.status || 'Agendada'),
    amount: initialData?.amount || ''
  });

  useEffect(() => {
    if (formData.patientId) {
      const p = patients.find(p => p.id === formData.patientId);
      if (p?.amount && (!formData.amount || formData.amount === '0' || formData.amount === 0 || formData.amount === '')) {
        setFormData(prev => ({ ...prev, amount: p.amount }));
      }
    }
  }, [formData.patientId, patients]);

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
              {initialData?.status === 'Recorrente' ? 'Ajustar Horário' : (initialData?.id ? (isPT ? 'Editar Consulta' : 'Editar Sessão') : (isPT ? 'Agendar Consulta' : 'Agendar Sessão'))}
            </h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-muted transition-colors">
               <Plus className="rotate-45" size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {!initialData?.id ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{isPT ? 'Utente ou Nome (Triagem)' : 'Paciente ou Nome (Triagem)'}</label>
                <input 
                  value={formData.triageName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matchedPatient = patients.find(p => p.name.toLowerCase() === val.toLowerCase());
                    setFormData({...formData, triageName: val, patientId: matchedPatient ? matchedPatient.id : ''});
                  }}
                  list="patients-list"
                  placeholder={isPT ? 'Selecione um utente ou digite um novo nome' : 'Selecione um paciente ou digite um novo nome'}
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
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{isPT ? 'Ajustando consulta de:' : 'Ajustando sessão de:'}</p>
                <p className="text-sm font-bold text-text-main mt-1 uppercase">{formData.triageName}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Data</label>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      date: newDate,
                      status: (prev.status === 'Desmarcou' && newDate !== prev.originalDate) ? 'Agendada' : prev.status
                    }));
                  }}
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Horário</label>
                <input 
                  type="time"
                  value={formData.time}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      time: newTime,
                      status: (prev.status === 'Desmarcou' && newTime !== prev.originalTime) ? 'Agendada' : prev.status
                    }));
                  }}
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{isPT ? 'Valor da Consulta (€)' : 'Valor da Sessão (R$)'}</label>
              <input 
                type="number"
                placeholder={isPT ? 'Ex: 50' : 'Ex: 150'}
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary font-mono"
              />
            </div>

            {/* Seletor de Status (Agendada / Confirmada / Desmarcou) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                  {isPT ? 'Estado da Consulta' : 'Status da Sessão'}
                </label>
                {formData.status === 'Desmarcou' && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-wider">
                    Desmarcou
                  </span>
                )}
                {formData.status === 'Confirmada' && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-wider">
                    ✓ Confirmada
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'Agendada' }))}
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    formData.status === 'Agendada'
                      ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                      : "bg-surface-muted text-text-muted border-border-ui hover:border-primary/40 hover:text-text-main"
                  )}
                  title={isPT ? 'Consulta ativa e normal na agenda' : 'Sessão ativa e normal na agenda'}
                >
                  <Clock size={13} className={formData.status === 'Agendada' ? "text-white" : "text-primary"} />
                  <span>Agendada (Ativa)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'Confirmada' }))}
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    formData.status === 'Confirmada'
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20 font-extrabold"
                      : "bg-surface-muted text-text-muted border-border-ui hover:border-emerald-500/40 hover:text-text-main"
                  )}
                  title={isPT ? 'Presença confirmada pelo utente' : 'Presença confirmada pelo paciente'}
                >
                  <Check size={13} className={formData.status === 'Confirmada' ? "text-white" : "text-emerald-400"} />
                  <span>Confirmada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'Desmarcou' }))}
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    formData.status === 'Desmarcou'
                      ? "bg-amber-500 text-black border-amber-500 shadow-sm shadow-amber-500/20 font-extrabold"
                      : "bg-surface-muted text-text-muted border-border-ui hover:border-amber-500/40 hover:text-text-main"
                  )}
                  title={isPT ? 'Utente desmarcou' : 'Paciente desmarcou'}
                >
                  <AlertTriangle size={13} className={formData.status === 'Desmarcou' ? "text-black" : "text-amber-400"} />
                  <span>Desmarcou</span>
                </button>
              </div>
              {formData.status === 'Desmarcou' && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between gap-2">
                  <span>{isPT ? 'Consulta desmarcada. Para remarcar, altere a data acima ou clique em ' : 'Sessão desmarcada. Para remarcar, altere a data acima ou clique em '}<strong>Agendada (Ativa)</strong>.</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'Agendada' }))}
                    className="shrink-0 px-2 py-1 bg-amber-500 text-black font-bold rounded-lg text-[10px] hover:bg-amber-400 transition-colors uppercase cursor-pointer"
                  >
                    Ativar Agora
                  </button>
                </div>
              )}
            </div>
            
            {initialData && initialData.status === 'Recorrente' && (
              <div className="space-y-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest pl-1">{isPT ? 'Alterar Periodicidade' : 'Alterar Recorrência'}</label>
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
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{isPT ? 'Periodicidade' : 'Recorrência'}</label>
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
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{isPT ? 'Tipo de Consulta' : 'Tipo de Sessão'}</label>
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
                    return alert(isPT ? 'Por favor, selecione um utente ou digite um nome para triagem.' : 'Por favor, selecione um paciente ou digite um nome para triagem.');
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

function ProfileSettingsModal({ 
  initialData, 
  onClose, 
  onSave, 
  googleAccessToken, 
  onConnectGoogleCalendar,
  hasAcceptedExtensionTerms = false,
  onOpenExtensionModal
}: any) {
  const isMasterAdmin = auth.currentUser?.email?.toLowerCase().trim() === 'wellcoutinho99@gmail.com' || auth.currentUser?.email?.toLowerCase().trim() === 'juniorcoutinho58@gmail.com';
  const initialCountry = isMasterAdmin ? 'BR' : (initialData?.country || 'BR');
  const [formData, setFormData] = useState({
    ...initialData,
    country: initialCountry
  });
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
          <h3 className="text-xl font-bold text-text-main">
            {formData.country === 'PT' ? 'Definições do Perfil' : 'Configurações do Perfil'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-muted transition-colors">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {/* País / Região de Atuação */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">País de Atuação Clínica</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, country: 'BR' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  (formData.country || 'BR') === 'BR'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-muted text-text-muted border-border-ui hover:bg-surface-muted/80'
                }`}
              >
                <span>🇧🇷 Brasil (CFP)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, country: 'PT' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formData.country === 'PT'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-muted text-text-muted border-border-ui hover:bg-surface-muted/80'
                }`}
              >
                <span>🇵🇹 Portugal (OPP)</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Nome do Profissional</label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder={formData.country === 'PT' ? "Ex: Dra. Sofia Lourenço" : "Ex: Dr. João Silva"}
              className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
            />
          </div>

          {/* Regional Identification & Payments */}
          {formData.country === 'PT' ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Cédula Profissional OPP</label>
                <input 
                  value={formData.opp || formData.crp || ''} 
                  onChange={e => setFormData({...formData, opp: e.target.value, crp: e.target.value})} 
                  placeholder="Ex: Cédula OPP 24192"
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">NIF do Profissional (Declarações / Faturação)</label>
                <input 
                  value={formData.nif || formData.cpfCnpj || ''} 
                  onChange={e => setFormData({...formData, nif: e.target.value, cpfCnpj: e.target.value})} 
                  placeholder="Ex: 123456789 (9 dígitos)"
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Contacto MB WAY (Recebimentos)</label>
                  <input 
                    value={formData.mbwayPhone || formData.pixKey || ''} 
                    onChange={e => setFormData({...formData, mbwayPhone: e.target.value, pixKey: e.target.value})} 
                    placeholder="Ex: 912 345 678"
                    className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">IBAN SEPA (Transferências)</label>
                  <input 
                    value={formData.iban || ''} 
                    onChange={e => setFormData({...formData, iban: e.target.value})} 
                    placeholder="PT50 0000 0000 0000 0000 0000 0"
                    className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary font-mono text-xs" 
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Número do CRP</label>
                <input 
                  value={formData.crp || ''} 
                  onChange={e => setFormData({...formData, crp: e.target.value})} 
                  placeholder="Ex: CRP 06/12345"
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Tipo de Chave Pix</label>
                  <select
                    value={formData.pixType || ''}
                    onChange={e => setFormData({...formData, pixType: e.target.value})}
                    className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23888' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1.25rem',
                      backgroundRepeat: 'no-repeat',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="" className="bg-background-dark">Não configurado</option>
                    <option value="CPF" className="bg-background-dark">CPF</option>
                    <option value="CNPJ" className="bg-background-dark">CNPJ</option>
                    <option value="E-mail" className="bg-background-dark">E-mail</option>
                    <option value="Celular" className="bg-background-dark">Celular</option>
                    <option value="Chave Aleatória" className="bg-background-dark">Chave Aleatória</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Chave Pix</label>
                  <input 
                    value={formData.pixKey || ''} 
                    onChange={e => setFormData({...formData, pixKey: e.target.value})} 
                    placeholder="Insira a chave"
                    className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Favorecido Pix (Opcional)</label>
                <input 
                  value={formData.pixName || ''} 
                  onChange={e => setFormData({...formData, pixName: e.target.value})} 
                  placeholder="Ex: Nome do beneficiário"
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">CPF ou CNPJ (Reembolso)</label>
                <input 
                  value={formData.cpfCnpj || ''} 
                  onChange={e => setFormData({...formData, cpfCnpj: e.target.value})} 
                  placeholder="Ex: 000.000.000-00"
                  className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
              {formData.country === 'PT' ? 'Morada do Consultório (Seguros de Saúde / ADSE)' : 'Endereço do Consultório (Reembolso)'}
            </label>
            <input 
              value={formData.address || ''} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
              placeholder={formData.country === 'PT' ? "Ex: Av. da Liberdade, 100 - Lisboa" : "Ex: Av. Paulista, 1000 - Sala 50"}
              className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
              {formData.country === 'PT' ? 'Telemóvel / Telefone de Contacto' : 'Telefone Comercial (Reembolso)'}
            </label>
            <input 
              value={formData.phone || ''} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              placeholder={formData.country === 'PT' ? "Ex: +351 912 345 678" : "Ex: (11) 99999-9999"}
              className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
              {formData.country === 'PT' ? 'Nome para Assinatura nos Processos Clínicos' : 'Nome para Assinatura em Relatórios'}
            </label>
            <input 
              value={formData.signatureText || ''} 
              onChange={e => setFormData({...formData, signatureText: e.target.value})} 
              placeholder={formData.country === 'PT' ? "Ex: Dra. Sofia Lourenço - Psicóloga Clínica" : "Ex: João da Silva - Psicólogo Clínico"}
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
              <div className="space-y-2 mt-2">
                <div className="glass-card p-3.5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-4">
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
                <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/10 text-left">
                  <p className="text-[9px] text-text-muted leading-relaxed">
                    🔒 <strong>Segurança e Consentimento da Google Agenda:</strong>
                  </p>
                  <p className="text-[9px] text-text-muted leading-relaxed mt-1">
                    Ao conectar, a Google poderá exibir uma mensagem de <em>"App não verificado"</em> ou <em>"Site suspeito"</em> por ser uma integração direta e privada. Para prosseguir:
                  </p>
                  <ol className="text-[9px] text-text-muted leading-relaxed mt-1 list-decimal list-inside space-y-0.5">
                    <li>Clique em <strong>Avançado</strong> (canto inferior esquerdo da tela de consentimento).</li>
                    <li>Selecione <strong>Acessar SimplePsi (não seguro)</strong>.</li>
                    <li>Certifique-se de <strong>marcar a caixinha</strong> de permissão para ler e gravar eventos da sua agenda para que a sincronização funcione.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Google Meet Extension Panel */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-text-main uppercase tracking-tight">Extensão Oficial Google Meet</p>
                <p className="text-[10px] text-text-muted">
                  {formData.country === 'PT' ? 'Transcrição e processo clínico com IA.' : 'Transcrição e evolução clínica com IA.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasAcceptedExtensionTerms ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className="text-[10px] font-bold text-text-main uppercase tracking-wider">
                  {hasAcceptedExtensionTerms ? 'ATIVADA' : 'PENDENTE'}
                </span>
              </div>
            </div>

            <div className="glass-card p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-3 text-left">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onOpenExtensionModal}
                  className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Chrome size={13} />
                  {hasAcceptedExtensionTerms 
                    ? (formData.country === 'PT' ? 'Gerir & Reinstalar' : 'Gerenciar & Reinstalar') 
                    : (formData.country === 'PT' ? 'Ativar Extensão' : 'Ativar Extensão')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(formData.country === 'PT' ? TCLE_TEMPLATE_TEXT_PT : TCLE_TEMPLATE_TEXT);
                    alert(formData.country === 'PT' ? "Modelo de termo de consentimento informado copiado com sucesso!" : "Modelo de termo TCLE copiado com sucesso!");
                  }}
                  className="px-3 py-2 bg-surface-muted hover:bg-border-ui text-text-muted hover:text-text-main border border-border-ui rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy size={13} />
                  {formData.country === 'PT' ? 'Copiar Consentimento' : 'Copiar Termo TCLE'}
                </button>
              </div>
              <p className="text-[9.5px] text-text-muted leading-relaxed">
                ⭐ <em>Lembrete:</em> Durante a teleconsulta, <strong>mantenha as legendas em Português ativadas no Google Meet</strong> para que a extensão faça a captura das falas.
              </p>
            </div>
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
          {formData.country === 'PT' ? 'Guardar Definições' : 'Salvar Configurações'}
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
  
  const isPT = typeof window !== 'undefined' && (
    localStorage.getItem('simplepsi_country') === 'PT' ||
    localStorage.getItem('prof_country') === 'PT' ||
    window.location.pathname.startsWith('/pt') ||
    window.location.search.includes('country=pt')
  );

  const getButtonText = () => {
    if (index === 0) return isPT ? 'Iniciar Visita 🚀' : 'Começar o Tour 🚀';
    if (index === size - 1) return 'Concluir ✨';
    return isPT ? 'Seguinte ➡️' : 'Avançar ➡️';
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
            {isPT ? 'Saltar' : 'Pular'}
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
            <ChevronLeft size={14} /> {isPT ? 'Anterior' : 'Voltar'}
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

function ImportTranscriptView({ 
  patients, 
  clinicalApproach,
  onSaveSession, 
  onCancel,
  onOpenExtensionModal,
  isTranscriptionDisabled = false
}: { 
  patients: any[], 
  clinicalApproach: string,
  onSaveSession: (patientId: string, date: string, time: string, duration: string, amount: string, type: 'Presencial' | 'Online', note: string) => void,
  onCancel: () => void,
  onOpenExtensionModal?: () => void,
  isTranscriptionDisabled?: boolean
}) {
  const [transcriptText, setTranscriptText] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [sessionDuration, setSessionDuration] = useState('50min');
  const [sessionType, setSessionType] = useState<'Presencial' | 'Online'>('Online');
  const [sessionAmount, setSessionAmount] = useState('180');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Copilot States
  const [activeLeftTab, setActiveLeftTab] = useState<'transcript' | 'ai'>('transcript');
  const approachKey = clinicalApproach || 'tcc';
  const approachInfo = CLINICAL_APPROACHES[approachKey] || CLINICAL_APPROACHES.tcc;

  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'model', content: string }>>([
    {
      role: 'model',
      content: `Olá! Sou o seu Copiloto de IA oficial. 🧠\n\nPosso ajudar você a analisar a transcrição desta sessão.\nUtilize as ações rápidas acima para gerar o relato completo da sessão, planejar a próxima sessão com base no plano de tratamento ou realizar uma supervisão clínica na abordagem ${approachInfo.name}. Você também pode me fazer perguntas personalizadas no chat abaixo!`
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const currentUser = auth.currentUser;
  const isMaster = currentUser?.email?.toLowerCase().trim() === 'wellcoutinho99@gmail.com';
  const hasReachedLimit = false; // Removido o limite para todos os usuários conforme solicitado

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isAiLoading]);

  // Escuta postMessage da extensão do Chrome para importar os dados de forma assíncrona
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SIMPLEPSI_IMPORT_TRANSCRIPT') {
        const { text, patientId } = event.data;
        console.log("[React App] Recebeu postMessage do Chrome extension:", { textLength: text?.length, patientId });
        
        // Só importa se o campo estiver vazio para evitar sobrescrever edições manuais
        setTranscriptText(current => {
          if (!current && text) {
            console.log("[React App] Populando transcriptText com:", text.substring(0, 50) + "...");
            return text;
          }
          return current;
        });

        if (patientId) {
          setSelectedPatientId(current => {
            if (!current && patientId) {
              console.log("[React App] Populando selectedPatientId com:", patientId);
              return patientId;
            }
            return current;
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle trigger from Chrome extension
  const handleImportTriggered = () => {
    const inputText = document.getElementById('simplepsi-pending-transcript-input') as HTMLInputElement;
    const inputPatientId = document.getElementById('simplepsi-pending-patient-id-input') as HTMLInputElement;
    
    if (inputText && inputText.value) {
      setTranscriptText(inputText.value);
    }
    if (inputPatientId && inputPatientId.value) {
      setSelectedPatientId(inputPatientId.value);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const evolucoes = selectedPatient?.clinicalData?.evoluções || [];
  const nextSessionNum = (evolucoes.length > 0 ? Math.max(...evolucoes.map((e: any) => e.sessionNumber || 0)) : 0) + 1;

  useEffect(() => {
    if (selectedPatient) {
      setSessionAmount(selectedPatient.amount || '180');
      setSessionType(selectedPatient.modality || 'Online');
    }
  }, [selectedPatientId]);

  const filteredList = patients.filter(p => 
    p.status !== 'Inativo' && 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  let dynamicAnalysisLabel = "Análise Clínica";
  if (approachKey === 'tcc') {
    dynamicAnalysisLabel = "Análise TCC";
  } else if (approachKey === 'psicanalise') {
    dynamicAnalysisLabel = "Análise Analítica";
  } else if (approachKey === 'gestalt') {
    dynamicAnalysisLabel = "Análise Gestáltica";
  } else if (approachKey === 'behaviorismo') {
    dynamicAnalysisLabel = "Análise Behaviorista";
  } else if (approachKey === 'junguiana') {
    dynamicAnalysisLabel = "Análise Junguiana";
  } else if (approachKey === 'humanista') {
    dynamicAnalysisLabel = "Análise Humanista";
  }

  const handleAiAction = async (actionType: string) => {
    if (isTranscriptionDisabled) {
      alert("O uso de inteligência artificial para transcrição de sessões foi desativado pela clínica.");
      return;
    }
    if (!transcriptText.trim()) {
      alert("A transcrição está vazia. Capture ou digite algo primeiro!");
      return;
    }
    if (hasReachedLimit) {
      alert("Limite de 4 interações de IA atingido.");
      return;
    }

    setIsAiLoading(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setAiMessages(prev => [...prev, 
        { role: 'user', content: `Executar: ${actionType === 'relato' ? 'Relato Completo' : actionType === 'proxima_sessao' ? 'Próxima Sessão' : 'Supervisão Clínica'}` },
        { role: 'model', content: "Erro: A chave de API do Gemini não está configurada (VITE_GEMINI_API_KEY no .env.local)." }
      ]);
      setIsAiLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      let prompt = "";

      if (actionType === 'relato') {
        prompt = `Você é um psicólogo clínico experiente cuja abordagem principal é a ${approachInfo.name}. Analise a transcrição de atendimento clínico a seguir e gere um relato completo da sessão em texto corrido com todos os detalhes importantes da sessão (o texto pode ser simplificado ou limpo de marcas de oralidade para melhor leitura).
        Regras fundamentais:
        1. O relato deve ser muito detalhado, completo e longo, estendendo-se por quantos parágrafos forem necessários (ex: 5, 7, 8, 9 ou mais parágrafos), de forma a cobrir todos os pontos discutidos de forma abrangente e aprofundada.
        2. Você deve reconhecer que quem está enviando a transcrição é o psicólogo (quem fala em primeira pessoa como "eu" na transcrição). Portanto, o relato deve ser elaborado sob a perspectiva em primeira pessoa do terapeuta (ex: "Questionei o paciente...", "Observei que...", "Realizei a intervenção...").
        3. REGRA ÉTICA DE SIGILO: Substitua todos os nomes próprios de pessoas mencionadas na transcrição apenas pela letra inicial (ex: Mariana -> M., João -> J.).
        4. NÃO utilize nenhum tipo de negrito ou itálico com asteriscos (como **texto** ou ***texto***). O texto deve ser inteiramente limpo e sem formatação de destaque com asteriscos.
        5. Retorne apenas o texto corrido do relato, sem saudações, introduções ou observações extras.
        
        Transcrição:
        "${transcriptText}"`;
      } else if (actionType === 'proxima_sessao') {
        const treatmentPlan = selectedPatient?.clinicalData?.treatmentPlan;
        const treatmentPlanStr = treatmentPlan && treatmentPlan.length > 0
          ? treatmentPlan.map((tp: any, index: number) => `- Objetivo ${index + 1}: ${tp.goal} (Status: ${tp.status})`).join('\n')
          : 'Nenhum plano de tratamento cadastrado.';

        prompt = `Você é um psicólogo clínico experiente cuja abordagem principal é a ${approachInfo.name}.
        Crie um planejamento completo, prático, estruturado e muito objetivo para a próxima sessão de psicoterapia do paciente ${selectedPatient?.name || 'do paciente'}.
        
        Você deve basear seu planejamento em dois pilares principais:
        1. O plano de tratamento atual do paciente:
        ${treatmentPlanStr}
        2. O conteúdo e a dinâmica discutidos na transcrição desta sessão atual:
        "${transcriptText}"
        
        IMPORTANTE:
        - Analise atentamente se, na transcrição, o terapeuta ou o paciente mencionaram explicitamente algum tema, técnica ou exercício específico para ser trabalhado na próxima sessão e incorpore isso.
        
        DIRETRIZES DE FORMATAÇÃO E CONTEÚDO (SIGA À RISCA):
        1. Divida o planejamento em tópicos numerados cronológicos da sessão (ex: 1. Checagem..., 2. Mapeamento..., 3. Construção..., 4. Fechamento...).
        2. Para cada tópico, estime a duração em minutos (ex: "5-10 min", "15-20 min").
        3. Para cada tópico, adicione itens de lista usando apenas o caractere "*" como marcador.
        4. O texto deve ser extremamente limpo. NÃO utilize nenhum tipo de negrito ou itálico com asteriscos (como **texto** ou ***texto***). Não envie os caracteres asteriscos extras a não ser o marcador de lista. Se quiser enfatizar algo, faça apenas no texto de forma natural.
        5. Remova saudações, introduções ou comentários iniciais/finais. Devolva apenas o planejamento limpo no formato do exemplo abaixo:

        Exemplo de formato esperado:
        1. Título do Tópico (5-10 min)
        * Item de orientação clínica ou pergunta prática para fazer ao paciente.
        * Outro item de acompanhamento.

        2. Título do Tópico (15-20 min)
        * Item descrevendo o foco principal e intervenções baseadas na abordagem ${approachInfo.name}.
        `;
      } else if (actionType === 'supervisao') {
        prompt = `Aja como um supervisor clínico altamente experiente e especializado na abordagem ${approachInfo.name}.
        Analise criticamente a transcrição de atendimento clínico a seguir e forneça uma supervisão clínica construtiva sobre a atuação do terapeuta.
        
        Identifique de forma detalhada e dividida em tópicos claros (utilize numeração simples como 1, 2, 3):
        1. Pontos fortes e acertos na condução do terapeuta (o que foi bem feito).
        2. Pontos a melhorar ou possíveis desvios (ex: onde o terapeuta fala demais, se repete, interrompe o paciente, perde oportunidades de aprofundamento, ou comete desvios técnicos).
        3. Otimização de intervenções: Onde o terapeuta poderia ter aprofundado mais na fala do paciente e quais perguntas reflexivas, hipóteses diagnósticas ou técnicas poderiam ter sido exploradas sob a perspectiva da abordagem ${approachInfo.name}.
        4. Recomendações e orientações práticas de manejo clínico para as próximas sessões.
        
        DIRETRIZES DE FORMATAÇÃO (SIGA À RISCA):
        - NÃO utilize nenhum tipo de negrito ou itálico com asteriscos (como **texto** ou ***texto***). O texto deve ser inteiramente limpo de caracteres asteriscos extras.
        - Mantenha um tom profissional, acadêmico e construtivo, focado na melhoria da prática clínica.
        
        Transcrição:
        "${transcriptText}"`;
      }

      const label = actionType === 'relato' 
        ? 'Relato Completo da Sessão' 
        : actionType === 'proxima_sessao' 
          ? 'Planejamento da Próxima Sessão' 
          : 'Supervisão Clínica';

      setAiMessages(prev => [...prev, { role: 'user', content: `Executar: ${label}` }]);

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "Não foi possível gerar uma resposta.";
      setAiMessages(prev => [...prev, { role: 'model', content: responseText }]);
      setInteractionCount(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      setAiMessages(prev => [...prev, { role: 'model', content: `Erro ao gerar resposta da IA: ${err.message}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendCustomMessage = async () => {
    if (isTranscriptionDisabled) {
      alert("O uso de inteligência artificial para transcrição de sessões foi desativado pela clínica.");
      return;
    }
    if (!aiInput.trim()) return;
    if (!transcriptText.trim()) {
      alert("A transcrição está vazia. Capture ou digite algo primeiro!");
      return;
    }
    if (hasReachedLimit) {
      alert("Limite de 4 interações de IA atingido.");
      return;
    }

    const userMessage = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setAiMessages(prev => [...prev, { role: 'model', content: "Erro: A chave de API do Gemini não está configurada (VITE_GEMINI_API_KEY)." }]);
      setIsAiLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const conversationHistory = aiMessages
        .slice(1) // Exclui a mensagem de boas-vindas inicial para otimizar contexto
        .map(msg => `${msg.role === 'user' ? 'Terapeuta' : 'Copiloto de IA'}: ${msg.content}`)
        .join("\n\n");
      
      const prompt = `Você é o Copiloto de IA do psicólogo na plataforma SimplePsi.
      Você tem acesso à seguinte transcrição de atendimento clínico:
      ---
      "${transcriptText}"
      ---

      Abordagem teórica ativa do psicólogo: ${approachInfo.name}

      Histórico de perguntas e análises feitas anteriormente nesta tela:
      ${conversationHistory}

      Pergunta/Instrução atual do terapeuta:
      "${userMessage}"

      Aja como um assistente de inteligência artificial prestativo e profissional (estilo o Gemini padrão). Se o usuário der uma instrução direta (como "escreva o relato no estilo TCC", "resuma", "analise" ou "reescreva tal parte"), execute a instrução exatamente como pedido, focando estritamente no conteúdo e na abordagem.
      REGRA DE OURO 1: Vá direto ao ponto. Não adicione introduções burocráticas (como "Aqui está a análise...") ou assinaturas/rodapés repetitivos (como "Observação do Copiloto:" ou "Nota da IA"). Retorne diretamente a resposta limpa e útil.
      REGRA DE OURO 2: NÃO utilize nenhum tipo de negrito ou itálico com asteriscos (como **texto** ou ***texto***). O texto deve ser inteiramente livre de caracteres asteriscos extras.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "Não foi possível gerar uma resposta.";
      setAiMessages(prev => [...prev, { role: 'model', content: responseText }]);
      setInteractionCount(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      setAiMessages(prev => [...prev, { role: 'model', content: `Erro ao gerar resposta da IA: ${err.message}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado para a área de transferência!");
  };

  const applyAsEvolution = (text: string) => {
    setTranscriptText(text);
    setActiveLeftTab('transcript');
    alert("Texto aplicado diretamente no prontuário!");
  };

  const mergeToEvolution = (text: string) => {
    setTranscriptText(prev => prev ? `${prev}\n\n---\nAdicionado via Copiloto de IA:\n${text}` : text);
    setActiveLeftTab('transcript');
    alert("Texto mesclado ao final do prontuário!");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 animate-in fade-in-50 duration-300"
    >
      {/* Inputs ocultos para ponte com a Extensão Chrome */}
      <input type="hidden" id="simplepsi-pending-transcript-input" defaultValue="" />
      <input type="hidden" id="simplepsi-pending-patient-id-input" defaultValue="" />
      <button id="simplepsi-trigger-import" style={{ display: 'none' }} onClick={handleImportTriggered} />

      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 rounded-xl bg-surface-muted hover:opacity-80 text-text-muted transition-all cursor-pointer">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold uppercase text-text-main">
            📥 Importar Transcrição do Google Meet
          </h2>
          <p className="text-xs text-text-muted mt-0.5">Vincule a chamada capturada ao prontuário de um paciente</p>
        </div>
      </div>

      {isTranscriptionDisabled && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-600 dark:text-amber-400 text-xs font-semibold">
          <Lock size={18} className="shrink-0 text-amber-500" />
          <span>O recurso de inteligência artificial para transcrição de sessões foi desativado pela clínica nas configurações administrativas.</span>
        </div>
      )}

      {/* Banner Extensão Oficial do Google Meet */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Chrome size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-main">
              Extensão Oficial Google Meet
            </h4>
            <p className="text-[11px] text-text-muted">
              Envie a transcrição da sua sessão online diretamente para esta tela com 1 clique.
            </p>
            <p className="text-[9.5px] text-primary/90 mt-0.5 font-medium">
              ⭐ * Lembrete: A legenda em Português no Google Meet deve permanecer ativada durante a chamada.
            </p>
          </div>
        </div>
        {onOpenExtensionModal && (
          <button
            type="button"
            onClick={onOpenExtensionModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-primary text-white hover:opacity-90 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
          >
            <Chrome size={13} />
            Ver Extensão / Reinstalar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Esquerdo: Editor / Copiloto de IA */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="glass-card rounded-[32px] border border-white/5 bg-white/5 p-6 flex flex-col flex-1 min-h-[500px]">
            
            {/* Seletor de Abas Esquerdo */}
            <div className="flex border-b border-white/5 mb-4">
              <button
                onClick={() => setActiveLeftTab('transcript')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                  activeLeftTab === 'transcript'
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main"
                )}
              >
                <FileText size={14} /> Transcrição Bruta
              </button>
              <button
                onClick={() => setActiveLeftTab('ai')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                  activeLeftTab === 'ai'
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main"
                )}
              >
                <Sparkles size={14} /> Copiloto de IA
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full lowercase tracking-normal font-bold",
                  "bg-primary/20 text-primary"
                )}>
                  {interactionCount}/∞
                </span>
              </button>
            </div>

            {/* ABA 1: Editor de Texto */}
            {activeLeftTab === 'transcript' && (
              <div className="flex-1 flex flex-col">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Falas Capturadas na Sessão</h4>
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  className="w-full flex-1 bg-surface-muted/50 border border-border-ui rounded-2xl p-4 text-xs leading-relaxed text-text-main font-mono outline-none resize-none focus:border-primary/50 transition-all focus:ring-1 focus:ring-primary/20 min-h-[300px]"
                  placeholder="Cole a transcrição bruta da sessão aqui ou edite-a livremente..."
                />
                {!transcriptText && (
                  <p className="text-[10px] text-text-muted mt-2 pl-1 animate-pulse">
                    💡 Aguardando dados da extensão... Cole a transcrição da sessão manualmente ou envie os dados capturados pela extensão do Google Meet.
                  </p>
                )}
              </div>
            )}

            {/* ABA 2: Copiloto de IA */}
            {activeLeftTab === 'ai' && (
              <div className="flex-1 flex flex-col min-h-[450px]">
                
                {/* Badge de interações */}
                <div className={cn(
                  "p-3 rounded-2xl mb-4 text-xs font-medium flex items-center justify-between transition-all duration-300",
                  "bg-primary/5 border border-primary/20 text-primary"
                )}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="animate-pulse" />
                    <span>
                      Uso do Copiloto: {interactionCount} interações utilizadas (Acesso Ilimitado)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase">
                    Ilimitado
                  </span>
                </div>

                {/* Ações Rápidas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <button
                    onClick={() => handleAiAction('relato')}
                    disabled={isAiLoading || !transcriptText.trim()}
                    className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl border border-white/5 bg-white/5 text-[11px] font-bold text-text-main uppercase hover:bg-primary/10 hover:border-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <span>📝 Relato da Sessão</span>
                  </button>
                  <button
                    onClick={() => handleAiAction('proxima_sessao')}
                    disabled={isAiLoading || !transcriptText.trim()}
                    className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl border border-white/5 bg-white/5 text-[11px] font-bold text-text-main uppercase hover:bg-primary/10 hover:border-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span>📅 Próxima Sessão</span>
                  </button>
                  <button
                    onClick={() => handleAiAction('supervisao')}
                    disabled={isAiLoading || !transcriptText.trim()}
                    className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl border border-white/5 bg-white/5 text-[11px] font-bold text-text-main uppercase hover:bg-primary/10 hover:border-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span>🎓 Supervisão Clínica</span>
                  </button>
                </div>

                {/* Histórico do Chat */}
                <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] border border-white/5 bg-surface-muted/20 rounded-2xl p-4 flex flex-col mb-4">
                  {aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap shadow-sm transition-all flex flex-col gap-2.5",
                        msg.role === 'user'
                          ? "bg-primary text-white self-end rounded-tr-none text-left"
                          : "bg-surface-muted border border-border-ui text-text-main self-start rounded-tl-none text-left"
                      )}
                    >
                      {msg.role === 'user' ? (
                        <span>{msg.content}</span>
                      ) : (
                        <div className="markdown-content text-xs leading-relaxed text-left">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                      
                      {/* Controles para respostas da IA */}
                      {msg.role === 'model' && idx > 0 && (
                        <div className="flex items-center gap-3 pt-2 border-t border-border-ui/40 text-[9px] font-bold uppercase tracking-wider text-text-muted">
                          <button 
                            onClick={() => copyToClipboard(msg.content)} 
                            className="flex items-center gap-1 hover:text-text-main transition-colors"
                          >
                            <Copy size={11} /> Copiar
                          </button>
                          <button 
                            onClick={() => applyAsEvolution(msg.content)} 
                            className="flex items-center gap-1 hover:text-primary transition-colors text-primary"
                          >
                            <Plus size={11} /> Usar no Prontuário
                          </button>
                          <button 
                            onClick={() => mergeToEvolution(msg.content)} 
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                          >
                            <Plus size={11} /> Mesclar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Indicador de carregamento */}
                  {isAiLoading && (
                    <div className="flex items-center gap-1.5 bg-surface-muted border border-border-ui rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] self-start text-xs text-text-muted shadow-sm">
                      <span>IA está analisando a sessão</span>
                      <span className="flex gap-0.5 ml-1 items-center">
                        <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input de Chat */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={hasReachedLimit ? "Limite atingido." : "Pergunte algo sobre a transcrição..."}
                    disabled={isAiLoading || hasReachedLimit || !transcriptText.trim()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendCustomMessage();
                    }}
                    className="flex-1 bg-surface-muted border border-border-ui rounded-2xl py-2.5 px-4 text-xs font-bold text-text-main outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-text-muted/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleSendCustomMessage}
                    disabled={isAiLoading || hasReachedLimit || !aiInput.trim() || !transcriptText.trim()}
                    className="p-2.5 rounded-2xl bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Send size={15} />
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Lado Direito: Controles de Vínculo */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card rounded-[32px] border border-white/5 bg-white/5 p-6 space-y-6">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Informações do Registro</h4>

            {selectedPatientId && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-primary">
                <span className="text-lg">📈</span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Próximo Registro</span>
                  <span className="text-xs font-bold text-text-main">Sessão nº {nextSessionNum} ({approachInfo.name})</span>
                </div>
              </div>
            )}

            {/* 1. Selecionar Paciente */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Paciente Vinculado</label>
              
              {!selectedPatientId ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-text-muted" size={16} />
                    <input 
                      type="text"
                      placeholder="Pesquise o nome do paciente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-muted/50 border border-border-ui rounded-2xl py-2 px-10 text-xs font-bold text-text-main outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-text-muted/40 transition-all"
                    />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto border border-border-ui rounded-2xl divide-y divide-border-ui bg-surface-muted/20">
                    {filteredList.length > 0 ? (
                      filteredList.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPatientId(p.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-muted text-xs font-bold text-text-main uppercase transition-all flex items-center justify-between"
                        >
                          <span>{p.name}</span>
                          <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">Ativo</span>
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-xs text-text-muted italic text-center">Nenhum paciente ativo encontrado.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/25 rounded-2xl">
                  <div>
                    <p className="text-xs font-bold text-text-main uppercase">{selectedPatient?.name}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-tight">{selectedPatient?.modality} • {selectedPatient?.recurrence}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPatientId('')}
                    className="text-[10px] font-bold text-red-500 hover:underline uppercase"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>

            {/* 2. Detalhes de Agendamento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-surface-muted/50 border border-border-ui">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Data do Atendimento</span>
                <input 
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="text-xs font-bold text-text-main bg-transparent outline-none mt-1 cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-surface-muted/50 border border-border-ui">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Horário da Sessão</span>
                <input 
                  type="time"
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                  className="text-xs font-bold text-text-main bg-transparent outline-none mt-1"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <button
                onClick={() => {
                  if (!selectedPatientId) {
                    alert("Por favor, selecione um paciente para vincular.");
                    return;
                  }
                  if (!transcriptText.trim()) {
                    alert("A transcrição está vazia.");
                    return;
                  }
                  const type = (selectedPatient?.modality === 'Presencial' ? 'Presencial' : 'Online');
                  const amount = selectedPatient?.amount || selectedPatient?.sessionAmount || 180;
                  onSaveSession(selectedPatientId, sessionDate, sessionTime, sessionDuration, String(amount), type, transcriptText);
                }}
                disabled={!selectedPatientId || !transcriptText.trim()}
                className="w-full bg-primary text-white py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                💾 Salvar Relato & Criar Evolução
              </button>
              <button
                onClick={() => {
                  if (confirm("Deseja mesmo descartar esta transcrição?")) {
                    onCancel();
                  }
                }}
                className="w-full bg-surface-muted text-text-muted hover:text-red-500 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Descartar Transcrição
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
