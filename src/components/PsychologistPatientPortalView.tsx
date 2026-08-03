import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  UserCircle, 
  FileText, 
  ShieldAlert, 
  BookOpen, 
  Calendar, 
  Trash2, 
  Plus, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw,
  AlertCircle,
  FileDown,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Patient, PatientPortal, PdfLibraryItem, DiaryEntry } from '../types';

interface PsychologistPatientPortalViewProps {
  user: any;
  patients: Patient[];
  initialPatientId?: string;
  initialSubTab?: 'pdfs' | 'safety' | 'diary' | 'access';
}

export default function PsychologistPatientPortalView({ 
  user, 
  patients, 
  initialPatientId, 
  initialSubTab 
}: PsychologistPatientPortalViewProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || '');
  const [portalData, setPortalData] = useState<PatientPortal | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'pdfs' | 'safety' | 'diary' | 'access'>(initialSubTab || 'pdfs');
  const [loadingPortal, setLoadingPortal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // PDF Library State
  const [pdfLibrary, setPdfLibrary] = useState<PdfLibraryItem[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState<boolean>(false);
  const [isAddingPdf, setIsAddingPdf] = useState<boolean>(false);
  const [pdfForm, setPdfForm] = useState({ title: '', description: '', type: 'link', fileUrl: '', base64: '' });
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  // Diary State
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loadingDiary, setLoadingDiary] = useState<boolean>(false);

  // Safety Plan Form State
  const [safetyPlanForm, setSafetyPlanForm] = useState({
    warningSigns: '',
    copingStrategies: '',
    distractingPeople: '',
    helpingPeople: '',
    professionals: '',
    safeEnvironment: '',
    reasonsToLive: ''
  });
  const [savingSafety, setSavingSafety] = useState<boolean>(false);

  const activePatients = patients.filter(p => p.status !== 'Inativo');

  // Synchronize initial prop values
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    }
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialPatientId, initialSubTab]);

  // Load PDF Library
  useEffect(() => {
    if (!user) return;
    setLoadingPdfs(true);
    const q = query(collection(db, 'pdf_library'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const items: PdfLibraryItem[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as PdfLibraryItem);
      });
      setPdfLibrary(items);
      setLoadingPdfs(false);
    }, (err) => {
      console.error("Erro ao buscar biblioteca de PDFs:", err);
      setLoadingPdfs(false);
    });
    return unsub;
  }, [user]);

  // Load selected patient portal data
  useEffect(() => {
    if (!selectedPatientId || !user) {
      setPortalData(null);
      return;
    }
    setLoadingPortal(true);
    const portalRef = doc(db, 'patient_portal', selectedPatientId);
    
    const unsub = onSnapshot(portalRef, async (snap) => {
      if (!snap.exists()) {
        // Auto initialize portal doc if it doesn't exist
        const patient = patients.find(p => p.id === selectedPatientId);
        if (patient) {
          const cleanCpf = (patient.cpf || patient.document || '').replace(/\D/g, '');
          const newPortal: PatientPortal = {
            patientId: selectedPatientId,
            ownerId: user.uid,
            cpf: cleanCpf,
            patientUid: null,
            tutorialCompleted: false,
            name: patient.name.toUpperCase(),
            phone: patient.phone || '',
            email: patient.email || '',
            birthDate: patient.birthDate || '',
            gender: patient.gender || '',
            profession: patient.profession || patient.occupation || '',
            address: patient.address || '',
            emergencyName: '',
            emergencyRelation: '',
            emergencyPhone: '',
            sharedPDFs: [],
            updatedAt: new Date().toISOString()
          };
          try {
            await setDoc(portalRef, newPortal);
            setPortalData(newPortal);
          } catch (e) {
            console.error("Erro ao inicializar portal do paciente:", e);
          }
        }
      } else {
        const data = snap.data() as PatientPortal;
        const patient = patients.find(p => p.id === selectedPatientId);
        if (patient && !data.cpf && (patient.cpf || patient.document)) {
          const cleanCpf = (patient.cpf || patient.document || '').replace(/\D/g, '');
          try {
            await updateDoc(portalRef, { cpf: cleanCpf });
            data.cpf = cleanCpf;
          } catch (e) {
            console.error(e);
          }
        }
        setPortalData(data);
        if (data.safetyPlan) {
          setSafetyPlanForm({
            warningSigns: data.safetyPlan.warningSigns || '',
            copingStrategies: data.safetyPlan.copingStrategies || '',
            distractingPeople: data.safetyPlan.distractingPeople || '',
            helpingPeople: data.safetyPlan.helpingPeople || '',
            professionals: data.safetyPlan.professionals || '',
            safeEnvironment: data.safetyPlan.safeEnvironment || '',
            reasonsToLive: data.safetyPlan.reasonsToLive || ''
          });
        } else {
          setSafetyPlanForm({
            warningSigns: '',
            copingStrategies: '',
            distractingPeople: '',
            helpingPeople: '',
            professionals: '',
            safeEnvironment: '',
            reasonsToLive: ''
          });
        }
      }
      setLoadingPortal(false);
    }, (err) => {
      console.error("Erro ao carregar dados do portal:", err);
      setLoadingPortal(false);
    });

    // Load Diary Entries
    setLoadingDiary(true);
    const qDiary = query(
      collection(db, 'diary_entries'), 
      where('patientId', '==', selectedPatientId),
      orderBy('date', 'desc')
    );
    const unsubDiary = onSnapshot(qDiary, (snap) => {
      const items: DiaryEntry[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as DiaryEntry);
      });
      setDiaryEntries(items);
      setLoadingDiary(false);
    }, (err) => {
      console.error("Erro ao carregar diários:", err);
      setLoadingDiary(false);
    });

    return () => {
      unsub();
      unsubDiary();
    };
  }, [selectedPatientId, patients, user]);

  const copyPatientLink = () => {
    const link = `${window.location.protocol}//${window.location.host}/paciente?id=${selectedPatientId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetAccess = async () => {
    if (!portalData) return;
    if (confirm("Tem certeza que deseja resetar o acesso deste paciente? O vínculo com o dispositivo atual será removido, permitindo que ele faça login novamente em qualquer novo aparelho.")) {
      try {
        const portalRef = doc(db, 'patient_portal', portalData.patientId);
        await updateDoc(portalRef, {
          patientUid: null,
          updatedAt: new Date().toISOString()
        });
        alert("Acesso resetado com sucesso!");
      } catch (err) {
        console.error(err);
        alert("Erro ao resetar o acesso do paciente.");
      }
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

  const handleSaveSafetyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalData) return;
    setSavingSafety(true);
    try {
      const portalRef = doc(db, 'patient_portal', portalData.patientId);
      await updateDoc(portalRef, {
        safetyPlan: {
          ...safetyPlanForm,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      });
      alert("Plano de Segurança salvo com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar o plano de segurança.");
    } finally {
      setSavingSafety(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Por favor, selecione apenas arquivos PDF ou imagens (PNG/JPG).');
      return;
    }

    if (file.size > 800 * 1024) {
      alert('O arquivo excede o limite de 800KB. Reduza o arquivo ou use a opção de Link Externo.');
      return;
    }

    setUploadingFile(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPdfForm({
        ...pdfForm,
        base64: reader.result as string,
        fileUrl: file.name
      });
      setUploadingFile(false);
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePdfToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pdfForm.title) return;
    
    let url = pdfForm.fileUrl;
    if (pdfForm.type === 'upload') {
      url = pdfForm.base64;
    }

    if (!url) {
      alert('Forneça um link ou selecione um arquivo PDF.');
      return;
    }

    try {
      await addDoc(collection(db, 'pdf_library'), {
        ownerId: user.uid,
        title: pdfForm.title,
        description: pdfForm.description,
        fileUrl: url,
        createdAt: new Date().toISOString()
      });
      setPdfForm({ title: '', description: '', type: 'link', fileUrl: '', base64: '' });
      setIsAddingPdf(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar PDF na biblioteca.');
    }
  };

  const handleDeletePdfFromLibrary = async (pdfId: string) => {
    if (confirm("Tem certeza que deseja apagar este PDF da sua biblioteca? Ele será removido do portal de todos os pacientes que o visualizavam.")) {
      try {
        const pdfRef = doc(db, 'pdf_library', pdfId);
        await deleteDoc(pdfRef);
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir PDF da biblioteca.');
      }
    }
  };

  const toggleSharePdf = async (pdf: PdfLibraryItem, isShared: boolean) => {
    if (!portalData) return;
    const currentShared = portalData.sharedPDFs || [];
    let newShared = [];

    if (isShared) {
      // Remove PDF
      newShared = currentShared.filter(item => item.id !== pdf.id);
    } else {
      // Add PDF
      newShared = [...currentShared, {
        id: pdf.id,
        title: pdf.title,
        description: pdf.description,
        fileUrl: pdf.fileUrl,
        sharedAt: new Date().toISOString()
      }];
    }

    try {
      await updateDoc(doc(db, 'patient_portal', portalData.patientId), {
        sharedPDFs: newShared,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Erro ao atualizar compartilhamento de PDF:", err);
      alert("Erro ao alterar compartilhamento do PDF.");
    }
  };

  const getMoodColor = (mood: number) => {
    if (mood >= 8) return 'bg-emerald-500 text-white';
    if (mood >= 5) return 'bg-amber-500 text-black';
    return 'bg-rose-500 text-white';
  };

  const getInitialsBg = (name: string) => {
    const colors = [
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    ];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[70vh] text-left animate-in fade-in duration-300">
      {/* Left Sidebar: Patients List */}
      <div className="w-full lg:w-64 lg:shrink-0 bg-card border border-border-ui rounded-[24px] p-4 flex flex-col gap-3">
        <h4 className="font-bold text-sm text-primary uppercase tracking-widest px-2">Pacientes</h4>
        <div className="flex-1 overflow-y-auto max-h-[250px] lg:max-h-[60vh] space-y-1 custom-scrollbar pr-1">
          {activePatients.length === 0 ? (
            <p className="text-xs text-text-muted p-4">Nenhum paciente cadastrado.</p>
          ) : (
            activePatients.map(p => {
              const photo = p.photo;
              const hasCustomPhoto = photo && !photo.includes('dicebear.com');
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm ${
                    selectedPatientId === p.id 
                      ? 'bg-primary/20 text-primary border border-primary/20 font-semibold' 
                      : 'text-text-muted hover:bg-white/5 hover:text-text-main border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border ${
                    hasCustomPhoto ? 'border-white/5 overflow-hidden' : getInitialsBg(p.name)
                  }`}>
                    {hasCustomPhoto ? (
                      <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-text-main">{p.name}</p>
                    <p className="text-[9px] text-text-muted truncate">CPF: {p.cpf || p.document || 'Não informado'}</p>
                  </div>
                  <ArrowRight size={14} className={`opacity-40 ${selectedPatientId === p.id ? 'translate-x-1 opacity-100 transition-transform' : ''}`} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col">
        {!selectedPatientId ? (
          <div className="flex-1 bg-card border border-border-ui rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-4 text-text-muted">
            <UserCircle size={48} className="text-primary animate-pulse" />
            <div>
              <h3 className="font-bold text-lg text-text-main">Área do Paciente</h3>
              <p className="text-sm max-w-sm mt-1">Selecione um paciente na barra lateral para carregar seu portal, compartilhar PDFs, gerenciar o plano de segurança ou ler os diários semanais.</p>
            </div>
          </div>
        ) : loadingPortal ? (
          <div className="flex-1 bg-card border border-border-ui rounded-[32px] p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-xs text-text-muted font-bold uppercase tracking-widest">Carregando portal do paciente...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-card border border-border-ui rounded-[32px] p-6 flex flex-col gap-6">
            {/* Patient Header Summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                {(() => {
                  const selectedPatient = patients.find(p => p.id === selectedPatientId);
                  const photo = selectedPatient?.photo;
                  const hasCustomPhoto = photo && !photo.includes('dicebear.com');
                  return (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-md border ${
                      hasCustomPhoto ? 'border-white/5 overflow-hidden' : getInitialsBg(portalData?.name || '')
                    }`}>
                      {hasCustomPhoto ? (
                        <img src={selectedPatient?.photo} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        portalData?.name.charAt(0) || 'P'
                      )}
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-bold text-lg text-text-main">{portalData?.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted mt-0.5">
                    <span>CPF: <strong className="text-text-main">{portalData?.cpf || (patients.find(p => p.id === selectedPatientId)?.cpf || patients.find(p => p.id === selectedPatientId)?.document || '').replace(/\D/g, '') || 'Não cadastrado'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Share link action */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={copyPatientLink}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* Sub-tab Switcher */}
            <div className="flex border-b border-white/5 pb-1 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveSubTab('pdfs')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                  activeSubTab === 'pdfs' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen size={14} />
                  <span>Biblioteca de PDFs</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSubTab('safety')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                  activeSubTab === 'safety' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  <span>Plano de Segurança</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSubTab('diary')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                  activeSubTab === 'diary' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Diários Recebidos ({diaryEntries.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSubTab('access')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                  activeSubTab === 'access' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={14} />
                  <span>Configurações de Acesso</span>
                </div>
              </button>
            </div>

            {/* Sub-tab Content Area */}
            <div className="flex-1 overflow-y-auto max-h-[55vh] custom-scrollbar pr-1 space-y-4">
              
              {/* PDF Library & Sharing */}
              {activeSubTab === 'pdfs' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-text-main">Arquivos e Materiais Compartilhados</h4>
                      <p className="text-xs text-text-muted mt-0.5">Selecione quais PDFs de sua biblioteca serão disponibilizados para o paciente.</p>
                    </div>
                    <button
                      onClick={() => setIsAddingPdf(!isAddingPdf)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-main font-semibold text-xs rounded-lg transition-all border border-white/5"
                    >
                      <Plus size={14} />
                      <span>{isAddingPdf ? 'Fechar' : 'Novo PDF'}</span>
                    </button>
                  </div>

                  {/* Add PDF Form */}
                  {isAddingPdf && (
                    <form onSubmit={handleSavePdfToLibrary} className="bg-surface-muted border border-border-ui rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-3 duration-200">
                      <h5 className="font-bold text-xs text-text-main uppercase tracking-widest">Adicionar PDF à sua Biblioteca</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Título do Material</label>
                          <input
                            required
                            placeholder="Ex: Higiene do Sono"
                            value={pdfForm.title}
                            onChange={(e) => setPdfForm({...pdfForm, title: e.target.value})}
                            className="w-full bg-card border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Descrição Breve</label>
                          <input
                            placeholder="Ex: Guia com 10 passos para noites melhores."
                            value={pdfForm.description}
                            onChange={(e) => setPdfForm({...pdfForm, description: e.target.value})}
                            className="w-full bg-card border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-xs text-text-main cursor-pointer">
                            <input
                              type="radio"
                              name="pdf-type"
                              checked={pdfForm.type === 'link'}
                              onChange={() => setPdfForm({...pdfForm, type: 'link', fileUrl: ''})}
                              className="accent-primary"
                            />
                            <span>Link Externo (Google Drive, Dropbox, etc.)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-text-main cursor-pointer">
                            <input
                              type="radio"
                              name="pdf-type"
                              checked={pdfForm.type === 'upload'}
                              onChange={() => setPdfForm({...pdfForm, type: 'upload', fileUrl: ''})}
                              className="accent-primary"
                            />
                            <span>Upload do Arquivo PDF/Imagem (Max 800KB)</span>
                          </label>
                        </div>

                        {pdfForm.type === 'link' ? (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">URL do PDF</label>
                            <input
                              required={pdfForm.type === 'link'}
                              type="url"
                              placeholder="https://drive.google.com/file/d/..."
                              value={pdfForm.fileUrl}
                              onChange={(e) => setPdfForm({...pdfForm, fileUrl: e.target.value})}
                              className="w-full bg-card border border-border-ui rounded-xl px-4 py-2.5 text-xs text-text-main outline-none focus:border-primary"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Arquivo PDF ou Imagem</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept="application/pdf, image/png, image/jpeg, image/jpg"
                                onChange={handleFileUpload}
                                className="text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer"
                              />
                              {uploadingFile && <Loader2 className="animate-spin text-primary" size={16} />}
                            </div>
                            {pdfForm.fileUrl && !uploadingFile && (
                              <p className="text-[10px] text-emerald-500 font-medium mt-1">Carregado: {pdfForm.fileUrl}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingPdf(false)}
                          className="px-4 py-2 bg-transparent hover:bg-white/5 text-text-muted font-semibold text-xs rounded-xl transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={uploadingFile}
                          className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                          Salvar na Biblioteca
                        </button>
                      </div>
                    </form>
                  )}

                  {/* PDFs Library List */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-text-muted uppercase tracking-widest pl-1">Biblioteca ({pdfLibrary.length})</h5>
                    {loadingPdfs ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-primary" size={24} />
                      </div>
                    ) : pdfLibrary.length === 0 ? (
                      <div className="bg-surface-muted rounded-2xl p-6 text-center text-xs text-text-muted border border-dashed border-white/10">
                        Nenhum PDF cadastrado em sua biblioteca ainda. Clique em "Novo PDF" acima para cadastrar.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pdfLibrary.map(pdf => {
                          const isShared = (portalData?.sharedPDFs || []).some(item => item.id === pdf.id);
                          return (
                            <div key={pdf.id} className="bg-surface-muted border border-border-ui rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-primary/20 transition-all">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h6 className="font-bold text-xs text-text-main line-clamp-1">{pdf.title}</h6>
                                  <button
                                    onClick={() => handleDeletePdfFromLibrary(pdf.id)}
                                    className="text-text-muted hover:text-red-500 transition-colors p-1"
                                    title="Excluir da biblioteca"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <p className="text-[10px] text-text-muted mt-1 line-clamp-2 h-7">{pdf.description || 'Sem descrição.'}</p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                <span className="text-[9px] text-text-muted">
                                  {pdf.fileUrl.startsWith('data:') ? 'Arquivo local' : 'Link externo'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold ${isShared ? 'text-emerald-500' : 'text-text-muted'}`}>
                                    {isShared ? 'Compartilhado' : 'Não compartilhado'}
                                  </span>
                                  <button
                                    onClick={() => toggleSharePdf(pdf, isShared)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                      isShared ? 'bg-primary' : 'bg-white/10'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        isShared ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Safety Plan Form */}
              {activeSubTab === 'safety' && (
                <form onSubmit={handleSaveSafetyPlan} className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-text-main">Plano de Segurança de Crise</h4>
                    <p className="text-xs text-text-muted mt-0.5">Um plano estruturado baseado no protocolo Stanley-Brown. Preencha com o paciente para que ele acesse rapidamente no celular em momentos difíceis.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">1. Sinais de Alerta</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Sentimento de solidão, agitação mental, respiração ofegante..."
                        value={safetyPlanForm.warningSigns}
                        onChange={(e) => setSafetyPlanForm({...safetyPlanForm, warningSigns: e.target.value})}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-primary resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">2. Estratégias Internas de Enfrentamento</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Fazer a respiração quadrada, tomar um banho morno, ouvir a playlist de calmaria..."
                        value={safetyPlanForm.copingStrategies}
                        onChange={(e) => setSafetyPlanForm({...safetyPlanForm, copingStrategies: e.target.value})}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-primary resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">3. Pessoas e Locais para Distração</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Ir à padaria da esquina, ligar para o meu irmão e falar sobre futebol..."
                        value={safetyPlanForm.distractingPeople}
                        onChange={(e) => setSafetyPlanForm({...safetyPlanForm, distractingPeople: e.target.value})}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-primary resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">4. Pessoas para Pedir Ajuda</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Mãe (00) 99999-9999, Amiga Joana (00) 98888-8888..."
                        value={safetyPlanForm.helpingPeople}
                        onChange={(e) => setSafetyPlanForm({...safetyPlanForm, helpingPeople: e.target.value})}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-primary resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">5. Profissionais e Serviços de Emergência</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Psicólogo Wellington (00) 97777-7777, CVV (Ligar 188), SAMU (Ligar 192)..."
                        value={safetyPlanForm.professionals}
                        onChange={(e) => setSafetyPlanForm({...safetyPlanForm, professionals: e.target.value})}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-primary resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">6. Como Tornar o Ambiente Seguro</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Entregar medicamentos para guarda do meu marido, afastar objetos cortantes..."
                        value={safetyPlanForm.safeEnvironment}
                        onChange={(e) => setSafetyPlanForm({...safetyPlanForm, safeEnvironment: e.target.value})}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-primary resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">7. Razões para Viver</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Meus filhos, ver o pôr do sol, terminar a faculdade, cuidar do meu cachorro..."
                        value={safetyPlanForm.reasonsToLive}
                        onChange={(e) => setSafetyPlanForm({...safetyPlanForm, reasonsToLive: e.target.value})}
                        className="w-full bg-surface-muted border border-border-ui rounded-xl px-4 py-3 text-xs text-text-main outline-none focus:border-primary resize-y"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={savingSafety}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingSafety ? <Loader2 className="animate-spin" size={14} /> : null}
                      <span>Salvar Plano de Segurança</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Diary Entries Received */}
              {activeSubTab === 'diary' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-text-main">Diários Enviados pelo Paciente</h4>
                    <p className="text-xs text-text-muted mt-0.5">Aqui estão as notas de acompanhamento preenchidas pelo paciente no portal dele durante a semana.</p>
                  </div>

                  {loadingDiary ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : diaryEntries.length === 0 ? (
                    <div className="bg-surface-muted rounded-2xl p-8 text-center text-xs text-text-muted border border-dashed border-white/10">
                      O paciente ainda não enviou nenhum diário.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {diaryEntries.map(entry => (
                        <div key={entry.id} className="bg-surface-muted border border-border-ui rounded-2xl p-4 space-y-3 hover:border-white/10 transition-all">
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
                            {entry.text || 'Sem anotações escritas.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Access Settings & Link Management */}
              {activeSubTab === 'access' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-sm text-text-main">Gerenciamento de Vínculo e Acesso</h4>
                    <p className="text-xs text-text-muted mt-0.5">Controle as credenciais simplificadas e a segurança do portal para este paciente.</p>
                  </div>

                  <div className="bg-surface-muted border border-border-ui rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="text-primary shrink-0 mt-0.5" size={18} />
                      <div className="space-y-1">
                        <h6 className="font-bold text-xs text-text-main">Como funciona o acesso do paciente?</h6>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          O portal do paciente utiliza autenticação simplificada e segura por token único na URL.
                          Ao compartilhar o link gerado acima, o paciente poderá acessar de qualquer dispositivo (celular, tablet ou computador) de forma simultânea.
                          As informações dele (como diários e financeiro) são protegidas e associadas exclusivamente ao link dele.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-xs text-text-muted uppercase tracking-widest pl-1">Instruções para enviar ao paciente</h5>
                    <div className="bg-surface-muted border border-border-ui rounded-2xl p-4 text-xs text-text-muted leading-relaxed space-y-2">
                      <p>Envie o seguinte texto explicativo para o WhatsApp do paciente:</p>
                      <div className="bg-card border border-border-ui rounded-xl p-3 text-[11px] text-text-main select-all whitespace-pre-wrap font-mono">
{`Olá! Criei um espaço exclusivo para você acompanhar nossas sessões, diários, materiais de apoio e financeiro.

Para acessar, clique no link abaixo:
👉 ${window.location.protocol}//${window.location.host}/paciente?id=${selectedPatientId}

Dica: No primeiro acesso, você poderá completar seus dados de cadastro (caso falte algum) e adicionar a página na tela inicial do seu celular como se fosse um aplicativo.`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
