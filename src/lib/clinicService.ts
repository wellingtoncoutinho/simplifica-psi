import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Clinic, 
  ClinicMember, 
  ClinicTheme, 
  ClinicSettings, 
  ClinicUserRole,
  Session,
  SupervisionFeedback,
  ClinicCrmLead,
  ClinicCrmStage
} from '../types';

// Mock de membros de demonstração padrão para o piloto
export const DEFAULT_DEMO_MEMBERS: ClinicMember[] = [
  {
    id: 'simplepsi.app@gmail.com',
    email: 'simplepsi.app@gmail.com',
    name: 'Gestor SimplePsi Clínicas (Admin)',
    role: 'clinic_admin',
    status: 'active',
    clinicId: 'reinventar',
    phone: '(11) 99999-0001',
    joinedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'paula.psi@reinventar.com',
    email: 'paula.psi@reinventar.com',
    name: 'Dra. Paula Silva',
    role: 'psychologist',
    status: 'active',
    clinicId: 'reinventar',
    crp: '06/142981',
    phone: '(11) 98888-1111',
    supervisorId: 'marcos.supervisao@reinventar.com',
    commissionRate: 60,
    joinedAt: '2026-01-10T00:00:00.000Z'
  },
  {
    id: 'ricardo.psi@reinventar.com',
    email: 'ricardo.psi@reinventar.com',
    name: 'Dr. Ricardo Mendes',
    role: 'psychologist',
    status: 'active',
    clinicId: 'reinventar',
    crp: '06/189234',
    phone: '(11) 97777-2222',
    commissionRate: 50,
    joinedAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'marcos.supervisao@reinventar.com',
    email: 'marcos.supervisao@reinventar.com',
    name: 'Dr. Marcos Souza',
    role: 'supervisor',
    status: 'active',
    clinicId: 'reinventar',
    crp: '06/054120',
    phone: '(11) 96666-3333',
    joinedAt: '2026-01-05T00:00:00.000Z'
  },
  {
    id: 'juliana.recepcao@reinventar.com',
    email: 'juliana.recepcao@reinventar.com',
    name: 'Juliana Rocha (Recepção & Agendamentos)',
    role: 'receptionist',
    status: 'active',
    clinicId: 'reinventar',
    phone: '(11) 95555-4444',
    joinedAt: '2026-01-12T00:00:00.000Z'
  }
];

// Mock de fallback para demonstração imediata do piloto
export const DEMO_PILOT_CLINIC: Clinic = {
  id: 'reinventar',
  slug: 'reinventar',
  name: 'Clínica Reinventar',
  ownerEmail: 'simplepsi.app@gmail.com',
  maxSeats: 7, // 7 vagas exclusivas para psicólogos
  activeSeats: 2,
  theme: {
    primaryColor: '#4F46E5',      // Indigo moderno
    secondaryColor: '#059669',    // Esmeralda / Verde acolhedor
    accentColor: '#818CF8',
    logoUrl: ''                   // Se vazio, usa ícone/monograma estilizado
  },
  settings: {
    allowPsychologistManageAgenda: true,
    allowPsychologistSetPrice: true,
    allowSupervision: true,
    defaultSessionDuration: 50,
    defaultCommissionRate: 60,
    rooms: ['Sala 01 - Presencial', 'Sala 02 - Terapia Infantil', 'Sala 03 - Atendimento Online']
  },
  createdAt: new Date().toISOString()
};

