import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Building, 
  Clock, 
  DoorOpen, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { Clinic, ClinicMember, Session, Patient } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

interface ClinicDashboardViewProps {
  clinic: Clinic;
  currentMember: ClinicMember | null;
  members: ClinicMember[];
  sessions: Session[];
  patients: Patient[];
  isPrivacyMode?: boolean;
  onOpenTeamModal: () => void;
  onGoToMasterAgenda: () => void;
  onOpenNewSessionModal: () => void;
  onSelectPatient?: (patientId: string) => void;
}

export default function ClinicDashboardView({
  clinic,
  currentMember,
  members,
  sessions,
  patients,
  isPrivacyMode = false,
  onOpenTeamModal,
  onGoToMasterAgenda,
  onOpenNewSessionModal,
  onSelectPatient
}: ClinicDashboardViewProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtra psicólogos da equipe
  const psychologists = useMemo(() => {
    return members.filter(m => m.role === 'psychologist');
  }, [members]);

  const maxPsychologistSeats = clinic.maxSeats || 7;
  const usedPsychologistSeats = psychologists.length;
  const availablePsychologistSeats = Math.max(0, maxPsychologistSeats - usedPsychologistSeats);

  // Atendimentos de hoje na clínica
  const todaySessions = useMemo(() => {
    return sessions
      .filter(s => s.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [sessions, todayStr]);

  // Faturamento estimado da clínica no mês
  const estimatedRevenueMonth = useMemo(() => {
    return sessions.reduce((acc, s) => {
      if (s.status !== 'Cancelada') {
        return acc + (Number(s.amount) || 0);
      }
      return acc;
    }, 0);
  }, [sessions]);

  // Taxa de ocupação de salas
  const roomsCount = clinic.settings?.rooms?.length || 3;
  const occupiedRoomsToday = useMemo(() => {
    const activeRooms = new Set(todaySessions.map(s => s.room).filter(Boolean));
    return activeRooms.size;
  }, [todaySessions]);

  const roleBadgeMap: Record<string, { label: string; color: string }> = {
    clinic_admin: { label: 'Administrador(a) / Gestor(a)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    psychologist: { label: 'Psicólogo(a) Clínico(a)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    supervisor: { label: 'Supervisor(a) Clínico(a)', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    receptionist: { label: 'Recepção & Secretaria', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
  };

  const currentRoleInfo = roleBadgeMap[currentMember?.role || 'clinic_admin'] || roleBadgeMap.clinic_admin;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Banner de Boas-vindas da Clínica */}
      <div className="relative overflow-hidden rounded-[28px] border border-border-ui bg-gradient-to-br from-card via-surface-muted to-card p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                Painel da Clínica
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${currentRoleInfo.color}`}>
                Perfil: {currentRoleInfo.label}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-main flex items-center gap-3">
              {clinic.name}
            </h1>
            <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
              Gestão centralizada de atendimentos, ocupação de salas e acompanhamento da equipe de profissionais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewSessionModal}
              className="px-4 py-2.5 rounded-xl bg-primary text-text-main text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
            <button
              onClick={onOpenTeamModal}
              className="px-4 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-text-main text-xs font-bold hover:bg-card transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-primary" />
              Gerenciar Equipe ({usedPsychologistSeats}/{maxPsychologistSeats} Vagas)
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais da Clínica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* Card 1: Vagas de Psicólogos */}
        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm hover:border-primary/40 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Vagas de Psicólogos</span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-black text-text-main transition-all", isPrivacyMode && "privacy-blur-strong")}>{usedPsychologistSeats} / {maxPsychologistSeats}</span>
              <span className={cn("text-xs font-semibold text-emerald-400 transition-all", isPrivacyMode && "privacy-blur")}>
                ({availablePsychologistSeats} livres)
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Admin & Recepção não consomem vagas
            </p>
          </div>
        </div>

        {/* Card 2: Atendimentos Hoje */}
        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm hover:border-primary/40 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Atendimentos Hoje</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-black text-text-main transition-all", isPrivacyMode && "privacy-blur-strong")}>{todaySessions.length}</span>
              <span className="text-xs text-text-muted">sessões agendadas</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Em {psychologists.length || 1} profissionais ativos
            </p>
          </div>
        </div>

        {/* Card 3: Salas em Uso */}
        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm hover:border-primary/40 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Ocupação de Salas</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-black text-text-main transition-all", isPrivacyMode && "privacy-blur-strong")}>{occupiedRoomsToday} / {roomsCount}</span>
              <span className="text-xs text-text-muted">salas ativas hoje</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {roomsCount} salas cadastradas na clínica
            </p>
          </div>
        </div>

        {/* Card 4: Faturamento Estimado */}
        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm hover:border-primary/40 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Faturamento da Clínica</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-black text-emerald-400 transition-all", isPrivacyMode && "privacy-blur-strong")}>{formatCurrency(estimatedRevenueMonth)}</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Total previsto de atendimentos no mês
            </p>
          </div>
        </div>

      </div>

      {/* Seção Principal: Agenda Geral de Hoje & Equipe de Psicólogos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna da Esquerda: Atendimentos de Hoje (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-text-main">
                Atendimentos de Hoje na Clínica ({todaySessions.length})
              </h2>
            </div>
            <button
              onClick={onGoToMasterAgenda}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Ver Agenda Diária Geral
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="border border-border-ui rounded-2xl bg-card overflow-hidden divide-y divide-border-ui">
            {todaySessions.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Clock className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                <p className="text-sm font-medium text-text-muted">
                  Nenhum atendimento agendado para hoje.
                </p>
                <button
                  onClick={onOpenNewSessionModal}
                  className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-all"
                >
                  + Agendar Primeira Consulta
                </button>
              </div>
            ) : (
              todaySessions.map((session) => {
                const statusColors: Record<string, string> = {
                  Agendada: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  Confirmada: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  'Em Atendimento': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  Realizada: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                  Desmarcou: 'bg-red-500/10 text-red-400 border-red-500/20',
                  Cancelada: 'bg-red-500/10 text-red-400 border-red-500/20',
                };
                const badgeStyle = statusColors[session.status] || statusColors.Agendada;

                return (
                  <div key={session.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-muted/50 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border-ui flex flex-col items-center justify-center font-mono shrink-0">
                        <span className="text-xs font-bold text-text-main">{session.time}</span>
                        <span className="text-[10px] text-text-muted">{session.duration || '50min'}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-bold text-sm text-text-main transition-all", isPrivacyMode && "privacy-blur")}>
                            {session.patientName || 'Paciente'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}`}>
                            {session.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          <span className="text-primary font-medium">
                            🩺 {session.psychologistName || 'Psicólogo'}
                          </span>
                          {session.room && (
                            <span className="flex items-center gap-1">
                              🚪 {session.room}
                            </span>
                          )}
                          <span>
                            {session.type === 'Online' ? '🌐 Online' : '🏢 Presencial'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className={cn("text-xs font-bold font-mono text-emerald-400 transition-all", isPrivacyMode && "privacy-blur-strong")}>
                        {formatCurrency(session.amount || 0)}
                      </span>
                      {session.paid ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          Pago
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna da Direita: Equipe de Psicólogos & Ocupação (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-main">
              Equipe de Psicólogos ({psychologists.length})
            </h2>
            <button
              onClick={onOpenTeamModal}
              className="text-xs font-bold text-primary hover:underline"
            >
              Ver Todos
            </button>
          </div>

          <div className="border border-border-ui rounded-2xl bg-card p-4 space-y-3">
            {psychologists.map((psy) => {
              // Conta sessões de hoje deste psicólogo
              const psyTodaySessions = todaySessions.filter(s => s.psychologistId === psy.id || s.psychologistName === psy.name);

              return (
                <div key={psy.id} className="p-3 rounded-xl bg-surface-muted border border-border-ui flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                      {(psy.name || psy.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-text-main truncate">{psy.name || psy.email}</p>
                      <p className="text-[10px] text-text-muted truncate">CRP: {psy.crp || 'Ativo'}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-primary font-mono">{psyTodaySessions.length}</span>
                    <span className="text-[10px] text-text-muted block">hoje</span>
                  </div>
                </div>
              );
            })}

            {availablePsychologistSeats > 0 && (
              <button
                onClick={onOpenTeamModal}
                className="w-full py-2.5 rounded-xl border border-dashed border-border-ui hover:border-primary text-text-muted hover:text-primary text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Convidar Psicólogo ({availablePsychologistSeats} vagas livres)
              </button>
            )}
          </div>

          {/* Card Informativo de Salas */}
          <div className="border border-border-ui rounded-2xl bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-text-main">
              <DoorOpen className="w-4 h-4 text-primary" />
              <span>Salas de Atendimento ({roomsCount})</span>
            </div>
            <div className="space-y-1.5">
              {(clinic.settings?.rooms || ['Sala 01 - Presencial', 'Sala 02 - Infantil', 'Sala 03 - Online']).map((room, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-muted">
                  <span className="text-text-muted font-medium">{room}</span>
                  <span className="text-[10px] font-semibold text-emerald-400">Disponível</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
