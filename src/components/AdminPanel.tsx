import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Sparkles, 
  Clock, 
  Lock, 
  Unlock, 
  Search, 
  ShieldCheck, 
  CheckCircle,
  RefreshCw, 
  AlertCircle,
  Calendar,
  Trash2
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clinic } from '../types';
import { DEMO_PILOT_CLINIC, saveClinic } from '../lib/clinicService';
import { Building, ExternalLink, Plus } from 'lucide-react';

export default function AdminPanel() {
  const [panelSection, setPanelSection] = useState<'users' | 'clinics'>('users');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'trial' | 'expired'>('all');
  const [loading, setLoading] = useState(true);

  // Nova clínica form
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicSlug, setNewClinicSlug] = useState('');
  const [newClinicOwner, setNewClinicOwner] = useState('');
  const [newClinicSeats, setNewClinicSeats] = useState(7);
  const [newClinicColor, setNewClinicColor] = useState('#4F46E5');
  const [isCreatingClinic, setIsCreatingClinic] = useState(false);

  useEffect(() => {
    // 1. Real-time listener for profiles
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfiles(data);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar perfis:", err);
      setLoading(false);
    });

    // 2. Real-time listener for authorized_emails
    const unsubAuth = onSnapshot(collection(db, 'authorized_emails'), (snapshot) => {
      const emails = snapshot.docs
        .filter(doc => doc.data().active !== false)
        .map(doc => doc.id.toLowerCase().trim());
      setAuthorizedEmails(emails);
    }, (err) => {
      console.error("Erro ao carregar e-mails autorizados:", err);
    });

    // 3. Real-time listener for clinics
    const unsubClinics = onSnapshot(collection(db, 'clinics'), (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Clinic[];
      setClinics(data);
    }, (err) => {
      console.error("Erro ao carregar clínicas:", err);
    });

    return () => {
      unsubProfiles();
      unsubAuth();
      unsubClinics();
    };
  }, []);

  // Compute stats and details for each user profile
  const usersData = useMemo(() => {
    const today = new Date();
    
    return profiles.map(p => {
      const email = p.email ? p.email.toLowerCase().trim() : '';
      const isPaid = authorizedEmails.includes(email) || p.isTrial === false;
      
      let remainingDays = 0;
      let status: 'paid' | 'trial' | 'expired' = 'trial';

      if (isPaid) {
        status = 'paid';
      } else if (p.trialStartDate) {
        const start = new Date(p.trialStartDate);
        // Pure date difference
        const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffTime = todayDateOnly.getTime() - startDateOnly.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        remainingDays = 7 - diffDays;
        
        status = remainingDays < 0 ? 'expired' : 'trial';
      } else {
        // Fallback for profiles without trialStartDate and not authorized
        status = 'expired';
        remainingDays = -1;
      }

      return {
        ...p,
        email,
        isPaid,
        status,
        remainingDays
      };
    });
  }, [profiles, authorizedEmails]);

  // Handle Action: Make Paid (Vitalício)
  const handleMakePaid = async (userId: string, email: string) => {
    if (!email) {
      alert("Erro: O usuário não possui e-mail cadastrado.");
      return;
    }
    const confirm = window.confirm(`Deseja liberar acesso vitalício para o e-mail: ${email}?`);
    if (!confirm) return;

    try {
      // 1. Add to authorized_emails collection
      const emailDocRef = doc(db, 'authorized_emails', email.toLowerCase().trim());
      await setDoc(emailDocRef, { active: true, createdAt: new Date().toISOString() });

      // 2. Update profiles document
      const profileRef = doc(db, 'profiles', userId);
      await updateDoc(profileRef, { isTrial: false });

      alert("Acesso vitalício concedido com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao conceder acesso: " + (err.message || String(err)));
    }
  };

  // Handle Action: Reset/Renew Trial (Estender +7 Dias)
  const handleResetTrial = async (userId: string, email: string) => {
    const confirm = window.confirm(`Deseja reiniciar o período de testes de 7 dias grátis para ${email}?`);
    if (!confirm) return;

    try {
      // 1. Remove from authorized_emails collection (if they were there)
      if (email) {
        const emailDocRef = doc(db, 'authorized_emails', email.toLowerCase().trim());
        await deleteDoc(emailDocRef);
      }

      // 2. Reset profile variables
      const profileRef = doc(db, 'profiles', userId);
      await updateDoc(profileRef, { 
        isTrial: true, 
        trialStartDate: new Date().toISOString() 
      });

      alert("Período de testes reiniciado com sucesso! (+7 dias ativos)");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao reiniciar testes: " + (err.message || String(err)));
    }
  };

  // Handle Action: Revoke Access (Voltar para Trial Expirado)
  const handleRevokeAccess = async (userId: string, email: string) => {
    if (!email) return;
    const confirm = window.confirm(`ATENÇÃO: Deseja revogar a licença de ${email} e colocá-lo como expirado?`);
    if (!confirm) return;

    try {
      // 1. Delete from authorized_emails
      const emailDocRef = doc(db, 'authorized_emails', email.toLowerCase().trim());
      await deleteDoc(emailDocRef);

      // 2. Update profile to trial with an expired date (e.g. 10 days ago)
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 10);

      const profileRef = doc(db, 'profiles', userId);
      await updateDoc(profileRef, { 
        isTrial: true, 
        trialStartDate: expiredDate.toISOString() 
      });

      alert("Licença revogada e usuário definido como expirado.");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao revogar acesso: " + (err.message || String(err)));
    }
  };

  // Statistics calculations
  const stats = useMemo(() => {
    const total = usersData.length;
    const paid = usersData.filter(u => u.status === 'paid').length;
    const trial = usersData.filter(u => u.status === 'trial').length;
    const expired = usersData.filter(u => u.status === 'expired').length;

    return { total, paid, trial, expired };
  }, [usersData]);

  // Filtered List
  const filteredUsers = useMemo(() => {
    return usersData.filter(u => {
      // Search text matches email or name
      const matchesSearch = 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;

      // Status filters
      if (statusFilter === 'all') return true;
      return u.status === statusFilter;
    });
  }, [usersData, searchQuery, statusFilter]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  // Handle Action: Inicializar Piloto Clínica Reinventar
  const handleInitPilotClinic = async () => {
    try {
      setIsCreatingClinic(true);
      await saveClinic(DEMO_PILOT_CLINIC);
      alert("✅ Clínica Piloto 'Clínica Reinventar' inicializada com sucesso!\nVocê já pode testar acessando ?clinic=reinventar");
    } catch (err: any) {
      alert("Erro ao inicializar piloto: " + err.message);
    } finally {
      setIsCreatingClinic(false);
    }
  };

  // Handle Action: Criar Nova Clínica
  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim() || !newClinicSlug.trim()) {
      alert("Preencha o nome e o slug da clínica.");
      return;
    }

    const cleanSlug = newClinicSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();

    try {
      setIsCreatingClinic(true);
      const newClinic: Clinic = {
        id: cleanSlug,
        slug: cleanSlug,
        name: newClinicName.trim(),
        ownerEmail: newClinicOwner.toLowerCase().trim(),
        maxSeats: Number(newClinicSeats) || 7,
        activeSeats: 1,
        theme: {
          primaryColor: newClinicColor,
          logoUrl: ''
        },
        settings: {
          allowPsychologistManageAgenda: true,
          allowPsychologistSetPrice: true,
          allowSupervision: true,
          defaultSessionDuration: 50,
          rooms: ['Sala 01', 'Sala 02']
        },
        createdAt: new Date().toISOString()
      };

      await saveClinic(newClinic);
      setNewClinicName('');
      setNewClinicSlug('');
      setNewClinicOwner('');
      alert(`✅ Clínica "${newClinic.name}" cadastrada com sucesso!`);
    } catch (err: any) {
      alert("Erro ao criar clínica: " + err.message);
    } finally {
      setIsCreatingClinic(false);
    }
  };

  const handleDeleteClinic = async (slug: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a clínica "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'clinics', slug));
      alert("Clínica excluída com sucesso.");
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-text-muted">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 lg:p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* Header com Seletor de Seção */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
            <ShieldCheck size={16} />
            <span>Área do Super Administrador</span>
          </div>
          <h2 className="text-2xl font-serif font-black text-text-main mt-1">Painel Master de Controle</h2>
          <p className="text-sm text-text-muted mt-0.5">Gerencie os psicólogos individuais (B2C) e as Clínicas Contratantes (B2B).</p>
        </div>

        {/* Alternador de Seções B2C vs B2B */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-card border border-white/5">
          <button
            onClick={() => setPanelSection('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              panelSection === 'users'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-muted hover:text-text-main hover:bg-white/5'
            }`}
          >
            <Users size={14} />
            Psicólogos Solo (B2C)
          </button>
          <button
            onClick={() => setPanelSection('clinics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              panelSection === 'clinics'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-muted hover:text-text-main hover:bg-white/5'
            }`}
          >
            <Building size={14} />
            Clínicas & Equipes (B2B)
          </button>
        </div>
      </div>

      {panelSection === 'clinics' ? (
        /* SEÇÃO DE CLÍNICAS B2B */
        <div className="space-y-8">
          {/* Card de Inicialização Rápida do Piloto */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                  Piloto B2B
                </span>
                <h3 className="text-lg font-bold text-text-main">Piloto "Clínica Reinventar" (7 Vagas)</h3>
              </div>
              <p className="text-sm text-text-muted">
                Inicialize a estrutura da clínica piloto com 7 vagas, tema indigo e regras de equipe para testar no seu navegador sem risco de afetar outros usuários.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleInitPilotClinic}
                disabled={isCreatingClinic}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:opacity-90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 shrink-0"
              >
                <Sparkles size={14} />
                {isCreatingClinic ? 'Criando...' : 'Inicializar / Resetar Piloto'}
              </button>

              <a
                href="/?clinic=reinventar"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-card border border-white/10 hover:border-primary text-text-main text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                Abrir Piloto <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Formulário: Nova Clínica */}
          <div className="bg-card border border-white/5 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-text-main">
              <Plus size={16} className="text-primary" />
              <span>Cadastrar Nova Clínica Contratante</span>
            </div>

            <form onSubmit={handleCreateClinic} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase">Nome da Clínica</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clínica Mente Sã"
                  value={newClinicName}
                  onChange={(e) => {
                    setNewClinicName(e.target.value);
                    if (!newClinicSlug) {
                      setNewClinicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-white/10 focus:border-primary text-sm focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase">Slug / Subdomínio</label>
                <input
                  type="text"
                  required
                  placeholder="mentesa"
                  value={newClinicSlug}
                  onChange={(e) => setNewClinicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-white/10 focus:border-primary text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase">E-mail do Dono/Admin</label>
                <input
                  type="email"
                  required
                  placeholder="diretoria@mentesa.com.br"
                  value={newClinicOwner}
                  onChange={(e) => setNewClinicOwner(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-white/10 focus:border-primary text-sm focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase">Vagas (Seats)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newClinicSeats}
                  onChange={(e) => setNewClinicSeats(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-white/10 focus:border-primary text-sm focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isCreatingClinic}
                  className="w-full py-2 px-4 rounded-xl bg-primary text-white font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                >
                  {isCreatingClinic ? 'Salvando...' : '+ Criar Clínica'}
                </button>
              </div>
            </form>
          </div>

          {/* Tabela de Clínicas Cadastradas */}
          <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-main">Clínicas Cadastradas ({clinics.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-background/50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <th className="p-4 pl-6">Clínica</th>
                    <th className="p-4">Subdomínio / Slug</th>
                    <th className="p-4">Administrador</th>
                    <th className="p-4">Vagas Contratadas</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clinics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-sm text-text-muted">
                        Nenhuma clínica cadastrada no momento. Clique em "Inicializar / Resetar Piloto" acima para criar a primeira.
                      </td>
                    </tr>
                  ) : (
                    clinics.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.01] transition-colors text-sm">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                              style={{ backgroundColor: c.theme?.primaryColor || '#4F46E5' }}
                            >
                              {c.name[0]}
                            </div>
                            <span className="font-bold text-text-main">{c.name}</span>
                          </div>
                        </td>

                        <td className="p-4 text-text-muted font-mono text-xs">
                          ?clinic={c.slug}
                        </td>

                        <td className="p-4 text-text-muted text-xs">
                          {c.ownerEmail || 'Não definido'}
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                            {c.maxSeats || 7} psicólogos
                          </span>
                        </td>

                        <td className="p-4 pr-6 text-right space-x-2 whitespace-nowrap">
                          <a
                            href={`/?clinic=${c.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-xs font-bold transition-all"
                          >
                            Abrir <ExternalLink size={12} />
                          </a>

                          <button
                            onClick={() => handleDeleteClinic(c.slug, c.name)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all"
                          >
                            <Trash2 size={12} />
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
      ) : (
        /* SEÇÃO DE PSICÓLOGOS SOLO (B2C) - MANTIDA 100% INALTERADA */
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Total Users */}
            <div className="bg-card border border-white/5 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Users size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Cadastros</p>
                <h3 className="text-2xl font-black text-text-main mt-0.5">{stats.total}</h3>
              </div>
            </div>

            {/* Vitalícios */}
            <div className="bg-card border border-[#5F7D5C]/15 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#5F7D5C]/15 flex items-center justify-center text-[#5F7D5C] shrink-0">
                <CheckCircle size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Vitalícios</p>
                <h3 className="text-2xl font-black text-text-main mt-0.5">{stats.paid}</h3>
              </div>
            </div>

            {/* Em Trial */}
            <div className="bg-card border border-blue-500/10 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <Clock size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Em Teste</p>
                <h3 className="text-2xl font-black text-text-main mt-0.5">{stats.trial}</h3>
              </div>
            </div>

            {/* Expirados */}
            <div className="bg-card border border-red-500/10 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <Lock size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Expirados</p>
                <h3 className="text-2xl font-black text-text-main mt-0.5">{stats.expired}</h3>
              </div>
            </div>

          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-white/5 p-4 rounded-2xl">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por e-mail ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-white/5 bg-background text-sm rounded-xl focus:outline-none focus:border-primary/40 text-text-main"
              />
            </div>

            <div className="flex gap-1 bg-background border border-white/5 p-1 rounded-xl w-full sm:w-auto">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'paid', label: 'Vitalícios' },
                { id: 'trial', label: 'Em Trial' },
                { id: 'expired', label: 'Expirados' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setStatusFilter(btn.id as any)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === btn.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-main hover:bg-white/5'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-background/50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <th className="p-4 pl-6">Psicólogo</th>
                    <th className="p-4">Data de Cadastro</th>
                    <th className="p-4">Status da Licença</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-sm text-text-muted">
                        Nenhum psicólogo encontrado com estes filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-colors text-sm">
                        {/* Name & Email */}
                        <td className="p-4 pl-6">
                          <div className="font-bold text-text-main">{u.name || 'Sem nome informado'}</div>
                          <div className="text-xs text-text-muted mt-0.5">{u.email}</div>
                        </td>

                        {/* Registration Date */}
                        <td className="p-4 text-text-muted">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            <span>{formatDate(u.createdAt || u.trialStartDate)}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="p-4">
                          {u.status === 'paid' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5F7D5C]/15 text-[#5F7D5C]">
                              <Unlock size={10} />
                              <span>Vitalício</span>
                            </span>
                          )}
                          
                          {u.status === 'trial' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500">
                              <Clock size={10} />
                              <span>Trial ({u.remainingDays} {u.remainingDays === 1 ? 'dia' : 'dias'})</span>
                            </span>
                          )}

                          {u.status === 'expired' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500">
                              <Lock size={10} />
                              <span>Expirado</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right space-x-2 whitespace-nowrap">
                          {u.status !== 'paid' ? (
                            <>
                              <button
                                onClick={() => handleMakePaid(u.id, u.email)}
                                className="px-3 py-1.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white text-xs font-bold rounded-lg transition-colors flex-inline items-center gap-1.5"
                              >
                                Liberar Vitalício
                              </button>
                              
                              <button
                                onClick={() => handleResetTrial(u.id, u.email)}
                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold rounded-lg transition-colors flex-inline items-center gap-1.5"
                              >
                                +7 Dias Teste
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRevokeAccess(u.id, u.email)}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-500 text-xs font-bold rounded-lg transition-colors flex-inline items-center gap-1.5"
                            >
                              Revogar Acesso
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

