import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Phone, 
  ShieldCheck, 
  Calendar, 
  XCircle, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Ban,
  Bell,
  BellOff,
  Settings,
  Code2,
  Check,
  Lock
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Session, Patient } from '../types';
import { cn } from '../lib/utils';
import { formatWhatsAppPhone } from '../lib/whatsappService';

interface WhatsAppRemindersPanelProps {
  user: any;
  sessions: Session[];
  patients: Patient[];
  profileSettings?: any;
  onUpdateSessionStatus?: (sessionId: string, newStatus: any) => void;
  effectivePlan?: 'free' | 'consultorio' | 'ilimitado' | 'lifetime';
  onOpenUpgradeModal?: () => void;
}

export function WhatsAppRemindersPanel({
  user,
  sessions,
  patients,
  profileSettings,
  onUpdateSessionStatus,
  effectivePlan,
  onOpenUpgradeModal,
}: WhatsAppRemindersPanelProps) {
  const userEmail = (user?.email || '').toLowerCase().trim();
  const isDev = userEmail === 'wellcoutinho99@gmail.com';
  const isPT = profileSettings?.country === 'PT';
  const isConsultorio = effectivePlan === 'consultorio';

  // Abas para o desenvolvedor: Visão do Usuário vs Painel Técnico da Meta
  const [activeSubTab, setActiveSubTab] = useState<'user' | 'dev'>('user');

  const [loading, setLoading] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<{ 
    d1_br: string; d1_pt: string; 
    d0_br: string; d0_pt: string; 
    cancel_br: string; cancel_pt: string 
  }>({
    d1_br: 'Verificando...',
    d1_pt: 'Verificando...',
    d0_br: 'Verificando...',
    d0_pt: 'Verificando...',
    cancel_br: 'Verificando...',
    cancel_pt: 'Verificando...',
  });

  // Telefone para disparo de teste (já preenche com o telefone do perfil do psicólogo)
  const defaultPhone = profileSettings?.phone 
    ? profileSettings.phone.replace(/\D/g, '')
    : (isDev ? '5562983208784' : '');
  const [manualPhone, setManualPhone] = useState(defaultPhone);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  // Checar status dos templates na Meta (disponível no modo dev)
  const checkTemplateStatus = async () => {
    setLoading(true);
    try {
      const token = 'EAANsmvCEdG8BStLQbLypOXS0wbrRWoRMfsEkPQIn87LhD1uvZAvoQ6kJ71F1sQZADxVSZBudO6T7hfeLZBXcZAxJHwcndzOoZC3THnHSD4NvQbPtH6dFyO0y8tBYPbzbOH6sJHIfsZCldfgOooQggpVubaHbVJB9kZCO0GOHrA1LBpW1pDamTSelwPZCZC72etRwZDZD';
      const wabaId = '1604487048142695';
      const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data?.data) {
        const d1_br = data.data.find((t: any) => t.name === 'lembrete_sessao_confirmacao' && t.language === 'pt_BR');
        const d1_pt = data.data.find((t: any) => t.name === 'lembrete_sessao_confirmacao' && t.language === 'pt_PT');
        const d0_br = data.data.find((t: any) => t.name === 'lembrete_sessao_inicio' && t.language === 'pt_BR');
        const d0_pt = data.data.find((t: any) => t.name === 'lembrete_sessao_inicio' && t.language === 'pt_PT');
        const cancel_br = data.data.find((t: any) => t.name === 'notificacao_cancelamento_psi' && t.language === 'pt_BR');
        const cancel_pt = data.data.find((t: any) => t.name === 'notificacao_cancelamento_psi' && t.language === 'pt_PT');

        setTemplateStatus({
          d1_br: d1_br?.status || 'Não cadastrado',
          d1_pt: d1_pt?.status || 'Não cadastrado',
          d0_br: d0_br?.status || 'Não cadastrado',
          d0_pt: d0_pt?.status || 'Não cadastrado',
          cancel_br: cancel_br?.status || 'Não cadastrado',
          cancel_pt: cancel_pt?.status || 'Não cadastrado',
        });
      }
    } catch (e: any) {
      console.error('Erro ao verificar status dos templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDev) {
      checkTemplateStatus();
    }
  }, [isDev]);

  // Disparar teste de demonstração para o WhatsApp
  const handleSendTestMessage = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const token = 'EAANsmvCEdG8BStLQbLypOXS0wbrRWoRMfsEkPQIn87LhD1uvZAvoQ6kJ71F1sQZADxVSZBudO6T7hfeLZBXcZAxJHwcndzOoZC3THnHSD4NvQbPtH6dFyO0y8tBYPbzbOH6sJHIfsZCldfgOooQggpVubaHbVJB9kZCO0GOHrA1LBpW1pDamTSelwPZCZC72etRwZDZD';
      const phoneId = '1261779623696198';
      const targetPhone = formatWhatsAppPhone(manualPhone);

      if (!targetPhone) {
        throw new Error('Por favor, informe um número de telemóvel/telefone válido com código do país (ex: 55... ou 351...).');
      }

      const isTargetPT = targetPhone.startsWith('351');
      const langCode = isTargetPT ? 'pt_PT' : 'pt_BR';
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1);
      const dateFormatted = `${testDate.getDate().toString().padStart(2, '0')}/${(testDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const psyName = profileSettings?.name || user?.displayName || 'Seu Consultório';

      // Envia modelo oficial de confirmação
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: targetPhone,
          type: 'template',
          template: {
            name: 'lembrete_sessao_confirmacao',
            language: { code: langCode },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'Você (Demonstração)' },
                  { type: 'text', text: `Amanhã, ${dateFormatted}` },
                  { type: 'text', text: '14:00' },
                  { type: 'text', text: psyName }
                ]
              },
              {
                type: 'button',
                sub_type: 'quick_reply',
                index: '0',
                parameters: [{ type: 'payload', payload: 'CONFIRM_TEST' }]
              },
              {
                type: 'button',
                sub_type: 'quick_reply',
                index: '1',
                parameters: [{ type: 'payload', payload: 'CANCEL_TEST' }]
              },
              {
                type: 'button',
                sub_type: 'quick_reply',
                index: '2',
                parameters: [{ type: 'payload', payload: 'OPTOUT_TEST' }]
              }
            ]
          }
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.error?.message || 'Falha no envio da mensagem.');
      }

      setTestResult({
        success: true,
        message: `Mensagem de demonstração enviada com sucesso para +${targetPhone}! Abra o seu WhatsApp para ver como o seu paciente/utente recebe.`
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao disparar mensagem de teste.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Forçar execução do Cron manualmente (apenas dev)
  const handleRunCronManually = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron-reminders', { method: 'POST' });
      const data = await res.json();
      setCronResult(data);
    } catch (e: any) {
      setCronResult({ success: false, error: e.message });
    } finally {
      setCronRunning(false);
    }
  };

  const handleToggleReminder = async (session: Session) => {
    try {
      const newDisabled = !session.reminderDisabled;
      if (!session.id.startsWith('virtual-')) {
        await updateDoc(doc(db, 'sessions', session.id), {
          reminderDisabled: newDisabled
        });
      } else {
        await setDoc(doc(db, 'sessions', session.id), {
          patientId: session.patientId,
          patientName: session.patientName || '',
          date: session.date,
          time: session.time,
          status: 'Agendada',
          type: session.type || 'Online',
          ownerId: (session as any).ownerId || user?.uid,
          reminderDisabled: newDisabled,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.error('Erro ao alternar lembrete:', err);
    }
  };

  // Montar lista unificada das próximas sessões da agenda
  const upcomingSessions = useMemo(() => {
    const list: any[] = [];
    const targetTz = isPT ? 'Europe/Lisbon' : 'America/Sao_Paulo';
    const now = new Date();

    const getTzYMD = (date: Date) => {
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: targetTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      return `${year}-${month}-${day}`;
    };

    const todayStr = getTzYMD(now);
    const [todayY, todayM, todayD] = todayStr.split('-').map(Number);

    const nowParts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: targetTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now).split(':').map(Number);
    const currentMinutes = (nowParts[0] || 0) * 60 + (nowParts[1] || 0);

    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    // 1. Sessões gravadas (a partir de hoje no fuso local)
    sessions.forEach(s => {
      if (s.date >= todayStr && s.status !== 'Cancelada') {
        list.push({ ...s, isRecurrentSlot: false });
      }
    });

    // 2. Projetar sessões recorrentes (utilizando o fuso horário correto para não descompassar dias e datas)
    const nextDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayY, todayM - 1, todayD + i, 12, 0, 0);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = weekdays[d.getDay()];
      return { dateStr, dayName, isToday: i === 0 };
    });

    patients.forEach(p => {
      if (p.status === 'Ativo' && p.sessionDay && p.sessionTime) {
        nextDays.forEach(({ dateStr, dayName, isToday }) => {
          if (p.sessionDay === dayName) {
            const hasRecorded = list.some(s => s.patientId === p.id && s.date === dateStr);
            if (hasRecorded) return;

            // Se for hoje e o horário da sessão já passou, não deve projetar lembrete futuro virtual
            if (isToday) {
              const [sH, sM] = (p.sessionTime || '00:00').split(':').map(Number);
              const sessionMinutes = (sH || 0) * 60 + (sM || 0);
              if (sessionMinutes <= currentMinutes) return;
            }

            const pRecurrenceStart = p.recurrenceStart || p.firstSessionDate || p.createdAt || '2024-01-01';
            const startDateObj = new Date(pRecurrenceStart.split('T')[0] + 'T00:00:00');
            const currDateObj = new Date(dateStr + 'T00:00:00');
            if (currDateObj < startDateObj) return;

            const diffWeeks = Math.floor((currDateObj.getTime() - startDateObj.getTime()) / (7 * 24 * 60 * 60 * 1000));
            let shouldInclude = false;
            if (!p.recurrence || p.recurrence === 'Semanal') shouldInclude = true;
            else if (p.recurrence === 'Quinzenal') shouldInclude = diffWeeks % 2 === 0;
            else if (p.recurrence === 'Mensal') shouldInclude = diffWeeks % 4 === 0;

            if (shouldInclude) {
              const virtualDoc = sessions.find(s => s.id === `virtual-${p.id}-${dateStr}`);
              list.push({
                id: `virtual-${p.id}-${dateStr}`,
                patientId: p.id,
                patientName: p.name,
                patientPhone: p.phone,
                date: dateStr,
                time: p.sessionTime,
                status: 'Agendada',
                duration: '50min',
                type: p.modality || 'Online',
                reminderDisabled: virtualDoc?.reminderDisabled || false,
                reminderD1Sent: virtualDoc?.reminderD1Sent || false,
                reminderD0Sent: virtualDoc?.reminderD0Sent || false,
                isRecurrentSlot: true
              });
            }
          }
        });
      }
    });

    return list.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
  }, [sessions, patients, isPT]);

  return (
    <div className="space-y-6">
      {/* HEADER DO PAINEL */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-surface to-surface border border-emerald-500/20 rounded-3xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isPT ? 'Automação Oficial WhatsApp Conectada' : 'Automação Oficial WhatsApp Ativa'}
              </span>
              <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-text-muted text-[11px] font-semibold rounded-full">
                {isPT ? '🇵🇹 Fuso Horário de Lisboa' : '🇧🇷 Fuso Horário de Brasília'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-text-main tracking-tight">
              Central de Lembretes WhatsApp
            </h1>
            <p className="text-sm text-text-muted mt-1 max-w-xl">
              {isPT 
                ? 'Automação humanizada de consultas. O robô monitoriza a sua agenda do SimplePsi, avisa os seus utentes na véspera com botões interativos e envia o link 1h30 antes.'
                : 'Automação humanizada de sessões. O robô monitora a sua agenda do SimplePsi, avisa os seus pacientes na véspera com botões interativos e envia o link 1h30 antes.'}
            </p>
          </div>

          {/* Abas e Controles de Desenvolvedor (se for o Wellington) */}
          {isDev && (
            <div className="flex items-center gap-2 bg-surface-muted/60 p-1.5 rounded-2xl border border-white/5 self-start lg:self-center">
              <button
                onClick={() => setActiveSubTab('user')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeSubTab === 'user'
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-text-muted hover:text-text-main"
                )}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Visão do Psicólogo</span>
              </button>
              <button
                onClick={() => setActiveSubTab('dev')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeSubTab === 'dev'
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-text-muted hover:text-text-main"
                )}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Painel Dev (Meta)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO TÉCNICA DO DESENVOLVEDOR (EXIBIDA APENAS QUANDO ATIVADA POR WELLINGTON) */}
      {isDev && activeSubTab === 'dev' && (
        <div className="bg-surface border border-emerald-500/30 rounded-3xl p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Code2 className="w-4 h-4" />
                <span>Ferramentas de Engenharia & Meta Cloud API</span>
              </div>
              <p className="text-xs text-text-muted">
                Controle interno de infraestrutura, status dos modelos na nuvem da Meta e disparador manual do cron.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunCronManually}
                disabled={cronRunning}
                className="px-4 py-2 bg-surface-hover border border-white/10 hover:border-emerald-500/40 text-text-main text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-400", cronRunning && "animate-spin")} />
                <span>{cronRunning ? "Disparando..." : "Rodar Cron Manual"}</span>
              </button>
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>WhatsApp Manager Meta</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Modelos e Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-muted/40 border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-text-muted uppercase">Lembrete Véspera (D-1)</div>
              <div className="text-xs font-mono text-emerald-400">lembrete_sessao_confirmacao</div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                <span>🇧🇷 Brasil (pt_BR):</span>
                <span className="font-bold text-emerald-400">{templateStatus.d1_br}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>🇵🇹 Portugal (pt_PT):</span>
                <span className={cn("font-bold", templateStatus.d1_pt === 'APPROVED' ? "text-emerald-400" : "text-amber-400")}>
                  {templateStatus.d1_pt}
                </span>
              </div>
            </div>

            <div className="bg-surface-muted/40 border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-text-muted uppercase">Lembrete Imediato (D-0)</div>
              <div className="text-xs font-mono text-indigo-400">lembrete_sessao_inicio</div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                <span>🇧🇷 Brasil (pt_BR):</span>
                <span className="font-bold text-emerald-400">{templateStatus.d0_br}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>🇵🇹 Portugal (pt_PT):</span>
                <span className={cn("font-bold", templateStatus.d0_pt === 'APPROVED' ? "text-emerald-400" : "text-amber-400")}>
                  {templateStatus.d0_pt}
                </span>
              </div>
            </div>

            <div className="bg-surface-muted/40 border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-text-muted uppercase">Aviso Desmarcação (Psi)</div>
              <div className="text-xs font-mono text-rose-400">notificacao_cancelamento_psi</div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                <span>🇧🇷 Brasil (pt_BR):</span>
                <span className="font-bold text-emerald-400">{templateStatus.cancel_br}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>🇵🇹 Portugal (pt_PT):</span>
                <span className={cn("font-bold", templateStatus.cancel_pt === 'APPROVED' ? "text-emerald-400" : "text-amber-400")}>
                  {templateStatus.cancel_pt}
                </span>
              </div>
            </div>
          </div>

          {/* Resultado do Cron Manual */}
          {cronResult && (
            <div className="bg-black/30 border border-white/10 p-4 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-emerald-400">Retorno da execução do robô:</p>
              <pre className="text-text-muted overflow-x-auto p-2 bg-black/40 rounded-lg font-mono text-[11px]">
                {JSON.stringify(cronResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* CARDS VISUAIS DE FUNCIONAMENTO (PARA TODOS OS PSICÓLOGOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Canal Oficial */}
        <div className="bg-surface border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Canal Oficial</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-text-main flex items-center gap-1.5">
              <span>SimplePsi WhatsApp</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Disparos seguros com selo de verificação corporativo via Meta Graph API oficial.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Status do Robô</span>
            <span className="text-emerald-400 font-bold">100% Ativo</span>
          </div>
        </div>

        {/* Card 2: Lembrete Véspera (D-1) */}
        <div className="bg-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Lembrete Véspera (D-1)</span>
              {isConsultorio ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                  <CheckCircle2 size={10} /> Ativo no seu plano
                </span>
              ) : (
                <Clock className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="text-base font-bold text-text-main">Confirmação Antecipada</div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {isPT
                ? 'Enviado 24h antes com botões interativos para o utente confirmar ou desmarcar a consulta.'
                : 'Enviado 24h antes com botões interativos para o paciente confirmar ou desmarcar a sessão.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Horário de Envio</span>
            <span className="text-primary font-bold">08h às 21h</span>
          </div>
        </div>

        {/* Card 3: Lembrete Imediato (D-0) */}
        <div className={cn(
          "border rounded-2xl p-5 flex flex-col justify-between transition-all",
          isConsultorio 
            ? "bg-indigo-500/5 border-indigo-500/30" 
            : "bg-surface border-white/5"
        )}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Lembrete Imediato (D-0)</span>
              {isConsultorio ? (
                <button
                  type="button"
                  onClick={onOpenUpgradeModal}
                  className="text-[10px] bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-500/30 transition-colors cursor-pointer"
                  title="Fazer upgrade para o Plano Ilimitado"
                >
                  <Lock size={10} /> Plano Ilimitado Pro
                </button>
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div className="text-base font-bold text-text-main">Link & Pontualidade</div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {isPT
                ? 'Envia 1h30 antes da consulta com o link do Google Meet para reduzir faltas de última hora.'
                : 'Envia 1h30 antes da sessão com o link do Google Meet para reduzir faltas de última hora.'}
            </p>
          </div>
          {isConsultorio ? (
            <div className="mt-4 pt-3 border-t border-indigo-500/20 flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Exclusivo do Pro</span>
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                {isPT ? 'Desbloquear (+10€/mês) →' : 'Desbloquear (+R$ 30/mês) →'}
              </button>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Antecedência</span>
              <span className="text-indigo-400 font-bold">1h30 antes</span>
            </div>
          )}
        </div>

        {/* Card 4: Alerta de Cancelamento */}
        <div className="bg-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Alerta ao Psicólogo</span>
              <Bell className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-base font-bold text-text-main">Aviso no Seu Celular</div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {isPT
                ? 'Se um utente desmarcar pelo botão, o robô envia um aviso instantâneo para o seu WhatsApp.'
                : 'Se um paciente desmarcar pelo botão, o robô envia um aviso instantâneo para o seu WhatsApp.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Seu Contato</span>
            <span className="text-rose-400 font-bold truncate max-w-[120px]">
              {profileSettings?.phone || 'Cadastrado no perfil'}
            </span>
          </div>
        </div>
      </div>

      {/* DISPARO DE TESTE / DEMONSTRAÇÃO */}
      <div className="bg-surface border border-white/5 rounded-3xl p-6">
        <h2 className="text-base font-bold text-text-main mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Experimente no Seu Próprio WhatsApp</span>
        </h2>
        <p className="text-xs text-text-muted mb-4 max-w-2xl">
          {isPT
            ? 'Digite o seu número de telemóvel para receber uma demonstração prática e ver exatamente como os seus utentes receberão o lembrete com botões interativos.'
            : 'Digite o seu número de WhatsApp para receber uma demonstração prática e ver exatamente como os seus pacientes receberão o lembrete com botões interativos.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              placeholder={isPT ? "Ex: 351912345678" : "Ex: 5511999998888"}
              className="w-full px-4 py-2.5 bg-surface-hover border border-white/10 rounded-xl text-sm text-text-main focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>
          <button
            onClick={handleSendTestMessage}
            disabled={loading || !manualPhone}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? "Enviando..." : "Enviar Demonstração para Mim"}</span>
          </button>
        </div>

        {testResult && (
          <div className={cn(
            "mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200",
            testResult.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* FILA DAS PRÓXIMAS SESSÕES E STATUS DO LEMBRETE */}
      <div className="bg-surface border border-white/5 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-text-main flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{isPT ? 'Próximas Consultas (Monitorização Automática)' : 'Próximas Sessões na sua Agenda (Pipeline Automático)'}</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {isPT
                ? 'O robô lê a sua agenda e programa os lembretes automaticamente. Você pode pausar o lembrete de uma consulta específica a qualquer momento.'
                : 'O robô lê a sua agenda e programa os lembretes automaticamente. Você pode pausar o lembrete de uma consulta específica a qualquer momento.'}
            </p>
          </div>
          <span className="text-xs text-text-muted bg-white/5 px-3 py-1 rounded-full self-start sm:self-center">
            {upcomingSessions.length} {isPT ? 'consultas agendadas' : 'sessões agendadas'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-text-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-3">{isPT ? 'Utente' : 'Paciente'}</th>
                <th className="py-3 px-3">{isPT ? 'Telemóvel' : 'WhatsApp'}</th>
                <th className="py-3 px-3">Data & Horário</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Véspera (D-1)</th>
                <th className="py-3 px-3">Início (D-0)</th>
                <th className="py-3 px-3 text-right">Lembrete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {upcomingSessions.map((session) => {
                const patient = patients.find(p => p.id === session.patientId);
                const phone = session.patientPhone || patient?.phone || (isPT ? 'Sem telemóvel' : 'Sem telefone');
                const hasValidPhone = phone !== 'Sem telefone' && phone !== 'Sem telemóvel' && phone.replace(/\D/g, '').length >= 9;

                return (
                  <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-text-main">
                      {session.patientName || patient?.name || (isPT ? 'Utente' : 'Paciente')}
                    </td>
                    <td className="py-3.5 px-3 text-text-muted">
                      {hasValidPhone ? (
                        <span className="text-emerald-400 font-mono">{phone}</span>
                      ) : (
                        <span className="text-rose-400 text-[11px]">⚠️ {isPT ? 'Falta telemóvel' : 'Falta telefone'}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-text-main">
                      {session.date} às {session.time}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                        session.status === 'Confirmada' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        session.status === 'Desmarcou' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                        session.status === 'Realizada' ? "bg-blue-500/20 text-blue-400" :
                        "bg-white/10 text-text-muted"
                      )}>
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {session.reminderD1Sent ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enviado
                        </span>
                      ) : (
                        <span className="text-text-muted flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Programado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {isConsultorio ? (
                        <button
                          type="button"
                          onClick={onOpenUpgradeModal}
                          className="text-[11px] text-indigo-400/80 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer transition-colors"
                          title="Lembretes no dia são exclusivos do Plano Ilimitado. Clique para desbloquear."
                        >
                          <Lock className="w-3 h-3 text-indigo-400" />
                          <span>Disponível no Pro</span>
                        </button>
                      ) : session.reminderD0Sent ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enviado
                        </span>
                      ) : (
                        <span className="text-text-muted flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          1h30 antes
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleReminder(session)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer",
                          session.reminderDisabled
                            ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                        )}
                        title={session.reminderDisabled ? "Clique para ativar os lembretes para esta sessão" : "Clique para pausar os lembretes para esta sessão"}
                      >
                        {session.reminderDisabled ? (
                          <>
                            <BellOff className="w-3 h-3" />
                            Pausado
                          </>
                        ) : (
                          <>
                            <Bell className="w-3 h-3" />
                            Ativo
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {upcomingSessions.length === 0 && (
            <div className="py-12 text-center text-text-muted text-xs">
              {isPT
                ? 'Nenhuma consulta futura agendada no momento. Assim que marcar na agenda, ela aparecerá aqui!'
                : 'Nenhuma sessão futura agendada no momento. Assim que marcar na agenda, ela aparecerá aqui!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
