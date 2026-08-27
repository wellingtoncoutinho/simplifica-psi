import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Sparkles, 
  X, 
  ChevronDown, 
  Search, 
  Users, 
  Calendar, 
  ArrowRight,
  Loader2,
  FileCheck,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { 
  ImportedPatientPreview, 
  extractTextFromFile, 
  parseMigrationDataWithGemini, 
  saveImportedPatientsToFirestore 
} from '../utils/migrationParser';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserEmail: string;
  onSuccess: () => void;
}

export function DataMigrationModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserEmail,
  onSuccess
}: DataMigrationModalProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'saving' | 'success'>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{
    currentFileIndex: number;
    totalFiles: number;
    currentFileName: string;
    stageMessage: string;
    patientsFound: number;
    evolutionsFound: number;
  }>({
    currentFileIndex: 0,
    totalFiles: 0,
    currentFileName: '',
    stageMessage: '',
    patientsFound: 0,
    evolutionsFound: 0
  });
  
  const [extractedPatients, setExtractedPatients] = useState<ImportedPatientPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ count: number; evolucoesCount: number }>({ count: 0, evolucoesCount: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validExtensions = ['.pdf', '.csv', '.txt', '.json', '.tsv'];
    const validFiles = newFiles.filter(f => {
      const lower = f.name.toLowerCase();
      return validExtensions.some(ext => lower.endsWith(ext));
    });

    if (validFiles.length < newFiles.length) {
      alert("Alguns arquivos foram ignorados por não serem PDFs ou planilhas/textos (.pdf, .csv, .txt, .json).");
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Chave da API Gemini não encontrada nas variáveis de ambiente (VITE_GEMINI_API_KEY).");
      return;
    }

    setStep('processing');
    setErrorMessage(null);

    const allDiscoveredPatients: ImportedPatientPreview[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStatus({
          currentFileIndex: i + 1,
          totalFiles: files.length,
          currentFileName: file.name,
          stageMessage: `Extraindo texto de "${file.name}"...`,
          patientsFound: allDiscoveredPatients.length,
          evolutionsFound: allDiscoveredPatients.reduce((acc, p) => acc + (p.evolucoes?.length || 0), 0)
        });

        const textContent = await extractTextFromFile(file);

        if (!textContent || textContent.trim().length === 0) {
          console.warn(`Arquivo ${file.name} não contém texto legível.`);
          continue;
        }

        setProcessingStatus(prev => ({
          ...prev,
          stageMessage: `Estruturando prontuários com IA (${file.name})...`
        }));

        const patientsFromDoc = await parseMigrationDataWithGemini(textContent, apiKey);

        // Merge patients if name already exists
        for (const newP of patientsFromDoc) {
          const existingIdx = allDiscoveredPatients.findIndex(
            p => p.name.toLowerCase().trim() === newP.name.toLowerCase().trim()
          );

          if (existingIdx >= 0) {
            // Merge evolucoes and missing contact info
            const existing = allDiscoveredPatients[existingIdx];
            existing.phone = existing.phone || newP.phone;
            existing.email = existing.email || newP.email;
            existing.cpf = existing.cpf || newP.cpf;
            existing.birthDate = existing.birthDate || newP.birthDate;
            existing.mainComplaint = existing.mainComplaint || newP.mainComplaint;
            existing.lifeHistory = existing.lifeHistory || newP.lifeHistory;

            // Merge evolucoes without exact date duplication
            const mergedEvolucoes = [...existing.evolucoes];
            for (const newEvo of newP.evolucoes) {
              const alreadyHas = mergedEvolucoes.some(
                e => e.date === newEvo.date && e.note.slice(0, 30) === newEvo.note.slice(0, 30)
              );
              if (!alreadyHas) {
                mergedEvolucoes.push(newEvo);
              }
            }
            existing.evolucoes = mergedEvolucoes;
          } else {
            allDiscoveredPatients.push(newP);
          }
        }

        setProcessingStatus(prev => ({
          ...prev,
          patientsFound: allDiscoveredPatients.length,
          evolutionsFound: allDiscoveredPatients.reduce((acc, p) => acc + (p.evolucoes?.length || 0), 0)
        }));
      }

      if (allDiscoveredPatients.length === 0) {
        throw new Error("Nenhum paciente ou registro clínico pôde ser identificado nos arquivos enviados. Verifique se os arquivos contêm texto digital e tente novamente.");
      }

      setExtractedPatients(allDiscoveredPatients);
      setStep('preview');
    } catch (err: any) {
      console.error("Erro durante o processamento da migração:", err);
      setErrorMessage(err?.message || "Ocorreu um erro ao processar os arquivos.");
      setStep('upload');
    }
  };

  const toggleSelectAll = (select: boolean) => {
    setExtractedPatients(prev => prev.map(p => ({ ...p, selected: select })));
  };

  const togglePatientSelection = (tempId: string) => {
    setExtractedPatients(prev => prev.map(p => p.tempId === tempId ? { ...p, selected: !p.selected } : p));
  };

  const togglePatientExpanded = (tempId: string) => {
    setExtractedPatients(prev => prev.map(p => p.tempId === tempId ? { ...p, isExpanded: !p.isExpanded } : p));
  };

  const updatePatientField = (tempId: string, field: keyof ImportedPatientPreview, value: any) => {
    setExtractedPatients(prev => prev.map(p => p.tempId === tempId ? { ...p, [field]: value } : p));
  };

  const handleConfirmImport = async () => {
    const selected = extractedPatients.filter(p => p.selected);
    if (selected.length === 0) {
      alert("Selecione ao menos um paciente para importar.");
      return;
    }

    setStep('saving');
    try {
      const summary = await saveImportedPatientsToFirestore(extractedPatients, currentUserId);
      setImportSummary(summary);
      setStep('success');
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar no banco de dados:", err);
      alert("Erro ao gravar os pacientes: " + err?.message);
      setStep('preview');
    }
  };

  const filteredPatientsList = extractedPatients.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.cpf && p.cpf.includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.mainComplaint && p.mainComplaint.toLowerCase().includes(q))
    );
  });

  const selectedCount = extractedPatients.filter(p => p.selected).length;
  const totalEvolutionsCount = extractedPatients
    .filter(p => p.selected)
    .reduce((acc, p) => acc + (p.evolucoes?.length || 0), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card w-full max-w-4xl bg-card border border-primary/25 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative my-6 text-left max-h-[90vh] flex flex-col justify-between overflow-hidden"
        >
          {/* Top Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-muted transition-colors cursor-pointer z-10"
            title="Fechar"
          >
            <X size={20} />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3.5 border-b border-white/5 pb-4 shrink-0 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-lg shadow-primary/10">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-text-main">
                  Migração Mágica de Prontuários & Pacientes
                </h3>
                <span className="text-[9.5px] bg-primary/15 text-primary border border-primary/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  BETA TESTE
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Importe prontuários, cadastros e históricos clínicos de qualquer plataforma ou planilha em segundos com IA.
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-300 text-xs shrink-0">
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <p className="flex-1">{errorMessage}</p>
            </div>
          )}

          {/* Content Area according to Step */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-5">
            {/* STEP 1: UPLOAD */}
            {step === 'upload' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-border-ui hover:border-primary/50 hover:bg-surface-muted/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.csv,.txt,.json,.tsv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">
                      Arraste seus PDFs de Prontuários ou Planilhas para cá
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Você pode selecionar múltiplos arquivos PDF de uma vez só (ex: 30 prontuários).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-surface-muted border border-border-ui rounded-full text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      PDFs de Prontuário
                    </span>
                    <span className="px-3 py-1 bg-surface-muted border border-border-ui rounded-full text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Planilhas CSV / Excel
                    </span>
                    <span className="px-3 py-1 bg-surface-muted border border-border-ui rounded-full text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      TXT / Relatórios
                    </span>
                  </div>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-main uppercase tracking-wider">
                        Arquivos Selecionados ({files.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles([])}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer"
                      >
                        Limpar todos
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="bg-surface-muted/60 border border-border-ui rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText size={16} className="text-primary shrink-0" />
                            <span className="truncate text-text-main font-medium">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-text-muted font-mono">
                              {(file.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(idx);
                              }}
                              className="text-text-muted hover:text-red-400 transition-colors p-1"
                              title="Remover arquivo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supported Systems & Security Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-surface-muted/40 border border-border-ui rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-main">
                      <FileCheck size={16} className="text-primary" />
                      <span>Compatibilidade Universal</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Compatível com PDFs de prontuários, relatórios clínicos, evoluções de sessões e planilhas exportadas de <strong>qualquer plataforma ou sistema</strong>.
                    </p>
                  </div>
                  <div className="bg-surface-muted/40 border border-border-ui rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-main">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <span>Sigilo & Criptografia</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      A extração é processada de forma segura e os prontuários são vinculados estritamente à sua conta <em>({currentUserEmail})</em>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PROCESSING */}
            {step === 'processing' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin flex items-center justify-center" />
                  <div className="absolute inset-0 flex items-center justify-center text-primary">
                    <Sparkles size={28} className="animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2 max-w-md">
                  <h4 className="text-lg font-bold text-text-main">
                    Analisando e Estruturando Prontuários...
                  </h4>
                  <p className="text-xs text-text-muted font-medium">
                    {processingStatus.stageMessage}
                  </p>
                  <p className="text-[11px] text-primary/80 font-mono">
                    Arquivo {processingStatus.currentFileIndex} de {processingStatus.totalFiles}
                  </p>
                </div>

                {/* Live Stats */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="bg-surface-muted border border-border-ui px-4 py-2 rounded-2xl text-center">
                    <span className="text-lg font-bold text-text-main block">{processingStatus.patientsFound}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Pacientes Identificados</span>
                  </div>
                  <div className="bg-surface-muted border border-border-ui px-4 py-2 rounded-2xl text-center">
                    <span className="text-lg font-bold text-primary block">{processingStatus.evolutionsFound}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Relatos de Sessão</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW & REVIEW */}
            {step === 'preview' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Highlights Banner */}
                <div className="bg-primary/10 border border-primary/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-main uppercase tracking-tight">
                        🎉 Prontuários Identificados com Sucesso!
                      </h4>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Encontramos <strong>{extractedPatients.length} pacientes</strong> e <strong>{totalEvolutionsCount} relatos clínicos</strong> nos arquivos enviados.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(true)}
                      className="px-2.5 py-1 bg-surface-muted hover:bg-border-ui text-text-main rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(false)}
                      className="px-2.5 py-1 bg-surface-muted hover:bg-border-ui text-text-muted rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar paciente por nome, CPF ou queixa..."
                    className="w-full bg-surface-muted/50 border border-border-ui rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Patients List */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredPatientsList.map((patient) => (
                    <div
                      key={patient.tempId}
                      className={`border rounded-2xl p-4 transition-all ${
                        patient.selected
                          ? 'bg-card border-primary/30 shadow-sm'
                          : 'bg-surface-muted/30 border-border-ui opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={patient.selected}
                            onChange={() => togglePatientSelection(patient.tempId)}
                            className="mt-1 rounded border-border-ui text-primary focus:ring-primary h-4 w-4 shrink-0 cursor-pointer"
                          />
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-text-main">{patient.name}</span>
                              {patient.evolucoes.length > 0 && (
                                <span className="px-2 py-0.5 bg-primary/15 text-primary border border-primary/20 rounded-full text-[10px] font-bold">
                                  {patient.evolucoes.length} {patient.evolucoes.length === 1 ? 'sessão' : 'sessões'}
                                </span>
                              )}
                              {patient.modality && (
                                <span className="px-2 py-0.5 bg-surface-muted text-text-muted rounded-full text-[10px] font-medium">
                                  {patient.modality}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
                              {patient.cpf && <span>CPF: <strong className="text-text-main">{patient.cpf}</strong></span>}
                              {patient.phone && <span>Tel: <strong className="text-text-main">{patient.phone}</strong></span>}
                              {patient.birthDate && <span>Nascimento: <strong className="text-text-main">{patient.birthDate}</strong></span>}
                              {patient.sessionAmount ? <span>Valor: <strong className="text-text-main">R$ {patient.sessionAmount}</strong></span> : null}
                            </div>

                            {patient.mainComplaint && (
                              <p className="text-[11px] text-text-muted line-clamp-1 italic">
                                Queixa: "{patient.mainComplaint}"
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => togglePatientExpanded(patient.tempId)}
                          className="flex items-center gap-1 text-[10.5px] text-primary hover:underline font-bold transition-all shrink-0 cursor-pointer p-1"
                        >
                          <span>{patient.isExpanded ? 'Recolher' : 'Ver Detalhes'}</span>
                          <ChevronDown size={14} className={patient.isExpanded ? 'rotate-180' : ''} />
                        </button>
                      </div>

                      {/* Expanded Details Form */}
                      {patient.isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-4 text-xs animate-in fade-in duration-200">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-text-muted uppercase">Nome</label>
                              <input
                                type="text"
                                value={patient.name}
                                onChange={(e) => updatePatientField(patient.tempId, 'name', e.target.value)}
                                className="w-full bg-surface-muted border border-border-ui rounded-lg px-2.5 py-1.5 text-xs text-text-main mt-0.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-text-muted uppercase">Telefone / WhatsApp</label>
                              <input
                                type="text"
                                value={patient.phone || ''}
                                onChange={(e) => updatePatientField(patient.tempId, 'phone', e.target.value)}
                                className="w-full bg-surface-muted border border-border-ui rounded-lg px-2.5 py-1.5 text-xs text-text-main mt-0.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-text-muted uppercase">CPF</label>
                              <input
                                type="text"
                                value={patient.cpf || ''}
                                onChange={(e) => updatePatientField(patient.tempId, 'cpf', e.target.value)}
                                className="w-full bg-surface-muted border border-border-ui rounded-lg px-2.5 py-1.5 text-xs text-text-main mt-0.5"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase">Queixa Principal / Anamnese</label>
                            <textarea
                              rows={2}
                              value={patient.mainComplaint || ''}
                              onChange={(e) => updatePatientField(patient.tempId, 'mainComplaint', e.target.value)}
                              className="w-full bg-surface-muted border border-border-ui rounded-lg p-2 text-xs text-text-main mt-0.5"
                            />
                          </div>

                          {/* Evoluções Preview Accordion List */}
                          {patient.evolucoes.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                Histórico de Sessões Extraídas ({patient.evolucoes.length})
                              </span>
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {patient.evolucoes.map((evo, eIdx) => (
                                  <div
                                    key={eIdx}
                                    className="bg-surface-muted/80 border border-border-ui rounded-xl p-2.5 text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-text-muted font-bold text-[10px]">
                                      <span>Sessão #{evo.sessionNumber}</span>
                                      <span>{evo.date} {evo.time ? `(${evo.time})` : ''}</span>
                                    </div>
                                    <p className="text-text-main leading-relaxed whitespace-pre-wrap">
                                      {evo.note}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: SAVING */}
            {step === 'saving' && (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                <Loader2 size={36} className="text-primary animate-spin" />
                <h4 className="text-lg font-bold text-text-main">
                  Importando dados para o Simplifica Psi...
                </h4>
                <p className="text-xs text-text-muted max-w-sm">
                  Criando prontuários clínicos, cadastros e associando suas evoluções de forma criptografada.
                </p>
              </div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === 'success' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300">
                <div className="w-20 h-20 rounded-3xl bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center shadow-xl shadow-green-500/10">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-2 max-w-md">
                  <h4 className="text-xl font-bold text-text-main">
                    Migração Concluída com Sucesso!
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    <strong>{importSummary.count} pacientes</strong> e <strong>{importSummary.evolucoesCount} relatos de sessão</strong> foram importados com sucesso para a sua conta.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {step === 'upload' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-surface-muted text-text-muted hover:text-text-main text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={files.length === 0}
                  onClick={handleStartProcessing}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    files.length > 0
                      ? 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20 active:scale-[0.99]'
                      : 'bg-surface-muted text-text-muted cursor-not-allowed opacity-50'
                  }`}
                >
                  <Sparkles size={16} />
                  Analisar Arquivos com IA ({files.length})
                </button>
              </>
            )}

            {step === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-surface-muted text-text-muted hover:text-text-main text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  ← Voltar aos Arquivos
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleConfirmImport}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedCount > 0
                      ? 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20 active:scale-[0.99]'
                      : 'bg-surface-muted text-text-muted cursor-not-allowed opacity-50'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  Confirmar e Importar ({selectedCount} {selectedCount === 1 ? 'Paciente' : 'Pacientes'})
                </button>
              </>
            )}

            {step === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-primary text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-90 transition-all cursor-pointer"
              >
                🚀 Ver Pacientes no Simplifica Psi
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
