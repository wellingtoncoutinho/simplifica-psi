import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Zap,
  Loader2, 
  ExternalLink,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail: string;
  currentPlan?: 'free' | 'consultorio' | 'ilimitado' | 'lifetime';
  isTrial?: boolean;
  trialDaysRemaining?: number;
  hasStripeCustomer?: boolean;
  limitReason?: string;
  country?: 'BR' | 'PT';
}

export default function UpgradeModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentPlan = 'free',
  isTrial = false,
  trialDaysRemaining = 7,
  hasStripeCustomer = false,
  limitReason,
  country = 'BR'
}: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<'consultorio' | 'ilimitado' | 'portal' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCheckout = async (plan: 'consultorio' | 'ilimitado') => {
    try {
      setLoadingPlan(plan);
      setErrorMessage(null);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: userId || userEmail,
          userEmail,
          returnOrigin: window.location.origin,
          country: country || 'BR',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Não foi possível iniciar o checkout.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Erro ao redirecionar para o checkout:', err);
      setErrorMessage(err.message || 'Erro ao conectar à Stripe.');
      setLoadingPlan(null);
    }
  };

  const handleOpenCustomerPortal = async () => {
    try {
      setLoadingPlan('portal');
      setErrorMessage(null);

      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || userEmail,
          userEmail: userEmail,
          returnOrigin: window.location.origin,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Não foi possível abrir o portal do cliente.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Erro ao abrir portal da Stripe:', err);
      setErrorMessage(err.message || 'Erro ao carregar portal de gerenciamento da Stripe.');
      setLoadingPlan(null);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl lg:max-w-3xl w-full border border-[#2E3C2B]/10 shadow-2xl relative my-auto max-h-[95vh] flex flex-col text-[#2E3C2B] overflow-hidden"
        >
          {/* Botão Fechar - Fixo no cabeçalho com alto contraste e clique garantido */}
          <button
            onClick={onClose}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-1.5 text-[#2E3C2B]/60 hover:text-[#2E3C2B] bg-[#2E3C2B]/5 hover:bg-[#2E3C2B]/10 rounded-full transition-colors z-30 cursor-pointer shadow-2xs"
            aria-label="Fechar"
            title="Fechar"
          >
            <X size={18} />
          </button>

          {/* Cabeçalho Compacto */}
          <div className="px-5 py-3 sm:px-6 sm:py-3.5 text-center space-y-1 border-b border-[#2E3C2B]/5 bg-[#FAF9F6] shrink-0 relative pr-12">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#5F7D5C] bg-[#5F7D5C]/10 py-0.5 px-2.5 rounded-full inline-block">
              {country === 'PT' ? 'Gestão de Plano • SimplePsi' : 'Gerenciamento de Plano • SimplePsi'}
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[#2E3C2B]">
              {currentPlan === 'lifetime' 
                ? (country === 'PT' ? 'A sua Licença e Subscrição' : 'Sua Assinatura e Licença') 
                : (country === 'PT' ? 'Planos & Subscrições' : 'Planos & Assinaturas')}
            </h2>
            {limitReason ? (
              <p className="text-[11px] text-amber-800 font-medium bg-amber-50 border border-amber-200 py-1 px-3 rounded-lg max-w-md mx-auto">
                {limitReason}
              </p>
            ) : (
              <p className="text-[11px] text-[#2E3C2B]/60 max-w-md mx-auto leading-tight">
                {currentPlan === 'lifetime'
                  ? 'Informações da sua licença permanente ativa no sistema.'
                  : (country === 'PT' ? 'Aumente o limite de utentes ou faça a gestão da faturação sem burocracia.' : 'Aumente seu limite de pacientes ou gerencie sua cobrança sem burocracia.')}
              </p>
            )}

            {errorMessage && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 py-1 px-3 rounded-lg max-w-md mx-auto">
                {errorMessage}
              </p>
            )}
          </div>

          {/* CONTEÚDO PARA PLANO VITALÍCIO */}
          {currentPlan === 'lifetime' ? (
            <div className="p-5 sm:p-6 text-center space-y-3.5 max-w-md mx-auto overflow-y-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#5F7D5C]/15 text-[#5F7D5C] mx-auto flex items-center justify-center">
                <ShieldCheck size={28} />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#5F7D5C] bg-[#5F7D5C]/10 py-0.5 px-2.5 rounded-full inline-block">
                  Licença Permanente Ativa
                </span>
                <h3 className="text-xl font-serif font-black text-[#2E3C2B]">
                  {country === 'PT' ? 'Tem Acesso Vitalício' : 'Você tem Acesso Vitalício'}
                </h3>
                <p className="text-[11px] text-[#2E3C2B]/75 leading-relaxed">
                  {country === 'PT'
                    ? <>A sua conta possui licença permanente com todos os recursos disponíveis: <strong>utentes ilimitados</strong>, lembretes de WhatsApp antifaltas, IA clínica completa e histórico de processos clínicos.</>
                    : <>Sua conta possui licença permanente com todos os recursos liberados: <strong>pacientes ilimitados</strong>, robô de WhatsApp antifaltas, IA clínica completa e histórico de prontuários.</>}
                </p>
              </div>

              <div className="p-3 bg-[#FAF9F6] border border-[#2E3C2B]/10 rounded-xl text-[11px] text-[#2E3C2B]/80 font-medium space-y-1 text-left">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <Check size={14} /> <span>Sem cobranças de mensalidade para sempre</span>
                </div>
                <div className="flex items-center gap-2 text-[#2E3C2B]/70">
                  <Check size={14} className="text-[#5F7D5C]" /> <span>Acesso a todas as novas atualizações</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Voltar ao Sistema
              </button>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 flex flex-col justify-between">
              <div>
                {/* Banner Informativo de Período de Testes Compacto */}
                {isTrial && (
                  <div className="mx-4 sm:mx-6 mt-3 mb-0.5 p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/80 text-left flex items-center gap-2.5 shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/15 text-emerald-800 flex items-center justify-center shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-emerald-950">
                        {country === 'PT'
                          ? `Está no Período Experimental (${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'})`
                          : `Você está no Período de Testes (${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'})`}
                      </h4>
                      <p className="text-[10px] text-emerald-800/80 leading-snug mt-0.5">
                        {country === 'PT'
                          ? 'Gostou do SimplePsi e deseja subscrever? Escolha o seu plano abaixo para ir diretamente ao checkout da Stripe!'
                          : 'Gostou do SimplePsi e deseja assinar já? Escolha seu plano abaixo para ir direto ao checkout da Stripe e liberar o envio de lembretes no WhatsApp!'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cards dos Planos Compactos */}
                <div className="px-4 py-2.5 sm:px-6 sm:py-3 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  
                  {/* PLANO CONSULTÓRIO */}
                  <div className={`border rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all ${
                    !isTrial && currentPlan === 'consultorio' 
                      ? 'border-[#5F7D5C] bg-[#5F7D5C]/5 ring-2 ring-[#5F7D5C]/20' 
                      : 'border-[#2E3C2B]/10 bg-[#FAF9F6] hover:border-[#5F7D5C]/40'
                  }`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#5F7D5C] bg-[#5F7D5C]/10 py-0.5 px-2 rounded-md">
                          Consultório
                        </span>
                        {!isTrial && currentPlan === 'consultorio' && (
                          <span className="text-[9px] font-bold text-white bg-[#5F7D5C] py-0.5 px-2 rounded-md">
                            Plano Atual
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-[#2E3C2B]/60 font-semibold">{country === 'PT' ? '€' : 'R$'}</span>
                          <span className="text-2xl sm:text-[26px] font-serif font-black text-[#2E3C2B]">
                            {country === 'PT' ? '19,00' : '49,90'}
                          </span>
                          <span className="text-[11px] text-[#2E3C2B]/60">/mês</span>
                        </div>
                        <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">
                          {country === 'PT' ? 'Ideal para até 15 utentes' : 'Ideal para até 15 pacientes'}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#2E3C2B]/5 text-[11px] text-[#2E3C2B]">
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span><strong>Até 15 {country === 'PT' ? 'utentes' : 'pacientes'}</strong> {country === 'PT' ? 'registados' : 'cadastrados'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span>{country === 'PT' ? 'Processo clínico completo e anamnese' : 'Prontuário completo e anamnese'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span><strong>Lembretes no WhatsApp na véspera (D-1)</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span>{country === 'PT' ? 'IA Clínica para evoluções (padrão OPP)' : 'IA Clínica para evoluções'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2">
                      <button
                        onClick={() => handleCheckout('consultorio')}
                        disabled={loadingPlan !== null || (!isTrial && currentPlan === 'consultorio')}
                        className="w-full py-2 bg-white hover:bg-[#5F7D5C]/10 text-[#2E3C2B] font-bold border border-[#5F7D5C] rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                      >
                        {loadingPlan === 'consultorio' ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : !isTrial && currentPlan === 'consultorio' ? (
                          <span>Plano Atual Ativo</span>
                        ) : (
                          <>
                            <span>{country === 'PT' ? 'Subscrever Consultório' : 'Assinar Consultório'}</span>
                            <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* PLANO ILIMITADO */}
                  <div className={`border-2 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all relative ${
                    !isTrial && currentPlan === 'ilimitado'
                      ? 'border-[#5F7D5C] bg-[#5F7D5C]/10 ring-2 ring-[#5F7D5C]/30'
                      : 'border-[#5F7D5C] bg-[#5F7D5C]/5 shadow-xs'
                  }`}>
                    <div className="absolute -top-2.5 right-4 bg-[#5F7D5C] text-white text-[8.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full shadow-2xs flex items-center gap-1">
                      <Sparkles size={9} className="fill-white" />
                      <span>Sem Limites</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#5F7D5C] bg-[#5F7D5C]/15 py-0.5 px-2 rounded-md">
                          Ilimitado (Pro)
                        </span>
                        {!isTrial && currentPlan === 'ilimitado' && (
                          <span className="text-[9px] font-bold text-white bg-[#5F7D5C] py-0.5 px-2 rounded-md">
                            Plano Atual
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-[#2E3C2B]/60 font-semibold">{country === 'PT' ? '€' : 'R$'}</span>
                          <span className="text-2xl sm:text-[26px] font-serif font-black text-[#5F7D5C]">
                            {country === 'PT' ? '29,00' : '79,90'}
                          </span>
                          <span className="text-[11px] text-[#2E3C2B]/60">/mês</span>
                        </div>
                        <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">
                          {country === 'PT' ? 'Sem limites de uso ou utentes' : 'Sem limites de uso ou pacientes'}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#2E3C2B]/5 text-[11px] text-[#2E3C2B]">
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span><strong>{country === 'PT' ? 'Utentes Ilimitados' : 'Pacientes Ilimitados'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span><strong>{country === 'PT' ? 'Confirmações WhatsApp (D-1 + D-0)' : 'WhatsApp (D-1 + D-0)'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span>{country === 'PT' ? 'Ligação Google Meet no WhatsApp' : 'Link Google Meet no WhatsApp'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span><strong>Inteligência Artificial Ilimitada</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                          <span>{country === 'PT' ? <><strong>Radar Clínico</strong> (Ideias de posts)</> : <><strong>Radar de Conteúdo</strong> (Ideias de posts)</>}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2">
                      <button
                        onClick={() => handleCheckout('ilimitado')}
                        disabled={loadingPlan !== null || (!isTrial && currentPlan === 'ilimitado')}
                        className="w-full py-2 bg-[#5F7D5C] hover:bg-[#4E674C] text-[#FAF9F6] font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                      >
                        {loadingPlan === 'ilimitado' ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : !isTrial && currentPlan === 'ilimitado' ? (
                          <span>Plano Atual Ativo</span>
                        ) : currentPlan === 'consultorio' ? (
                          <>
                            <span>{country === 'PT' ? 'Upgrade para Ilimitado' : 'Fazer Upgrade para Ilimitado'}</span>
                            <ArrowRight size={12} />
                          </>
                        ) : (
                          <>
                            <span>{country === 'PT' ? 'Subscrever Ilimitado' : (isTrial ? 'Assinar Ilimitado' : 'Quero Acesso Ilimitado')}</span>
                            <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAINEL DE GERENCIAMENTO DA ASSINATURA STRIPE (CANCELAR / ALTERAR CARTÃO) */}
              <div className="px-4 py-2 sm:px-6 sm:py-2.5 bg-[#FAF9F6] border-t border-[#2E3C2B]/10 shrink-0 space-y-1.5 mt-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-[#2E3C2B]/10 shadow-2xs">
                  <div className="space-y-0.5 text-left">
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[#5F7D5C] shrink-0" />
                      <h4 className="text-[11px] font-bold text-[#2E3C2B]">
                        {country === 'PT' ? 'Cancelar, Alterar Cartão ou Faturas' : 'Cancelar, Alterar Cartão ou Baixar Faturas'}
                      </h4>
                    </div>
                    <p className="text-[10px] text-[#2E3C2B]/60 leading-tight max-w-md">
                      {country === 'PT'
                        ? 'Pelo portal oficial da Stripe pode alterar o seu cartão bancário, consultar faturas europeias ou cancelar a renovação sem multas.'
                        : 'Pelo portal oficial da Stripe você pode alterar seu cartão de crédito, atualizar dados de cobrança ou cancelar sua renovação a qualquer momento sem taxas.'}
                    </p>
                  </div>

                  <button
                    onClick={handleOpenCustomerPortal}
                    disabled={loadingPlan !== null}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-white hover:bg-[#FAF9F6] text-[#2E3C2B] border border-[#2E3C2B]/20 hover:border-[#5F7D5C] rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {loadingPlan === 'portal' ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>{country === 'PT' ? 'A abrir Stripe...' : 'Abrindo Stripe...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{country === 'PT' ? 'Gerir na Stripe' : 'Gerenciar na Stripe'}</span>
                        <ExternalLink size={12} className="text-[#5F7D5C]" />
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1 text-[9px] text-[#2E3C2B]/45 font-medium">
                  <ShieldCheck size={11} className="text-[#5F7D5C]" />
                  <span>{country === 'PT' ? 'Segurança encriptada de nível bancário assegurada pela Stripe Inc.' : 'Segurança criptografada de nível bancário fornecida pela Stripe Inc.'}</span>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
