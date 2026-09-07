import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Building, 
  Sparkles, 
  Lock, 
  LogIn, 
  ArrowRight, 
  Users, 
  ShieldCheck, 
  GraduationCap, 
  Calendar,
  AlertCircle,
  Check,
  Mail,
  User,
  HelpCircle
} from 'lucide-react';
import { Clinic, ClinicMember, ClinicUserRole } from '../../types';
import { DEFAULT_DEMO_MEMBERS } from '../../lib/clinicService';

interface ClinicLoginPageProps {
  clinic: Clinic;
  members?: ClinicMember[];
  onLoginGoogle: () => void;
  onSelectSimulatedMember: (member: ClinicMember) => void;
  onExitClinicMode: () => void;
}

export default function ClinicLoginPage({
  clinic,
  members = DEFAULT_DEMO_MEMBERS,
  onLoginGoogle,
  onSelectSimulatedMember,
  onExitClinicMode
}: ClinicLoginPageProps) {
  const [emailInput, setEmailInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState<ClinicUserRole>('psychologist');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lista de todos os membros disponíveis para identificação
  const allMembers = useMemo(() => {
    const combined = [...members];
    // Garante que os membros padrão estejam presentes se a lista estiver vazia
    for (const def of DEFAULT_DEMO_MEMBERS) {
      if (!combined.some(m => m.email.toLowerCase() === def.email.toLowerCase())) {
        combined.push(def);
      }
    }
    return combined;
  }, [members]);

  // Procura se o e-mail digitado já pertence a um membro cadastrado
  const matchedMember = useMemo(() => {
    const clean = emailInput.trim().toLowerCase();
    if (!clean) return null;
    return allMembers.find(m => m.email.toLowerCase() === clean) || null;
  }, [emailInput, allMembers]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Por favor, informe seu e-mail profissional.');
      return;
    }

    if (matchedMember) {
      // Login imediato no perfil encontrado
      onSelectSimulatedMember(matchedMember);
    } else {
      // Novo membro cadastrado pelo formulário de entrada
      const newMember: ClinicMember = {
        id: cleanEmail,
        email: cleanEmail,
        name: customName.trim() || cleanEmail.split('@')[0],
        role: customRole,
        status: 'active',
        clinicId: clinic.id,
        joinedAt: new Date().toISOString()
      };
      onSelectSimulatedMember(newMember);
    }
  };

  const roleConfig: Record<ClinicUserRole, { label: string; icon: any; desc: string; badge: string }> = {
    clinic_admin: { 
      label: 'Gestor(a) / Admin', 
      icon: ShieldCheck, 
      desc: 'Visão executiva, gestão de equipe, salas, financeiro e CRM',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    psychologist: { 
      label: 'Psicólogo(a) Clínico(a)', 
      icon: Users, 
      desc: 'Acesso individual a seus prontuários confidenciais, IA e sessões',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    supervisor: { 
      label: 'Supervisor(a) Clínico(a)', 
      icon: GraduationCap, 
      desc: 'Painel de supervisão, pareceres técnicos e discussão de casos',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    receptionist: { 
      label: 'Recepção / Secretária', 
      icon: Calendar, 
      desc: 'CRM da recepção, funil de captação e agenda geral da clínica',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#111315] text-[#2E3C2B] dark:text-text-main flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-primary/20">
      
      {/* Top Header */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          {clinic.theme?.logoUrl ? (
            <img src={clinic.theme.logoUrl} alt={clinic.name} className="w-9 h-9 object-contain rounded-xl bg-white p-1 shadow-sm border border-border-ui" />
          ) : (
            <div 
              className="w-9 h-9 rounded-xl shadow-sm flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: clinic.theme?.primaryColor || '#4F46E5' }}
            >
              {clinic.name[0]}
            </div>
          )}
          <div>
            <span className="font-serif font-black text-base tracking-tight block text-text-main">
              {clinic.name}
            </span>
            <span className="text-[10px] text-text-muted font-medium">
              Ambiente Integrado para Equipes de Psicologia
            </span>
          </div>
        </div>

        <button
          onClick={onExitClinicMode}
          className="text-xs text-text-muted hover:text-text-main font-medium underline underline-offset-4 transition-colors"
        >
          ← Voltar para SimplePsi Individual
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-lg w-full mx-auto my-auto py-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-card border border-[#2E3C2B]/10 dark:border-border-ui rounded-[32px] shadow-2xl p-6 sm:p-8 space-y-6 text-center relative overflow-hidden"
        >
          {/* Logo Central da Clínica */}
          <div className="space-y-2">
            {clinic.theme?.logoUrl ? (
              <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-border-ui shadow-md flex items-center justify-center bg-white p-2">
                <img src={clinic.theme.logoUrl} alt={clinic.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div 
                className="w-16 h-16 mx-auto rounded-2xl shadow-lg flex items-center justify-center font-bold text-white text-2xl"
                style={{ backgroundColor: clinic.theme?.primaryColor || '#4F46E5' }}
              >
                {clinic.name[0]}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-serif font-black text-text-main">
                Login da Equipe
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Digite seu e-mail cadastrado para acessar seu espaço de trabalho
              </p>
            </div>
          </div>

          {/* Formulário Principal: Login Direto por E-mail */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-left">
            <div>
              <label className="block text-xs font-bold text-text-main mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Seu E-mail Profissional</span>
              </label>
              
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="ex: paula.psi@reinventar.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-surface-muted border border-border-ui focus:border-primary text-xs font-medium text-text-main focus:outline-none transition-all shadow-inner"
                />
              </div>

              {/* Dica em tempo real caso o e-mail seja reconhecido */}
              {matchedMember && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-400 text-xs">{matchedMember.name}</p>
                      <p className="text-[10px] text-text-muted">{roleConfig[matchedMember.role]?.label}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${roleConfig[matchedMember.role]?.badge}`}>
                    Reconhecido
                  </span>
                </motion.div>
              )}

              {/* Se o e-mail não pertence a nenhum membro cadastrado, solicita nome e cargo */}
              {emailInput.trim() && !matchedMember && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3.5 rounded-2xl bg-surface-muted border border-border-ui space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-text-main">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Primeiro Acesso com este E-mail</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">Seu Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Ex: Dra. Camila Torres"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border-ui text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">Cargo / Função na Clínica</label>
                    <select
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value as ClinicUserRole)}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border-ui text-xs focus:outline-none focus:border-primary font-medium"
                    >
                      <option value="psychologist">Psicólogo(a) Clínico(a)</option>
                      <option value="receptionist">Recepção / Secretária (CRM & Agenda)</option>
                      <option value="supervisor">Supervisor(a) Clínico(a)</option>
                      <option value="clinic_admin">Administrador(a) / Gestor(a)</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:opacity-90 text-text-main font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              <span>Acessar meu Espaço de Trabalho</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divisor de Teste / Atalhos Rápidos */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-ui" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-text-muted tracking-wider">
              <span className="bg-white dark:bg-card px-3">Ou clique em um perfil para testar</span>
            </div>
          </div>

          {/* Botões Rápidos de Cada Papel */}
          <div className="grid grid-cols-1 gap-2 text-left">
            {allMembers.slice(0, 5).map((member) => {
              const config = roleConfig[member.role] || roleConfig.psychologist;
              const Icon = config.icon;

              return (
                <button
                  key={member.email}
                  type="button"
                  onClick={() => onSelectSimulatedMember(member)}
                  className="w-full p-2.5 rounded-xl bg-surface-muted hover:bg-card border border-border-ui hover:border-primary transition-all flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-bold text-text-main truncate text-xs">{member.name}</p>
                      <p className="text-[10px] text-text-muted truncate">{member.email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border shrink-0 ${config.badge}`}>
                    {config.label.split(' ')[0]} →
                  </span>
                </button>
              );
            })}
          </div>

          {/* Alternativa: Google Login */}
          <div className="pt-2 border-t border-border-ui/60">
            <button
              type="button"
              onClick={onLoginGoogle}
              className="w-full py-2.5 px-3 rounded-xl bg-surface-muted hover:bg-card border border-border-ui text-text-muted hover:text-text-main text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar com Conta Google</span>
            </button>
          </div>

        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-text-muted py-2">
        <span>SimplePsi Clínicas • Isolamento de dados, prontuários sigilosos e permissões por cargo</span>
      </div>

    </div>
  );
}
