import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  DoorOpen, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Search,
  X,
  User,
  DollarSign,
  Phone,
  Video,
  MapPin,
  Sparkles
} from 'lucide-react';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clinic, ClinicMember, Session, Patient } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface ClinicMasterAgendaViewProps {
  clinic: Clinic;
  members: ClinicMember[];
  sessions: Session[];
  patients: Patient[];
  onAddSession: (sessionData: Partial<Session>) => void;
  onUpdateSession: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
  currentMember: ClinicMember | null;
}

export default function ClinicMasterAgendaView({
  clinic,
  members,
  sessions,
  patients,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  currentMember
}: ClinicMasterAgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedPsychologistFilter, setSelectedPsychologistFilter] = useState<string>('all');
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<Session | null>(null);

  // Form de novo agendamento
  const [formData, setFormData] = useState({
    patientName: '',
    psychologistEmail: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    time: '09:00',
    duration: '50min',
    room: clinic.settings?.rooms?.[0] || 'Sala 01 - Presencial',
    type: 'Presencial' as 'Presencial' | 'Online',
    status: 'Agendada' as 'Agendada' | 'Confirmada' | 'Realizada' | 'Cancelada' | 'Em Atendimento' | 'Desmarcou',
    amount: 180,
    paid: false,
    notes: ''
  });

  const psychologists = useMemo(() => {
    return members.filter(m => m.role === 'psychologist');
  }, [members]);

  const activeRooms = useMemo(() => {
    return clinic.settings?.rooms || ['Sala 01 - Presencial', 'Sala 02 - Infantil', 'Sala 03 - Online'];
  }, [clinic]);

  const dateStr = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  const formattedDateTitle = useMemo(() => {
    return format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
  }, [selectedDate]);

  // Horários da grade da clínica (08:00 às 20:00)
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00'
  ];

  // Filtra as sessões do dia selecionado (incluindo sessões registradas e sessões recorrentes de pacientes)
  const filteredSessions = useMemo(() => {
    const dayName = format(selectedDate, 'eeee', { locale: ptBR });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    const allSessions: Session[] = [];

    // 1. Sessões registradas
    const recordedSessions = sessions.filter(s => s.date === dateStr);
    recordedSessions.forEach(s => allSessions.push(s));

    // 2. Sessões recorrentes dos pacientes vinculados à clínica ou psicólogos da clínica
    patients.forEach(p => {
      if (p.status === 'Inativo') return;
      if (p.sessionDay === capitalizedDayName && p.sessionTime && p.sessionDay !== '' && p.sessionDay !== 'Nenhum') {
        const hasRecorded = recordedSessions.some(s => s.patientId === p.id);
        if (hasRecorded) return;

        const assignedPsy = psychologists.find(
          psy => psy.email === p.psychologistId || psy.id === p.psychologistId || psy.name === p.psychologistName
        );

        allSessions.push({
          id: `virtual-${p.id}-${dateStr}`,
          clinicId: clinic.id,
          patientId: p.id,
          patientName: p.name,
          psychologistId: p.psychologistId || assignedPsy?.email || '',
          psychologistName: p.psychologistName || assignedPsy?.name || 'Psicólogo(a)',
          date: dateStr,
          time: p.sessionTime,
          duration: '50min',
          room: p.modality === 'Online' ? (activeRooms[2] || 'Sala 03 - Atendimento Online') : (activeRooms[0] || 'Sala 01 - Presencial'),
          type: (p.modality === 'Online' ? 'Online' : 'Presencial') as 'Presencial' | 'Online',
          status: 'Agendada',
          amount: p.amount || 180,
          paid: false,
          notes: 'Sessão Recorrente do Paciente'
        });
      }
    });

    return allSessions.filter(s => {
      const matchRoom = selectedRoomFilter === 'all' || s.room === selectedRoomFilter;
      const matchPsy = selectedPsychologistFilter === 'all' || 
        s.psychologistId === selectedPsychologistFilter || 
        s.psychologistName === selectedPsychologistFilter;
      return matchRoom && matchPsy;
    });
  }, [sessions, patients, dateStr, selectedDate, selectedRoomFilter, selectedPsychologistFilter, psychologists, clinic.id, activeRooms]);

  // Lista de psicólogos a exibir nas colunas
  const displayedPsychologists = useMemo(() => {
    if (selectedPsychologistFilter === 'all') {
      return psychologists.length > 0 ? psychologists : [
        { id: 'default_psy_1', email: 'paula.psi@reinventar.com', name: 'Dra. Paula Silva', role: 'psychologist', status: 'active', clinicId: clinic.id },
        { id: 'default_psy_2', email: 'ricardo.psi@reinventar.com', name: 'Dr. Ricardo Mendes', role: 'psychologist', status: 'active', clinicId: clinic.id }
      ] as ClinicMember[];
    }
    return psychologists.filter(p => p.id === selectedPsychologistFilter || p.email === selectedPsychologistFilter);
  }, [psychologists, selectedPsychologistFilter, clinic.id]);

  const canManageSession = (session: Session | null): boolean => {
    if (!session || !currentMember) return false;
    if (currentMember.role === 'clinic_admin' || currentMember.role === 'receptionist') return true;
    if (currentMember.role === 'psychologist') {
      const psyEmail = (currentMember.email || '').toLowerCase().trim();
      const psyId = (currentMember.id || '').toLowerCase().trim();
      const sessPsyId = (session.psychologistId || '').toLowerCase().trim();
      const sessPsyName = (session.psychologistName || '').toLowerCase().trim();
      const memberName = (currentMember.name || '').toLowerCase().trim();

      return sessPsyId === psyEmail || sessPsyId === psyId || (memberName !== '' && sessPsyName === memberName);
    }
    return false;
  };

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handleOpenCreateForSlot = (psyEmail: string, time: string) => {
    let targetPsyEmail = psyEmail;
    // Se o usuário for psicólogo, só pode agendar para si mesmo
    if (currentMember?.role === 'psychologist' && currentMember.email) {
      targetPsyEmail = currentMember.email;
    }
    setFormData({
      patientName: '',
      psychologistEmail: targetPsyEmail,
      date: dateStr,
      time: time,
      duration: '50min',
      room: activeRooms[0] || 'Sala 01 - Presencial',
      type: 'Presencial',
      status: 'Agendada',
      amount: 180,
      paid: false,
      notes: ''
    });
    setIsNewAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName.trim()) {
      alert('Informe o nome do paciente.');
      return;
    }

    const psy = psychologists.find(p => p.email === formData.psychologistEmail || p.id === formData.psychologistEmail);
    const matchedPatient = patients.find(p => p.name.toLowerCase() === formData.patientName.trim().toLowerCase());

    const newSession: Partial<Session> = {
      id: `session_${Date.now()}`,
      clinicId: clinic.id,
      patientId: matchedPatient ? matchedPatient.id : `pat_${Date.now()}`,
      patientName: matchedPatient ? matchedPatient.name : formData.patientName.trim(),
      psychologistId: formData.psychologistEmail,
      psychologistName: psy?.name || formData.psychologistEmail,
      date: formData.date || dateStr,
      time: formData.time,
      duration: formData.duration,
      room: formData.room,
      type: formData.type,
      status: formData.status,
      amount: Number(formData.amount) || 0,
      paid: formData.paid,
      notes: formData.notes
    };

    onAddSession(newSession);
    setIsNewAppointmentModalOpen(false);
  };

  const statusBadgeStyles: Record<string, string> = {
    Agendada: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Confirmada: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Em Atendimento': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Realizada: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    Desmarcou: 'bg-red-500/10 text-red-400 border-red-500/20',
    Cancelada: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header com Navegação de Data & Filtros */}
      <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Navegação de Data */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-surface-muted border border-border-ui p-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-card transition-all"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                isToday(selectedDate)
                  ? 'bg-primary text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-card transition-all"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-base md:text-lg font-bold text-text-main capitalize">
              {formattedDateTitle}
            </h2>
            <span className="text-xs text-text-muted">
              {filteredSessions.length} {filteredSessions.length === 1 ? 'atendimento' : 'atendimentos'} agendados
            </span>
          </div>
        </div>

        {/* Filtros e Ações */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro por Sala */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-ui text-xs">
            <DoorOpen className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-text-main outline-none cursor-pointer"
            >
              <option value="all">Todas as Salas ({activeRooms.length})</option>
              {activeRooms.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Psicólogo */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-ui text-xs">
            <Users className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedPsychologistFilter}
              onChange={(e) => setSelectedPsychologistFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-text-main outline-none cursor-pointer"
            >
              <option value="all">Todos os Psicólogos ({psychologists.length})</option>
              {psychologists.map((p) => (
                <option key={p.id} value={p.email}>{p.name || p.email}</option>
              ))}
            </select>
          </div>

          {/* Botão Novo Agendamento */}
          <button
            onClick={() => {
              setFormData({
                patientName: '',
                psychologistEmail: psychologists[0]?.email || '',
                date: dateStr,
                time: '09:00',
                duration: '50min',
                room: activeRooms[0] || 'Sala 01 - Presencial',
                type: 'Presencial',
                status: 'Agendada',
                amount: 180,
                paid: false,
                notes: ''
              });
              setIsNewAppointmentModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-primary text-text-main text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Consulta</span>
          </button>
        </div>

      </div>

      {/* Grade Diária Multiprofissional (Matriz de Colunas por Psicólogo) */}
      <div className="border border-border-ui rounded-2xl bg-card overflow-x-auto shadow-sm">
        <div className="min-w-[768px]">
          
          {/* Cabeçalho das Colunas: Horário + Nome de cada Psicólogo */}
          <div className="grid grid-flow-col auto-cols-fr border-b border-border-ui bg-surface-muted/70 sticky top-0 z-10">
            {/* Coluna fixa do Horário */}
            <div className="w-20 p-3.5 text-center text-xs font-bold uppercase tracking-wider text-text-muted border-r border-border-ui shrink-0">
              Horário
            </div>

            {/* Coluna para cada Psicólogo */}
            {displayedPsychologists.map((psy) => {
              const psySessionsCount = filteredSessions.filter(
                s => s.psychologistId === psy.email || s.psychologistId === psy.id || s.psychologistName === psy.name
              ).length;

              return (
                <div key={psy.id || psy.email} className="p-3.5 border-r last:border-r-0 border-border-ui flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                      {(psy.name || psy.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-text-main truncate">{psy.name || psy.email}</p>
                      <span className="text-[10px] text-text-muted block truncate">CRP: {psy.crp || 'Ativo'}</span>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-muted text-text-muted font-bold font-mono shrink-0">
                    {psySessionsCount} hoje
                  </span>
                </div>
              );
            })}
          </div>

          {/* Linhas de Horários da Grade */}
          <div className="divide-y divide-border-ui">
            {timeSlots.map((time) => {
              return (
                <div key={time} className="grid grid-flow-col auto-cols-fr min-h-[90px] group hover:bg-surface-muted/20 transition-colors">
                  
                  {/* Célula do Horário */}
                  <div className="w-20 p-3 flex flex-col items-center justify-start border-r border-border-ui font-mono text-xs font-bold text-text-muted shrink-0">
                    <span>{time}</span>
                  </div>

                  {/* Célula para cada Psicólogo no Horário */}
                  {displayedPsychologists.map((psy) => {
                    const session = filteredSessions.find(
                      s => (s.psychologistId === psy.email || s.psychologistId === psy.id || s.psychologistName === psy.name) && s.time === time
                    );

                    return (
                      <div 
                        key={psy.id || psy.email} 
                        className="p-2 border-r last:border-r-0 border-border-ui relative group/slot flex flex-col"
                      >
                        {session ? (
                          /* Card de Sessão Agendada */
                          <div 
                            onClick={() => setSelectedSessionForDetail(session)}
                            className="w-full h-full p-2.5 rounded-xl bg-surface-muted border border-border-ui hover:border-primary/50 cursor-pointer transition-all shadow-sm flex flex-col justify-between gap-1.5"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-xs text-text-main truncate">
                                {session.patientName || 'Paciente'}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${statusBadgeStyles[session.status] || statusBadgeStyles.Agendada}`}>
                                {session.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted">
                              {session.room && (
                                <span className="flex items-center gap-0.5 text-primary font-medium truncate">
                                  🚪 {session.room.split(' - ')[0]}
                                </span>
                              )}
                              <span>• {session.type}</span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-border-ui/50">
                              <span className="text-emerald-400 font-semibold">{formatCurrency(session.amount || 0)}</span>
                              <span className={session.paid ? 'text-emerald-400' : 'text-amber-400'}>
                                {session.paid ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Espaço Livre para Agendamento Rápido */
                          <button
                            onClick={() => handleOpenCreateForSlot(psy.email, time)}
                            className="w-full h-full rounded-xl border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 text-transparent hover:text-primary transition-all flex items-center justify-center text-xs font-semibold"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            <span>Agendar {time}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Modal de Detalhes da Sessão */}
      <AnimatePresence>
        {selectedSessionForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border-ui rounded-3xl p-6 shadow-2xl space-y-5 text-text-main"
            >
              <div className="flex items-center justify-between border-b border-border-ui pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{selectedSessionForDetail.patientName || 'Atendimento'}</h3>
                    <p className="text-xs text-text-muted">{selectedSessionForDetail.date} às {selectedSessionForDetail.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSessionForDetail(null)}
                  className="p-2 rounded-xl text-text-muted hover:text-text-main"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-surface-muted space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Psicólogo(a) Responsável:</span>
                    <span className="font-bold text-text-main">{selectedSessionForDetail.psychologistName || selectedSessionForDetail.psychologistId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Sala / Espaço:</span>
                    <span className="font-bold text-text-main">{selectedSessionForDetail.room || 'Não especificada'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Modalidade:</span>
                    <span className="font-bold text-text-main">{selectedSessionForDetail.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Valor da Sessão:</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(selectedSessionForDetail.amount || 0)}</span>
                  </div>
                </div>

                {!canManageSession(selectedSessionForDetail) ? (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">
                      Sessão sob responsabilidade de <strong>{selectedSessionForDetail.psychologistName || 'outro profissional'}</strong>. Apenas o próprio psicólogo responsável ou a recepção podem alterar o status ou cancelar este atendimento.
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Alterar Status Rápido */}
                    <div>
                      <label className="block text-text-muted font-medium mb-1.5">Atualizar Status do Atendimento:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {(['Confirmada', 'Em Atendimento', 'Realizada', 'Desmarcou', 'Agendada'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              onUpdateSession({ ...selectedSessionForDetail, status: st });
                              setSelectedSessionForDetail(prev => prev ? { ...prev, status: st } : null);
                            }}
                            className={`p-2 rounded-xl border text-[11px] font-bold transition-all ${
                              selectedSessionForDetail.status === st
                                ? 'bg-primary text-text-main border-primary'
                                : 'bg-surface-muted border-border-ui text-text-muted hover:text-text-main'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Marcar Pagamento */}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        onClick={() => {
                          const newPaid = !selectedSessionForDetail.paid;
                          onUpdateSession({ ...selectedSessionForDetail, paid: newPaid });
                          setSelectedSessionForDetail(prev => prev ? { ...prev, paid: newPaid } : null);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                          selectedSessionForDetail.paid
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}
                      >
                        {selectedSessionForDetail.paid ? '✓ Pagamento Registrado' : 'Marcar como Pago'}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Deseja realmente excluir este agendamento da clínica?')) {
                            onDeleteSession(selectedSessionForDetail.id);
                            setSelectedSessionForDetail(null);
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all"
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Novo Agendamento */}
      <AnimatePresence>
        {isNewAppointmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border-ui rounded-3xl p-6 shadow-2xl space-y-4 text-text-main"
            >
              <div className="flex items-center justify-between border-b border-border-ui pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Novo Agendamento na Clínica</h3>
                    <p className="text-xs text-text-muted">Marque a consulta para qualquer data e psicólogo</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewAppointmentModalOpen(false)}
                  className="p-2 rounded-xl text-text-muted hover:text-text-main"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAppointment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-text-muted font-medium mb-1">Nome do Paciente *</label>
                  <input
                    type="text"
                    required
                    list="clinic-patients-list"
                    placeholder="Selecione um paciente cadastrado ou digite o nome"
                    value={formData.patientName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = patients.find(p => p.name.toLowerCase() === val.toLowerCase());
                      if (matched) {
                        setFormData({
                          ...formData,
                          patientName: val,
                          amount: matched.amount || formData.amount,
                          psychologistEmail: matched.psychologistId || formData.psychologistEmail
                        });
                      } else {
                        setFormData({ ...formData, patientName: val });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                  />
                  <datalist id="clinic-patients-list">
                    {patients.map(p => (
                      <option key={p.id} value={p.name}>{p.name} {p.psychologistName ? `(${p.psychologistName})` : ''}</option>
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Data da Consulta *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Horário *</label>
                    <select
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    >
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Psicólogo(a) *</label>
                    <select
                      value={formData.psychologistEmail}
                      disabled={currentMember?.role === 'psychologist'}
                      onChange={(e) => setFormData({ ...formData, psychologistEmail: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed"
                    >
                      {psychologists.map((p) => (
                        <option key={p.id} value={p.email}>{p.name || p.email}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-muted font-medium mb-1">Sala / Espaço</label>
                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    >
                      {activeRooms.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-muted font-medium mb-1">Modalidade</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-muted font-medium mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewAppointmentModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-text-muted font-semibold text-xs hover:bg-card"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-primary text-text-main font-bold text-xs hover:opacity-90 transition-all shadow-md shadow-primary/20"
                  >
                    Salvar Agendamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