// Gera sessões de demonstração diária multiprofissional para a data atual
export function getDemoClinicSessions(targetDateStr?: string): Session[] {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
  
  return [
    {
      id: 'demo_session_1',
      clinicId: 'reinventar',
      psychologistId: 'paula.psi@reinventar.com',
      psychologistName: 'Dra. Paula Silva',
      patientId: 'pat_ana_clara',
      patientName: 'Ana Clara Albuquerque',
      date: dateStr,
      time: '09:00',
      duration: '50min',
      type: 'Presencial',
      room: 'Sala 01 - Presencial',
      status: 'Confirmada',
      amount: 180,
      paid: true,
      notes: 'Sessão semanal - TCC'
    },
    {
      id: 'demo_session_2',
      clinicId: 'reinventar',
      psychologistId: 'ricardo.psi@reinventar.com',
      psychologistName: 'Dr. Ricardo Mendes',
      patientId: 'pat_marcos_aurelio',
      patientName: 'Marcos Aurélio Santos',
      date: dateStr,
      time: '09:00',
      duration: '50min',
      type: 'Presencial',
      room: 'Sala 02 - Terapia Infantil',
      status: 'Confirmada',
      amount: 200,
      paid: true,
      notes: 'Atendimento presencial'
    },
    {
      id: 'demo_session_3',
      clinicId: 'reinventar',
      psychologistId: 'paula.psi@reinventar.com',
      psychologistName: 'Dra. Paula Silva',
      patientId: 'pat_lucas_fernandes',
      patientName: 'Lucas Fernandes Costa',
      date: dateStr,
      time: '10:00',
      duration: '50min',
      type: 'Online',
      room: 'Sala 03 - Atendimento Online',
      status: 'Agendada',
      amount: 180,
      paid: false,
      notes: 'Google Meet'
    },
    {
      id: 'demo_session_4',
      clinicId: 'reinventar',
      psychologistId: 'ricardo.psi@reinventar.com',
      psychologistName: 'Dr. Ricardo Mendes',
      patientId: 'pat_mariana_lima',
      patientName: 'Mariana Lima Rocha',
      date: dateStr,
      time: '11:00',
      duration: '50min',
      type: 'Presencial',
      room: 'Sala 01 - Presencial',
      status: 'Agendada',
      amount: 220,
      paid: false,
      notes: 'Primeira consulta de avaliação'
    },
    {
      id: 'demo_session_5',
      clinicId: 'reinventar',
      psychologistId: 'paula.psi@reinventar.com',
      psychologistName: 'Dra. Paula Silva',
      patientId: 'pat_gabriel_souza',
      patientName: 'Gabriel Souza Martins',
      date: dateStr,
      time: '14:00',
      duration: '50min',
      type: 'Presencial',
      room: 'Sala 01 - Presencial',
      status: 'Agendada',
      amount: 180,
      paid: true,
      notes: 'Sessão quinzenal'
    },
    {
      id: 'demo_session_6',
      clinicId: 'reinventar',
      psychologistId: 'ricardo.psi@reinventar.com',
      psychologistName: 'Dr. Ricardo Mendes',
      patientId: 'pat_beatriz_duarte',
      patientName: 'Beatriz Duarte de Oliveira',
      date: dateStr,
      time: '15:00',
      duration: '50min',
      type: 'Online',
      room: 'Sala 03 - Atendimento Online',
      status: 'Agendada',
      amount: 200,
      paid: false,
      notes: 'Teleconsulta'
    }
  ];
}

/**
 * Detecta o slug da clínica a partir da URL:
 * 1. Query parameter: ?clinic=reinventar (fácil para testes locais e em produção)
 * 2. Subdomínio: reinventar.simplepsi.com ou reinventar.localhost
 */
export function detectCurrentClinicSlug(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Prioridade para Query Param (?clinic=reinventar)
  const urlParams = new URLSearchParams(window.location.search);
  const clinicParam = urlParams.get('clinic');
  if (clinicParam) {
    return clinicParam.toLowerCase().trim();
  }

  // 2. Subdomínio
  const hostname = window.location.hostname.toLowerCase();
  
  // Ignora domínios padrão
  if (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === 'simplepsi.com' || 
    hostname === 'app.simplepsi.com' ||
    hostname === 'www.simplepsi.com' ||
    hostname.endsWith('.web.app') ||
    hostname.endsWith('.firebaseapp.com')
  ) {
    return null;
  }

  // Se tiver subdomínio (ex: reinventar.simplepsi.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain !== 'app' && subdomain !== 'www' && subdomain !== 'dev') {
      return subdomain;
    }
  }

  return null;
}

function adjustHexBrightness(hex: string, percent: number): string {
  try {
    const cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length !== 6 && cleanHex.length !== 3) return hex;
    const fullHex = cleanHex.length === 3 
      ? cleanHex.split('').map(c => c + c).join('') 
      : cleanHex;
    const num = parseInt(fullHex, 16);
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch (e) {
    return hex;
  }
}

/**
 * Aplica as variáveis CSS dinamicamente para colorir a plataforma com as cores da clínica,
 * injetando tags de estilo com !important para garantir sobreposição no Tailwind e body.light.
 */
