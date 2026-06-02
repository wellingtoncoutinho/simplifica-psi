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
  modality?: 'Online' | 'Presencial';
  meetingLink?: string;
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
