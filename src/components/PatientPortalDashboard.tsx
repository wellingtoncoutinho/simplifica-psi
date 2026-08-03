import React, { useState, useEffect } from 'react';
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
  Copy
} from 'lucide-react';
import { PatientPortal, Session, Transaction, DiaryEntry } from '../types';

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
  const [activeTab, setActiveTab] = useState<'finance' | 'safety' | 'diary' | 'materials'>('diary');
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

  // Pre-fill registerForm when portalData changes
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
    }
  }, [portalData]);

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
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1">
          
          {/* DIARY TAB */}
          {activeTab === 'diary' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-text-main">Diário Terapêutico</h3>
                  <p className="text-xs text-text-muted mt-0.5">Registre como foi seu dia/semana e pontue seu humor geral. Seu psicólogo terá acesso para nos guiar na próxima sessão.</p>
                </div>
                {!isAddingDiary && (
                  <button
                    onClick={() => setIsAddingDiary(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Novo Registro</span>
                  </button>
                )}
              </div>

              {/* Add New Diary Form */}
              {isAddingDiary && (
                <form onSubmit={handleAddDiaryEntry} className="bg-card border border-border-ui rounded-[24px] p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-[#2E3C2B]">Novo Registro de Diário</h4>
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
                      rows={5}
                      placeholder="Descreva aqui o que sentiu, eventos importantes ou tarefas da semana..."
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

              {/* Diary Entries List */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-text-muted uppercase tracking-widest pl-1">Histórico de Diários</h4>
                {diaryError ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                    <AlertCircle className="shrink-0 mt-0.5" size={15} />
                    <span>{diaryError}</span>
                  </div>
                ) : loadingDiary ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : diaryEntries.length === 0 ? (
                  <div className="bg-card border border-border-ui rounded-2xl p-8 text-center text-xs text-text-muted">
                    Você ainda não registrou nenhum diário. Clique em "Novo Registro" acima para começar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diaryEntries.map(entry => (
                      <div key={entry.id} className="bg-card border border-border-ui rounded-[20px] p-4 space-y-3 hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              <Calendar size={13} />
                              <span>{entry.date.split('-').reverse().join('/')}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteDiaryEntry(entry.id)}
                              className="text-text-muted hover:text-red-500 transition-all p-1"
                              title="Excluir Registro"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getMoodColor(entry.mood)}`}>
                            Humor: {entry.mood}/10
                          </div>
                        </div>
                        <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-primary/20">
                          {entry.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                s.status === 'Realizada' ? 'bg-emerald-500/10 text-emerald-600' :
                                s.status === 'Agendada' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                              }`}>
                                {s.status}
                              </span>
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

        </div>
      </main>
    </div>
  );
}