export function applyClinicTheme(theme?: ClinicTheme) {
  if (typeof document === 'undefined') return;

  const styleId = 'simplepsi-clinic-theme-override';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!theme || !theme.primaryColor) {
    if (styleEl) styleEl.remove();
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-primary-dark');
    document.documentElement.style.removeProperty('--color-secondary');
    document.documentElement.style.removeProperty('--color-accent');
    document.body.style.removeProperty('--color-primary');
    document.body.style.removeProperty('--color-primary-dark');
    document.body.style.removeProperty('--color-secondary');
    document.body.style.removeProperty('--color-accent');
    return;
  }

  const primary = theme.primaryColor;
  const primaryDark = theme.accentColor || adjustHexBrightness(primary, -15);
  const secondary = theme.secondaryColor || primary;
  const accent = theme.accentColor || secondary;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Injeção de estilo com alta especificidade para Tailwind e temas claro/escuro
  styleEl.innerHTML = `
    :root, body, body.light, body.dark {
      --color-primary: ${primary} !important;
      --color-primary-dark: ${primaryDark} !important;
      --color-secondary: ${secondary} !important;
      --color-accent: ${accent} !important;
    }
    .bg-primary { background-color: ${primary} !important; }
    .text-primary { color: ${primary} !important; }
    .border-primary { border-color: ${primary} !important; }
    .bg-secondary { background-color: ${secondary} !important; }
    .text-secondary { color: ${secondary} !important; }
    .border-secondary { border-color: ${secondary} !important; }
  `;

  document.documentElement.style.setProperty('--color-primary', primary);
  document.documentElement.style.setProperty('--color-primary-dark', primaryDark);
  document.documentElement.style.setProperty('--color-secondary', secondary);
  document.documentElement.style.setProperty('--color-accent', accent);

  document.body.style.setProperty('--color-primary', primary);
  document.body.style.setProperty('--color-primary-dark', primaryDark);
  document.body.style.setProperty('--color-secondary', secondary);
  document.body.style.setProperty('--color-accent', accent);
}

/**
 * Carrega a lista de sessões da clínica com persistência no LocalStorage
 */
export function getClinicSessions(clinicId: string, targetDateStr?: string): Session[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`simplepsi_clinic_sessions_${clinicId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
  }
  const defaults = getDemoClinicSessions(targetDateStr);
  saveClinicSessions(clinicId, defaults);
  return defaults;
}

/**
 * Salva as sessões da clínica no LocalStorage
 */
export function saveClinicSessions(clinicId: string, sessions: Session[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`simplepsi_clinic_sessions_${clinicId}`, JSON.stringify(sessions));
    } catch (e) {}
  }
}

/**
 * Adiciona ou atualiza uma sessão na agenda da clínica e persiste localmente
 */
export function addOrUpdateClinicSession(clinicId: string, session: Session): Session[] {
  const current = getClinicSessions(clinicId);
  const exists = current.some(s => s.id === session.id);
  const updated = exists 
    ? current.map(s => s.id === session.id ? session : s)
    : [session, ...current];
  saveClinicSessions(clinicId, updated);
  return updated;
}

/**
 * Remove uma sessão da agenda da clínica e persiste localmente
 */
export function deleteClinicSession(clinicId: string, sessionId: string): Session[] {
  const current = getClinicSessions(clinicId);
  const updated = current.filter(s => s.id !== sessionId);
  saveClinicSessions(clinicId, updated);
  return updated;
}

/**
 * Busca os dados de uma clínica no Firestore com fallback prioritário para o LocalStorage
 */
export async function getClinicBySlug(slug: string): Promise<Clinic | null> {
  let localData: Clinic | null = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`simplepsi_clinic_custom_${slug}`);
      if (stored) {
        localData = JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
  }

  try {
    const docRef = doc(db, 'clinics', slug);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const remoteData = { id: snap.id, ...snap.data() } as Clinic;
      return localData ? { ...remoteData, ...localData } : remoteData;
    }

    if (slug === 'reinventar') {
      return localData ? { ...DEMO_PILOT_CLINIC, ...localData } : DEMO_PILOT_CLINIC;
    }

    return localData;
  } catch (err) {
    console.warn('Erro ao buscar dados da clínica no Firestore, usando fallback local:', err);
    if (localData) return localData;
    if (slug === 'reinventar') return DEMO_PILOT_CLINIC;
    return null;
  }
}

/**
 * Salva ou atualiza os dados da clínica no LocalStorage e sincroniza com Firestore
 */
export async function saveClinic(clinic: Clinic): Promise<void> {
  const updatedData: Clinic = {
    ...clinic,
    updatedAt: new Date().toISOString()
  };

  // 1. Salva imediatamente no LocalStorage para persistência no ambiente de teste/piloto
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`simplepsi_clinic_custom_${clinic.slug}`, JSON.stringify(updatedData));
      if (clinic.id && clinic.id !== clinic.slug) {
        localStorage.setItem(`simplepsi_clinic_custom_${clinic.id}`, JSON.stringify(updatedData));
      }
    } catch (e) {
      console.warn('Erro ao salvar clínica localmente:', e);
    }
  }

  // 2. Tenta sincronizar com o Firestore em background de forma segura
  try {
    const docRef = doc(db, 'clinics', clinic.slug);
    await setDoc(docRef, updatedData, { merge: true });
  } catch (err) {
    console.warn('Sincronização remota Firestore não disponível/sem permissão, dados salvos localmente com sucesso:', err);
  }
}

/**
 * Helper para carregar membros salvos localmente
 */
function getLocalClinicMembers(clinicId: string): ClinicMember[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`simplepsi_clinic_members_${clinicId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
  }
  return clinicId === 'reinventar' ? DEFAULT_DEMO_MEMBERS : [];
}

