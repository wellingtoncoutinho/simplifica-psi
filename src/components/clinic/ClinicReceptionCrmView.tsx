import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Phone, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  ArrowLeft,
  Trash2, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Building,
  Check,
  DoorOpen,
  Send,
  X,
  Edit3
} from 'lucide-react';
import { Clinic, ClinicMember, ClinicCrmLead, ClinicCrmStage } from '../../types';
import { 
  getClinicCrmLeads, 
  saveClinicCrmLead, 
  updateClinicCrmLeadStage, 
  deleteClinicCrmLead 
} from '../../lib/clinicService';

interface ClinicReceptionCrmViewProps {
  clinic: Clinic;
  currentMember: ClinicMember | null;
  members: ClinicMember[];
}

interface StageColumnConfig {
  id: ClinicCrmStage;
  title: string;
  subtitle: string;
  icon: any;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  badgeBg: string;
}

const STAGES: StageColumnConfig[] = [
  {
    id: 'contacted',
    title: 'Entrou em Contato',
    subtitle: 'Novo lead via Whats ou Telefone',
    icon: Phone,
    colorBg: 'bg-blue-500/5',
    colorBorder: 'border-blue-500/20',
    colorText: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  {
    id: 'triage',
    title: 'Triagem & Psicólogo',
    subtitle: 'Alinhando terapeuta e horários',
    icon: Users,
    colorBg: 'bg-purple-500/5',
    colorBorder: 'border-purple-500/20',
    colorText: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  {
    id: 'scheduled',
    title: 'Sessão Marcada',
    subtitle: '1ª consulta na agenda',
    icon: Calendar,
    colorBg: 'bg-amber-500/5',
    colorBorder: 'border-amber-500/20',
    colorText: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  {
    id: 'paid',
    title: 'Pago / Confirmado',
    subtitle: 'Pix, Cartão ou Pacote recebido',
    icon: DollarSign,
    colorBg: 'bg-emerald-500/5',
    colorBorder: 'border-emerald-500/20',
    colorText: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'completed',
    title: 'Sessão Realizada',
    subtitle: 'Atendimento efetuado',
    icon: CheckCircle2,
    colorBg: 'bg-indigo-500/5',
    colorBorder: 'border-indigo-500/20',
    colorText: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  },
  {
    id: 'receipt_issued',
    title: 'Nota / Recibo Emitido',
    subtitle: 'Comprovante enviado ao paciente',
    icon: FileText,
    colorBg: 'bg-teal-500/5',
    colorBorder: 'border-teal-500/20',
    colorText: 'text-teal-400',
    badgeBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  }
];

export default function ClinicReceptionCrmView({
  clinic,
  currentMember,
  members
}: ClinicReceptionCrmViewProps) {
  const [leads, setLeads] = useState<ClinicCrmLead[]>(() => getClinicCrmLeads(clinic.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Modal Novo / Editar Lead
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ClinicCrmLead | null>(null);

  // Campos do formulário
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formComplaint, setFormComplaint] = useState('');
  const [formStage, setFormStage] = useState<ClinicCrmStage>('contacted');
  const [formDoctorEmail, setFormDoctorEmail] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formAmount, setFormAmount] = useState<number>(180);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro' | 'convenio' | 'outro'>('pix');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [formReceiptIssued, setFormReceiptIssued] = useState(false);
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Drag and drop states
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ClinicCrmStage | null>(null);

  const psychologists = useMemo(() => {
    return members.filter(m => m.role === 'psychologist');
  }, [members]);

  const rooms = clinic.settings?.rooms || ['Sala 01 - Presencial', 'Sala 02 - Terapia Infantil', 'Sala 03 - Atendimento Online'];

  // Métricas do Topo
  const metrics = useMemo(() => {
    const total = leads.length;
    const scheduledCount = leads.filter(l => ['scheduled', 'paid', 'completed', 'receipt_issued'].includes(l.stage)).length;
    const pendingPaymentCount = leads.filter(l => l.paymentStatus === 'pending' && ['scheduled', 'completed'].includes(l.stage)).length;
    const pendingPaymentAmount = leads
      .filter(l => l.paymentStatus === 'pending' && ['scheduled', 'completed'].includes(l.stage))
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    const receiptIssuedCount = leads.filter(l => l.receiptIssued || l.stage === 'receipt_issued').length;

    return {
      total,
      scheduledCount,
      pendingPaymentCount,
      pendingPaymentAmount,
      receiptIssuedCount,
      conversionRate: total > 0 ? Math.round((scheduledCount / total) * 100) : 0
    };
  }, [leads]);

  // Filtros
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchSearch = 
        !searchQuery.trim() ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        (lead.complaint && lead.complaint.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDoctor = 
        filterDoctor === 'all' ||
        lead.assignedPsychologistId === filterDoctor;

      return matchSearch && matchDoctor;
    });
  }, [leads, searchQuery, filterDoctor]);

  // Abertura do modal para novo lead
  const handleOpenNewModal = () => {
    setEditingLead(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormComplaint('');
    setFormStage('contacted');
    setFormDoctorEmail(psychologists[0]?.email || '');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('14:00');
    setFormRoom(rooms[0] || 'Sala 01 - Presencial');
    setFormAmount(180);
    setFormPaymentMethod('pix');
    setFormPaymentStatus('pending');
    setFormReceiptIssued(false);
    setFormReceiptNumber('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Abertura do modal para editar lead existente
  const handleOpenEditModal = (lead: ClinicCrmLead) => {
    setEditingLead(lead);
    setFormName(lead.name);
    setFormPhone(lead.phone);
    setFormEmail(lead.email || '');
    setFormComplaint(lead.complaint || '');
    setFormStage(lead.stage);
    setFormDoctorEmail(lead.assignedPsychologistId || psychologists[0]?.email || '');
    setFormDate(lead.scheduledDate || new Date().toISOString().split('T')[0]);
    setFormTime(lead.scheduledTime || '14:00');
    setFormRoom(lead.sessionRoom || rooms[0] || '');
    setFormAmount(lead.amount || 180);
    setFormPaymentMethod(lead.paymentMethod || 'pix');
    setFormPaymentStatus(lead.paymentStatus || 'pending');
    setFormReceiptIssued(lead.receiptIssued || lead.stage === 'receipt_issued');
    setFormReceiptNumber(lead.receiptNumber || '');
    setFormNotes(lead.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const assignedDoc = psychologists.find(p => p.email === formDoctorEmail);

    const leadData: ClinicCrmLead = {
      id: editingLead ? editingLead.id : `lead_${Date.now()}`,
      clinicId: clinic.id,
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      complaint: formComplaint.trim() || undefined,
      stage: formStage,
      assignedPsychologistId: formDoctorEmail || undefined,
      assignedPsychologistName: assignedDoc?.name || formDoctorEmail || undefined,
      scheduledDate: formDate || undefined,
      scheduledTime: formTime || undefined,
      sessionRoom: formRoom || undefined,
      amount: formAmount,
      paymentMethod: formPaymentMethod,
      paymentStatus: formPaymentStatus,
      receiptIssued: formReceiptIssued,
      receiptNumber: formReceiptNumber.trim() || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: editingLead ? editingLead.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = saveClinicCrmLead(clinic.id, leadData);
    setLeads(updated);
    setIsModalOpen(false);
  };

  // Mover etapa rápida
  const handleMoveStage = (leadId: string, currentStage: ClinicCrmStage, direction: 'forward' | 'backward') => {
    const stageOrder: ClinicCrmStage[] = ['contacted', 'triage', 'scheduled', 'paid', 'completed', 'receipt_issued'];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= stageOrder.length) return;

    const nextStage = stageOrder[nextIndex];
    let extraData: Partial<ClinicCrmLead> = {};

    if (nextStage === 'paid') {
      extraData.paymentStatus = 'paid';
    } else if (nextStage === 'receipt_issued') {
      extraData.receiptIssued = true;
      extraData.receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const updated = updateClinicCrmLeadStage(clinic.id, leadId, nextStage, extraData);
    setLeads(updated);
  };

  // Arrastar e soltar (Drag and drop) direto para a coluna destino
  const handleDropLeadToStage = (leadId: string, targetStage: ClinicCrmStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;

    let extraData: Partial<ClinicCrmLead> = {};
    if (targetStage === 'paid') {
      extraData.paymentStatus = 'paid';
    } else if (targetStage === 'receipt_issued') {
      extraData.paymentStatus = 'paid';
      extraData.receiptIssued = true;
      if (!lead.receiptNumber) {
        extraData.receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    const updated = updateClinicCrmLeadStage(clinic.id, leadId, targetStage, extraData);
    setLeads(updated);
  };

  const handleDeleteLead = (leadId: string, name: string) => {
    if (!confirm(`Deseja remover o contato de "${name}" do funil de atendimento?`)) return;
    const updated = deleteClinicCrmLead(clinic.id, leadId);
    setLeads(updated);
  };

  // Montar link direto de WhatsApp
  const handleOpenWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${name}! Sou da recepção da ${clinic.name}. Vi que você entrou em contato conosco e estou à disposição para ajudar com seu agendamento.`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header do CRM */}
      <div className="p-6 md:p-8 rounded-[28px] bg-card border border-border-ui shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              CRM & Funil da Recepção
            </span>
            <span className="text-xs text-text-muted">
              {clinic.name}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-main">
            Captação, Agendamentos & Recibos
          </h1>
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            Acompanhe todo o ciclo do paciente: do primeiro contato pelo WhatsApp à triagem, marcação da 1ª sessão, cobrança e emissão da nota fiscal.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="px-5 py-3 rounded-2xl bg-primary text-text-main font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Lead / Contato</span>
        </button>
      </div>

      {/* Cards de Métricas Operacionais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total de Leads</span>
            <Phone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-text-main">{metrics.total}</span>
            <span className="text-xs text-text-muted">no funil</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <span>{metrics.conversionRate}% convertidos em agendamentos</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Sessões Agendadas</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{metrics.scheduledCount}</span>
            <span className="text-xs text-text-muted">consultas</span>
          </div>
          <div className="text-[11px] text-text-muted">
            1ª sessão na agenda da clínica
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Cobrança Pendente</span>
            <DollarSign className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-400">{metrics.pendingPaymentCount}</span>
            <span className="text-xs text-text-muted">R$ {metrics.pendingPaymentAmount} a receber</span>
          </div>
          <div className="text-[11px] text-text-muted">
            Aguardando Pix ou cartão
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border-ui shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Notas & Recibos</span>
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-400">{metrics.receiptIssuedCount}</span>
            <span className="text-xs text-text-muted">emitidos</span>
          </div>
          <div className="text-[11px] text-teal-400 font-semibold">
            Comprovantes liberados aos pacientes
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Alternância de Visualização */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border-ui">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por paciente, telefone ou queixa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-muted border border-border-ui text-xs text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted hidden sm:block" />
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-muted border border-border-ui text-xs font-semibold text-text-main focus:outline-none focus:border-primary"
            >
              <option value="all">Todos os Psicólogos ({psychologists.length})</option>
              {psychologists.map((p) => (
                <option key={p.id} value={p.email}>{p.name || p.email}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-surface-muted p-1 rounded-xl border border-border-ui self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'kanban' ? 'bg-primary text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Quadro Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'table' ? 'bg-primary text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Lista / Tabela
          </button>
        </div>
      </div>

      {/* Modo de Exibição: Kanban */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
            const Icon = stage.icon;

            return (
              <div 
                key={stage.id} 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverStage !== stage.id) setDragOverStage(stage.id);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
                  setDraggedLeadId(null);
                  if (leadId) {
                    handleDropLeadToStage(leadId, stage.id);
                  }
                }}
                className={`rounded-2xl border transition-all duration-200 ${stage.colorBorder} ${stage.colorBg} flex flex-col min-h-[500px] overflow-hidden ${
                  dragOverStage === stage.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01] shadow-xl' : ''
                }`}
              >
                {/* Cabeçalho da Coluna */}
                <div className="p-3.5 border-b border-border-ui/60 bg-card/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${stage.badgeBg}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text-main leading-tight">{stage.title}</h3>
                      <p className="text-[10px] text-text-muted truncate max-w-[130px]">{stage.subtitle}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${stage.badgeBg}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Lista de Cards da Etapa */}
                <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[620px]">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-text-muted border border-dashed border-border-ui/60 rounded-xl my-2">
                      Nenhum paciente nesta etapa (arraste aqui)
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      return (
                        <div
                          key={lead.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', lead.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedLeadId(lead.id);
                          }}
                          onDragEnd={() => {
                            setDraggedLeadId(null);
                            setDragOverStage(null);
                          }}
                          className={`p-3.5 rounded-xl bg-card border border-border-ui shadow-sm hover:shadow-md hover:border-primary/40 transition-all space-y-2 text-xs cursor-grab active:cursor-grabbing select-none ${
                            draggedLeadId === lead.id ? 'opacity-40 border-dashed border-primary scale-95' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="font-bold text-text-main text-xs">{lead.name}</h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(lead.phone, lead.name)}
                                title="Abrir WhatsApp direto"
                                className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(lead)}
                                title="Editar dados do lead"
                                className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-muted"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 text-[11px] text-text-muted">
                            <p className="flex items-center gap-1.5 text-text-main font-medium">
                              <Phone className="w-3 h-3 text-text-muted" />
                              <span>{lead.phone}</span>
                            </p>

                            {lead.assignedPsychologistName && (
                              <p className="flex items-center gap-1.5 text-purple-400 font-semibold truncate">
                                <Users className="w-3 h-3 shrink-0" />
                                <span className="truncate">{lead.assignedPsychologistName}</span>
                              </p>
                            )}

                            {lead.scheduledDate && (
                              <p className="flex items-center gap-1.5 text-amber-400 font-medium">
                                <Calendar className="w-3 h-3" />
                                <span>{lead.scheduledDate} às {lead.scheduledTime || '14:00'}</span>
                              </p>
                            )}

                            {lead.complaint && (
                              <p className="italic line-clamp-2 text-[10px] text-text-muted pt-0.5">
                                "{lead.complaint}"
                              </p>
                            )}
                          </div>

                          {/* Badges de Valor e Pagamento */}
                          <div className="flex items-center justify-between pt-1 border-t border-border-ui/60 text-[10px]">
                            <span className="font-bold text-text-main">
                              R$ {lead.amount || 180}
                            </span>

                            <span className={`px-2 py-0.5 rounded-md font-bold ${
                              lead.paymentStatus === 'paid' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {lead.paymentStatus === 'paid' ? 'Pago ✓' : 'Aguardando'}
                            </span>
                          </div>

                          {/* Botões de Avançar e Voltar Etapa */}
                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleMoveStage(lead.id, lead.stage, 'backward')}
                              disabled={lead.stage === 'contacted'}
                              className="p-1 text-text-muted hover:text-text-main disabled:opacity-20 disabled:hover:text-text-muted"
                              title="Voltar etapa"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveStage(lead.id, lead.stage, 'forward')}
                              disabled={lead.stage === 'receipt_issued'}
                              className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-card border border-border-ui text-text-main font-bold text-[10px] flex items-center gap-1 transition-all disabled:opacity-20"
                            >
                              <span>Avançar</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Modo de Exibição: Tabela Operacional */
        <div className="border border-border-ui rounded-2xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-main">
              <thead className="bg-surface-muted text-[11px] font-bold uppercase text-text-muted border-b border-border-ui">
                <tr>
                  <th className="p-3.5">Paciente</th>
                  <th className="p-3.5">Contato</th>
                  <th className="p-3.5">Psicólogo(a)</th>
                  <th className="p-3.5">1ª Sessão</th>
                  <th className="p-3.5">Etapa / Status</th>
                  <th className="p-3.5">Pagamento</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {filteredLeads.map((lead) => {
                  const stageConfig = STAGES.find(s => s.id === lead.stage) || STAGES[0];

                  return (
                    <tr key={lead.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-text-main">{lead.name}</p>
                        {lead.complaint && <p className="text-[10px] text-text-muted truncate max-w-xs">{lead.complaint}</p>}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span>{lead.phone}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(lead.phone, lead.name)}
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Chamar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-purple-400 font-semibold">
                          {lead.assignedPsychologistName || 'A definir'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {lead.scheduledDate ? (
                          <span>{lead.scheduledDate} {lead.scheduledTime}</span>
                        ) : (
                          <span className="text-text-muted italic">Não agendada</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${stageConfig.badgeBg}`}>
                          {stageConfig.title}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-bold">R$ {lead.amount || 180}</span>
                          <span className={`block text-[10px] font-semibold ${
                            lead.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {lead.paymentStatus === 'paid' ? 'Pago ✓' : 'Pendente'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 rounded-lg bg-surface-muted hover:bg-card border border-border-ui text-text-muted hover:text-text-main"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id, lead.name)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição do Lead */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-card border border-border-ui rounded-[28px] shadow-2xl p-6 space-y-5 text-text-main max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-ui">
                <div className="flex items-center gap-2 font-bold text-base">
                  <Phone className="w-5 h-5 text-primary" />
                  <span>{editingLead ? 'Editar Contato da Recepção' : 'Cadastrar Novo Contato / Lead'}</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLead} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Nome do Paciente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Amanda Nogueira"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">WhatsApp / Telefone *</label>
                    <input
                      type="text"
                      required
                      placeholder="(11) 99999-8888"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">Queixa / Motivo da Procura</label>
                  <input
                    type="text"
                    placeholder="Ex: Ansiedade no trabalho, terapia de casal, luto..."
                    value={formComplaint}
                    onChange={(e) => setFormComplaint(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Etapa Atual no Funil</label>
                    <select
                      value={formStage}
                      onChange={(e) => setFormStage(e.target.value as ClinicCrmStage)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                    >
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Psicólogo(a) Responsável</label>
                    <select
                      value={formDoctorEmail}
                      onChange={(e) => setFormDoctorEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="">A definir pela triagem</option>
                      {psychologists.map((p) => (
                        <option key={p.id} value={p.email}>{p.name || p.email}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sessão Agendada & Sala */}
                <div className="p-4 rounded-2xl bg-surface-muted border border-border-ui space-y-3">
                  <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Dados do Agendamento da 1ª Consulta
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1">Data</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-card border border-border-ui text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1">Horário</label>
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-card border border-border-ui text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1">Sala de Atendimento</label>
                      <select
                        value={formRoom}
                        onChange={(e) => setFormRoom(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-card border border-border-ui text-xs focus:outline-none focus:border-primary"
                      >
                        {rooms.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Financeiro e Recibo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Valor da Sessão (R$)</label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Forma de Pagamento</label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="pix">Pix</option>
                      <option value="cartao">Cartão de Crédito/Débito</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="convenio">Reembolso / Convênio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Status do Pagamento</label>
                    <select
                      value={formPaymentStatus}
                      onChange={(e) => setFormPaymentStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="pending">Pendente (Aguardando)</option>
                      <option value="paid">Confirmado (Pago ✓)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-text-main cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formReceiptIssued}
                      onChange={(e) => setFormReceiptIssued(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span>Recibo / Nota Fiscal já emitida para este atendimento</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">Anotações Internas da Recepção</label>
                  <textarea
                    rows={2}
                    placeholder="Preferências de horário do paciente, indicação de quem recomendou, etc..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-muted border border-border-ui text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-ui">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-card border border-border-ui text-xs font-semibold text-text-muted hover:text-text-main"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-primary text-text-main font-bold text-xs hover:opacity-90 transition-all shadow-md shadow-primary/20"
                  >
                    Salvar no CRM
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
