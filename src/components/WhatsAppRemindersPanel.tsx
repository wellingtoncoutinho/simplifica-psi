import React, { useState, useEffect } from 'react';
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
  BellOff
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Session, Patient } from '../types';
import { cn } from '../lib/utils';
import { formatWhatsAppPhone } from '../lib/whatsappService';

interface WhatsAppRemindersPanelProps {
  user: any;
  sessions: Session[];
  patients: Patient[];
  onUpdateSessionStatus?: (sessionId: string, newStatus: any) => void;
}

export function WhatsAppRemindersPanel({
  user,
  sessions,
  patients,
  onUpdateSessionStatus,
}: WhatsAppRemindersPanelProps) {
  // Controle de segurança: restrito exclusivamente para o e-mail do Wellington
  const userEmail = (user?.email || '').toLowerCase().trim();
  const isAuthorized = userEmail === 'wellcoutinho99@gmail.com';

  const [loading, setLoading] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<{ d1: string; d0: string; cancelAlert: string }>({
    d1: 'Verificando...',
    d0: 'Verificando...',
    cancelAlert: 'Verificando...',
  });
  const [manualPhone, setManualPhone] = useState('5562983208784');
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  // Checar status dos templates na Meta
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
        const d1 = data.data.find((t: any) => t.name === 'lembrete_sessao_confirmacao');
        const d0 = data.data.find((t: any) => t.name === 'lembrete_sessao_inicio');
        const cancelAlert = data.data.find((t: any) => t.name === 'notificacao_cancelamento_psi');
        setTemplateStatus({
          d1: d1?.status || 'Não encontrado',
          d0: d0?.status || 'Não encontrado',
          cancelAlert: cancelAlert?.status || 'Não encontrado',
        });
      }
    } catch (e: any) {
      console.error('Erro ao verificar status dos templates:', e);
      setTemplateStatus({ d1: 'Erro ao consultar', d0: 'Erro ao consultar', cancelAlert: 'Erro ao consultar' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      checkTemplateStatus();
    }
  }, [isAuthorized]);

  // Disparar teste imediato para o número manual
  const handleSendTestMessage = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const token = 'EAANsmvCEdG8BStLQbLypOXS0wbrRWoRMfsEkPQIn87LhD1uvZAvoQ6kJ71F1sQZADxVSZBudO6T7hfeLZBXcZAxJHwcndzOoZC3THnHSD4NvQbPtH6dFyO0y8tBYPbzbOH6sJHIfsZCldfgOooQggpVubaHbVJB9kZCO0GOHrA1LBpW1pDamTSelwPZCZC72etRwZDZD';
      const phoneId = '1261779623696198';
      const targetPhone = formatWhatsAppPhone(manualPhone);

      // Envia modelo oficial aprovado de confirmação
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: targetPhone,
          type: 'template',
          template: {
            name: 'lembrete_sessao_confirmacao',
            language: { code: 'pt_BR' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'Wellington (Teste)' },
                  { type: 'text', text: 'Amanhã' },
                  { type: 'text', text: '15:00' },
                  { type: 'text', text: 'Psi Wellington Coutinho' },
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
        throw new Error(resData?.error?.message || 'Falha no envio');
      }

      setTestResult({
        success: true,
        message: `Mensagem de teste enviada com sucesso para ${targetPhone}! Verifique seu WhatsApp.`
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao disparar mensagem'
      });
    } finally {
      setLoading(false);
    }
  };

  // Forçar execução do Cron manualmente
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
      }
    } catch (e: any) {
      console.error('Erro ao alternar lembrete:', e);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-surface border border-white/10 rounded-2xl max-w-md mx-auto my-12">
        <Ban className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-text-main mb-2">Acesso Exclusivo</h2>
        <p className="text-sm text-text-muted">
          Este painel de automação do WhatsApp é reservado exclusivamente para o administrador da conta.
        </p>
      </div>
    );
  }

  // Obter data de hoje no formato YYYY-MM-DD
  const todayYMD = new Date().toISOString().split('T')[0];

  // Filtrar APENAS sessões futuras da Agenda (de hoje em diante), de pacientes ATIVOS, e com status 'Agendada' ou 'Confirmada'
  const upcomingSessions = sessions
    .filter(s => {
      if (!s.date || s.date < todayYMD) return false;
      if (s.status === 'Cancelada' || s.status === 'Realizada' || s.status === 'Desmarcou') return false;
      const patient = patients.find(p => p.id === s.patientId);
      if (!patient || patient.status === 'Inativo') return false;
      return true;
    })
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">
      {/* HEADER DO PAINEL */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-surface to-surface border border-emerald-500/20 rounded-3xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <MessageSquare className="w-6 h-6" />
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                API Oficial Meta Cloud Conectada
              </span>
              <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold rounded-full">
                Exclusivo Wellington
              </span>
            </div>
            <h1 className="text-2xl font-black text-text-main tracking-tight">
              Central de Lembretes WhatsApp
            </h1>
            <p className="text-sm text-text-muted mt-1 max-w-xl">
              Automação inteligente de sessões. O robô lê diretamente a sua agenda do SimplePsi, 
              avisa os seus pacientes na véspera com botões de confirmação e manda o link 1h30 antes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunCronManually}
              disabled={cronRunning}
              className="px-4 py-2.5 bg-surface-hover border border-white/10 hover:border-emerald-500/40 text-text-main text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 text-emerald-400", cronRunning && "animate-spin")} />
              {cronRunning ? "Verificando..." : "Rodar Verificação Agora"}
            </button>
            <a
              href="https://business.facebook.com/wa/manage/message-templates/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>Gerenciador Meta</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* CARDS DE STATUS E MODELOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Status da API */}
        <div className="bg-surface border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Número Oficial</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">+55 (21) 96886-4184</div>
          <div className="text-xs text-text-muted mt-1">ID: <code className="text-emerald-400 font-mono">1261779623696198</code></div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-text-muted">
            <span>Status da Nuvem</span>
            <span className="text-emerald-400 font-bold">100% Online</span>
          </div>
        </div>

        {/* Card 2: Modelo D-1 (Véspera) */}
        <div className="bg-surface border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Lembrete Véspera (D-1)</span>
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="text-xs font-semibold text-text-main truncate">lembrete_sessao_confirmacao</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
              templateStatus.d1 === 'APPROVED' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}>
              {templateStatus.d1 === 'APPROVED' ? 'Aprovado' : templateStatus.d1}
            </span>
            <button onClick={checkTemplateStatus} className="text-text-muted hover:text-text-main text-xs p-1">
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-text-muted">
            Envia 24h antes com botões de confirmação.
          </div>
        </div>

        {/* Card 3: Modelo D-0 (1h30 antes) */}
        <div className="bg-surface border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Lembrete Imediato (D-0)</span>
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-xs font-semibold text-text-main truncate">lembrete_sessao_inicio</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
              templateStatus.d0 === 'APPROVED' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}>
              {templateStatus.d0 === 'APPROVED' ? 'Aprovado' : templateStatus.d0}
            </span>
            <button onClick={checkTemplateStatus} className="text-text-muted hover:text-text-main text-xs p-1">
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-text-muted">
            Envia 1h30 antes com link do Meet e política.
          </div>
        </div>

        {/* Card 4: Alerta Cancelamento (Psi) */}
        <div className="bg-surface border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Aviso Cancelamento</span>
            <Bell className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-xs font-semibold text-text-main truncate">notificacao_cancelamento_psi</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
              templateStatus.cancelAlert === 'APPROVED' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}>
              {templateStatus.cancelAlert === 'APPROVED' ? 'Aprovado' : templateStatus.cancelAlert}
            </span>
            <button onClick={checkTemplateStatus} className="text-text-muted hover:text-text-main text-xs p-1">
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-text-muted">
            Notifica seu WhatsApp (62) 98320-8784 se desmarcarem.
          </div>
        </div>
      </div>

      {/* RESULTADO DO CRON SE ACIONADO */}
      {cronResult && (
        <div className="bg-surface border border-white/10 p-4 rounded-2xl text-xs text-text-main space-y-1">
          <p className="font-bold text-emerald-400">Resultado da checagem automática:</p>
          <pre className="text-text-muted overflow-x-auto p-2 bg-black/30 rounded-lg">{JSON.stringify(cronResult, null, 2)}</pre>
        </div>
      )}

      {/* DISPARO DE TESTE RÁPIDO */}
      <div className="bg-surface border border-white/5 rounded-3xl p-6">
        <h2 className="text-base font-bold text-text-main mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-400" />
          Teste Imediato de Conexão WhatsApp
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Digite o número com DDD (ex: 5511939215473) para disparar um ping de teste pela API da Meta agora mesmo.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="Ex: 5511939215473"
            className="w-full sm:w-80 px-4 py-2.5 bg-surface-hover border border-white/10 rounded-xl text-sm text-text-main focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            onClick={handleSendTestMessage}
            disabled={loading || !manualPhone}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Mensagem de Teste</span>
          </button>
        </div>

        {testResult && (
          <div className={cn(
            "mt-4 p-3 rounded-xl text-xs flex items-center gap-2",
            testResult.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* FILA DAS PRÓXIMAS SESSÕES E STATUS DO LEMBRETE */}
      <div className="bg-surface border border-white/5 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-text-main flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Próximas Sessões na sua Agenda (Pipeline dos Pacientes)
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              O sistema monitora essas consultas automaticamente. Você não precisa cadastrar nada além da sua agenda normal.
            </p>
          </div>
          <span className="text-xs text-text-muted bg-white/5 px-3 py-1 rounded-full">
            {upcomingSessions.length} sessões listadas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-text-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Paciente</th>
                <th className="py-3 px-3">Telefone</th>
                <th className="py-3 px-3">Data & Horário</th>
                <th className="py-3 px-3">Status da Sessão</th>
                <th className="py-3 px-3">Lembrete Véspera (D-1)</th>
                <th className="py-3 px-3">Lembrete Início (D-0)</th>
                <th className="py-3 px-3 text-right">Automação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {upcomingSessions.map((session) => {
                const patient = patients.find(p => p.id === session.patientId);
                const phone = session.patientPhone || patient?.phone || 'Sem telefone';
                const hasValidPhone = phone !== 'Sem telefone' && phone.replace(/\D/g, '').length >= 10;

                return (
                  <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-text-main">
                      {session.patientName || patient?.name || 'Paciente'}
                    </td>
                    <td className="py-3.5 px-3 text-text-muted">
                      {hasValidPhone ? (
                        <span className="text-emerald-400 font-mono">{phone}</span>
                      ) : (
                        <span className="text-rose-400 text-[11px]">⚠️ Falta telefone</span>
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
                      {session.reminderD0Sent ? (
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
              Nenhuma sessão futura agendada no momento. Assim que você marcar na agenda, ela aparecerá aqui!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