/**
 * Helper para salvar membros localmente
 */
function saveLocalClinicMembers(clinicId: string, members: ClinicMember[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`simplepsi_clinic_members_${clinicId}`, JSON.stringify(members));
    } catch (e) {}
  }
}

/**
 * Escuta em tempo real os membros de uma clínica com suporte a cache local
 */
export function subscribeClinicMembers(
  clinicId: string, 
  onUpdate: (members: ClinicMember[]) => void
) {
  // Retorna os membros locais imediatamente
  const localMembers = getLocalClinicMembers(clinicId);
  onUpdate(localMembers);

  try {
    const membersRef = collection(db, `clinics/${clinicId}/members`);
    return onSnapshot(membersRef, (snapshot) => {
      if (snapshot.empty) {
        onUpdate(localMembers);
        return;
      }

      const remoteMembers = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as ClinicMember[];
      
      const merged = remoteMembers.length > 0 ? remoteMembers : localMembers;
      saveLocalClinicMembers(clinicId, merged);
      onUpdate(merged);
    }, (err) => {
      console.warn('Erro ao escutar membros no Firestore, mantendo membros locais:', err);
      onUpdate(localMembers);
    });
  } catch (err) {
    console.warn('Erro ao inicializar listener de membros:', err);
    return () => {};
  }
}

/**
 * Adiciona/Convida um novo membro para a clínica com persistência local garantida
 */
export async function inviteClinicMember(
  clinicId: string,
  data: {
    email: string;
    role: ClinicUserRole;
    name?: string;
    crp?: string;
    phone?: string;
    supervisorId?: string;
  }
): Promise<void> {
  const emailKey = data.email.toLowerCase().trim();

  const member: ClinicMember = {
    id: emailKey,
    email: emailKey,
    name: data.name || '',
    role: data.role,
    status: 'active',
    clinicId,
    crp: data.crp || '',
    phone: data.phone || '',
    supervisorId: data.supervisorId || '',
    invitedAt: new Date().toISOString(),
    joinedAt: new Date().toISOString()
  };

  // 1. Atualiza cache local
  const currentMembers = getLocalClinicMembers(clinicId);
  const updated = currentMembers.filter(m => m.email.toLowerCase() !== emailKey);
  updated.push(member);
  saveLocalClinicMembers(clinicId, updated);

  // 2. Tenta Firestore de forma segura
  try {
    const memberDocRef = doc(db, `clinics/${clinicId}/members`, emailKey);
    await setDoc(memberDocRef, member, { merge: true });
  } catch (err) {
    console.warn('Aviso: membro salvo no cache local, erro no Firestore:', err);
  }
}

/**
 * Remove/Desvincula um membro da clínica com persistência local garantida
 */
