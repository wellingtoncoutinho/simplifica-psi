import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  FileText, 
  Sliders, 
  ShieldCheck, 
  Lock,
  ChevronDown,
  Download,
  Filter
} from 'lucide-react';
import { Clinic, ClinicMember, Session } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { saveClinicSessions, saveClinic } from '../../lib/clinicService';

interface ClinicFinanceViewProps {
  clinic: Clinic;
  members: ClinicMember[];
  sessions: Session[];
  currentMember: ClinicMember | null;
  onUpdateSession?: (session: Session) => void;
  onUpdateClinic?: (updatedClinic: Clinic) => void;
}

export default function ClinicFinanceView({
  clinic,
  members,
  sessions,
  currentMember,
  onUpdateSession,
  onUpdateClinic
}: ClinicFinanceViewProps) {
  const isPsychologist = currentMember?.role === 'psychologist';
  const defaultRate = clinic.settings?.defaultCommissionRate ?? 60; // 60% padrão se não configurado

  // Filtro de Mês/Período
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [isCommissionConfigModalOpen, setIsCommissionConfigModalOpen] = useState(false);
  const [newDefaultRate, setNewDefaultRate] = useState<number>(defaultRate);
  const [memberCustomRates, setMemberCustomRates] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    members.forEach(m => {
      if (m.commissionRate !== undefined) {
        map[m.id] = m.commissionRate;
        map[m.email] = m.commissionRate;
      }
    });
    return map;
  });

  const psychologists = useMemo(() => {
    return members.filter(m => m.role === 'psychologist');
  }, [members]);

  // Filtragem de sessões por mês
  const monthSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchMonth = !selectedMonth || (s.date && s.date.startsWith(selectedMonth));
      const notCancelled = s.status !== 'Cancelada' && s.status !== 'Desmarcou';
      return matchMonth && notCancelled;
    });
  }, [sessions, selectedMonth]);

  // Helper para obter a taxa de comissão de um psicólogo
  const getPsychologistCommissionRate = (psyIdOrEmail: string): number => {
    if (memberCustomRates[psyIdOrEmail] !== undefined) {
      return memberCustomRates[psyIdOrEmail];
    }
    const member = members.find(m => m.id === psyIdOrEmail || m.email === psyIdOrEmail);
    if (member && member.commissionRate !== undefined) {
      return member.commissionRate;
    }
    return defaultRate;
  };

  // ========================================================
  // CÁLCULOS PARA ADMIN E RECEPÇÃO (VISÃO GERAL DA CLÍNICA)
  // ========================================================
  const clinicOverview = useMemo(() => {
    let grossRevenue = 0;
    let totalRepasseToPsychologists = 0;
    let completedSessionsCount = 0;

    monthSessions.forEach(s => {
      const amount = s.amount || 0;
      grossRevenue += amount;
      completedSessionsCount += 1;

      const rate = s.clinicCommissionRate ?? getPsychologistCommissionRate(s.psychologistId || '');
      const repasse = (amount * rate) / 100;
      totalRepasseToPsychologists += repasse;
    });

    const clinicNetProfit = grossRevenue - totalRepasseToPsychologists;
    const clinicMarginPercent = grossRevenue > 0 ? Math.round((clinicNetProfit / grossRevenue) * 100) : 0;

    return {
      grossRevenue,
      totalRepasseToPsychologists,
      clinicNetProfit,
      clinicMarginPercent,
      completedSessionsCount
    };
  }, [monthSessions, memberCustomRates, defaultRate]);

  // Performance e Repasse por Psicólogo
  const psychologistPerformance = useMemo(() => {
    return psychologists.map(psy => {
      const psySessions = monthSessions.filter(s => 
        s.psychologistId === psy.id || 
        s.psychologistId === psy.email || 
        s.psychologistName === psy.name
      );

      const rate = getPsychologistCommissionRate(psy.email);
      let gross = 0;
      let repasseTotal = 0;
      let repassePaid = 0;
      let repassePending = 0;

      psySessions.forEach(s => {
        const amt = s.amount || 0;
        gross += amt;
        const rep = (amt * (s.clinicCommissionRate ?? rate)) / 100;
        repasseTotal += rep;
        if (s.clinicCommissionPaid) {
          repassePaid += rep;
        } else {
          repassePending += rep;
        }
      });

      const clinicRetained = gross - repasseTotal;

      return {
        member: psy,
        rate,
        sessionCount: psySessions.length,
        gross,
        repasseTotal,
        repassePaid,
        repassePending,
        clinicRetained,
        sessions: psySessions
      };
    });
  }, [psychologists, monthSessions, memberCustomRates, defaultRate]);

  // ========================================================
  // CÁLCULOS EXCLUSIVOS DO PSICÓLOGO LOGADO (PRIVACIDADE MÁXIMA)
  // ========================================================
  const myPsychologistFinance = useMemo(() => {
    if (!isPsychologist || !currentMember) return null;

    const myEmail = currentMember.email.toLowerCase().trim();
    const myId = currentMember.id.toLowerCase().trim();
    const myName = (currentMember.name || '').toLowerCase().trim();

    const mySessions = monthSessions.filter(s => {
      const sessPsyId = (s.psychologistId || '').toLowerCase().trim();
      const sessPsyName = (s.psychologistName || '').toLowerCase().trim();
      return sessPsyId === myEmail || sessPsyId === myId || (myName !== '' && sessPsyName === myName);
    });

    const myRate = getPsychologistCommissionRate(currentMember.email);
    let totalGrossGenerated = 0;
    let totalToReceive = 0;
    let totalAlreadyPaid = 0;
    let totalPending = 0;

    const sessionRows = mySessions.map(s => {
      const amt = s.amount || 0;
      totalGrossGenerated += amt;
      const rate = s.clinicCommissionRate ?? myRate;
      const netAmount = (amt * rate) / 100;
      totalToReceive += netAmount;

      if (s.clinicCommissionPaid) {
        totalAlreadyPaid += netAmount;
      } else {
        totalPending += netAmount;
      }

      return {
        ...s,
        appliedRate: rate,
        netAmount
      };
    });

    return {
      rate: myRate,
      sessionsCount: mySessions.length,
      totalGrossGenerated,
      totalToReceive,
      totalAlreadyPaid,
      totalPending,
      sessionRows
    };
  }, [isPsychologist, currentMember, monthSessions, memberCustomRates, defaultRate]);

  // Ação: Liquidar todos os repasses pendentes de um psicólogo
  const handleLiquidatePsychologistRepasse = (psyEmail: string) => {
    if (!confirm(`Confirmar liquidação de repasses para este profissional no mês selecionado?`)) return;

    const updated = sessions.map(s => {
      const matchMonth = !selectedMonth || (s.date && s.date.startsWith(selectedMonth));
      const matchPsy = s.psychologistId === psyEmail || s.psychologistName === psyEmail;
      if (matchMonth && matchPsy) {
        return {
          ...s,
          clinicCommissionPaid: true
        };
      }
      return s;
    });

    saveClinicSessions(clinic.id, updated);
    if (onUpdateSession) {
      updated.forEach(s => {
        const orig = sessions.find(o => o.id === s.id);
        if (orig && orig.clinicCommissionPaid !== s.clinicCommissionPaid) {
          onUpdateSession(s);
        }
      });
    }
    alert('Repasses do profissional marcados como liquidados com sucesso!');
  };

  // Salvar configurações de comissão da clínica
  const handleSaveCommissionSettings = async () => {
    const updatedSettings = {
      ...clinic.settings,
      defaultCommissionRate: newDefaultRate
    };

    const updatedClinic: Clinic = {
      ...clinic,
      settings: updatedSettings
    };

    // Salva membros com taxas personalizadas no LocalStorage
    try {
      localStorage.setItem(`simplepsi_clinic_rates_${clinic.id}`, JSON.stringify(memberCustomRates));
    } catch (e) {}

    await saveClinic(updatedClinic);
    if (onUpdateClinic) {
      onUpdateClinic(updatedClinic);
    }
    setIsCommissionConfigModalOpen(false);
    alert('Políticas de repasse e comissão atualizadas com sucesso!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header do Financeiro */}
      <div className="p-6 md:p-8 rounded-[28px] bg-card border border-border-ui shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              {isPsychologist ? 'Extrato & Repasses' : 'Gestão Financeira & Comissões'}
            </span>
            <span className="text-xs text-text-muted">
              {clinic.name}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-main">
            {isPsychologist ? 'Meus Atendimentos & Repasses' : 'Faturamento & Repasses aos Psicólogos'}
          </h1>
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            {isPsychologist 
              ? 'Acompanhe com transparência o valor líquido dos seus repasses a receber da clínica por cada atendimento realizado.'
              : 'Gestão completa do faturamento bruto da clínica, divisão de comissões por psicólogo(a) e controle de liquidações.'}
          </p>
        </div>

        {/* Controles de Período e Configuração */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-muted border border-border-ui px-3.5 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-text-muted" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-text-main outline-none font-semibold cursor-pointer"
            />
          </div>

          {!isPsychologist && (
            <button
              onClick={() => setIsCommissionConfigModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-surface-muted hover:bg-card border border-border-ui text-text-main font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <Sliders className="w-4 h-4 text-primary" />
              <span>Regras de Repasse ({defaultRate}%)</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* CENÁRIO 1: VISÃO DO PSICÓLOGO (CONFIDENCIALIDADE RIGOROSA) */}
      {/* ======================================================== */}
      {isPsychologist && myPsychologistFinance && (
        <div className="space-y-6">
          {/* Métricas do Psicólogo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Taxa de Repasse Acordada</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-primary">{myPsychologistFinance.rate}%</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">Percentual do valor de cada sessão</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Sessões no Mês</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-text-main">{myPsychologistFinance.sessionsCount}</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">Atendimentos contabilizados</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total a Receber da Clínica</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-400">
                  {formatCurrency(myPsychologistFinance.totalToReceive)}
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">Soma dos seus repasses no período</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Status dos Repasses</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400">
                  Pendente: {formatCurrency(myPsychologistFinance.totalPending)}
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold">
                Liquidado: {formatCurrency(myPsychologistFinance.totalAlreadyPaid)}
              </p>
            </div>
          </div>

          {/* Tabela de Atendimentos Pessoais com Repasses */}
          <div className="border border-border-ui rounded-3xl overflow-hidden bg-card shadow-sm space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-main">Detalhamento dos Atendimentos</h3>
                <p className="text-xs text-text-muted">Extrato individual das suas sessões e o repasse calculado</p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Extrato Pessoal Seguro
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-text-main">
                <thead className="bg-surface-muted text-[11px] font-bold uppercase text-text-muted border-b border-border-ui">
                  <tr>
                    <th className="p-3.5">Data / Hora</th>
                    <th className="p-3.5">Paciente</th>
                    <th className="p-3.5">Modalidade</th>
                    <th className="p-3.5">Valor Cobrado</th>
                    <th className="p-3.5">Sua Comissão</th>
                    <th className="p-3.5">Seu Repasse Líquido</th>
                    <th className="p-3.5 text-right">Status do Repasse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {myPsychologistFinance.sessionRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-muted">
                        Nenhum atendimento registrado neste mês.
                      </td>
                    </tr>
                  ) : (
                    myPsychologistFinance.sessionRows.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-muted/60 transition-colors">
                        <td className="p-3.5 font-medium">
                          {s.date} <span className="text-text-muted text-[11px]">às {s.time}</span>
                        </td>
                        <td className="p-3.5 font-bold">
                          {s.patientName || 'Atendimento'}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border-ui text-[10px]">
                            {s.type}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-text-muted">
                          {formatCurrency(s.amount || 0)}
                        </td>
                        <td className="p-3.5 font-semibold text-primary">
                          {s.appliedRate}%
                        </td>
                        <td className="p-3.5 font-bold font-mono text-emerald-400">
                          {formatCurrency(s.netAmount)}
                        </td>
                        <td className="p-3.5 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            s.clinicCommissionPaid 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {s.clinicCommissionPaid ? 'Liquidado ✓' : 'Aguardando Repasse'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CENÁRIO 2: VISÃO DO GESTOR/ADMIN E RECEPÇÃO (CLÍNICA GERAL) */}
      {/* ======================================================== */}
      {!isPsychologist && (
        <div className="space-y-8">
          
          {/* KPIs Executivos da Clínica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Faturamento Bruto da Clínica</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-text-main">
                  {formatCurrency(clinicOverview.grossRevenue)}
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">{clinicOverview.completedSessionsCount} sessões faturadas no período</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total em Repasses aos Psicólogos</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-amber-400">
                  {formatCurrency(clinicOverview.totalRepasseToPsychologists)}
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">Média de repasse: ~{defaultRate}% por sessão</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Margem Retida na Clínica</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-400">
                  {formatCurrency(clinicOverview.clinicNetProfit)}
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold">{clinicOverview.clinicMarginPercent}% retido para custos e lucro</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Corpo Clínico Ativo</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-purple-400">{psychologists.length}</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">Psicólogos em atendimento</p>
            </div>
          </div>

          {/* Tabela de Repasses por Psicólogo */}
          <div className="border border-border-ui rounded-3xl overflow-hidden bg-card shadow-sm space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-text-main">Repasses & Comissões por Psicólogo</h3>
                <p className="text-xs text-text-muted">Acompanhamento do faturamento por profissional e liquidação de repasses</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCommissionConfigModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Ajustar % de Comissões
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-text-main">
                <thead className="bg-surface-muted text-[11px] font-bold uppercase text-text-muted border-b border-border-ui">
                  <tr>
                    <th className="p-3.5">Profissional</th>
                    <th className="p-3.5">CRP</th>
                    <th className="p-3.5">% Repasse</th>
                    <th className="p-3.5">Sessões</th>
                    <th className="p-3.5">Faturamento Bruto</th>
                    <th className="p-3.5">Repasse ao Psicólogo</th>
                    <th className="p-3.5">Fica na Clínica</th>
                    <th className="p-3.5 text-right">Ação / Liquidação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {psychologistPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-text-muted">
                        Nenhum psicólogo cadastrado na equipe.
                      </td>
                    </tr>
                  ) : (
                    psychologistPerformance.map((p) => (
                      <tr key={p.member.id} className="hover:bg-surface-muted/60 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                              {(p.member.name || p.member.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold">{p.member.name || p.member.email}</p>
                              <p className="text-[10px] text-text-muted">{p.member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-text-muted">
                          {p.member.crp || '06/--'}
                        </td>
                        <td className="p-3.5 font-bold text-primary">
                          {p.rate}%
                        </td>
                        <td className="p-3.5 font-semibold">
                          {p.sessionCount}
                        </td>
                        <td className="p-3.5 font-mono text-text-muted">
                          {formatCurrency(p.gross)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-amber-400">
                          {formatCurrency(p.repasseTotal)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {formatCurrency(p.clinicRetained)}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleLiquidatePsychologistRepasse(p.member.email)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Liquidar Repasse
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Comissões e Repasses */}
      <AnimatePresence>
        {isCommissionConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border-ui rounded-3xl p-6 shadow-2xl space-y-5 text-text-main"
            >
              <div className="flex items-center justify-between border-b border-border-ui pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Políticas de Repasse & Comissões</h3>
                    <p className="text-xs text-text-muted">Defina a porcentagem que vai para o psicólogo vs clínica</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCommissionConfigModalOpen(false)}
                  className="p-2 rounded-xl text-text-muted hover:text-text-main"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Taxa Padrão */}
                <div className="p-4 rounded-2xl bg-surface-muted border border-border-ui space-y-2">
                  <label className="block font-bold text-text-main">
                    Taxa Padrão de Repasse da Clínica (%)
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Aplicada automaticamente a todos os psicólogos que não possuem taxa individual específica.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={newDefaultRate}
                      onChange={(e) => setNewDefaultRate(Number(e.target.value))}
                      className="flex-1 accent-primary cursor-pointer"
                    />
                    <span className="font-mono font-bold text-base text-primary w-12 text-right">
                      {newDefaultRate}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted pt-1">
                    <span>Psicólogo recebe: <strong>{newDefaultRate}%</strong></span>
                    <span>Clínica retém: <strong>{100 - newDefaultRate}%</strong></span>
                  </div>
                </div>

                {/* Taxas Individuais por Psicólogo */}
                <div className="space-y-2 pt-2">
                  <label className="block font-bold text-text-main">
                    Taxa Individual por Profissional (Opcional)
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {psychologists.map((psy) => {
                      const currentVal = memberCustomRates[psy.email] ?? newDefaultRate;
                      return (
                        <div key={psy.id} className="p-2.5 rounded-xl bg-surface-muted border border-border-ui flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{psy.name || psy.email}</p>
                            <p className="text-[10px] text-text-muted">{psy.crp || 'Sem CRP'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min="10"
                              max="95"
                              value={currentVal}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setMemberCustomRates(prev => ({ ...prev, [psy.email]: v, [psy.id]: v }));
                              }}
                              className="w-16 px-2 py-1 rounded-lg bg-card border border-border-ui text-center font-mono text-xs font-bold outline-none focus:border-primary"
                            />
                            <span className="text-text-muted font-bold text-xs">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-ui">
                  <button
                    type="button"
                    onClick={() => setIsCommissionConfigModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-text-muted font-semibold text-xs hover:bg-card"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCommissionSettings}
                    className="px-5 py-2.5 rounded-xl bg-primary text-text-main font-bold text-xs hover:opacity-90 transition-all shadow-md shadow-primary/20"
                  >
                    Salvar Regras de Repasse
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
