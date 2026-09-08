export interface Patient {
  id: string;
  name: string;
  status: 'Ativo' | 'Inativo';
  sessions: number;
  lastSession?: string;
  email: string;
  phone: string;
  photo?: string;
  gender?: string;
  birthDate?: string;
  document?: string;
  cpf?: string;
  occupation?: string;
  profession?: string;
  address?: string;
  medication?: string; // Mantido por retrocompatibilidade, mas vamos focar em currentMedication no novo form
  emergencyContact?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  paymentNotes?: string;
  paymentPeriodicity?: 'Mensal' | 'Quinzenal' | 'Semanal' | 'Por Sessão';
  paymentValue?: number;
  paymentDay1?: number;
  paymentDay2?: number;
  paymentWeekday?: string;
  // Campos de Anamnese
  mainComplaint?: string;
  familyHistory?: string;
  lifeHistory?: string;
  currentMedication?: string;
  sessionDay?: string;
  sessionTime?: string;
  sessionAmount?: number;
  amount?: number;
  recurrence?: 'Semanal' | 'Quinzenal' | 'Mensal' | 'Nenhuma';
  recurrenceStart?: string;
  modality?: 'Online' | 'Presencial';
  meetingLink?: string;
  // Contrato Terapêutico
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractSignature?: string;
  contractSignedBy?: string;
  contractSignedDocument?: string;
  contractSignedText?: string;
  contractManualOverride?: boolean;
  contractManualNotes?: string;
  clinicId?: string;
  psychologistId?: string;
  psychologistName?: string;
  createdAt?: string;
  updatedAt?: string;
  clinicalData?: {
    evoluções?: Array<{
      id: string;
      date: string;
      time: string;
      sessionNumber: number;
      note: string;
    }>;
    smartNotes?: {
      padroes?: string;
      progresso?: string;
      sugestao?: string;
      topicos?: string[];
    };
    tccData?: {
      lifeHistory?: string;
      problemList?: string;
      diagnosisAndMeds?: string;
      isSplitByBelief?: boolean;
      unifiedFormulation?: TccFormulation;
      beliefFormulations?: Array<{
        id: string;
        title: string;
        formulation: TccFormulation;
      }>;
    };
    psicanaliseData?: {
      manifestDemand?: string;
      latentDemand?: string;
      defenses?: string;
      transference?: string;
      structuralPosition?: string;
    };
    psychoanalysisData?: {
      manifestDemand?: string;
      latentDemand?: string;
      defenses?: string;
      transference?: string;
      structuralPosition?: string;
    };
    gestaltData?: {
      figureAndGround?: string;
      contactCycleBlocks?: string;
      awarenessLevel?: string;
      supportSystem?: string;
    };
    actData?: {
      fusion?: string;
      experientialAvoidance?: string;
      values?: string;
      committedAction?: string;
    };
    humanistaData?: {
      existentialThemes?: string;
      phenomenologicalFocus?: string;
      selfCongruence?: string;
      therapeuticInsights?: string;
    };
    treatmentPlan?: Array<{
      id: string;
      goal: string;
      interventions?: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
    nextSessionPlan?: string;
  };
}

export interface TccFormulation {
  coreBelief?: string;
  intermediateBelief?: string;
  activatingSituations?: string;
  compensatoryStrategies?: string;
  goals?: string;
  strengths?: string;
  situations?: [TccSituation, TccSituation, TccSituation];
}

export interface TccSituation {
  situation?: string;
  automaticThought?: string;
  meaning?: string;
  emotion?: string;
  behavior?: string;
}

export interface Session {
  id: string;
  patientId: string;
  patientName?: string;
  date: string;
  time: string;
  duration: string;
  type: 'Presencial' | 'Online';
  status: 'Agendada' | 'Realizada' | 'Cancelada' | 'Confirmada' | 'Em Atendimento' | 'Desmarcou';
  recurrence?: 'Semanal' | 'Quinzenal' | 'Mensal' | 'Nenhuma';
  isTriage?: boolean;
  triageName?: string;
  googleEventId?: string;
  // Financial fields
  amount?: number;
  paid?: boolean;
  nfIssued?: boolean;
  cost?: number;
  // Clinic fields
  clinicId?: string;
  psychologistId?: string;
  psychologistName?: string;
  room?: string;
  notes?: string;
  clinicCommissionRate?: number;
  clinicCommissionPaid?: boolean;
}

export interface Transaction {
  id: string;
  patientId?: string;
  patientName?: string;
  description?: string;
  amount: number;
  date: string;
  status: 'Pago' | 'Aguardando' | 'Cancelada';
  type?: 'Receita' | 'Despesa';
  category?: string;
  nfIssued?: boolean;
  cost?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: 'session' | 'finance' | 'system';
  date: string;
  read: boolean;
}

export interface PatientPortal {
  patientId: string;
  ownerId: string;
  cpf: string;
  patientUid: string | null;
  tutorialCompleted: boolean;
  
  // Dados Cadastrais Públicos
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  profession: string;
  address: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;

  // Plano de Segurança
  safetyPlan?: {
    warningSigns: string;
    copingStrategies: string;
    distractingPeople: string;
    helpingPeople: string;
    professionals: string;
    safeEnvironment: string;
    reasonsToLive: string;
    updatedAt: string;
  };

  // PDFs Compartilhados
  sharedPDFs?: Array<{
    id: string;
    title: string;
    description: string;
    fileUrl: string;
    sharedAt: string;
  }>;

  // Contrato Terapêutico
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractSignature?: string;
  contractSignedBy?: string;
  contractSignedDocument?: string;
  contractSignedText?: string;
  contractManualOverride?: boolean;
  contractManualNotes?: string;

  // Módulos Clínicos & Monitoramento de Sintomas Personalizável
  clinicalModules?: ClinicalModulesConfig;

  updatedAt: string;
}

export type ClinicalModuleKey = 
  | 'general_diary'
  | 'toc'
  | 'panic'
  | 'depression'
  | 'anxiety'
  | 'sleep'
  | 'rpd'
  | 'habits';

export interface ClinicalModulesConfig {
  general_diary?: boolean;
  toc?: boolean;
  panic?: boolean;
  depression?: boolean;
  anxiety?: boolean;
  sleep?: boolean;
  rpd?: boolean;
  habits?: boolean;
  customHabits?: string[];
  updatedAt?: string;
}

export interface PdfLibraryItem {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  fileUrl: string;
  createdAt: string;
}

export interface DiaryEntryData {
  // Categoria do registro (episódio agudo vs evolução diária/pensamentos)
  entryCategory?: 'episode' | 'daily_evolution';

  // TOC
  trigger?: string;
  anxietyLevel?: number;
  compulsion?: string;
  resisted?: 'yes' | 'delayed' | 'no';
  delayMinutes?: number;
  dailyControlScore?: number; // Para evolução diária

  // Pânico & Agorafobia
  panicIntensity?: number;
  symptoms?: string[];
  copingUsed?: string;
  anticipatoryAnxiety?: number; // Ansiedade antecipatória do dia (0-10)
  exposureSituation?: string;   // Enfrentamento de situação desafiadora
  dailyVictories?: string;      // Vitórias/conquistas do dia
  generalThoughts?: string;     // Pensamentos e reflexões

  // Depressão / Ativação Comportamental
  activity?: string;
  pleasureLevel?: number;
  masteryLevel?: number;
  energyLevel?: number;

  // Ansiedade & Preocupações
  concern?: string;
  inControl?: boolean;
  actionPlan?: string;

  // Sono
  bedTime?: string;
  wakeTime?: string;
  sleepQuality?: number;
  awakenings?: number;

  // RPD (TCC)
  situation?: string;
  automaticThought?: string;
  emotion?: string;
  alternativeThought?: string;

  // Hábitos
  completedHabits?: string[];
}

export interface DiaryEntry {
  id: string;
  patientId: string;
  ownerId: string;
  date: string;
  mood: number;
  text: string;
  createdAt: string;
  moduleType?: ClinicalModuleKey;
  data?: DiaryEntryData;
}

// ==========================================
// MÓDULO MULTI-TENANT PARA CLÍNICAS (B2B)
// ==========================================

export type ClinicUserRole = 'clinic_admin' | 'psychologist' | 'supervisor' | 'receptionist';

export interface ClinicTheme {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  accentColor?: string;
}

export interface ClinicAiSettings {
  enabled?: boolean; // Habilitar IA globalmente para psicólogos afiliados
  allowTranscription?: boolean; // Transcrição de áudio e reuniões (Google Meet)
  allowConceptualization?: boolean; // Conceitualização Cognitiva (TCC) e Formulações por Abordagem
  allowTreatmentPlan?: boolean; // Planejamento do Plano de Tratamento e Próxima Sessão
  allowEvolutionAssistant?: boolean; // Assistente de Escrita de Evoluções e Smart Notes
  allowCfpDocuments?: boolean; // Emissão de Laudos e Prontuários CFP com IA
}

export interface ClinicSettings {
  allowPsychologistManageAgenda?: boolean;
  allowPsychologistSetPrice?: boolean;
  allowSupervision?: boolean;
  defaultSessionDuration?: number; // minutos
  rooms?: string[]; // Lista de salas disponíveis (ex: ["Sala 1 - Principal", "Sala 2 - Infantil"])
  defaultCommissionRate?: number; // Porcentagem padrão de repasse ao psicólogo (ex: 60%)
  aiSettings?: ClinicAiSettings;
}

export interface ClinicMember {
  id: string;
  email: string;
  name?: string;
  role: ClinicUserRole;
  status: 'active' | 'invited' | 'disabled';
  clinicId: string;
  crp?: string;
  phone?: string;
  supervisorId?: string; // ID do supervisor responsável caso seja supervisionado
  commissionRate?: number; // Taxa de repasse individual deste psicólogo (ex: 50% ou 70%). Se não definido, usa a padrão da clínica
  joinedAt?: string;
  invitedAt?: string;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string; // Ex: 'reinventar' para reinventar.simplepsi.com ou ?clinic=reinventar
  ownerEmail: string;
  maxSeats: number;
  activeSeats?: number;
  phone?: string;
  address?: string;
  theme?: ClinicTheme;
  settings?: ClinicSettings;
  createdAt: string;
  updatedAt?: string;
}

export interface SupervisionCase {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  psychologistId: string;
  psychologistName: string;
  psychologistEmail?: string;
  supervisorId?: string;
  supervisorName?: string;
  sessionNumber?: number;
  sessionDate?: string;
  evolutionNote: string; // Conteúdo selecionado/editado pelo psicólogo para a supervisão
  psychologistDoubts?: string; // Dúvidas ou impasses trazidos para discussão
  approach?: string;
  complaint?: string;
  needsReview?: boolean;
  feedback?: string;
  recommendations?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupervisionFeedback {
  id: string;
  supervisorId: string;
  supervisorName: string;
  patientId: string;
  patientName: string;
  psychologistId: string;
  psychologistName: string;
  feedback: string;
  recommendations?: string;
  status: 'pending' | 'reviewed';
  createdAt: string;
}

export type ClinicCrmStage = 
  | 'contacted'       // Entrou em contato / Novo lead
  | 'triage'          // Triagem & Encaminhamento
  | 'scheduled'       // 1ª Sessão agendada
  | 'paid'            // Pagamento confirmado
  | 'completed'       // Sessão realizada
  | 'receipt_issued'  // Recibo / Nota fiscal emitida
  | 'archived';       // Desistência / Arquivado

export interface ClinicCrmLead {
  id: string;
  clinicId: string;
  name: string;
  phone: string;
  email?: string;
  complaint?: string;
  stage: ClinicCrmStage;
  assignedPsychologistId?: string;
  assignedPsychologistName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  sessionRoom?: string;
  amount?: number;
  paymentMethod?: 'pix' | 'cartao' | 'dinheiro' | 'convenio' | 'outro';
  paymentStatus?: 'pending' | 'paid';
  receiptIssued?: boolean;
  receiptNumber?: string;
  notes?: string;
  isConverted?: boolean;
  convertedPatientId?: string;
  createdAt: string;
  updatedAt: string;
}


