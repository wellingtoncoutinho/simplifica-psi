import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  X, 
  Check, 
  Copy, 
  ShieldCheck, 
  GraduationCap, 
  Settings, 
  Palette, 
  Trash2, 
  Sparkles, 
  AlertCircle,
  Building,
  Key,
  DoorOpen,
  Calendar,
  DollarSign,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Clinic, ClinicMember, ClinicUserRole } from '../types';
import { 
  subscribeClinicMembers, 
  inviteClinicMember, 
  removeClinicMember, 
  saveClinic,
  applyClinicTheme 
} from '../lib/clinicService';

interface ClinicTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: Clinic;
  onUpdateClinic: (updated: Clinic) => void;
  currentUserEmail?: string;
}

export default function ClinicTeamModal({
  isOpen,
  onClose,
  clinic,
  onUpdateClinic,
  currentUserEmail
}: ClinicTeamModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Formulário de convite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<ClinicUserRole>('psychologist');
  const [inviteCrp, setInviteCrp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Configurações, Cores e Logo da Clínica
  const [clinicName, setClinicName] = useState(clinic.name || '');
  const [primaryColor, setPrimaryColor] = useState(clinic.theme?.primaryColor || '#4F46E5');
  const [secondaryColor, setSecondaryColor] = useState(clinic.theme?.secondaryColor || '#059669');
  const [logoUrl, setLogoUrl] = useState(clinic.theme?.logoUrl || '');
  const [allowManageAgenda, setAllowManageAgenda] = useState(clinic.settings?.allowPsychologistManageAgenda ?? true);
  const [allowSetPrice, setAllowSetPrice] = useState(clinic.settings?.allowPsychologistSetPrice ?? true);
  const [allowSupervision, setAllowSupervision] = useState(clinic.settings?.allowSupervision ?? true);
  const [newRoom, setNewRoom] = useState('');
  const [rooms, setRooms] = useState<string[]>(clinic.settings?.rooms || ['Sala 01 - Presencial', 'Sala 02 - Terapia Infantil', 'Sala 03 - Atendimento Online']);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !clinic.id) return;

    setClinicName(clinic.name);
    setPrimaryColor(clinic.theme?.primaryColor || '#4F46E5');
    setSecondaryColor(clinic.theme?.secondaryColor || '#059669');
    setLogoUrl(clinic.theme?.logoUrl || '');
    setAllowManageAgenda(clinic.settings?.allowPsychologistManageAgenda ?? true);
    setAllowSetPrice(clinic.settings?.allowPsychologistSetPrice ?? true);
    setAllowSupervision(clinic.settings?.allowSupervision ?? true);
    setRooms(clinic.settings?.rooms || ['Sala 01 - Presencial', 'Sala 02 - Terapia Infantil', 'Sala 03 - Atendimento Online']);

    const unsubscribe = subscribeClinicMembers(clinic.id, (loadedMembers) => {
      setMembers(loadedMembers);
      setLoadingMembers(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, clinic.id, currentUserEmail]);

  if (!isOpen) return null;

  // CÁLCULO DE VAGAS:
  // As 7 vagas contratadas são EXCLUSIVAS para psicólogos (role === 'psychologist')
  // Admin, Supervisores e Secretárias NÃO consomem as vagas de psicólogos!
  const totalPsychologistSeats = clinic.maxSeats || 7;
  const usedPsychologistSeats = members.filter(m => m.role === 'psychologist').length;
  const availablePsychologistSeats = Math.max(0, totalPsychologistSeats - usedPsychologistSeats);
  const percentUsed = Math.min(100, Math.round((usedPsychologistSeats / totalPsychologistSeats) * 100));

  const supervisorCount = members.filter(m => m.role === 'supervisor').length;
  const receptionistCount = members.filter(m => m.role === 'receptionist').length;

  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/?clinic=${clinic.slug}`
    : `https://app.simplepsi.com/?clinic=${clinic.slug}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem do logo deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    // Se for psicólogo, checa o limite de 7 vagas
    if (inviteRole === 'psychologist' && usedPsychologistSeats >= totalPsychologistSeats) {
      setFeedbackMsg({ 
        type: 'error', 
        text: `Limite de vagas de psicólogos atingido (${totalPsychologistSeats} vagas). Faça upgrade do plano para adicionar mais psicólogos.` 
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      await inviteClinicMember(clinic.id, {
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
        crp: inviteCrp.trim()
      });

      setInviteEmail('');
      setInviteName('');
      setInviteCrp('');
      setFeedbackMsg({ type: 'success', text: 'Profissional adicionado à equipe com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: 'Erro ao cadastrar profissional: ' + (err.message || 'Tente novamente.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!confirm(`Deseja realmente desvincular o profissional (${email}) da clínica? A vaga de psicólogo correspondente ficará livre.`)) {
      return;
    }

    try {
      await removeClinicMember(clinic.id, email);
      setFeedbackMsg({ type: 'success', text: 'Profissional desvinculado e vaga liberada.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao desvincular profissional: ' + err.message });
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updatedClinic: Clinic = {
        ...clinic,
        name: clinicName.trim() || clinic.name,
        theme: {
          ...clinic.theme,
          primaryColor,
          secondaryColor,
          logoUrl
        },
        settings: {
          ...clinic.settings,
          allowPsychologistManageAgenda: allowManageAgenda,
          allowPsychologistSetPrice: allowSetPrice,
          allowSupervision: allowSupervision,
          rooms
        }
      };

      await saveClinic(updatedClinic);
      applyClinicTheme(updatedClinic.theme);
      onUpdateClinic(updatedClinic);

      setFeedbackMsg({ type: 'success', text: 'Identidade visual, logotipo e configurações salvas com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao salvar configurações: ' + err.message });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddRoom = () => {
    if (!newRoom.trim()) return;
    if (rooms.includes(newRoom.trim())) return;
    setRooms([...rooms, newRoom.trim()]);
    setNewRoom('');
  };

  const handleRemoveRoom = (roomToRemove: string) => {
    setRooms(rooms.filter(r => r !== roomToRemove));
  };

  const roleLabels: Record<ClinicUserRole, { label: string; bg: string; text: string }> = {
    clinic_admin: { label: 'Administrador(a) / Dono', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
    supervisor: { label: 'Supervisor(a) Clínico(a)', bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400' },
    psychologist: { label: 'Psicólogo(a) Clínico(a)', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
    receptionist: { label: 'Recepção / Secretária', bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl max-h-[90vh] bg-card border border-border-ui rounded-[28px] shadow-2xl flex flex-col overflow-hidden text-text-main"
      >
        {/* Header do Modal */}
        <div className="p-6 border-b border-border-ui flex items-center justify-between bg-surface-muted">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={clinic.name} className="w-12 h-12 rounded-2xl object-contain bg-white p-1 border border-border-ui shadow-sm" />
            ) : (
              <div 
                className="w-12 h-12 rounded-2xl border flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {clinic.name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{clinic.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Plano Clínica ({totalPsychologistSeats} vagas de Psicólogos)
                </span>
              </div>
              <p className="text-sm text-text-muted">
                Gestão da equipe, permissões de atendimento e identidade visual
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-card border border-transparent hover:border-border-ui transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-border-ui px-6 bg-card">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Users className="w-4 h-4" />
            Minha Equipe ({usedPsychologistSeats}/{totalPsychologistSeats} Psicólogos)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Settings className="w-4 h-4" />
            Identidade Visual & Permissões
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl border text-sm flex items-center gap-2.5 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'members' ? (
            <>
              {/* Barra de Progresso e Cotas de Vagas */}
              <div className="p-5 rounded-2xl bg-surface-muted border border-border-ui space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">Vagas de Psicólogos:</span>
                      <span className="text-lg font-bold text-primary">{usedPsychologistSeats} de {totalPsychologistSeats}</span>
                      <span className="text-xs text-emerald-400 font-semibold">({availablePsychologistSeats} {availablePsychologistSeats === 1 ? 'vaga livre' : 'vagas livres'})</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      As <strong>{totalPsychologistSeats} vagas</strong> são 100% livres para seus psicólogos. Gestores, supervisores e secretárias têm cotas dedicadas e <strong>não gastam vagas</strong>.
                    </p>
                  </div>

                  <div className="w-full md:w-64 space-y-1.5">
                    <div className="w-full h-3 bg-card border border-border-ui rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentUsed >= 100 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>{percentUsed}% utilizado</span>
                      <span>{availablePsychologistSeats} vagas livres</span>
                    </div>
                  </div>
                </div>

                {/* Subcontadores de outros perfis */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-ui/60 text-xs">
                  <div className="p-2 rounded-xl bg-card border border-border-ui">
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Supervisores</span>
                    <span className="font-bold text-purple-400">{supervisorCount} / 2 inclusos</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border-ui">
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Secretárias</span>
                    <span className="font-bold text-blue-400">{receptionistCount} / 2 inclusas</span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border-ui">
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Gestores / Admin</span>
                    <span className="font-bold text-amber-400">1 Dono (Sem custo)</span>
                  </div>
                </div>
              </div>

              {/* Formulário de Convidar Novo Membro */}
              <div className="p-5 rounded-2xl bg-card border border-border-ui space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <UserPlus className="w-5 h-5 text-primary" />
                    <span>Cadastrar Novo Profissional na Equipe</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-surface-muted hover:bg-card border border-border-ui transition-all"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Link Copiado!' : 'Copiar Link da Clínica'}
                  </button>
                </div>

                <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-text-muted mb-1">E-mail do Profissional *</label>
                    <input
                      type="email"
                      required
                      placeholder="dra.paula@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-text-muted mb-1">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Dra. Paula Silva"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-text-muted mb-1">Cargo / Função</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as ClinicUserRole)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    >
                      <option value="psychologist">Psicólogo(a) (Consome vaga)</option>
                      <option value="supervisor">Supervisor(a) Clínico(a)</option>
                      <option value="receptionist">Recepção / Secretária</option>
                      <option value="clinic_admin">Co-Administrador(a)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || (inviteRole === 'psychologist' && availablePsychologistSeats <= 0)}
                      className="w-full py-2.5 px-4 rounded-xl bg-primary text-text-main font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? 'Cadastrando...' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Membros Cadastrados */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                  Membros da Equipe ({members.length})
                </h3>

                <div className="border border-border-ui rounded-2xl overflow-hidden bg-card divide-y divide-border-ui">
                  {members.map((member) => {
                    const roleInfo = roleLabels[member.role] || roleLabels.psychologist;
                    const isOwner = member.email.toLowerCase() === clinic.ownerEmail?.toLowerCase();

                    return (
                      <div key={member.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-muted/50 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                            {(member.name || member.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{member.name || member.email}</span>
                              {isOwner && (
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Dono da Clínica
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                              <span>{member.email}</span>
                              {member.crp && <span>• CRP: {member.crp}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${roleInfo.bg} ${roleInfo.text}`}>
                            {roleInfo.label}
                          </span>

                          {!isOwner && (
                            <button
                              onClick={() => handleRemoveMember(member.email)}
                              title="Desvincular e liberar vaga"
                              className="p-2 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Aba de Configurações & Personalização */
            <div className="space-y-6">
              
              {/* Identidade Visual: Logo & Cores */}
              <div className="p-5 rounded-2xl bg-card border border-border-ui space-y-5">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <Palette className="w-5 h-5 text-primary" />
                  <span>Identidade Visual & Logotipo da Clínica</span>
                </div>

                {/* Upload do Logo da Clínica */}
                <div className="p-4 rounded-2xl bg-surface-muted border border-border-ui space-y-3">
                  <label className="block text-xs font-bold text-text-main">
                    Logotipo Oficial da Clínica (Exibido no topo, menu lateral e portal)
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Preview da Logo */}
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border-ui flex items-center justify-center bg-card overflow-hidden shrink-0 relative group">
                      {logoUrl ? (
                        <>
                          <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                            title="Remover Logo"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <div 
                          className="w-full h-full flex flex-col items-center justify-center font-bold text-white text-2xl"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {clinicName ? clinicName[0] : 'C'}
                        </div>
                      )}
                    </div>

                    {/* Botões de Upload */}
                    <div className="space-y-2 flex-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-primary text-text-main text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Carregar Imagem da Logo
                        </button>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="px-3 py-2 rounded-xl bg-surface-muted border border-border-ui text-red-400 text-xs font-medium hover:bg-card"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Formatos recomendados: PNG transparente ou SVG (máx. 2MB).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome da Clínica */}
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Nome da Clínica</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                    />
                  </div>

                  {/* Cor Primária */}
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Cor Primária da Marca</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-28 px-3 py-2 rounded-xl bg-surface-muted border border-border-ui text-sm font-mono focus:outline-none"
                      />
                      <div className="flex gap-1.5">
                        {['#4F46E5', '#059669', '#2563EB', '#9333EA', '#D97706', '#E11D48'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setPrimaryColor(c)}
                            className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cor Secundária */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-text-muted mb-1">Cor Secundária da Marca</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-28 px-3 py-2 rounded-xl bg-surface-muted border border-border-ui text-sm font-mono focus:outline-none"
                      />
                      <div className="flex gap-1.5">
                        {['#059669', '#EC4899', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSecondaryColor(c)}
                            className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissões e Autonomia da Equipe */}
              <div className="p-5 rounded-2xl bg-card border border-border-ui space-y-4">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <Key className="w-5 h-5 text-primary" />
                  <span>Modelo de Gestão & Autonomia da Equipe</span>
                </div>

                <div className="space-y-3 divide-y divide-border-ui">
                  <label className="pt-3 first:pt-0 flex items-center justify-between cursor-pointer gap-4">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Autonomia de Agendamento
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Permite que os psicólogos criem, editem e cancelem seus próprios horários na agenda. (Se desmarcado, apenas a administração/recepção agenda).
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowManageAgenda}
                      onChange={(e) => setAllowManageAgenda(e.target.checked)}
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                  </label>

                  <label className="pt-3 flex items-center justify-between cursor-pointer gap-4">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        Autonomia de Preços e Valores
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Permite que o psicólogo defina ou negocie o valor individual por sessão com o paciente.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowSetPrice}
                      onChange={(e) => setAllowSetPrice(e.target.checked)}
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                  </label>

                  <label className="pt-3 flex items-center justify-between cursor-pointer gap-4">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Módulo de Supervisão Clínica
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Habilita a aba de supervisão para validação e comentários em prontuários/estagiários.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowSupervision}
                      onChange={(e) => setAllowSupervision(e.target.checked)}
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Gestão de Salas */}
              <div className="p-5 rounded-2xl bg-card border border-border-ui space-y-4">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <DoorOpen className="w-5 h-5 text-primary" />
                  <span>Salas e Espaços Físicos</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Sala 03 - Infantil"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-surface-muted border border-border-ui focus:border-primary text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddRoom}
                    className="px-4 py-2 rounded-xl bg-surface-muted border border-border-ui hover:border-primary text-sm font-semibold transition-colors"
                  >
                    + Adicionar Sala
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {rooms.map((room) => (
                    <span key={room} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-ui text-xs font-medium">
                      {room}
                      <button onClick={() => handleRemoveRoom(room)} className="text-text-muted hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Botão Salvar Configurações */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 rounded-xl bg-primary text-text-main font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
                >
                  {isSavingSettings ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
