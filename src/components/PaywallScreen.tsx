import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Check, 
  HelpCircle, 
  LogOut, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  MessageSquare,
  Loader2
} from 'lucide-react';

interface PaywallScreenProps {
  userId?: string;
  email: string;
  patientCount?: number;
  onSignOut: () => void;
  onContinueFree?: () => void;
  country?: 'BR' | 'PT';
}

export default function PaywallScreen({ 
  userId,
  email, 
  patientCount = 0,
  onSignOut,
  onContinueFree,
  country
}: PaywallScreenProps) {
  const [loadingPlan, setLoadingPlan] = useState<'consultorio' | 'ilimitado' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPT = country ? country === 'PT' : (typeof window !== 'undefined' && (
    localStorage.getItem('prof_country') === 'PT' || 
    (localStorage.getItem('simplepsi_country') === 'PT' && !localStorage.getItem('prof_crp')) || 
    window.location.pathname.startsWith('/pt')
  ));

  const handleCheckout = async (plan: 'consultorio' | 'ilimitado') => {
    try {
      setLoadingPlan(plan);
      setErrorMessage(null);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          userId: userId || email,
          userEmail: email,
          returnOrigin: window.location.origin,
          country: isPT ? 'PT' : 'BR',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Não foi possível iniciar o checkout.');
      }

      // Redireciona para o Stripe Checkout seguro
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Erro ao redirecionar para pagamento:', err);
      setErrorMessage(err.message || 'Erro ao conectar à plataforma de pagamento.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-[#2E3C2B] font-sans antialiased overflow-y-auto relative flex items-center justify-center p-4 sm:p-6 selection:bg-[#5F7D5C]/20">
      
      {/* Background Glowing Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(95,125,92,0.15)_0%,transparent_70%)]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(179,109,83,0.1)_0%,transparent_70%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-4xl w-full bg-white border border-[#2E3C2B]/10 rounded-[32px] shadow-2xl relative z-10 overflow-hidden my-8"
      >
        {/* Banner Superior */}
        <div className="w-full bg-[#5F7D5C] text-white py-3 px-6 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <Lock size={14} className="animate-pulse" />
          <span>Escolha o plano ideal para a sua prática clínica</span>
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          
          {/* Cabeçalho */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border border-[#2E3C2B]/5 flex items-center justify-center bg-white">
              <img src="/apple-touch-icon.png" alt="SimplePsi Logo" className="w-full h-full object-cover" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight leading-tight">
              {isPT ? (
                <>Potencie as suas consultas com o <span className="text-[#5F7D5C]">SimplePsi</span></>
              ) : (
                <>Potencialize seus atendimentos com o <span className="text-[#5F7D5C]">SimplePsi</span></>
              )}
            </h2>
            <p className="text-sm text-[#2E3C2B]/70 max-w-lg">
              {isPT
                ? <>Conectado à conta <strong className="text-[#2E3C2B] font-bold">{email}</strong>. Cancele ou altere a sua subscrição a qualquer momento pela Stripe com faturação europeia.</>
                : <>Conectado à conta <strong className="text-[#2E3C2B] font-bold">{email}</strong>. Cancele ou altere seu plano quando quiser com a segurança Stripe.</>}
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium max-w-md">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Comparativo de Planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PLANO 1: CONSULTÓRIO */}
            <div className="border border-[#2E3C2B]/15 hover:border-[#5F7D5C]/40 rounded-3xl p-6 sm:p-7 bg-[#FAF9F6] flex flex-col justify-between transition-all hover:shadow-lg relative">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F7D5C] bg-[#5F7D5C]/10 py-1 px-2.5 rounded-full">
                    Plano Consultório
                  </span>
                  <h3 className="text-xl font-serif font-bold text-[#2E3C2B] mt-2">
                    {isPT ? 'Ideal para até 15 utentes' : 'Ideal para até 15 pacientes'}
                  </h3>
                  <p className="text-xs text-[#2E3C2B]/70 mt-1">
                    {isPT ? 'Para o psicólogo que procura organização profissional e redução de faltas.' : 'Para o psicólogo que busca organização profissional e economia de faltas.'}
                  </p>
                </div>

                <div className="py-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-[#2E3C2B]/60 font-semibold">{isPT ? '€' : 'R$'}</span>
                    <span className="text-4xl font-serif font-black text-[#2E3C2B]">
                      {isPT ? '19,00' : '49,90'}
                    </span>
                    <span className="text-xs text-[#2E3C2B]/60 font-medium">/mês</span>
                  </div>
                  <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">
                    {isPT ? 'Cobrança mensal no cartão de crédito • Cancele quando quiser' : 'Cobrança mensal no cartão • Cancele a qualquer momento'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-[#2E3C2B]/10">
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>Até 15 {isPT ? 'utentes' : 'pacientes'}</strong> ativos {isPT ? 'registados' : 'cadastrados'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span>{isPT ? 'Processo clínico completo e Anamnese' : 'Prontuário eletrônico completo e Anamnese'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span>{isPT ? 'IA Clínica para registos na sua abordagem (padrão OPP)' : 'IA Clínica para evoluções e conceitualizações'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>Lembretes no WhatsApp na véspera (D-1)</strong> com confirmação</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span>{isPT ? 'Contratos com assinatura no ecrã e declarações para seguros' : 'Contratos com assinatura digital e recibos'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4">
                <button
                  onClick={() => handleCheckout('consultorio')}
                  disabled={loadingPlan !== null}
                  className="w-full py-3.5 bg-white hover:bg-[#5F7D5C]/10 text-[#2E3C2B] font-bold border-2 border-[#5F7D5C] rounded-2xl transition-all shadow-sm hover:scale-[1.01] flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  {loadingPlan === 'consultorio' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isPT ? 'A estabelecer ligação à Stripe...' : 'Conectando à Stripe...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isPT ? 'Subscrever Consultório' : 'Assinar Consultório'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PLANO 2: ILIMITADO (DESTAQUE) */}
            <div className="border-2 border-[#5F7D5C] rounded-3xl p-6 sm:p-7 bg-[#5F7D5C]/5 flex flex-col justify-between transition-all hover:shadow-xl relative shadow-md">
              <div className="absolute -top-3 right-6 bg-[#5F7D5C] text-white text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-full shadow flex items-center gap-1">
                <Sparkles size={11} className="fill-white" />
                <span>Mais Escolhido</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F7D5C] bg-[#5F7D5C]/15 py-1 px-2.5 rounded-full">
                    Plano Ilimitado
                  </span>
                  <h3 className="text-xl font-serif font-bold text-[#2E3C2B] mt-2">
                    Liberdade total e automação
                  </h3>
                  <p className="text-xs text-[#2E3C2B]/70 mt-1">
                    {isPT ? 'Para psicólogos estabelecidos e com rotina intensa de consultas.' : 'Para psicólogos consolidados e com rotina intensa de atendimentos.'}
                  </p>
                </div>

                <div className="py-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-[#2E3C2B]/60 font-semibold">{isPT ? '€' : 'R$'}</span>
                    <span className="text-4xl font-serif font-black text-[#5F7D5C]">
                      {isPT ? '29,00' : '79,90'}
                    </span>
                    <span className="text-xs text-[#2E3C2B]/60 font-medium">/mês</span>
                  </div>
                  <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">
                    {isPT ? 'Sem limites de utilização • Acesso imediato a tudo' : 'Sem limites de uso • Acesso imediato a tudo'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-[#2E3C2B]/10">
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>{isPT ? 'Utentes Ilimitados' : 'Pacientes Ilimitados'}</strong> {isPT ? '(quantos necessitar)' : '(quantos você precisar)'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>Lembretes de WhatsApp Completos</strong>: Véspera (D-1) + No Dia (D-0)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span>{isPT ? 'Envio automático da ligação do Google Meet no WhatsApp' : 'Envio automático do link do Google Meet no WhatsApp'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>Inteligência Artificial Ilimitada</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>Radar de Ideias Clínicas</strong>: Ideias para publicações</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#2E3C2B]">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span>Sincronização com Google Agenda</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4">
                <button
                  onClick={() => handleCheckout('ilimitado')}
                  disabled={loadingPlan !== null}
                  className="w-full py-4 bg-[#5F7D5C] hover:bg-[#4E674C] text-[#FAF9F6] font-bold rounded-2xl transition-all shadow-xl shadow-[#5F7D5C]/25 hover:scale-[1.02] flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  {loadingPlan === 'ilimitado' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isPT ? 'A estabelecer ligação à Stripe...' : 'Conectando à Stripe...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isPT ? 'Subscrever Plano Ilimitado' : 'Quero Acesso Ilimitado'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Opção para continuar no Plano Gratuito (se tiver até 5 pacientes) */}
          {onContinueFree && (
            <div className="bg-[#FAF9F6] border border-[#2E3C2B]/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <h4 className="text-xs font-bold text-[#2E3C2B] flex items-center justify-center sm:justify-start gap-1.5">
                  <Users size={14} className="text-[#5F7D5C]" />
                  <span>{isPT ? 'Acompanha até 5 utentes?' : 'Você atende até 5 pacientes?'}</span>
                </h4>
                <p className="text-[11px] text-[#2E3C2B]/60 mt-0.5">
                  {isPT
                    ? 'O plano Start é 100% gratuito para sempre (sem envio automático de WhatsApp e até 5 utilizações de IA/dia).'
                    : 'O plano Start é 100% gratuito para sempre (sem WhatsApp automático e até 5 usos de IA/dia).'}
                </p>
              </div>
              <button
                onClick={onContinueFree}
                className="text-xs font-bold text-[#5F7D5C] hover:underline whitespace-nowrap px-3 py-1.5 bg-white border border-[#5F7D5C]/30 rounded-xl hover:bg-[#5F7D5C]/5 transition-colors cursor-pointer"
              >
                {isPT ? 'Continuar no Plano Gratuito' : 'Continuar no Plano Grátis'}
              </button>
            </div>
          )}

          {/* Segurança & Rodapé */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#2E3C2B]/5 text-xs text-[#2E3C2B]/60">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#5F7D5C]" />
              <span>{isPT ? 'Pagamento 100% encriptado e processado pela Stripe com faturação europeia' : 'Pagamento 100% criptografado e processado pela Stripe'}</span>
            </div>

            <div className="flex items-center gap-4">
              <a 
                href={isPT ? "https://wa.me/351912345678" : "https://wa.me/5511939215473"}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[#5F7D5C] transition-colors font-semibold"
              >
                <HelpCircle size={15} />
                <span>{isPT ? 'Dúvidas? Fale connosco' : 'Dúvidas? Fale conosco'}</span>
              </a>

              <button 
                onClick={onSignOut}
                className="flex items-center gap-1.5 hover:text-red-500 transition-colors font-semibold py-1 px-3 bg-[#2E3C2B]/5 hover:bg-red-500/10 rounded-lg cursor-pointer"
              >
                <LogOut size={14} />
                <span>{isPT ? 'Terminar Sessão' : 'Sair'}</span>
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
