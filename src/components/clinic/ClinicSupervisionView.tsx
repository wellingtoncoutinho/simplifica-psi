import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ChevronRight, 
  Search, 
  Plus, 
  Send, 
  Sparkles,
  BookOpen,
  UserCheck,
  Archive,
  RotateCcw,
  Check,
  Calendar
} from 'lucide-react';
import { Clinic, ClinicMember, Patient, Session, SupervisionCase } from '../../types';
import { 
  getDiscussedSupervisionCases, 
  toggleDiscussedSupervisionCase,
  getClinicSupervisionCases,
  updateSupervisionFeedback
} from '../../lib/clinicService';

interface ClinicSupervisionViewProps {
  clinic: Clinic;
  currentMember: ClinicMember | null;
  members: ClinicMember[];
  patients: Patient[];
  sessions: Session[];
}

export default function ClinicSupervisionView({
  clinic,
  currentMember,
  members,
  patients,
  sessions
}: ClinicSupervisionViewProps) {
  const [selectedSupervisedEmail, setSelectedSupervisedEmail] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'discussed' | 'all'>('pending');
  const [discussedCaseIds, setDiscussedCaseIds] = useState<string[]>(() => getDiscussedSupervisionCases(clinic.id));
  const [casesList, setCasesList] = useState<SupervisionCase[]>(() => getClinicSupervisionCases(clinic.id));
  const [archiveOnFeedback, setArchiveOnFeedback] = useState(true);
  const [feedbackSuccessNotice, setFeedbackSuccessNotice] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; patientName: string; psyName: string; feedback: string; date: string }>>([
    {
      id: 'fb_1',
      patientName: 'Ana Clara Albuquerque',
      psyName: 'Dra. Paula Silva',
      feedback: 'Excelente condução do RPD na sessão 4. Sugiro reforçar o experimento comportamental para testar a crença de desvalia durante a próxima semana.',
      date: '2026-09-02'
    }
  ]);

  useEffect(() => {
    setDiscussedCaseIds(getDiscussedSupervisionCases(clinic.id));
    setCasesList(getClinicSupervisionCases(clinic.id));
  }, [clinic.id]);

  // Lista de psicólogos supervisionados
  const supervisedPsychologists = useMemo(() => {
    return members.filter(m => m.role === 'psychologist');
  }, [members]);

  const supervisionCases = casesList;

  const handleToggleCaseStatus = (caseId: string, markAsDiscussed: boolean) => {
    const updated = toggleDiscussedSupervisionCase(clinic.id, caseId, markAsDiscussed);
    setDiscussedCaseIds(updated);

    if (markAsDiscussed) {
      setFeedbackSuccessNotice('Caso marcado como discutido e arquivado da fila ativa com sucesso!');
      if (selectedCase?.id === caseId && activeTab === 'pending') {
        setSelectedCase(null);
      }
    } else {
      setFeedbackSuccessNotice('Caso reaberto e retornado à fila ativa de supervisão!');
    }

    setTimeout(() => setFeedbackSuccessNotice(null), 3500);
  };

  const filteredByDoctorCases = useMemo(() => {
    if (selectedSupervisedEmail === 'all') return supervisionCases;
    return supervisionCases.filter(c => c.psychologistEmail === selectedSupervisedEmail);
  }, [supervisionCases, selectedSupervisedEmail]);

  // Contadores
  const pendingCount = useMemo(() => {
    return filteredByDoctorCases.filter(c => !discussedCaseIds.includes(c.id)).length;
  }, [filteredByDoctorCases, discussedCaseIds]);

  const discussedCount = useMemo(() => {
    return filteredByDoctorCases.filter(c => discussedCaseIds.includes(c.id)).length;
  }, [filteredByDoctorCases, discussedCaseIds]);

  const visibleCases = useMemo(() => {
    if (activeTab === 'pending') {
      return filteredByDoctorCases.filter(c => !discussedCaseIds.includes(c.id));
    }
    if (activeTab === 'discussed') {
      return filteredByDoctorCases.filter(c => discussedCaseIds.includes(c.id));
    }
    return filteredByDoctorCases;
  }, [filteredByDoctorCases, activeTab, discussedCaseIds]);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !selectedCase) return;

    const newFb = {
      id: `fb_${Date.now()}`,
      patientName: selectedCase.patientName,
      psyName: selectedCase.psychologistName,
      feedback: feedbackText.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    setFeedbacks([newFb, ...feedbacks]);

    const updated = updateSupervisionFeedback(clinic.id, selectedCase.id, feedbackText.trim());
    setCasesList(updated);

    if (archiveOnFeedback) {
      handleToggleCaseStatus(selectedCase.id, true);
    }

    setFeedbackText('');
    setFeedbackSuccessNotice('Orientação de supervisão enviada ao psicólogo com sucesso!');
    setTimeout(() => setFeedbackSuccessNotice(null), 3500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header do Módulo de Supervisão */}
      <div className="p-6 md:p-8 rounded-[28px] bg-card border border-border-ui shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-400 border-purple-500/20 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              Supervisão Clínica
            </span>
            <span className="text-xs text-text-muted">
              {clinic.name}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-main">
            Painel do Supervisor Clínico
          </h1>
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            Acompanhamento de casos, validação de formulações clínicas e emissão de orientações técnicas para os psicólogos da equipe.
          </p>
        </div>

        {/* Filtro por Psicólogo Supervisionado */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-muted border border-border-ui text-xs">
          <Users className="w-4 h-4 text-purple-400" />
          <select
            value={selectedSupervisedEmail}
            onChange={(e) => setSelectedSupervisedEmail(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-text-main outline-none cursor-pointer"
          >
            <option value="all">Todos os Psicólogos Supervisionados ({supervisedPsychologists.length})</option>
            {supervisedPsychologists.map((p) => (
              <option key={p.id} value={p.email}>{p.name || p.email}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerta de Feedback / Arquivamento */}
      {feedbackSuccessNotice && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2.5 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{feedbackSuccessNotice}</span>
        </motion.div>
      )}

      {/* Grid Principal: Casos em Supervisão & Pareceres */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna da Esquerda: Lista de Casos sob Supervisão (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Abas de Filtro: Pendentes / Discutidos / Todos */}
          <div className="flex items-center justify-between gap-2 border-b border-border-ui pb-2">
            <div className="flex items-center gap-1.5 bg-surface-muted p-1 rounded-2xl border border-border-ui">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <span>Fila Ativa / Pendentes</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-card text-text-muted'
                }`}>
                  {pendingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('discussed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'discussed'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <span>Discutidos / Concluídos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'discussed' ? 'bg-white/20 text-white' : 'bg-card text-text-muted'
                }`}>
                  {discussedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <span>Todos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-card text-text-muted'
                }`}>
                  {filteredByDoctorCases.length}
                </span>
              </button>
            </div>

            <span className="text-[11px] text-text-muted hidden sm:inline">
              {activeTab === 'pending' && 'Casos aguardando orientação ou discussão presencial'}
              {activeTab === 'discussed' && 'Casos já discutidos ou com supervisão presencial realizada'}
              {activeTab === 'all' && 'Todos os casos supervisionados'}
            </span>
          </div>

          <div className="space-y-3">
            {visibleCases.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border-ui rounded-2xl space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
                <p className="font-bold text-sm text-text-main">
                  {activeTab === 'pending' 
                    ? 'Nenhum caso pendente de supervisão no momento!'
                    : 'Nenhum caso nesta categoria.'}
                </p>
                <p className="text-xs text-text-muted">
                  {activeTab === 'pending'
                    ? 'Todos os casos enviados pelos terapeutas já foram discutidos ou concluídos.'
                    : 'Os casos discutidos aparecerão arquivados aqui para consulta futura.'}
                </p>
              </div>
            ) : (
              visibleCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const isDiscussed = discussedCaseIds.includes(c.id);

                return (
                  <div
                    key={c.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      isSelected
                        ? 'bg-purple-500/10 border-purple-500 text-text-main shadow-lg'
                        : isDiscussed
                        ? 'bg-surface-muted/60 border-border-ui opacity-90'
                        : 'bg-card border-border-ui hover:border-purple-500/40 text-text-main'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{c.patientName}</span>
                          <span className="text-xs text-text-muted">({c.age} anos)</span>
                        </div>
                        <p className="text-xs text-purple-400 font-semibold mt-0.5">
                          🩺 Terapeuta: {c.psychologistName} • {c.approach}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDiscussed ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Discutido / Concluído
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            c.needsReview 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {c.needsReview ? 'Revisão Pendente' : 'Acompanhamento'}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.complaint && (
                      <p className="text-xs text-text-muted leading-relaxed">
                        <strong className="text-text-main">Queixa Principal:</strong> {c.complaint}
                      </p>
                    )}

                    {/* Dúvidas trazidas pelo psicólogo */}
                    {c.psychologistDoubts && (
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-purple-400">
                          Dúvidas / Foco trazido pelo terapeuta:
                        </span>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{c.psychologistDoubts}</p>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-surface-muted text-xs text-text-muted leading-relaxed">
                      <strong className="text-text-main block mb-1">
                        Relato Clínico da Sessão {c.sessionNumber ? `(#${c.sessionNumber})` : (c.sessionsCount ? `(${c.sessionsCount}ª sessão)` : '')}:
                      </strong>
                      <p className="whitespace-pre-wrap leading-relaxed">{c.evolutionNote || c.lastEvolutionSummary}</p>
                    </div>

                    {c.feedback && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-400">
                          Parecer do Supervisor ({c.reviewedAt ? new Date(c.reviewedAt).toLocaleDateString() : 'Registrado'}):
                        </span>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{c.feedback}</p>
                      </div>
                    )}

                    {/* Barra de Ações Rápidas do Caso */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-ui/60 text-xs">
                      <span className="text-text-muted text-[11px]">{c.sessionsCount} sessões registradas</span>

                      <div className="flex items-center gap-2">
                        {isDiscussed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCaseStatus(c.id, false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-card hover:bg-surface-muted border border-border-ui text-text-muted hover:text-text-main text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                            title="Devolver caso para a fila ativa de pendentes"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reabrir Caso</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCaseStatus(c.id, true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 transition-all"
                            title="Marcar que o caso já foi discutido em supervisão presencial e retirar da fila ativa"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>✓ Já Discutido (Presencial)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedCase(c)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Emitir Parecer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna da Direita: Emissão de Feedback e Histórico (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border-ui space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Orientação do Supervisor para o Caso
            </h3>

            {selectedCase ? (
              <form onSubmit={handleSendFeedback} className="space-y-3">
                <div className="p-3 rounded-xl bg-surface-muted text-xs space-y-1">
                  <span className="text-text-muted block text-[11px]">Caso Selecionado:</span>
                  <p className="font-bold text-text-main">{selectedCase.patientName}</p>
                  <p className="text-purple-400 font-medium text-[11px]">{selectedCase.psychologistName}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Parecer Técnico / Recomendações Terapêuticas:
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Digite aqui os apontamentos clínicos, sugestões de intervenção, manejo de transferência ou temas para a próxima sessão..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-muted border border-border-ui focus:border-purple-500 text-xs focus:outline-none leading-relaxed"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted pt-1">
                  <input
                    type="checkbox"
                    checked={archiveOnFeedback}
                    onChange={(e) => setArchiveOnFeedback(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                  <span>Concluir e arquivar caso da fila ativa após o envio</span>
                </label>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCase(null)}
                    className="py-2.5 px-3 rounded-xl bg-surface-muted hover:bg-card border border-border-ui text-text-muted text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar Parecer para o Psicólogo
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 text-center text-xs text-text-muted border border-dashed border-border-ui rounded-xl space-y-2">
                <GraduationCap className="w-8 h-8 text-text-muted mx-auto opacity-40" />
                <p>Selecione um caso ao lado para emitir orientações técnicas.</p>
                <p className="text-[11px] text-text-muted">
                  Casos discutidos em supervisão presencial podem ser arquivados diretamente no botão <strong>"✓ Já Discutido"</strong> no card.
                </p>
              </div>
            )}
          </div>

          {/* Histórico de Pareceres Emitidos */}
          <div className="p-5 rounded-2xl bg-card border border-border-ui space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Pareceres Recentes Emitidos ({feedbacks.length})
            </h3>

            <div className="space-y-2.5">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="p-3 rounded-xl bg-surface-muted border border-border-ui text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-main">{fb.patientName}</span>
                    <span className="text-[10px] text-text-muted">{fb.date}</span>
                  </div>
                  <p className="text-[11px] text-purple-400 font-semibold">{fb.psyName}</p>
                  <p className="text-[11px] text-text-muted italic leading-relaxed">"{fb.feedback}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
