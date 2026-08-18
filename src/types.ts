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
  // Contrato Terapêutico
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractSignature?: string;
  contractSignedBy?: string;
  contractSignedDocument?: string;
  contractSignedText?: string;
  contractManualOverride?: boolean;
  contractManualNotes?: string;
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
  date: string;
  time: string;
  duration: string;
  type: 'Presencial' | 'Online';
  status: 'Agendada' | 'Realizada' | 'Cancelada';
  recurrence?: 'Semanal' | 'Quinzenal' | 'Mensal' | 'Nenhuma';
  isTriage?: boolean;
  triageName?: string;
  googleEventId?: string;
  // Financial fields
  amount?: number;
  paid?: boolean;
  nfIssued?: boolean;
  cost?: number;
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

  updatedAt: string;
}

export interface PdfLibraryItem {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  fileUrl: string;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  patientId: string;
  ownerId: string;
  date: string;
  mood: number;
  text: string;
  createdAt: string;
}