export async function removeClinicMember(clinicId: string, email: string): Promise<void> {
  const emailKey = email.toLowerCase().trim();

  // 1. Atualiza cache local
  const currentMembers = getLocalClinicMembers(clinicId);
  const updated = currentMembers.filter(m => m.email.toLowerCase() !== emailKey);
  saveLocalClinicMembers(clinicId, updated);

  // 2. Tenta Firestore
  try {
    const memberDocRef = doc(db, `clinics/${clinicId}/members`, emailKey);
    await deleteDoc(memberDocRef);
  } catch (err) {
    console.warn('Aviso: membro removido do cache local, erro no Firestore:', err);
  }
}

// ==========================================
// SUPERVISÃO CLÍNICA - ARQUIVAMENTO / CONCLUSÃO
// ==========================================

export function getDiscussedSupervisionCases(clinicId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`simplepsi_supervision_discussed_${clinicId}`);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

export function toggleDiscussedSupervisionCase(
  clinicId: string, 
  caseId: string, 
  markAsDiscussed?: boolean
): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getDiscussedSupervisionCases(clinicId);
    let updated: string[];
    if (markAsDiscussed === undefined) {
      updated = current.includes(caseId) ? current.filter(id => id !== caseId) : [...current, caseId];
    } else if (markAsDiscussed) {
      updated = current.includes(caseId) ? current : [...current, caseId];
    } else {
      updated = current.filter(id => id !== caseId);
    }
    localStorage.setItem(`simplepsi_supervision_discussed_${clinicId}`, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

// ==========================================
// CRM DA RECEPÇÃO & PIPELINE DE ATENDIMENTO
// ==========================================

export const DEFAULT_DEMO_CRM_LEADS: ClinicCrmLead[] = [
  {
    id: 'lead_1',
    clinicId: 'reinventar',
    name: 'Beatriz Lima Mendonça',
    phone: '(11) 98123-4567',
    email: 'beatriz.mendonca@gmail.com',
    complaint: 'Crises de ansiedade recorrentes no trabalho e insônia.',
    stage: 'contacted',
    notes: 'Procurou via WhatsApp após indicação de colega.',
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z'
  },
  {
    id: 'lead_2',
    clinicId: 'reinventar',
    name: 'Rafael Nunes Ferreira',
    phone: '(11) 97654-3210',
    email: 'rafael.nunes@empresa.com.br',
    complaint: 'Dificuldade de adaptação após divórcio e luto recente.',
    stage: 'triage',
    assignedPsychologistId: 'ricardo.psi@reinventar.com',
    assignedPsychologistName: 'Dr. Ricardo Mendes',
    notes: 'Preferência por abordagem psicanalítica e atendimento presencial.',
    createdAt: '2026-09-03T14:30:00.000Z',
    updatedAt: '2026-09-04T09:15:00.000Z'
  },
  {
    id: 'lead_3',
    clinicId: 'reinventar',
    name: 'Camila Rodrigues Alves',
    phone: '(11) 99876-5432',
    email: 'camila.alves@hotmail.com',
    complaint: 'Fobia social e sintomas de pânico em ambientes fechados.',
    stage: 'scheduled',
    assignedPsychologistId: 'paula.psi@reinventar.com',
    assignedPsychologistName: 'Dra. Paula Silva',
    scheduledDate: '2026-09-08',
    scheduledTime: '14:00',
    sessionRoom: 'Sala 01 - Presencial',
    amount: 180,
    paymentStatus: 'pending',
    paymentMethod: 'pix',
    notes: 'Primeira consulta agendada para terça-feira às 14h.',
    createdAt: '2026-09-02T11:00:00.000Z',
    updatedAt: '2026-09-04T11:20:00.000Z'
  },
  {
    id: 'lead_4',
    clinicId: 'reinventar',
    name: 'Thiago Barreto Moreira',
    phone: '(11) 98321-9988',
    email: 'thiago.moreira@outlook.com',
    complaint: 'TDAH adulto e desorganização da rotina profissional.',
    stage: 'paid',
    assignedPsychologistId: 'paula.psi@reinventar.com',
    assignedPsychologistName: 'Dra. Paula Silva',
    scheduledDate: '2026-09-05',
    scheduledTime: '16:00',
    sessionRoom: 'Sala 01 - Presencial',
    amount: 180,
    paymentStatus: 'paid',
    paymentMethod: 'pix',
    notes: 'Pix recebido e comprovante validado pela recepção.',
    createdAt: '2026-09-01T15:00:00.000Z',
    updatedAt: '2026-09-04T12:00:00.000Z'
  },
  {
    id: 'lead_5',
    clinicId: 'reinventar',
    name: 'Julio Cesar Siqueira',
    phone: '(11) 99112-3344',
    email: 'julio.siqueira@gmail.com',
    complaint: 'Conflitos conjugais e transição de carreira.',
    stage: 'completed',
    assignedPsychologistId: 'ricardo.psi@reinventar.com',
    assignedPsychologistName: 'Dr. Ricardo Mendes',
    scheduledDate: '2026-09-04',
    scheduledTime: '10:00',
    sessionRoom: 'Sala 02 - Terapia Infantil',
    amount: 200,
    paymentStatus: 'paid',
    paymentMethod: 'cartao',
    notes: 'Sessão inicial realizada com sucesso.',
    createdAt: '2026-08-28T09:00:00.000Z',
    updatedAt: '2026-09-04T10:50:00.000Z'
  },
  {
    id: 'lead_6',
    clinicId: 'reinventar',
    name: 'Larissa Albuquerque Ramos',
    phone: '(11) 97234-8899',
    email: 'larissa.ramos@gmail.com',
    complaint: 'Acompanhamento psicológico continuado.',
    stage: 'receipt_issued',
    assignedPsychologistId: 'paula.psi@reinventar.com',
    assignedPsychologistName: 'Dra. Paula Silva',
    scheduledDate: '2026-09-02',
    scheduledTime: '11:00',
    amount: 180,
    paymentStatus: 'paid',
    paymentMethod: 'pix',
    receiptIssued: true,
    receiptNumber: 'REC-2026-089',
    notes: 'Recibo emitido e enviado em PDF via WhatsApp.',
    createdAt: '2026-08-25T14:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z'
  }
];

export function getClinicCrmLeads(clinicId: string): ClinicCrmLead[] {
  if (typeof window === 'undefined') return DEFAULT_DEMO_CRM_LEADS;
  try {
    const stored = localStorage.getItem(`simplepsi_clinic_crm_${clinicId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return DEFAULT_DEMO_CRM_LEADS;
}

export function saveClinicCrmLead(clinicId: string, lead: ClinicCrmLead): ClinicCrmLead[] {
  const leads = getClinicCrmLeads(clinicId);
  const index = leads.findIndex(l => l.id === lead.id);
  let updated: ClinicCrmLead[];
  
  if (index >= 0) {
    updated = [...leads];
    updated[index] = { ...lead, updatedAt: new Date().toISOString() };
  } else {
    updated = [lead, ...leads];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(`simplepsi_clinic_crm_${clinicId}`, JSON.stringify(updated));
  }
  return updated;
}

export function updateClinicCrmLeadStage(
  clinicId: string, 
  leadId: string, 
  stage: ClinicCrmStage,
  extraData?: Partial<ClinicCrmLead>
): ClinicCrmLead[] {
  const leads = getClinicCrmLeads(clinicId);
  const updated = leads.map(l => {
    if (l.id === leadId) {
      return {
        ...l,
        stage,
        ...extraData,
        updatedAt: new Date().toISOString()
      };
    }
    return l;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(`simplepsi_clinic_crm_${clinicId}`, JSON.stringify(updated));
  }
  return updated;
}

export function deleteClinicCrmLead(clinicId: string, leadId: string): ClinicCrmLead[] {
  const leads = getClinicCrmLeads(clinicId);
  const updated = leads.filter(l => l.id !== leadId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(`simplepsi_clinic_crm_${clinicId}`, JSON.stringify(updated));
  }
  return updated;
}

// ==========================================
// SIMULAÇÃO DE PERFIS LOCAIS PARA TESTES
// ==========================================

const CLINIC_SIMULATED_USER_KEY = 'simplepsi_simulated_clinic_user';

export function getSimulatedClinicMember(clinicId: string): ClinicMember | null {
  try {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(`${CLINIC_SIMULATED_USER_KEY}_${clinicId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

export function setSimulatedClinicMember(clinicId: string, member: ClinicMember | null) {
  try {
    if (typeof window === 'undefined') return;
    if (member) {
      localStorage.setItem(`${CLINIC_SIMULATED_USER_KEY}_${clinicId}`, JSON.stringify(member));
    } else {
      localStorage.removeItem(`${CLINIC_SIMULATED_USER_KEY}_${clinicId}`);
    }
  } catch (e) {
    // Ignore error
  }
}
