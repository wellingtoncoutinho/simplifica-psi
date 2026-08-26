import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { 
  UserCircle, 
  DollarSign, 
  ShieldAlert, 
  Calendar, 
  BookOpen, 
  Plus, 
  Loader2, 
  LogOut, 
  Check, 
  AlertCircle,
  FileDown,
  Info,
  Phone,
  Compass,
  ArrowRight,
  Trash2,
  Copy,
  FileCheck,
  FileText,
  PenTool,
  CheckCircle2,
  Download,
  CheckSquare,
  Square,
  Smile,
  Brain,
  Zap,
  Activity,
  Heart,
  Moon,
  Target,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Star,
  Filter,
  X,
  Clock,
  TrendingUp,
  Sun,
  Flame,
  Award
} from 'lucide-react';
import jsPDF from 'jspdf';
import { PatientPortal, Session, Transaction, DiaryEntry, ClinicalModuleKey, DiaryEntryData, ClinicalModulesConfig } from '../types';
import { DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE, fillContractTemplate } from '../utils/contractDefaults';

// Interactive Signature Canvas Component
function SignaturePad({ 
  onSignatureChange, 
  onClear 
}: { 
  onSignatureChange: (dataUrl: string | null) => void;
  onClear?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Scale for crisp high DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a365d'; // Deep ink color
    ctx.lineWidth = 2.5;
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
    if (onClear) onClear();
  };

  return (
    <div className="space-y-2 text-left">
      <div className="relative border-2 border-dashed border-[#2E3C2B]/30 hover:border-primary rounded-2xl bg-white overflow-hidden touch-none select-none h-36 w-full shadow-inner flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="w-full h-full cursor-crosshair block"
          style={{ touchAction: 'none' }}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-xs font-medium gap-1.5">
            <PenTool size={14} className="text-gray-400" />
            <span>Desenhe sua assinatura ou rubrica aqui com o dedo ou mouse</span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] text-[#2E3C2B]/60">Rubrica digital manuscrita</span>
        <button
          type="button"
          onClick={clear}
          disabled={!hasDrawn}
          className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-30 disabled:hover:text-red-500 transition-colors"
        >
          Limpar Assinatura
        </button>
      </div>
    </div>
  );
}

const isSessionInPast = (sessionDate: string, sessionTime?: string) => {
  try {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    if (sessionDate < todayStr) return true;
    if (sessionDate === todayStr) {
      if (!sessionTime) return true;
      const currentHourMin = String(today.getHours()).padStart(2, '0') + ':' + 
        String(today.getMinutes()).padStart(2, '0');
      return sessionTime < currentHourMin;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export default function PatientPortalDashboard() {
  const [cpf, setCpf] = useState<string>('');
  const [loadingLogin, setLoadingLogin] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Auth & Session State
  const [portalData, setPortalData] = useState<PatientPortal | null>(null);
  // Read patientId from URL query param "?id=XYZ" or fallback to LocalStorage
  const getInitialPatientId = () => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('id');
    if (urlId) {
      localStorage.setItem('patient_portal_id', urlId);
      return urlId;
    }
    return localStorage.getItem('patient_portal_id') || '';
  };

  const [patientId, setPatientId] = useState<string>(getInitialPatientId());
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [loginProgress, setLoginProgress] = useState<string>('');
  const loggingInRef = React.useRef<boolean>(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'finance' | 'safety' | 'diary' | 'materials' | 'contract'>('diary');
  const hasSafetyPlan = !!(portalData?.safetyPlan && Object.values(portalData.safetyPlan).some(v => v && v !== portalData.safetyPlan?.updatedAt));
  
  // Finance State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingFinance, setLoadingFinance] = useState<boolean>(false);
  const [financeError, setFinanceError] = useState<string>('');
  const [psychologistProfile, setPsychologistProfile] = useState<any | null>(null);
  const [copiedPix, setCopiedPix] = useState<boolean>(false);

  // Diary State
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loadingDiary, setLoadingDiary] = useState<boolean>(false);
  const [diaryError, setDiaryError] = useState<string>('');
  const [submittingDiary, setSubmittingDiary] = useState<boolean>(false);
  const [newDiaryForm, setNewDiaryForm] = useState({ mood: 5, text: '' });
  const [isAddingDiary, setIsAddingDiary] = useState<boolean>(false);

  // Clinical Modules Modal & Form States
  const [activeModuleModal, setActiveModuleModal] = useState<ClinicalModuleKey | null>(null);
  const [submittingModule, setSubmittingModule] = useState<boolean>(false);
  const [patientHistoryFilter, setPatientHistoryFilter] = useState<string>('all');

  // TOC Form
  const [tocForm, setTocForm] = useState({
    mode: 'episode' as 'episode' | 'evolution',
    trigger: '',
    anxietyLevel: 5,
    compulsion: '',
    resisted: 'yes' as 'yes' | 'delayed' | 'no',
    delayMinutes: 15,
    dailyControlScore: 7,
    dailyVictories: '',
    notes: ''
  });

  // Panic Form
  const [panicForm, setPanicForm] = useState({
    mode: 'episode' as 'episode' | 'evolution',
    intensity: 7,
    symptoms: [] as string[],
    copingUsed: '',
    anticipatoryAnxiety: 4,
    exposureSituation: '',
    dailyVictories: '',
    generalThoughts: '',
    notes: ''
  });

  // Depression / Behavioral Activation Form
  const [depressionForm, setDepressionForm] = useState({
    mode: 'episode' as 'episode' | 'evolution',
    activity: '',
    pleasureLevel: 5,
    masteryLevel: 5,
    energyLevel: 5,
    generalThoughts: '',
    notes: ''
  });

  // Anxiety / Worries Form
  const [anxietyForm, setAnxietyForm] = useState({
    mode: 'episode' as 'episode' | 'evolution',
    anxietyLevel: 6,
    concern: '',
    inControl: true,
    actionPlan: '',
    generalThoughts: '',
    dailyVictories: '',
    notes: ''
  });

  // Sleep Form
  const [sleepForm, setSleepForm] = useState({
    bedTime: '23:00',
    wakeTime: '07:00',
    sleepQuality: 4,
    awakenings: 0,
    notes: ''
  });

  // RPD Form
  const [rpdForm, setRpdForm] = useState({
    situation: '',
    automaticThought: '',
    emotion: '',
    alternativeThought: '',
    notes: ''
  });

  // Habits Form
  const [habitsForm, setHabitsForm] = useState({
    completedHabits: [] as string[],
    notes: ''
  });

  // Contract Signing Flow State
  const [contractAgreed, setContractAgreed] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signingContract, setSigningContract] = useState<boolean>(false);
  const [signerName, setSignerName] = useState<string>('');
  const [signerDocument, setSignerDocument] = useState<string>('');

  // Onboarding/Register States
  const [showRegisterForm, setShowRegisterForm] = useState<boolean>(false);
  const [registerForm, setRegisterForm] = useState({
    birthDate: '',
    gender: '',
    profession: '',
    address: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: ''
  });
  const [savingRegister, setSavingRegister] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  // Pre-fill registerForm and signer details when portalData changes
  useEffect(() => {
    if (portalData) {
      setRegisterForm({
        birthDate: portalData.birthDate || '',
        gender: portalData.gender || '',
        profession: portalData.profession || '',
        address: portalData.address || '',
        emergencyName: portalData.emergencyName || '',
        emergencyRelation: portalData.emergencyRelation || '',
        emergencyPhone: portalData.emergencyPhone || ''
      });
      if (!signerName) setSignerName(portalData.name || '');
      if (!signerDocument) setSignerDocument(portalData.cpf || '');
    }
  }, [portalData]);

  // Sign contract handler
  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalData) return;
    if (!contractAgreed) {
      alert('Por favor, marque a caixa confirmando que leu e aceita as cláusulas do contrato.');
      return;
    }
    if (!signatureDataUrl) {
      alert('Por favor, desenhe sua rubrica/assinatura no quadro com o dedo ou mouse antes de continuar.');
      return;
    }

    setSigningContract(true);
    try {
      const nowIso = new Date().toISOString();
      const filledText = fillContractTemplate(psychologistProfile?.contractTemplate || DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE, {
        psychologistName: psychologistProfile?.name,
        psychologistCrp: psychologistProfile?.crp,
        psychologistCpfCnpj: psychologistProfile?.cpfCnpj,
        psychologistAddress: psychologistProfile?.address,
        patientName: portalData.name,
        patientCpf: portalData.cpf,
        patientBirthDate: portalData.birthDate,
        patientAddress: portalData.address,
        patientPhone: portalData.phone,
        date: new Date().toLocaleDateString('pt-BR')
      });

      const updates = {
        contractSigned: true,
        contractSignedAt: nowIso,
        contractSignature: signatureDataUrl,
        contractSignedBy: signerName || portalData.name,
        contractSignedDocument: signerDocument || portalData.cpf || '',
        contractSignedText: filledText,
        contractManualOverride: false,
        updatedAt: nowIso
      };

      const portalRef = doc(db, 'patient_portal', portalData.patientId);
      await updateDoc(portalRef, updates);

      // Also mirror updates to patients collection
      await updateDoc(doc(db, 'patients', portalData.patientId), updates).catch(() => {});

      setPortalData({ ...portalData, ...updates });

      if (!portalData.tutorialCompleted) {
        setShowTutorial(true);
      }
    } catch (err: any) {
      console.error('Erro ao assinar contrato:', err);
      alert('Erro ao registrar assinatura: ' + (err.message || String(err)));
    } finally {
      setSigningContract(false);
    }
  };

  // Download contract PDF for patient
  const handleDownloadContractPdf = () => {
    if (!portalData) return;
    try {
      const docPdf = new jsPDF();
      let startY = 20;

      if (psychologistProfile?.logo) {
        try {
          docPdf.addImage(psychologistProfile.logo, 'JPEG', 14, 10, 25, 25);
          startY = 42;
        } catch (e) {
          console.error(e);
        }
      }

      docPdf.setFontSize(9);
      docPdf.setFont('helvetica', 'normal');
      const rightX = 196;
      let lineY = 14;
      if (psychologistProfile?.name) {
        docPdf.text(`Psicólogo(a): ${psychologistProfile.name}`, rightX, lineY, { align: 'right' });
        lineY += 5;
      }
      if (psychologistProfile?.crp) {
        docPdf.text(`CRP: ${psychologistProfile.crp}`, rightX, lineY, { align: 'right' });
        lineY += 5;
      }
      if (psychologistProfile?.cpfCnpj) {
        docPdf.text(`CPF/CNPJ: ${psychologistProfile.cpfCnpj}`, rightX, lineY, { align: 'right' });
        lineY += 5;
      }

      docPdf.setFontSize(13);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS', 14, startY);
      docPdf.setFontSize(9);
      docPdf.setFont('helvetica', 'normal');
      docPdf.text('TERMO DE CONSENTIMENTO E ACORDO TERAPÊUTICO', 14, startY + 5);

      const textToRender = portalData.contractSignedText || fillContractTemplate(psychologistProfile?.contractTemplate || DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE, {
        psychologistName: psychologistProfile?.name,
        psychologistCrp: psychologistProfile?.crp,
        psychologistCpfCnpj: psychologistProfile?.cpfCnpj,
        psychologistAddress: psychologistProfile?.address,
        patientName: portalData.name,
        patientCpf: portalData.cpf,
        patientBirthDate: portalData.birthDate,
        patientAddress: portalData.address,
        patientPhone: portalData.phone,
        date: portalData.contractSignedAt ? new Date(portalData.contractSignedAt).toLocaleDateString('pt-BR') : undefined
      });

      docPdf.setFontSize(8.5);
      const splitText = docPdf.splitTextToSize(textToRender, 180);
      let cursorY = startY + 14;
      const pageHeight = docPdf.internal.pageSize.height;

      for (let i = 0; i < splitText.length; i++) {
        if (cursorY > pageHeight - 25) {
          docPdf.addPage();
          cursorY = 20;
        }
        docPdf.text(splitText[i], 14, cursorY);
        cursorY += 4.5;
      }

      if (cursorY > pageHeight - 55) {
        docPdf.addPage();
        cursorY = 22;
      } else {
        cursorY += 8;
      }

      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, cursorY, 196, cursorY);
      cursorY += 7;

      docPdf.setFontSize(9.5);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('REGISTRO DE ACEITE E ASSINATURA ELETRÔNICA', 14, cursorY);
      cursorY += 6;

      docPdf.setFontSize(8);
      docPdf.setFont('helvetica', 'normal');

      if (portalData.contractSigned && !portalData.contractManualOverride) {
        const signedDateStr = portalData.contractSignedAt ? new Date(portalData.contractSignedAt).toLocaleString('pt-BR') : 'Data não registrada';
        docPdf.text(`• Status: Assinado digitalmente pelo paciente no Portal SimplePsi`, 14, cursorY);
        cursorY += 4.5;
        docPdf.text(`• Data e hora da assinatura: ${signedDateStr}`, 14, cursorY);
        cursorY += 4.5;
        docPdf.text(`• Nome do signatário: ${portalData.contractSignedBy || portalData.name}`, 14, cursorY);
        cursorY += 4.5;
        docPdf.text(`• CPF do signatário: ${portalData.contractSignedDocument || portalData.cpf || 'Não informado'}`, 14, cursorY);
        cursorY += 6;

        if (portalData.contractSignature) {
          try {
            docPdf.text('Rubrica / Assinatura do Paciente:', 14, cursorY);
            cursorY += 3;
            docPdf.addImage(portalData.contractSignature, 'PNG', 14, cursorY, 45, 18);
            cursorY += 22;
          } catch (e) {
            console.error(e);
          }
        }
      } else if (portalData.contractManualOverride) {
        docPdf.text(`• Status: Assinado fisicamente em consultório`, 14, cursorY);
        cursorY += 4.5;
        docPdf.text(`• Observações: ${portalData.contractManualNotes || 'Contrato físico assinado'}`, 14, cursorY);
      }

      const fileName = `Meu_Contrato_Terapeutico_${portalData.name.replace(/\s+/g, '_')}.pdf`;
      docPdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar PDF do contrato.');
    }
  };

  // Auto-login if we have patientId and anonymous user is active
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (loggingInRef.current) {
        setCheckingAuth(false);
        return;
      }
      if (user && user.isAnonymous && patientId) {
        try {
          const portalRef = doc(db, 'patient_portal', patientId);
          const portalSnap = await getDoc(portalRef);
          if (portalSnap.exists()) {
            const data = portalSnap.data() as PatientPortal;
            setPortalData(data);
            setAuthenticated(true);
            // Trigger registration form check (only if required fields are missing)
            const needsReg = !data.birthDate || !data.gender || !data.emergencyName || !data.emergencyRelation || !data.emergencyPhone;
            if (needsReg) {
              setShowRegisterForm(true);
            } else if (!data.tutorialCompleted) {
              setShowTutorial(true);
            }
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error(err);
          handleLogout();
        }
      }
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, [patientId]);

  // Load psychologist profile details
  useEffect(() => {
    if (!authenticated || !portalData?.ownerId) {
      setPsychologistProfile(null);
      return;
    }
    const unsubPsych = onSnapshot(doc(db, 'profiles', portalData.ownerId), (docSnap) => {
      if (docSnap.exists()) {
        setPsychologistProfile(docSnap.data());
      } else {
        setPsychologistProfile(null);
      }
    }, (err) => {
      console.error("Erro ao carregar dados do psicólogo:", err);
    });
    return () => unsubPsych();
  }, [authenticated, portalData?.ownerId]);

  // Load portal real-time data, sessions and diaries once authenticated
  useEffect(() => {
    if (!authenticated || !portalData) return;

    // 1. Listen for real-time updates to portal document (shared PDFs, safety plan)
    const unsubPortal = onSnapshot(doc(db, 'patient_portal', portalData.patientId), (docSnap) => {
      if (docSnap.exists()) {
        setPortalData(docSnap.data() as PatientPortal);
      }
    });

    // 2. Load sessions list
    setLoadingFinance(true);
    const qSessions = query(
      collection(db, 'sessions'),
      where('patientId', '==', portalData.patientId),
      orderBy('date', 'desc')
    );
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      const list: Session[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Session);
      });
      setSessions(list);
      setLoadingFinance(false);
    }, (err) => {
      console.error(err);
      setFinanceError(`Erro ao carregar dados financeiros: ${err.message || err.toString()}`);
      setLoadingFinance(false);
    });

    // 3. Load diary entries
    setLoadingDiary(true);
    const qDiary = query(
      collection(db, 'diary_entries'),
      where('patientId', '==', portalData.patientId),
      orderBy('date', 'desc')
    );
    const unsubDiary = onSnapshot(qDiary, (snap) => {
      const list: DiaryEntry[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as DiaryEntry);
      });
      setDiaryEntries(list);
      setLoadingDiary(false);
    }, (err) => {
      console.error(err);
      setDiaryError(`Erro ao carregar diários: ${err.message || err.toString()}`);
      setLoadingDiary(false);
    });

    return () => {
      unsubPortal();
      unsubSessions();
      unsubDiary();
    };
  }, [authenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setLoginError('Por favor, insira um CPF válido com 11 dígitos.');
      return;
    }

    setLoadingLogin(true);
    loggingInRef.current = true;
    setLoginProgress('Autenticando...');
    try {
      // 1. Sign in anonymously
      const credential = await signInAnonymously(auth).catch((err: any) => {
        console.error("Erro ao autenticar anonimamente:", err);
        if (err.code === 'auth/operation-not-allowed') {
          throw new Error('O login anônimo está desativado no console do Firebase. Ative-o em Authentication > Sign-in method.');
        }
        throw err;
      });
      const uid = credential.user.uid;

      if (!patientId) {
        setLoginError('Link de acesso inválido. Por favor, acesse o portal utilizando o link completo enviado pelo seu psicólogo.');
        await auth.signOut();
        setLoadingLogin(false);
        loggingInRef.current = false;
        return;
      }

      setLoginProgress('Conectando ao banco...');
      // 2. Fetch the patient portal document directly by ID
      const portalRef = doc(db, 'patient_portal', patientId);
      const portalSnap = await getDoc(portalRef);

      setLoginProgress('Verificando cadastro...');
      if (!portalSnap.exists()) {
        setLoginError('Acesso não encontrado. O link pode estar incorreto ou o portal foi removido pelo psicólogo.');
        await auth.signOut();
        setLoadingLogin(false);
        loggingInRef.current = false;
        return;
      }

      const data = portalSnap.data() as PatientPortal;

      // 3. Match CPF
      const normalizedCpf = data.cpf ? data.cpf.replace(/\D/g, '') : '';
      if (normalizedCpf && normalizedCpf !== cleanCpf) {
        setLoginError('CPF incorreto para este link de acesso. Verifique os dados digitados.');
        await auth.signOut();
        setLoadingLogin(false);
        loggingInRef.current = false;
        return;
      }

      // No device lock, access portal directly

      setLoginProgress('Acessando o portal...');
      // Save to local state and LocalStorage
      localStorage.setItem('patient_portal_id', data.patientId);
      setPortalData(data);
      setAuthenticated(true);

      // Check if details are completed (only if required fields are missing)
      const needsReg = !data.birthDate || !data.gender || !data.emergencyName || !data.emergencyRelation || !data.emergencyPhone;
      if (needsReg) {
        setShowRegisterForm(true);
      } else if (!data.tutorialCompleted) {
        setShowTutorial(true);
      }

    } catch (err: any) {
      console.error(err);
      const details = err.code || err.message || err.toString();
      setLoginError(`Erro no servidor: ${details}`);
      await auth.signOut();
    } finally {
      setLoadingLogin(false);
      loggingInRef.current = false;
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('patient_portal_id');
    setPatientId('');
    setPortalData(null);
    setAuthenticated(false);
  };

  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalData) return;
    setSavingRegister(true);
    try {
      const portalRef = doc(db, 'patient_portal', portalData.patientId);
      await updateDoc(portalRef, {
        birthDate: registerForm.birthDate,
        gender: registerForm.gender,
        profession: registerForm.profession,
        address: registerForm.address,
        emergencyName: registerForm.emergencyName,
        emergencyRelation: registerForm.emergencyRelation,
        emergencyPhone: registerForm.emergencyPhone,
        updatedAt: new Date().toISOString()
      });
      
      setShowRegisterForm(false);
      
      if (!portalData.tutorialCompleted) {
        setShowTutorial(true);
      }
    } catch (err: any) {
      console.error(err);
      const details = err.code || err.message || err.toString();
      alert(`Erro ao salvar os dados cadastrais: ${details}`);
    } finally {
      setSavingRegister(false);
    }
  };

  const handleCompleteTutorial = async () => {
    if (!portalData) return;
    try {
      const portalRef = doc(db, 'patient_portal', portalData.patientId);
      await updateDoc(portalRef, {
        tutorialCompleted: true,
        updatedAt: new Date().toISOString()
      });
      setShowTutorial(false);
    } catch (err) {
      console.error(err);
      setShowTutorial(false);
    }
  };

  const handleAddDiaryEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalData || !newDiaryForm.text.trim()) return;
    setSubmittingDiary(true);
    try {
      await addDoc(collection(db, 'diary_entries'), {
        patientId: portalData.patientId,
        ownerId: portalData.ownerId,
        date: new Date().toISOString().split('T')[0],
        mood: newDiaryForm.mood,
        text: newDiaryForm.text.trim(),
        moduleType: 'general_diary',
        createdAt: new Date().toISOString()
      });
      setNewDiaryForm({ mood: 5, text: '' });
      setIsAddingDiary(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar seu diário.');
    } finally {
      setSubmittingDiary(false);
    }
  };

  const handleSaveModuleEntry = async (
    moduleType: ClinicalModuleKey,
    data: DiaryEntryData,
    summaryText: string,
    moodScore: number = 5
  ) => {
    if (!portalData) return;
    setSubmittingModule(true);
    try {
      await addDoc(collection(db, 'diary_entries'), {
        patientId: portalData.patientId,
        ownerId: portalData.ownerId,
        date: new Date().toISOString().split('T')[0],
        mood: moodScore,
        text: summaryText.trim(),
        moduleType,
        data,
        createdAt: new Date().toISOString()
      });
      setActiveModuleModal(null);
      // Reset forms
      setTocForm({
        mode: 'episode',
        trigger: '',
        anxietyLevel: 5,
        compulsion: '',
        resisted: 'yes',
        delayMinutes: 15,
        dailyControlScore: 7,
        dailyVictories: '',
        notes: ''
      });
      setPanicForm({
        mode: 'episode',
        intensity: 7,
        symptoms: [],
        copingUsed: '',
        anticipatoryAnxiety: 4,
        exposureSituation: '',
        dailyVictories: '',
        generalThoughts: '',
        notes: ''
      });
      setDepressionForm({
        mode: 'episode',
        activity: '',
        pleasureLevel: 5,
        masteryLevel: 5,
        energyLevel: 5,
        generalThoughts: '',
        notes: ''
      });
      setAnxietyForm({
        mode: 'episode',
        anxietyLevel: 6,
        concern: '',
        inControl: true,
        actionPlan: '',
        generalThoughts: '',
        dailyVictories: '',
        notes: ''
      });
      setSleepForm({ bedTime: '23:00', wakeTime: '07:00', sleepQuality: 4, awakenings: 0, notes: '' });
      setRpdForm({ situation: '', automaticThought: '', emotion: '', alternativeThought: '', notes: '' });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar seu registro.');
    } finally {
      setSubmittingModule(false);
    }
  };

  const handleDeleteDiaryEntry = async (entryId: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este registro de diário?')) return;
    try {
      await deleteDoc(doc(db, 'diary_entries', entryId));
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir o diário.');
    }
  };

  const handleDownloadPdf = (pdf: { title: string, fileUrl: string }) => {
    if (pdf.fileUrl.startsWith('data:application/pdf')) {
      // It's base64, open in new tab
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<iframe src="${pdf.fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        newTab.document.title = pdf.title;
      }
    } else if (pdf.fileUrl.startsWith('data:image/')) {
      // It's base64 image, open in new tab
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`
          <html>
            <head>
              <title>${pdf.title}</title>
              <style>
                body { margin: 0; background: #0e0e0e; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${pdf.fileUrl}" alt="${pdf.title}" />
            </body>
          </html>
        `);
      }
    } else {
      // It's a link, open it
      window.open(pdf.fileUrl, '_blank');
    }
  };

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.substring(0, 3)}.${digits.substring(3)}`;
    if (digits.length <= 9) return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6)}`;
    return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9, 11)}`;
  };

  const getMoodColor = (mood: number) => {
    if (mood >= 8) return 'bg-emerald-500 text-white';
    if (mood >= 5) return 'bg-amber-500 text-black';
    return 'bg-rose-500 text-white';
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-text-main">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Acessando portal...</p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-[#2E3C2B] p-4 text-left">
        <div className="bg-[#FAF9F6] border border-[#2E3C2B]/10 max-w-md w-full rounded-3xl p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center gap-3 text-center">
            <img src="/apple-touch-icon.png" className="w-16 h-16 object-contain rounded-2xl shadow-md" alt="Logo" />
            <h1 className="text-2xl font-bold tracking-tight text-[#2E3C2B]">Área do Paciente</h1>
            <p className="text-xs text-[#2E3C2B]/60 max-w-xs leading-relaxed">
              Bem-vindo ao seu espaço terapêutico do SimplePsi. Digite seu CPF para acessar.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#2E3C2B]/55 uppercase tracking-widest pl-1">Seu CPF</label>
              <input
                required
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-3 text-sm text-[#2E3C2B] outline-none focus:border-primary"
              />
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                <AlertCircle className="shrink-0 mt-0.5" size={15} />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full py-3.5 bg-[#2E3C2B] hover:bg-[#2E3C2B]/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 select-none disabled:opacity-50"
            >
              {loadingLogin ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>{loginProgress || 'Acessando...'}</span>
                </>
              ) : (
                <span>Acessar Portal</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // COMPLETE REGISTRATION SCREEN
  if (showRegisterForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-[#2E3C2B] p-4 text-left">
        <div className="bg-[#FAF9F6] border border-[#2E3C2B]/10 max-w-2xl w-full rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#2E3C2B]">Completar Cadastro</h2>
            <p className="text-xs text-[#2E3C2B]/60 leading-relaxed">
              Olá, <strong className="text-[#2E3C2B]">{portalData?.name}</strong>! Preencha as informações restantes para que seu psicólogo tenha seu cadastro completo em consultório.
            </p>
          </div>

          <form onSubmit={handleSaveRegister} className="space-y-5">
            {(!portalData?.birthDate || !portalData?.gender) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!portalData?.birthDate && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Data de Nascimento</label>
                    <input
                      required
                      type="date"
                      value={registerForm.birthDate}
                      onChange={(e) => setRegisterForm({...registerForm, birthDate: e.target.value})}
                      className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                    />
                  </div>
                )}
                {!portalData?.gender && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Gênero/Pronome</label>
                    <input
                      required
                      placeholder="Ex: Feminino, Masculino, Outro"
                      value={registerForm.gender}
                      onChange={(e) => setRegisterForm({...registerForm, gender: e.target.value})}
                      className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
            )}

            {(!portalData?.profession || !portalData?.address) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!portalData?.profession && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Profissão/Ocupação</label>
                    <input
                      placeholder="Ex: Estudante, Engenheiro, etc."
                      value={registerForm.profession}
                      onChange={(e) => setRegisterForm({...registerForm, profession: e.target.value})}
                      className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                    />
                  </div>
                )}
                {!portalData?.address && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Endereço Completo</label>
                    <input
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      value={registerForm.address}
                      onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})}
                      className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
            )}

            {(!portalData?.emergencyName || !portalData?.emergencyRelation || !portalData?.emergencyPhone) && (
              <div className="border-t border-[#2E3C2B]/10 pt-4 space-y-4">
                <h4 className="font-bold text-xs text-primary uppercase tracking-widest">Contato de Emergência</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {!portalData?.emergencyName && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Nome do Contato</label>
                      <input
                        required
                        placeholder="Ex: Maria (Mãe)"
                        value={registerForm.emergencyName}
                        onChange={(e) => setRegisterForm({...registerForm, emergencyName: e.target.value})}
                        className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                      />
                    </div>
                  )}
                  {!portalData?.emergencyRelation && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Parentesco</label>
                      <input
                        required
                        placeholder="Ex: Mãe, Marido, Amigo"
                        value={registerForm.emergencyRelation}
                        onChange={(e) => setRegisterForm({...registerForm, emergencyRelation: e.target.value})}
                        className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                      />
                    </div>
                  )}
                  {!portalData?.emergencyPhone && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Telefone de Emergência</label>
                      <input
                        required
                        placeholder="(00) 90000-0000"
                        value={registerForm.emergencyPhone}
                        onChange={(e) => setRegisterForm({...registerForm, emergencyPhone: e.target.value})}
                        className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={savingRegister}
                className="px-6 py-3 bg-[#2E3C2B] hover:bg-[#2E3C2B]/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingRegister ? <Loader2 className="animate-spin" size={14} /> : null}
                <span>Salvar Informações</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // MANDATORY CONTRACT SIGNING SCREEN
  const needsContract = !portalData?.contractSigned && !portalData?.contractManualOverride;
  if (needsContract) {
    const rawTemplate = psychologistProfile?.contractTemplate || DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE;
    const contractText = fillContractTemplate(rawTemplate, {
      psychologistName: psychologistProfile?.name,
      psychologistCrp: psychologistProfile?.crp,
      psychologistCpfCnpj: psychologistProfile?.cpfCnpj,
      psychologistAddress: psychologistProfile?.address,
      patientName: portalData?.name,
      patientCpf: portalData?.cpf,
      patientBirthDate: portalData?.birthDate,
      patientAddress: portalData?.address,
      patientPhone: portalData?.phone,
      date: new Date().toLocaleDateString('pt-BR')
    });

    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-[#2E3C2B] p-4 text-left">
        <div className="bg-[#FAF9F6] border border-[#2E3C2B]/10 max-w-3xl w-full rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#2E3C2B]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FileCheck size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#2E3C2B]">Contrato Terapêutico</h2>
                <p className="text-xs text-[#2E3C2B]/60">Leitura e Assinatura Eletrônica Obrigatória</p>
              </div>
            </div>
          </div>

          {/* Intro notice */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-xs text-[#2E3C2B]/80 leading-relaxed flex items-start gap-3">
            <Info size={18} className="text-primary shrink-0 mt-0.5" />
            <p>
              Olá, <strong className="text-[#2E3C2B]">{portalData?.name}</strong>! Para formalizarmos o acompanhamento terapêutico com segurança e transparência mútua, por favor leia as cláusulas abaixo e desenhe sua rubrica digital no final para liberar o seu acesso.
            </p>
          </div>

          {/* Scrollable Contract View */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl p-5 max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar font-mono text-xs text-[#2E3C2B] leading-relaxed whitespace-pre-wrap shadow-inner select-text">
            {contractText}
          </div>

          {/* Form with Agreement Checkbox & Signature Pad */}
          <form onSubmit={handleSignContract} className="space-y-5">
            
            {/* Agreement Checkbox */}
            <label className="flex items-start gap-3 p-4 bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-2xl cursor-pointer hover:bg-[#2E3C2B]/10 transition-colors">
              <input
                type="checkbox"
                required
                checked={contractAgreed}
                onChange={(e) => setContractAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-[#2E3C2B] leading-relaxed">
                Declaro que li atentamente, compreendi e concordo integralmente com todas as cláusulas e condições deste Contrato Terapêutico.
              </span>
            </label>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">
                Sua Assinatura / Rubrica Digital
              </label>
              <SignaturePad 
                onSignatureChange={setSignatureDataUrl} 
                onClear={() => setSignatureDataUrl(null)}
              />
            </div>

            {/* Signer Confirmation Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">Nome Completo do Signatário</label>
                <input
                  required
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">CPF do Signatário</label>
                <input
                  required
                  type="text"
                  value={signerDocument}
                  onChange={(e) => setSignerDocument(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-2.5 text-xs text-[#2E3C2B] outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={signingContract || !contractAgreed || !signatureDataUrl || !signerName.trim()}
                className="w-full py-4 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 select-none disabled:opacity-50"
              >
                {signingContract ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Registrando Assinatura...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Assinar e Acessar Meu Espaço</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // TUTORIAL/ONBOARDING SLIDES MODAL
  if (showTutorial) {
    const tutorials = [
      {
        title: "Bem-vindo ao seu Espaço!",
        desc: "Este é o seu portal pessoal. Aqui você pode acessar tudo sobre a sua terapia de forma rápida e segura diretamente do seu celular.",
        icon: Compass
      },
      {
        title: "Plano de Segurança & Emergência",
        desc: "Caso passe por um momento difícil ou crise, seu Plano de Segurança estará sempre à mão, com acesso rápido a técnicas de enfrentamento e atalhos para ligar para o CVV ou contatos importantes.",
        icon: ShieldAlert
      },
      {
        title: "Diário de Acompanhamento",
        desc: "Use o Diário semanal para registrar como está se sentindo e o que aconteceu de importante. Seu psicólogo receberá no consultório dele antes da sua próxima consulta.",
        icon: Calendar
      },
      {
        title: "Como usar como Aplicativo (PWA)",
        desc: "Para abrir este portal direto do seu celular:\n\n• no iOS (Safari): Toque em 'Compartilhar' (ícone de seta pra cima) e depois em 'Adicionar à Tela de Início'.\n• no Android (Chrome): Toque nas três bolinhas e selecione 'Instalar aplicativo' ou 'Adicionar à Tela de Início'.",
        icon: Info
      }
    ];

    const currentSlide = tutorials[tutorialStep];

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-left text-[#2E3C2B]">
        <div className="bg-[#FAF9F6] border border-[#2E3C2B]/10 max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative flex flex-col justify-between min-h-[350px]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <currentSlide.icon size={28} />
            </div>
            <h3 className="text-xl font-bold">{currentSlide.title}</h3>
            <p className="text-xs text-[#2E3C2B]/75 leading-relaxed whitespace-pre-line">{currentSlide.desc}</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#2E3C2B]/10">
            {/* Dots */}
            <div className="flex justify-center gap-1.5">
              {tutorials.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === tutorialStep ? 'w-5 bg-[#2E3C2B]' : 'w-1.5 bg-[#2E3C2B]/20'}`} />
              ))}
            </div>

            <div className="flex justify-between items-center gap-2">
              {tutorialStep > 0 ? (
                <button
                  onClick={() => setTutorialStep(tutorialStep - 1)}
                  className="px-4 py-2.5 text-[#2E3C2B]/60 hover:text-[#2E3C2B] font-bold text-xs rounded-xl"
                >
                  Voltar
                </button>
              ) : (
                <div />
              )}
              
              {tutorialStep < tutorials.length - 1 ? (
                <button
                  onClick={() => setTutorialStep(tutorialStep + 1)}
                  className="px-5 py-2.5 bg-[#2E3C2B] hover:bg-[#2E3C2B]/95 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
                >
                  <span>Avançar</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleCompleteTutorial}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
                >
                  <span>Concluir Tutorial</span>
                  <Check size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN PATIENT DASHBOARD
  return (
    <div className="min-h-screen bg-background text-[#2E3C2B] flex flex-col text-left">
      
      {/* Header */}
      <header className="bg-card border-b border-border-ui sticky top-0 z-30 shrink-0">
        <div className="px-4 py-4 max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" className="w-8 h-8 object-contain rounded-lg" alt="Logo" />
            <h1 className="text-md font-bold tracking-tight text-text-main">
              Simple<span className="text-primary">Psi</span> <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full ml-1 font-semibold uppercase tracking-wider">Espaço Paciente</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs font-semibold text-text-muted truncate max-w-[150px]">
              {portalData?.name}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-[#2E3C2B]/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-6 max-w-5xl w-full mx-auto flex flex-col gap-6 overflow-y-auto">
        
        {/* Navigation Tabs (Mobile-friendly Pills) */}
        <div className="flex bg-card border border-border-ui rounded-2xl p-1 gap-1 overflow-x-auto select-none">
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'diary' ? 'bg-[#2E3C2B] text-white shadow-md' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Calendar size={14} />
            <span>Meu Diário</span>
          </button>
          {hasSafetyPlan && (
            <button
              onClick={() => setActiveTab('safety')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'safety' ? 'bg-[#2E3C2B] text-white shadow-md' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <ShieldAlert size={14} />
              <span>Plano de Segurança</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'finance' ? 'bg-[#2E3C2B] text-white shadow-md' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <DollarSign size={14} />
            <span>Financeiro</span>
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'materials' ? 'bg-[#2E3C2B] text-white shadow-md' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <BookOpen size={14} />
            <span>Materiais</span>
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'contract' ? 'bg-[#2E3C2B] text-white shadow-md' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <FileCheck size={14} />
            <span>Meu Contrato</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1">
          
          {/* DIARY & CLINICAL MODULES TAB */}
          {activeTab === 'diary' && (() => {
            const activeModules = portalData?.clinicalModules || { general_diary: true };
            const customHabitsList = activeModules.customHabits || [
              'Tomar medicação prescrita no horário',
              'Caminhada ou atividade física (15-30 min)',
              'Higiene do sono (desligar telas às 22h)'
            ];

            const panicSymptomOptions = [
              'Taquicardia (Coração acelerado)',
              'Falta de ar / Sufocamento',
              'Tontura / Vertigem',
              'Sensação de desmaio',
              'Tremores',
              'Suor frio',
              'Aperto no peito',
              'Medo de perder o controle',
              'Formigamento nas mãos/rosto',
              'Náusea / Desconforto abdominal'
            ];

            return (
              <div className="space-y-6">
                
                {/* Header & Subtitle */}
                <div>
                  <h3 className="font-bold text-base text-text-main">Meu Espaço de Acompanhamento</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Registre seus episódios agudos, evoluções diárias, pensamentos e check-ins durante a semana. Essas informações guiarão seu psicólogo nas próximas sessões.
                  </p>
                </div>

                {/* Active Modules Quick Action Cards */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                    Ferramentas & Acompanhamentos Ativos
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* 1. TOC Module */}
                    {activeModules.toc && (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-purple-500/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                            <Brain size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">EPR & Obsessões</span>
                            <h4 className="font-bold text-xs text-text-main">Monitor de TOC & Rituais</h4>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                              Registre episódios de obsessão ou faça o check-in de evolução e vitórias do dia.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setTocForm(prev => ({ ...prev, mode: 'episode' })); setActiveModuleModal('toc'); }}
                            className="py-2 px-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            <Zap size={13} />
                            <span>Episódio / TOC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setTocForm(prev => ({ ...prev, mode: 'evolution' })); setActiveModuleModal('toc'); }}
                            className="py-2 px-2 bg-white dark:bg-card text-purple-700 dark:text-purple-300 font-bold text-[11px] rounded-xl border-2 border-purple-500/60 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all shadow-xs flex items-center justify-center gap-1"
                          >
                            <TrendingUp size={13} />
                            <span>Evolução do Dia</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 2. Panic Module */}
                    {activeModules.panic && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-rose-500/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                            <Zap size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Pânico & Agorafobia</span>
                            <h4 className="font-bold text-xs text-text-main">Diário de Pânico & Evolução</h4>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                              Registre crises agudas ou registre enfrentamentos, pensamentos e evolução diária.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setPanicForm(prev => ({ ...prev, mode: 'episode' })); setActiveModuleModal('panic'); }}
                            className="py-2 px-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            <Zap size={13} />
                            <span>Registrar Crise</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPanicForm(prev => ({ ...prev, mode: 'evolution' })); setActiveModuleModal('panic'); }}
                            className="py-2 px-2 bg-white dark:bg-card text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-xl border-2 border-rose-500/60 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-xs flex items-center justify-center gap-1"
                          >
                            <TrendingUp size={13} />
                            <span>Evolução & Medo</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 3. Depression Behavioral Activation */}
                    {activeModules.depression && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-amber-500/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <Activity size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Ativação Comportamental</span>
                            <h4 className="font-bold text-xs text-text-main">Ativação & Energia</h4>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                              Pontue o Prazer e a Maestria de atividades ou relate seu nível de energia e ânimo.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setDepressionForm(prev => ({ ...prev, mode: 'episode' })); setActiveModuleModal('depression'); }}
                            className="py-2 px-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            <Activity size={13} />
                            <span>Nova Atividade</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDepressionForm(prev => ({ ...prev, mode: 'evolution' })); setActiveModuleModal('depression'); }}
                            className="py-2 px-2 bg-white dark:bg-card text-amber-800 dark:text-amber-300 font-bold text-[11px] rounded-xl border-2 border-amber-500/60 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white transition-all shadow-xs flex items-center justify-center gap-1"
                          >
                            <TrendingUp size={13} />
                            <span>Evolução & Ânimo</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 4. Anxiety Worries */}
                    {activeModules.anxiety && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-orange-500/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                            <Heart size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">TAG & Ansiedade</span>
                            <h4 className="font-bold text-xs text-text-main">Termômetro de Ansiedade</h4>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                              Mapeie preocupações específicas ou relate o nível de tensão e reflexões do dia.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setAnxietyForm(prev => ({ ...prev, mode: 'episode' })); setActiveModuleModal('anxiety'); }}
                            className="py-2 px-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            <Heart size={13} />
                            <span>Preocupação</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAnxietyForm(prev => ({ ...prev, mode: 'evolution' })); setActiveModuleModal('anxiety'); }}
                            className="py-2 px-2 bg-white dark:bg-card text-orange-800 dark:text-orange-300 font-bold text-[11px] rounded-xl border-2 border-orange-500/60 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 dark:hover:text-white transition-all shadow-xs flex items-center justify-center gap-1"
                          >
                            <TrendingUp size={13} />
                            <span>Evolução do Dia</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 5. Sleep Diary */}
                    {activeModules.sleep && (
                      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-indigo-500/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <Moon size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Sono & Descanso</span>
                            <h4 className="font-bold text-xs text-text-main">Diário do Sono</h4>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                              Registre como foi sua noite, horários de dormir/acordar e qualidade.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal('sleep')}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Registrar Noite de Sono</span>
                        </button>
                      </div>
                    )}

                    {/* 6. RPD (TCC) */}
                    {activeModules.rpd && (
                      <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-sky-500/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                            <FileText size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">TCC</span>
                            <h4 className="font-bold text-xs text-text-main">RPD (Registro de Pensamentos)</h4>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                              Identifique pensamentos automáticos e encontre respostas alternativas.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal('rpd')}
                          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Novo Pensamento (RPD)</span>
                        </button>
                      </div>
                    )}

                    {/* 7. General Diary / Mood Check-in */}
                    {(activeModules.general_diary ?? true) && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Smile size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Autocuidado</span>
                            <h4 className="font-bold text-xs text-text-main">Check-in de Humor & Diário Livre</h4>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                              Conte como você está se sentindo hoje e registre seus pensamentos.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingDiary(true)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Fazer Check-in de Humor</span>
                        </button>
                      </div>
                    )}

                  </div>
                </div>

                {/* 8. Interactive Habits Card (Direct on Screen) */}
                {activeModules.habits && (
                  <div className="bg-card border border-teal-500/30 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                          <Target size={16} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Rotina & Compromisso</span>
                          <h4 className="font-bold text-xs text-text-main">Metas & Hábitos de Hoje</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-text-muted">
                        {habitsForm.completedHabits.length} de {customHabitsList.length} cumpridos
                      </span>
                    </div>

                    <div className="space-y-2">
                      {customHabitsList.map((habit, idx) => {
                        const isChecked = habitsForm.completedHabits.includes(habit);
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'bg-teal-500/10 border-teal-500/30 text-text-main'
                                : 'bg-[#2E3C2B]/5 border-border-ui text-text-muted hover:text-text-main'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = isChecked
                                  ? habitsForm.completedHabits.filter(h => h !== habit)
                                  : [...habitsForm.completedHabits, habit];
                                setHabitsForm({ ...habitsForm, completedHabits: next });
                              }}
                              className="hidden"
                            />
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                              isChecked ? 'bg-teal-500 border-teal-500 text-white' : 'border-border-ui'
                            }`}>
                              {isChecked && <Check size={13} />}
                            </div>
                            <span className={`text-xs font-medium ${isChecked ? 'line-through opacity-80' : ''}`}>
                              {habit}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={submittingModule || habitsForm.completedHabits.length === 0}
                        onClick={() => handleSaveModuleEntry(
                          'habits',
                          { completedHabits: habitsForm.completedHabits },
                          `Hábitos cumpridos: ${habitsForm.completedHabits.join(', ')}`,
                          8
                        )}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {submittingModule ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
                        <span>Salvar Hábitos de Hoje</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* MODAL: TOC FORM */}
                {activeModuleModal === 'toc' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-card border border-border-ui rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between pb-3 border-b border-border-ui">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <Brain size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">TOC & Rituais</span>
                            <h4 className="font-bold text-sm text-text-main">
                              {tocForm.mode === 'episode' ? 'Registrar Episódio / Gatilho' : 'Evolução Diária & Progresso'}
                            </h4>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal(null)}
                          className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-white/5"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Mode Switcher Tabs */}
                      <div className="flex bg-[#2E3C2B]/5 p-1 rounded-xl border border-border-ui">
                        <button
                          type="button"
                          onClick={() => setTocForm({ ...tocForm, mode: 'episode' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            tocForm.mode === 'episode'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <Zap size={13} />
                          <span>Episódio / Gatilho</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTocForm({ ...tocForm, mode: 'evolution' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            tocForm.mode === 'evolution'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <TrendingUp size={13} />
                          <span>Evolução & Pensamentos</span>
                        </button>
                      </div>

                      {/* TOC EPISODE FORM */}
                      {tocForm.mode === 'episode' ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'toc',
                              {
                                entryCategory: 'episode',
                                trigger: tocForm.trigger,
                                anxietyLevel: tocForm.anxietyLevel,
                                compulsion: tocForm.compulsion,
                                resisted: tocForm.resisted,
                                delayMinutes: tocForm.delayMinutes
                              },
                              tocForm.notes || `TOC: Gatilho "${tocForm.trigger}". Desfecho: ${tocForm.resisted === 'yes' ? 'Resistiu' : tocForm.resisted === 'delayed' ? `Adiou ${tocForm.delayMinutes} min` : 'Realizou ritual'}.`,
                              10 - tocForm.anxietyLevel
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              1. Qual foi a situação ou gatilho? *
                            </label>
                            <input
                              required
                              placeholder="Ex: Encostei na maçaneta, pensei que a porta ficou aberta..."
                              value={tocForm.trigger}
                              onChange={(e) => setTocForm({ ...tocForm, trigger: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Anxiety Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                2. Nível de Ansiedade / Desconforto
                              </span>
                              <span className="font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full text-xs">
                                {tocForm.anxietyLevel}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={tocForm.anxietyLevel}
                              onChange={(e) => setTocForm({ ...tocForm, anxietyLevel: Number(e.target.value) })}
                              className="w-full accent-purple-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-text-muted px-1">
                              <span>0 (Calmo)</span>
                              <span>5 (Moderado)</span>
                              <span>10 (Extremo)</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              3. Qual ritual você teve impulso de fazer?
                            </label>
                            <input
                              placeholder="Ex: Lavar as mãos 3 vezes, checar tranca..."
                              value={tocForm.compulsion}
                              onChange={(e) => setTocForm({ ...tocForm, compulsion: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Outcome Radio Buttons */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              4. O que você fez com o ritual? *
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                              <button
                                type="button"
                                onClick={() => setTocForm({ ...tocForm, resisted: 'yes' })}
                                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2.5 ${
                                  tocForm.resisted === 'yes'
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                                    : 'bg-[#2E3C2B]/5 border-border-ui text-text-muted hover:text-text-main'
                                }`}
                              >
                                <CheckCircle2 size={16} className={tocForm.resisted === 'yes' ? 'text-emerald-400' : 'opacity-40'} />
                                <div>
                                  <span className="font-bold block">Consegui resistir (Não fiz o ritual)</span>
                                  <span className="text-[10px] opacity-75 font-normal">Tolerei o desconforto e venci o impulso</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTocForm({ ...tocForm, resisted: 'delayed' })}
                                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2.5 ${
                                  tocForm.resisted === 'delayed'
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm'
                                    : 'bg-[#2E3C2B]/5 border-border-ui text-text-muted hover:text-text-main'
                                }`}
                              >
                                <Clock size={16} className={tocForm.resisted === 'delayed' ? 'text-amber-400' : 'opacity-40'} />
                                <div>
                                  <span className="font-bold block">Consegui adiar por alguns minutos</span>
                                  <span className="text-[10px] opacity-75 font-normal">Esperei um tempo antes de realizar</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTocForm({ ...tocForm, resisted: 'no' })}
                                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2.5 ${
                                  tocForm.resisted === 'no'
                                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-sm'
                                    : 'bg-[#2E3C2B]/5 border-border-ui text-text-muted hover:text-text-main'
                                }`}
                              >
                                <AlertCircle size={16} className={tocForm.resisted === 'no' ? 'text-rose-400' : 'opacity-40'} />
                                <div>
                                  <span className="font-bold block">Realizei o ritual imediatamente</span>
                                  <span className="text-[10px] opacity-75 font-normal">Não consegui segurar o impulso</span>
                                </div>
                              </button>
                            </div>
                          </div>

                          {tocForm.resisted === 'delayed' && (
                            <div className="space-y-1.5 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                Por quantos minutos conseguiu adiar?
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="180"
                                value={tocForm.delayMinutes}
                                onChange={(e) => setTocForm({ ...tocForm, delayMinutes: Number(e.target.value) })}
                                className="w-full bg-card border border-border-ui rounded-lg px-3 py-2 text-xs text-text-main outline-none focus:border-amber-500"
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Anotações complementares (Opcional)
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Como se sentiu depois? Algum detalhe que queira compartilhar com seu psicólogo..."
                              value={tocForm.notes}
                              onChange={(e) => setTocForm({ ...tocForm, notes: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-purple-500 resize-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Registro de TOC</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* TOC DAILY EVOLUTION FORM */
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'toc',
                              {
                                entryCategory: 'daily_evolution',
                                dailyControlScore: tocForm.dailyControlScore,
                                dailyVictories: tocForm.dailyVictories,
                                generalThoughts: tocForm.notes
                              },
                              tocForm.notes || `Evolução Diária TOC: Controle ${tocForm.dailyControlScore}/10. Vitórias: "${tocForm.dailyVictories || 'Nenhuma destacada'}".`,
                              tocForm.dailyControlScore
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          {/* Daily Control Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                1. Nível de controle geral sobre os rituais hoje
                              </span>
                              <span className="font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full text-xs">
                                {tocForm.dailyControlScore}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={tocForm.dailyControlScore}
                              onChange={(e) => setTocForm({ ...tocForm, dailyControlScore: Number(e.target.value) })}
                              className="w-full accent-purple-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-text-muted px-1">
                              <span>0 (Sem controle)</span>
                              <span>5 (Parcial)</span>
                              <span>10 (Total controle)</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              2. Vitórias ou momentos de superação de hoje
                            </label>
                            <input
                              placeholder="Ex: Consegui sair de casa checando a porta só 1 vez em vez de 5..."
                              value={tocForm.dailyVictories}
                              onChange={(e) => setTocForm({ ...tocForm, dailyVictories: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              3. Pensamentos intrusivos e reflexões do dia (Opcional)
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Como esteve sua mente hoje? Que pensamentos mais tentaram te convencer a fazer rituais?"
                              value={tocForm.notes}
                              onChange={(e) => setTocForm({ ...tocForm, notes: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-purple-500 resize-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Evolução Diária</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* MODAL: PANIC FORM */}
                {activeModuleModal === 'panic' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-card border border-border-ui rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between pb-3 border-b border-border-ui">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <Zap size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Pânico & Agorafobia</span>
                            <h4 className="font-bold text-sm text-text-main">
                              {panicForm.mode === 'episode' ? 'Registrar Crise de Pânico' : 'Evolução Diária, Pensamentos & Enfrentamentos'}
                            </h4>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal(null)}
                          className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-white/5"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Mode Switcher Tabs */}
                      <div className="flex bg-[#2E3C2B]/5 p-1 rounded-xl border border-border-ui">
                        <button
                          type="button"
                          onClick={() => setPanicForm({ ...panicForm, mode: 'episode' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            panicForm.mode === 'episode'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <Zap size={13} />
                          <span>Crise Aguda</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanicForm({ ...panicForm, mode: 'evolution' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            panicForm.mode === 'evolution'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <TrendingUp size={13} />
                          <span>Evolução & Enfrentamentos</span>
                        </button>
                      </div>

                      {/* PANIC EPISODE FORM */}
                      {panicForm.mode === 'episode' ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'panic',
                              {
                                entryCategory: 'episode',
                                panicIntensity: panicForm.intensity,
                                symptoms: panicForm.symptoms,
                                copingUsed: panicForm.copingUsed
                              },
                              panicForm.notes || `Crise de Pânico (Intensidade ${panicForm.intensity}/10). Sintomas: ${panicForm.symptoms.join(', ') || 'Não especificados'}.`,
                              10 - panicForm.intensity
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          {/* Intensity Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                Intensidade do episódio
                              </span>
                              <span className="font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full text-xs">
                                {panicForm.intensity}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={panicForm.intensity}
                              onChange={(e) => setPanicForm({ ...panicForm, intensity: Number(e.target.value) })}
                              className="w-full accent-rose-500 cursor-pointer"
                            />
                          </div>

                          {/* Symptoms selection */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Sintomas físicos sentidos (Toque para selecionar)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {panicSymptomOptions.map((symp, i) => {
                                const isSelected = panicForm.symptoms.includes(symp);
                                return (
                                  <button
                                    type="button"
                                    key={i}
                                    onClick={() => {
                                      const next = isSelected
                                        ? panicForm.symptoms.filter(s => s !== symp)
                                        : [...panicForm.symptoms, symp];
                                      setPanicForm({ ...panicForm, symptoms: next });
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                      isSelected
                                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                                        : 'bg-[#2E3C2B]/5 border-border-ui text-text-muted hover:text-text-main'
                                    }`}
                                  >
                                    {symp}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              O que você usou para se acalmar / regular?
                            </label>
                            <input
                              placeholder="Ex: Respiração diafragmática, liguei para familiar, saí do local..."
                              value={panicForm.copingUsed}
                              onChange={(e) => setPanicForm({ ...panicForm, copingUsed: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-rose-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Relato adicional / O que passou na cabeça (Opcional)
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Onde você estava? Teve algum pensamento catastrófico?"
                              value={panicForm.notes}
                              onChange={(e) => setPanicForm({ ...panicForm, notes: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-rose-500 resize-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Registro de Crise</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* PANIC DAILY EVOLUTION FORM */
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'panic',
                              {
                                entryCategory: 'daily_evolution',
                                anticipatoryAnxiety: panicForm.anticipatoryAnxiety,
                                exposureSituation: panicForm.exposureSituation,
                                dailyVictories: panicForm.dailyVictories,
                                generalThoughts: panicForm.generalThoughts
                              },
                              panicForm.notes || `Evolução Diária Pânico: Medo/Ansiedade antecipatória ${panicForm.anticipatoryAnxiety}/10. Enfrentamento: "${panicForm.exposureSituation || 'Nenhum'}". Vitórias: "${panicForm.dailyVictories || 'Nenhuma'}".`,
                              10 - panicForm.anticipatoryAnxiety
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          {/* Anticipatory Anxiety Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                1. Nível de medo de ter novas crises hoje (Ansiedade antecipatória)
                              </span>
                              <span className="font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full text-xs">
                                {panicForm.anticipatoryAnxiety}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={panicForm.anticipatoryAnxiety}
                              onChange={(e) => setPanicForm({ ...panicForm, anticipatoryAnxiety: Number(e.target.value) })}
                              className="w-full accent-rose-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-text-muted px-1">
                              <span>0 (Sem medo nenhum)</span>
                              <span>5 (Moderado)</span>
                              <span>10 (Constante / Pavor)</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              2. Conseguiu enfrentar algum lugar ou situação desafiadora hoje?
                            </label>
                            <input
                              placeholder="Ex: Fui ao supermercado sozinho, peguei o metrô, andei na rua..."
                              value={panicForm.exposureSituation}
                              onChange={(e) => setPanicForm({ ...panicForm, exposureSituation: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-rose-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              3. Vitórias ou sensações que percebeu no corpo
                            </label>
                            <input
                              placeholder="Ex: Senti o coração acelerar mas lembrei que era passageiro..."
                              value={panicForm.dailyVictories}
                              onChange={(e) => setPanicForm({ ...panicForm, dailyVictories: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-rose-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              4. Pensamentos automáticos e reflexões do dia (Opcional)
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Que pensamentos passaram na sua cabeça durante o dia? Como se sentiu no geral?"
                              value={panicForm.generalThoughts}
                              onChange={(e) => setPanicForm({ ...panicForm, generalThoughts: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-rose-500 resize-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Evolução Diária</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* MODAL: DEPRESSION ACTIVATION FORM */}
                {activeModuleModal === 'depression' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-card border border-border-ui rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between pb-3 border-b border-border-ui">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Activity size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Ativação Comportamental</span>
                            <h4 className="font-bold text-sm text-text-main">
                              {depressionForm.mode === 'episode' ? 'Registrar Atividade Realizada' : 'Evolução Diária, Ânimo & Energia'}
                            </h4>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal(null)}
                          className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-white/5"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Mode Switcher Tabs */}
                      <div className="flex bg-[#2E3C2B]/5 p-1 rounded-xl border border-border-ui">
                        <button
                          type="button"
                          onClick={() => setDepressionForm({ ...depressionForm, mode: 'episode' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            depressionForm.mode === 'episode'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <Activity size={13} />
                          <span>Atividade Realizada</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepressionForm({ ...depressionForm, mode: 'evolution' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            depressionForm.mode === 'evolution'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <TrendingUp size={13} />
                          <span>Evolução & Energia</span>
                        </button>
                      </div>

                      {/* DEPRESSION EPISODE FORM */}
                      {depressionForm.mode === 'episode' ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'depression',
                              {
                                entryCategory: 'episode',
                                activity: depressionForm.activity,
                                pleasureLevel: depressionForm.pleasureLevel,
                                masteryLevel: depressionForm.masteryLevel
                              },
                              depressionForm.notes || `Atividade: "${depressionForm.activity}". Prazer: ${depressionForm.pleasureLevel}/10, Maestria: ${depressionForm.masteryLevel}/10.`,
                              depressionForm.pleasureLevel
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Qual atividade você realizou? *
                            </label>
                            <input
                              required
                              placeholder="Ex: Caminhei 20 minutos, arrumei o quarto, cozinhei..."
                              value={depressionForm.activity}
                              onChange={(e) => setDepressionForm({ ...depressionForm, activity: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Pleasure Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                Nível de Prazer (Quanto foi bom/gostoso)
                              </span>
                              <span className="font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">
                                {depressionForm.pleasureLevel}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={depressionForm.pleasureLevel}
                              onChange={(e) => setDepressionForm({ ...depressionForm, pleasureLevel: Number(e.target.value) })}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>

                          {/* Mastery Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                Nível de Maestria (Sensação de dever cumprido / conquista)
                              </span>
                              <span className="font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full text-xs">
                                {depressionForm.masteryLevel}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={depressionForm.masteryLevel}
                              onChange={(e) => setDepressionForm({ ...depressionForm, masteryLevel: Number(e.target.value) })}
                              className="w-full accent-blue-500 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Como se sentiu antes vs depois? (Opcional)
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Ex: Estava sem vontade nenhuma no início, mas depois que terminei me senti mais leve..."
                              value={depressionForm.notes}
                              onChange={(e) => setDepressionForm({ ...depressionForm, notes: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-amber-500 resize-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Atividade</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* DEPRESSION DAILY EVOLUTION FORM */
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'depression',
                              {
                                entryCategory: 'daily_evolution',
                                energyLevel: depressionForm.energyLevel,
                                dailyVictories: depressionForm.notes,
                                generalThoughts: depressionForm.generalThoughts
                              },
                              depressionForm.notes || `Evolução Depressão: Nível de energia ${depressionForm.energyLevel}/10. Pensamentos: "${depressionForm.generalThoughts || 'Não especificados'}".`,
                              depressionForm.energyLevel
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          {/* Energy Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                1. Nível de Energia e Disposição de hoje
                              </span>
                              <span className="font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">
                                {depressionForm.energyLevel}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={depressionForm.energyLevel}
                              onChange={(e) => setDepressionForm({ ...depressionForm, energyLevel: Number(e.target.value) })}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-text-muted px-1">
                              <span>0 (Sem energia)</span>
                              <span>5 (Razoável)</span>
                              <span>10 (Muito disposto)</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              2. Pensamentos que passaram na cabeça hoje
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Ex: Tive pensamentos de desânimo, mas tentei não me culpar e focar no que dava para fazer..."
                              value={depressionForm.generalThoughts}
                              onChange={(e) => setDepressionForm({ ...depressionForm, generalThoughts: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-amber-500 resize-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              3. Pequenas vitórias ou momentos positivos do dia (Opcional)
                            </label>
                            <input
                              placeholder="Ex: Consegui tomar um banho demorado, liguei para um amigo..."
                              value={depressionForm.notes}
                              onChange={(e) => setDepressionForm({ ...depressionForm, notes: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Evolução Diária</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* MODAL: ANXIETY FORM */}
                {activeModuleModal === 'anxiety' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-card border border-border-ui rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between pb-3 border-b border-border-ui">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                            <Heart size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">TAG & Ansiedade</span>
                            <h4 className="font-bold text-sm text-text-main">
                              {anxietyForm.mode === 'episode' ? 'Registrar Preocupação / Pico' : 'Evolução Diária & Nível de Tensão'}
                            </h4>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal(null)}
                          className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-white/5"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Mode Switcher Tabs */}
                      <div className="flex bg-[#2E3C2B]/5 p-1 rounded-xl border border-border-ui">
                        <button
                          type="button"
                          onClick={() => setAnxietyForm({ ...anxietyForm, mode: 'episode' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            anxietyForm.mode === 'episode'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <Heart size={13} />
                          <span>Preocupação Específica</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnxietyForm({ ...anxietyForm, mode: 'evolution' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            anxietyForm.mode === 'evolution'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          <TrendingUp size={13} />
                          <span>Evolução & Tensão</span>
                        </button>
                      </div>

                      {/* ANXIETY EPISODE FORM */}
                      {anxietyForm.mode === 'episode' ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'anxiety',
                              {
                                entryCategory: 'episode',
                                anxietyLevel: anxietyForm.anxietyLevel,
                                concern: anxietyForm.concern,
                                inControl: anxietyForm.inControl,
                                actionPlan: anxietyForm.actionPlan
                              },
                              anxietyForm.notes || `Preocupação: "${anxietyForm.concern}". Controle: ${anxietyForm.inControl ? 'Sob controle' : 'Fora de controle'}.`,
                              10 - anxietyForm.anxietyLevel
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          {/* Anxiety Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                Nível de Ansiedade no Momento
                              </span>
                              <span className="font-bold text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full text-xs">
                                {anxietyForm.anxietyLevel}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={anxietyForm.anxietyLevel}
                              onChange={(e) => setAnxietyForm({ ...anxietyForm, anxietyLevel: Number(e.target.value) })}
                              className="w-full accent-orange-500 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Qual é a sua preocupação principal agora? *
                            </label>
                            <textarea
                              required
                              rows={3}
                              placeholder="Descreva o que está gerando angústia ou medo..."
                              value={anxietyForm.concern}
                              onChange={(e) => setAnxietyForm({ ...anxietyForm, concern: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-orange-500 resize-none"
                            />
                          </div>

                          {/* Sphere of Control */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Essa situação está no seu controle direto? *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setAnxietyForm({ ...anxietyForm, inControl: true })}
                                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                                  anxietyForm.inControl
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                                    : 'bg-[#2E3C2B]/5 border-border-ui text-text-muted hover:text-text-main'
                                }`}
                              >
                                ✓ Sim, posso agir
                              </button>
                              <button
                                type="button"
                                onClick={() => setAnxietyForm({ ...anxietyForm, inControl: false })}
                                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                                  !anxietyForm.inControl
                                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold'
                                    : 'bg-[#2E3C2B]/5 border-border-ui text-text-muted hover:text-text-main'
                                }`}
                              >
                                ✕ Não, foge do meu alcance
                              </button>
                            </div>
                          </div>

                          {anxietyForm.inControl ? (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest pl-1">
                                Qual pequeno passo você pode dar hoje para resolver?
                              </label>
                              <input
                                placeholder="Ex: Mandar mensagem para fulano, organizar a planilha..."
                                value={anxietyForm.actionPlan}
                                onChange={(e) => setAnxietyForm({ ...anxietyForm, actionPlan: e.target.value })}
                                className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-emerald-500"
                              />
                            </div>
                          ) : (
                            <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 text-xs text-text-muted leading-relaxed">
                              💡 <em>Dica terapêutica:</em> Quando algo está fora do nosso controle, a melhor estratégia é a aceitação radical e redirecionar a atenção para o presente.
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Registro de Ansiedade</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* ANXIETY DAILY EVOLUTION FORM */
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveModuleEntry(
                              'anxiety',
                              {
                                entryCategory: 'daily_evolution',
                                anxietyLevel: anxietyForm.anxietyLevel,
                                generalThoughts: anxietyForm.generalThoughts,
                                dailyVictories: anxietyForm.dailyVictories
                              },
                              anxietyForm.notes || `Evolução Ansiedade: Tensão média ${anxietyForm.anxietyLevel}/10. Pensamentos: "${anxietyForm.generalThoughts || 'Não especificados'}".`,
                              10 - anxietyForm.anxietyLevel
                            );
                          }}
                          className="space-y-4 text-left"
                        >
                          {/* Average Tension Slider */}
                          <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                1. Nível médio de ansiedade e tensão corporal de hoje
                              </span>
                              <span className="font-bold text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full text-xs">
                                {anxietyForm.anxietyLevel}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={anxietyForm.anxietyLevel}
                              onChange={(e) => setAnxietyForm({ ...anxietyForm, anxietyLevel: Number(e.target.value) })}
                              className="w-full accent-orange-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-text-muted px-1">
                              <span>0 (Relaxado)</span>
                              <span>5 (Tenso)</span>
                              <span>10 (Hiperalerta)</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              2. Principais pensamentos ou preocupações recorrentes do dia
                            </label>
                            <textarea
                              rows={3}
                              placeholder="O que mais ficou martelando na sua cabeça durante o dia?"
                              value={anxietyForm.generalThoughts}
                              onChange={(e) => setAnxietyForm({ ...anxietyForm, generalThoughts: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-orange-500 resize-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              3. O que você fez que te ajudou a desacelerar ou acalmar? (Opcional)
                            </label>
                            <input
                              placeholder="Ex: Fiz uma pausa, tomei água, fiz respiração lenta, conversei..."
                              value={anxietyForm.dailyVictories}
                              onChange={(e) => setAnxietyForm({ ...anxietyForm, dailyVictories: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                            <button
                              type="button"
                              onClick={() => setActiveModuleModal(null)}
                              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={submittingModule}
                              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                              <span>Salvar Evolução Diária</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* MODAL: SLEEP FORM */}
                {activeModuleModal === 'sleep' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-card border border-border-ui rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between pb-3 border-b border-border-ui">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <Moon size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Higiene do Sono</span>
                            <h4 className="font-bold text-sm text-text-main">Registrar Noite de Sono</h4>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal(null)}
                          className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-white/5"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveModuleEntry(
                            'sleep',
                            {
                              bedTime: sleepForm.bedTime,
                              wakeTime: sleepForm.wakeTime,
                              sleepQuality: sleepForm.sleepQuality,
                              awakenings: sleepForm.awakenings
                            },
                            sleepForm.notes || `Sono: Deitou às ${sleepForm.bedTime}, acordou às ${sleepForm.wakeTime}. Qualidade: ${sleepForm.sleepQuality}/5 estrelas.`,
                            sleepForm.sleepQuality * 2
                          );
                        }}
                        className="space-y-4 text-left"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Que horas foi dormir?
                            </label>
                            <input
                              type="time"
                              required
                              value={sleepForm.bedTime}
                              onChange={(e) => setSleepForm({ ...sleepForm, bedTime: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                              Que horas levantou?
                            </label>
                            <input
                              type="time"
                              required
                              value={sleepForm.wakeTime}
                              onChange={(e) => setSleepForm({ ...sleepForm, wakeTime: e.target.value })}
                              className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Sleep Quality Stars */}
                        <div className="space-y-2 bg-[#2E3C2B]/5 p-3 rounded-xl border border-border-ui">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Qualidade do Sono (Estrelas)
                          </span>
                          <div className="flex items-center gap-2 pt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setSleepForm({ ...sleepForm, sleepQuality: star })}
                                className="p-1 text-amber-400 hover:scale-110 transition-transform"
                              >
                                <Star
                                  size={24}
                                  className={star <= sleepForm.sleepQuality ? 'fill-amber-400 text-amber-400' : 'text-text-muted/30'}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-bold text-indigo-300 ml-2">
                              {sleepForm.sleepQuality === 5 ? 'Excelente' : sleepForm.sleepQuality === 4 ? 'Bom' : sleepForm.sleepQuality === 3 ? 'Regular' : sleepForm.sleepQuality === 2 ? 'Ruim' : 'Péssimo'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                            Quantas vezes acordou durante a noite?
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={sleepForm.awakenings}
                            onChange={(e) => setSleepForm({ ...sleepForm, awakenings: Number(e.target.value) })}
                            className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                            Anotações sobre o sono ou sonhos (Opcional)
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Sonhou com algo marcante? Tomou chá ou remédio para dormir?"
                            value={sleepForm.notes}
                            onChange={(e) => setSleepForm({ ...sleepForm, notes: e.target.value })}
                            className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                          <button
                            type="button"
                            onClick={() => setActiveModuleModal(null)}
                            className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={submittingModule}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                            <span>Salvar Diário do Sono</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* MODAL: RPD FORM */}
                {activeModuleModal === 'rpd' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-card border border-border-ui rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between pb-3 border-b border-border-ui">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                            <FileText size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">TCC Clássica</span>
                            <h4 className="font-bold text-sm text-text-main">RPD - Registro de Pensamentos</h4>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal(null)}
                          className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-white/5"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveModuleEntry(
                            'rpd',
                            {
                              situation: rpdForm.situation,
                              automaticThought: rpdForm.automaticThought,
                              emotion: rpdForm.emotion,
                              alternativeThought: rpdForm.alternativeThought
                            },
                            rpdForm.notes || `RPD: Situação "${rpdForm.situation}". Pensamento: "${rpdForm.automaticThought}". Alternativa: "${rpdForm.alternativeThought}".`,
                            6
                          );
                        }}
                        className="space-y-4 text-left"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                            1. Situação Gatilho *
                          </label>
                          <input
                            required
                            placeholder="O que estava acontecendo quando a emoção surgiu?"
                            value={rpdForm.situation}
                            onChange={(e) => setRpdForm({ ...rpdForm, situation: e.target.value })}
                            className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest pl-1">
                            2. Pensamento Automático *
                          </label>
                          <textarea
                            required
                            rows={2}
                            placeholder="O que passou pela sua cabeça naquele exato momento?"
                            value={rpdForm.automaticThought}
                            onChange={(e) => setRpdForm({ ...rpdForm, automaticThought: e.target.value })}
                            className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-amber-500 resize-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-rose-400 uppercase tracking-widest pl-1">
                            3. Emoção Sentida *
                          </label>
                          <input
                            required
                            placeholder="Ex: Ansiedade (80%), Tristeza (70%), Raiva (50%)..."
                            value={rpdForm.emotion}
                            onChange={(e) => setRpdForm({ ...rpdForm, emotion: e.target.value })}
                            className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-rose-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest pl-1">
                            4. Pensamento Alternativo / Resposta Realista *
                          </label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Qual seria uma forma mais equilibrada e racional de enxergar essa situação?"
                            value={rpdForm.alternativeThought}
                            onChange={(e) => setRpdForm({ ...rpdForm, alternativeThought: e.target.value })}
                            className="w-full bg-[#2E3C2B]/5 border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border-ui">
                          <button
                            type="button"
                            onClick={() => setActiveModuleModal(null)}
                            className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={submittingModule}
                            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {submittingModule ? <Loader2 className="animate-spin" size={13} /> : null}
                            <span>Salvar RPD</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* MODAL / FORM: GENERAL DIARY CHECK-IN */}
                {isAddingDiary && (
                  <form onSubmit={handleAddDiaryEntry} className="bg-card border border-border-ui rounded-[24px] p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smile size={16} className="text-emerald-500" />
                        <h4 className="font-bold text-xs uppercase tracking-widest text-[#2E3C2B]">Check-in de Humor & Diário</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingDiary(false)}
                        className="text-xs font-semibold text-text-muted hover:text-text-main"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Mood scale from 0 to 10 */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">
                        Como está seu humor hoje? (Nota de 0 a 10)
                      </label>
                      <div className="flex justify-between gap-1 overflow-x-auto py-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                          let btnColor = 'bg-[#2E3C2B]/5 border-[#2E3C2B]/10 text-[#2E3C2B]';
                          if (newDiaryForm.mood === score) {
                            if (score >= 8) btnColor = 'bg-emerald-500 border-emerald-500 text-white font-bold scale-105';
                            else if (score >= 5) btnColor = 'bg-amber-500 border-amber-500 text-black font-bold scale-105';
                            else btnColor = 'bg-rose-500 border-rose-500 text-white font-bold scale-105';
                          }
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setNewDiaryForm({ ...newDiaryForm, mood: score })}
                              className={`w-8 h-8 rounded-full border text-xs flex items-center justify-center shrink-0 transition-all ${btnColor}`}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest pl-1">
                        Como está se sentindo? O que está acontecendo?
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Descreva aqui o que sentiu, pensou, ou eventos importantes da semana..."
                        value={newDiaryForm.text}
                        onChange={(e) => setNewDiaryForm({...newDiaryForm, text: e.target.value})}
                        className="w-full bg-[#2E3C2B]/5 border border-[#2E3C2B]/10 rounded-xl px-4 py-3 text-xs text-[#2E3C2B] outline-none focus:border-primary resize-y"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={submittingDiary}
                        className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {submittingDiary ? <Loader2 className="animate-spin" size={12} /> : null}
                        <span>Enviar para Psicólogo</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Patient Diary & Clinical History List */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-text-muted uppercase tracking-widest pl-1">
                      Meus Registros ({diaryEntries.length})
                    </h4>

                    {/* Filter Pills */}
                    {diaryEntries.length > 0 && (
                      <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {[
                          { key: 'all', label: 'Todos' },
                          { key: 'toc', label: 'TOC' },
                          { key: 'panic', label: 'Pânico' },
                          { key: 'depression', label: 'Ativação' },
                          { key: 'anxiety', label: 'Ansiedade' },
                          { key: 'sleep', label: 'Sono' },
                          { key: 'rpd', label: 'RPD' },
                          { key: 'habits', label: 'Hábitos' },
                          { key: 'general_diary', label: 'Humor' }
                        ].map(f => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setPatientHistoryFilter(f.key)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              patientHistoryFilter === f.key
                                ? 'bg-[#2E3C2B] text-white shadow-xs'
                                : 'bg-[#2E3C2B]/5 text-text-muted hover:text-text-main'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {diaryError ? (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                      <AlertCircle className="shrink-0 mt-0.5" size={15} />
                      <span>{diaryError}</span>
                    </div>
                  ) : loadingDiary ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : (() => {
                    const filtered = diaryEntries.filter(entry => 
                      patientHistoryFilter === 'all' ? true : (entry.moduleType || 'general_diary') === patientHistoryFilter
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-card border border-border-ui rounded-2xl p-8 text-center text-xs text-text-muted">
                          {diaryEntries.length === 0 
                            ? 'Você ainda não possui registros. Use os botões acima para fazer seu primeiro registro!'
                            : 'Nenhum registro encontrado para este filtro.'}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filtered.map(entry => {
                          const mod = entry.moduleType || 'general_diary';
                          const isEvolution = entry.data?.entryCategory === 'daily_evolution';

                          return (
                            <div key={entry.id} className="bg-card border border-border-ui rounded-[20px] p-4 space-y-3 hover:shadow-sm transition-all">
                              
                              {/* Header */}
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  {mod === 'toc' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600">
                                      <Brain size={11} />
                                      <span>TOC</span>
                                    </span>
                                  )}
                                  {mod === 'panic' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600">
                                      <Zap size={11} />
                                      <span>Pânico</span>
                                    </span>
                                  )}
                                  {mod === 'depression' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600">
                                      <Activity size={11} />
                                      <span>Ativação</span>
                                    </span>
                                  )}
                                  {mod === 'anxiety' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-600">
                                      <Heart size={11} />
                                      <span>Ansiedade</span>
                                    </span>
                                  )}
                                  {mod === 'sleep' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600">
                                      <Moon size={11} />
                                      <span>Sono</span>
                                    </span>
                                  )}
                                  {mod === 'rpd' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600">
                                      <FileText size={11} />
                                      <span>RPD</span>
                                    </span>
                                  )}
                                  {mod === 'habits' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-600">
                                      <Target size={11} />
                                      <span>Hábitos</span>
                                    </span>
                                  )}
                                  {mod === 'general_diary' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                                      <Smile size={11} />
                                      <span>Humor</span>
                                    </span>
                                  )}

                                  {/* Subcategory Pill */}
                                  {isEvolution && (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                                      <TrendingUp size={10} />
                                      <span>Evolução Diária</span>
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                    <Calendar size={12} />
                                    <span>{entry.date.split('-').reverse().join('/')}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {mod === 'toc' && entry.data?.anxietyLevel !== undefined && !isEvolution && (
                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                      Ansiedade: {entry.data.anxietyLevel}/10
                                    </span>
                                  )}
                                  {mod === 'toc' && isEvolution && entry.data?.dailyControlScore !== undefined && (
                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                      Controle: {entry.data.dailyControlScore}/10
                                    </span>
                                  )}
                                  {mod === 'panic' && entry.data?.panicIntensity !== undefined && !isEvolution && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                      Intensidade: {entry.data.panicIntensity}/10
                                    </span>
                                  )}
                                  {mod === 'panic' && isEvolution && entry.data?.anticipatoryAnxiety !== undefined && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                      Medo Antecipatório: {entry.data.anticipatoryAnxiety}/10
                                    </span>
                                  )}
                                  {mod === 'sleep' && entry.data?.sleepQuality && (
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                      ⭐ {entry.data.sleepQuality}/5
                                    </span>
                                  )}
                                  {(mod === 'general_diary' || !mod) && (
                                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getMoodColor(entry.mood)}`}>
                                      Humor: {entry.mood}/10
                                    </div>
                                  )}

                                  <button
                                    onClick={() => handleDeleteDiaryEntry(entry.id)}
                                    className="text-text-muted hover:text-red-500 transition-all p-1"
                                    title="Excluir Registro"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Specialized Content */}
                              {/* TOC Display */}
                              {mod === 'toc' && entry.data && (
                                <div className="space-y-1 text-xs bg-[#2E3C2B]/5 rounded-xl p-3">
                                  {entry.data.trigger && (
                                    <p><strong>Gatilho:</strong> {entry.data.trigger}</p>
                                  )}
                                  {entry.data.resisted && (
                                    <p>
                                      <strong>Desfecho:</strong>{' '}
                                      {entry.data.resisted === 'yes' ? '✅ Conseguiu não fazer o ritual (Resistiu)' : entry.data.resisted === 'delayed' ? `⏳ Adiou por ${entry.data.delayMinutes || 'alguns'} minutos` : '⚠️ Realizou o ritual'}
                                    </p>
                                  )}
                                  {entry.data.dailyVictories && (
                                    <p className="text-emerald-600 font-semibold">
                                      <strong>Vitória do dia:</strong> {entry.data.dailyVictories}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Panic Display */}
                              {mod === 'panic' && entry.data && (
                                <div className="space-y-1.5 text-xs bg-[#2E3C2B]/5 rounded-xl p-3">
                                  {entry.data.symptoms && entry.data.symptoms.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {entry.data.symptoms.map((s, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-md text-[10px] font-medium">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {entry.data.exposureSituation && (
                                    <p className="text-text-main">
                                      <strong className="text-rose-600">Enfrentamento / Exposição:</strong> {entry.data.exposureSituation}
                                    </p>
                                  )}
                                  {entry.data.dailyVictories && (
                                    <p className="text-emerald-600 font-semibold">
                                      <strong>Vitória do dia:</strong> {entry.data.dailyVictories}
                                    </p>
                                  )}
                                  {entry.data.copingUsed && (
                                    <p className="text-text-muted">
                                      <strong>Autorregulação usada:</strong> {entry.data.copingUsed}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Anxiety Display */}
                              {mod === 'anxiety' && entry.data && (
                                <div className="space-y-1 text-xs bg-[#2E3C2B]/5 rounded-xl p-3">
                                  {entry.data.concern && (
                                    <p><strong>Preocupação:</strong> {entry.data.concern}</p>
                                  )}
                                  {entry.data.generalThoughts && (
                                    <p><strong>Pensamentos:</strong> {entry.data.generalThoughts}</p>
                                  )}
                                  {entry.data.dailyVictories && (
                                    <p className="text-emerald-600"><strong>O que ajudou:</strong> {entry.data.dailyVictories}</p>
                                  )}
                                </div>
                              )}

                              {/* Depression Display */}
                              {mod === 'depression' && entry.data && (
                                <div className="space-y-1 text-xs bg-[#2E3C2B]/5 rounded-xl p-3">
                                  {entry.data.activity && (
                                    <p><strong>Atividade:</strong> {entry.data.activity}</p>
                                  )}
                                  {entry.data.generalThoughts && (
                                    <p><strong>Pensamentos do dia:</strong> {entry.data.generalThoughts}</p>
                                  )}
                                </div>
                              )}

                              {entry.text && (
                                <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-primary/20">
                                  {entry.text}
                                </p>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {/* SAFETY PLAN TAB */}
          {activeTab === 'safety' && hasSafetyPlan && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-text-main">Meu Plano de Segurança</h3>
                  <p className="text-xs text-text-muted mt-0.5">Siga este plano passo a passo se sentir que está em crise ou passando por momentos difíceis.</p>
                </div>

                {/* Crisis hotlines */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <a
                    href="tel:188"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                  >
                    <Phone size={14} />
                    <span>Ligar CVV (188)</span>
                  </a>
                  <a
                    href="tel:192"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Phone size={14} />
                    <span>SAMU (192)</span>
                  </a>
                </div>
              </div>

              {!portalData?.safetyPlan || Object.values(portalData.safetyPlan).every(v => !v || v === portalData.safetyPlan?.updatedAt) ? (
                <div className="bg-card border border-border-ui rounded-2xl p-8 text-center text-xs text-text-muted">
                  Nenhum plano de segurança cadastrado pelo seu psicólogo ainda. Converse com ele na próxima consulta.
                </div>
              ) : (
                <div className="space-y-4">
                  {portalData.safetyPlan.warningSigns && (
                    <div className="bg-card border border-border-ui rounded-[20px] p-4 space-y-1">
                      <h4 className="font-bold text-xs text-[#2E3C2B]/60 uppercase tracking-widest">1. Meus Sinais de Alerta</h4>
                      <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">{portalData.safetyPlan.warningSigns}</p>
                    </div>
                  )}

                  {portalData.safetyPlan.copingStrategies && (
                    <div className="bg-card border border-border-ui rounded-[20px] p-4 space-y-1">
                      <h4 className="font-bold text-xs text-[#2E3C2B]/60 uppercase tracking-widest">2. Coisas que posso fazer sozinho (Coping)</h4>
                      <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">{portalData.safetyPlan.copingStrategies}</p>
                    </div>
                  )}

                  {portalData.safetyPlan.distractingPeople && (
                    <div className="bg-card border border-border-ui rounded-[20px] p-4 space-y-1">
                      <h4 className="font-bold text-xs text-[#2E3C2B]/60 uppercase tracking-widest">3. Distrações (Pessoas e Lugares)</h4>
                      <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">{portalData.safetyPlan.distractingPeople}</p>
                    </div>
                  )}

                  {portalData.safetyPlan.helpingPeople && (
                    <div className="bg-card border border-border-ui rounded-[20px] p-4 space-y-1">
                      <h4 className="font-bold text-xs text-[#2E3C2B]/60 uppercase tracking-widest">4. Pessoas com quem posso pedir ajuda</h4>
                      <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">{portalData.safetyPlan.helpingPeople}</p>
                    </div>
                  )}

                  {portalData.safetyPlan.professionals && (
                    <div className="bg-card border border-border-ui rounded-[20px] p-4 space-y-1 border-primary/20">
                      <h4 className="font-bold text-xs text-primary uppercase tracking-widest">5. Profissionais e Serviços de Apoio</h4>
                      <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap font-semibold">{portalData.safetyPlan.professionals}</p>
                    </div>
                  )}

                  {portalData.safetyPlan.safeEnvironment && (
                    <div className="bg-card border border-border-ui rounded-[20px] p-4 space-y-1">
                      <h4 className="font-bold text-xs text-[#2E3C2B]/60 uppercase tracking-widest">6. Tornando o Ambiente Seguro</h4>
                      <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">{portalData.safetyPlan.safeEnvironment}</p>
                    </div>
                  )}

                  {portalData.safetyPlan.reasonsToLive && (
                    <div className="bg-card border border-border-ui rounded-[20px] p-4 space-y-1 bg-primary/5 border-primary/10">
                      <h4 className="font-bold text-xs text-primary uppercase tracking-widest">7. Minhas Razões para Viver</h4>
                      <p className="text-xs text-text-main font-semibold italic leading-relaxed whitespace-pre-wrap">"{portalData.safetyPlan.reasonsToLive}"</p>
                    </div>
                  )}

                  <p className="text-[10px] text-text-muted text-right">Atualizado em: {portalData.safetyPlan.updatedAt.split('T')[0].split('-').reverse().join('/')}</p>
                </div>
              )}
            </div>
          )}

          {/* FINANCE TAB */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-base text-text-main">Controle Financeiro Simplificado</h3>
                <p className="text-xs text-text-muted mt-0.5">Acompanhe o status de pagamento das suas sessões e a emissão de recibos/notas fiscais.</p>
              </div>

              {/* PIX INFO CARD */}
              {psychologistProfile && (psychologistProfile.pixKey || psychologistProfile.pixType) && (
                <div className="bg-card border border-border-ui rounded-[24px] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-ui/50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💸</span>
                      <div>
                        <h4 className="font-bold text-xs text-text-main uppercase tracking-widest">Dados do Pix para Pagamento</h4>
                        <p className="text-[10px] text-text-muted">Utilize as informações abaixo para transferência</p>
                      </div>
                    </div>
                    {psychologistProfile.crp && (
                      <span className="self-start sm:self-auto text-[9px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">
                        CRP: {psychologistProfile.crp}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block pl-1">Tipo de Chave / Chave Pix</span>
                      <div className="flex items-center justify-between bg-surface-muted border border-border-ui rounded-xl px-4 py-2.5">
                        <div className="truncate pr-2 flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                            {psychologistProfile.pixType || 'Chave'}
                          </span>
                          <span className="text-xs text-text-main font-mono select-all truncate">
                            {psychologistProfile.pixKey || 'Não informada'}
                          </span>
                        </div>
                        {psychologistProfile.pixKey && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(psychologistProfile.pixKey);
                              setCopiedPix(true);
                              setTimeout(() => setCopiedPix(false), 2000);
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark transition-all bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg shrink-0"
                          >
                            {copiedPix ? (
                              <>
                                <Check size={12} className="text-emerald-500 animate-pulse" />
                                <span className="text-emerald-500">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block pl-1">Favorecido / Beneficiário</span>
                      <div className="bg-surface-muted border border-border-ui rounded-xl px-4 py-2.5 h-[40px] flex items-center">
                        <span className="text-xs text-text-main font-semibold truncate">
                          {psychologistProfile.pixName || psychologistProfile.name || 'Psicólogo(a)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {financeError ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="shrink-0 mt-0.5" size={15} />
                  <span>{financeError}</span>
                </div>
              ) : loadingFinance ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="bg-card border border-border-ui rounded-2xl p-8 text-center text-xs text-text-muted">
                  Nenhuma sessão registrada em seu histórico financeiro.
                </div>
              ) : (
                <div className="bg-card border border-border-ui rounded-[24px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#2E3C2B]/5 text-[#2E3C2B]/60 uppercase tracking-widest text-[9px] border-b border-[#2E3C2B]/10">
                          <th className="py-4 px-4 font-bold">Data</th>
                          <th className="py-4 px-4 font-bold">Modalidade</th>
                          <th className="py-4 px-4 font-bold">Status da Sessão</th>
                          <th className="py-4 px-4 font-bold text-right">Valor</th>
                          <th className="py-4 px-4 font-bold">Pagamento</th>
                          <th className="py-4 px-4 font-bold">Nota Fiscal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2E3C2B]/5">
                        {sessions.filter(s => s.status !== 'Cancelada').map(s => (
                          <tr key={s.id} className="hover:bg-[#2E3C2B]/5 transition-colors">
                            <td className="py-3 px-4 font-semibold">
                              {s.date.split('-').reverse().join('/')} às {s.time}
                            </td>
                            <td className="py-3 px-4 text-text-muted">{s.type}</td>
                            <td className="py-3 px-4">
                              {(() => {
                                const displayStatus = (s.status === 'Agendada' && isSessionInPast(s.date, s.time)) ? 'Realizada' : s.status;
                                return (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    displayStatus === 'Realizada' ? 'bg-emerald-500/10 text-emerald-600' :
                                    displayStatus === 'Agendada' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                                  }`}>
                                    {displayStatus}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right font-bold">
                              R$ {(s.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                s.paid ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                              }`}>
                                {s.paid ? 'Pago' : 'Aguardando'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {s.nfIssued ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                                  <Check size={12} />
                                  <span>Emitida</span>
                                </span>
                              ) : (
                                <span className="text-text-muted text-[10px]">Pendente</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MATERIALS TAB */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-base text-text-main">Materiais Compartilhados</h3>
                <p className="text-xs text-text-muted mt-0.5">Acesse PDFs, orientações ou leituras disponibilizados pelo seu psicólogo para acompanhar fora da sessão.</p>
              </div>

              {!portalData?.sharedPDFs || portalData.sharedPDFs.length === 0 ? (
                <div className="bg-card border border-border-ui rounded-2xl p-8 text-center text-xs text-text-muted">
                  Nenhum material de apoio compartilhado com você no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portalData.sharedPDFs.map(pdf => (
                    <div key={pdf.id} className="bg-card border border-border-ui rounded-[20px] p-4 flex flex-col justify-between gap-4 hover:shadow-sm transition-all text-left">
                      <div>
                        <h4 className="font-bold text-xs text-text-main line-clamp-1">{pdf.title}</h4>
                        <p className="text-[10px] text-text-muted mt-1 leading-relaxed line-clamp-2 h-7">{pdf.description || 'Sem descrição.'}</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#2E3C2B]/5">
                        <span className="text-[9px] text-text-muted">
                          Compartilhado em: {pdf.sharedAt.split('T')[0].split('-').reverse().join('/')}
                        </span>
                        <button
                          onClick={() => handleDownloadPdf(pdf)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] rounded-lg transition-all"
                        >
                          <FileDown size={12} />
                          <span>Abrir Material</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY CONTRACT TAB */}
          {activeTab === 'contract' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-text-main">Meu Contrato Terapêutico</h3>
                  <p className="text-xs text-text-muted mt-0.5">Visualize e baixe uma cópia do seu contrato de prestação de serviços psicológicos assinado.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadContractPdf}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
                >
                  <Download size={14} />
                  <span>Baixar Cópia em PDF</span>
                </button>
              </div>

              {/* Status Certificate Card */}
              <div className="bg-card border border-border-ui rounded-[24px] p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-border-ui/60">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Assinatura Eletrônica Válida</span>
                    <h4 className="font-bold text-xs text-text-main">
                      {portalData?.contractSigned && !portalData?.contractManualOverride
                        ? `Assinado digitalmente por ${portalData.contractSignedBy || portalData.name}`
                        : 'Contrato assinado em consultório'}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Data do Aceite</span>
                    <span className="font-semibold text-text-main">
                      {portalData?.contractSignedAt ? new Date(portalData.contractSignedAt).toLocaleString('pt-BR') : 'Registrado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Documento do Signatário</span>
                    <span className="font-semibold text-text-main">
                      CPF: {portalData?.contractSignedDocument || portalData?.cpf || 'Não informado'}
                    </span>
                  </div>
                  {portalData?.contractSignature && (
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">Rubrica Registrada</span>
                      <div className="bg-white rounded-lg p-1 border border-gray-200 w-fit mt-1">
                        <img src={portalData.contractSignature} alt="Rubrica" className="h-8 max-w-[120px] object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contract Full Text View */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-text-muted uppercase tracking-widest pl-1">Teor do Contrato</h4>
                <div className="bg-card border border-border-ui rounded-[24px] p-6 font-mono text-xs text-text-main leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                  {portalData?.contractSignedText || fillContractTemplate(psychologistProfile?.contractTemplate || DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE, {
                    psychologistName: psychologistProfile?.name,
                    psychologistCrp: psychologistProfile?.crp,
                    psychologistCpfCnpj: psychologistProfile?.cpfCnpj,
                    psychologistAddress: psychologistProfile?.address,
                    patientName: portalData?.name,
                    patientCpf: portalData?.cpf,
                    patientBirthDate: portalData?.birthDate,
                    patientAddress: portalData?.address,
                    patientPhone: portalData?.phone,
                    date: portalData?.contractSignedAt ? new Date(portalData.contractSignedAt).toLocaleDateString('pt-BR') : undefined
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

