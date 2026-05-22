import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Shield, 
  Zap, 
  Calendar, 
  DollarSign, 
  Star, 
  FileText, 
  Sparkles, 
  Trash2, 
  ChevronDown, 
  RefreshCw, 
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Briefcase,
  Users,
  Award,
  Layers,
  Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [years, setYears] = useState(3);
  const [routineMode, setRoutineMode] = useState<'current' | 'simple'>('simple');

  const handleCheckout = () => {
    window.location.href = 'https://pay.hotmart.com/P105903618L';
  };

  // Monitor scroll to show sticky CTA on mobile
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowStickyCta(true);
      } else {
        setShowStickyCta(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "O pagamento é realmente único? Sem mensalidades?",
      a: "Sim! Aproveitando a oferta promocional atual, você faz um único pagamento de R$ 297 (com mais de 50% de desconto sobre o valor original de R$ 597) e garante sua licença vitalícia. Nunca haverá nenhuma mensalidade, taxa oculta ou reajuste futuro."
    },
    {
      q: "A IA realmente respeita a minha abordagem clínica?",
      a: "Sim! Este é o nosso maior diferencial. Você configura se atende por TCC, Psicanálise, Gestalt, Existencial/ACP, Behaviorismo, Junguiana, ACT ou DBT. O gerador de relatos e a evolução diagnóstica geram textos na linguagem técnica nativa e na escuta clínica da sua abordagem."
    },
    {
      q: "Como funciona a segurança e o sigilo profissional perante o CFP?",
      a: "Nossa infraestrutura segue à risca o código de ética do CFP (Conselho Federal de Psicologia) e a LGPD. Todos os dados clínicos de prontuário, relatos e anamnese são criptografados de ponta a ponta e hospedados em servidores de altíssima segurança."
    },
    {
      q: "Posso acessar pelo celular e tablet?",
      a: "Com certeza. O SimplePsi é totalmente responsivo e otimizado para celulares, tablets, notebooks e computadores desktop. Sua agenda sincroniza diretamente com o seu Google Agenda nativo."
    },
    {
      q: "As atualizações estão inclusas no acesso vitalício?",
      a: "Sim. Todas as atualizações corretivas e novos recursos disponibilizados na plataforma são integrados automaticamente na sua conta sem nenhum custo extra futuro."
    },
    {
      q: "Tenho alguma garantia se não me adaptar?",
      a: "Sim! Oferecemos uma garantia incondicional de 7 dias. Se por qualquer motivo você não gostar da plataforma, basta solicitar o reembolso e devolveremos 100% do valor pago sem burocracia."
    }
  ];

  const approaches = [
    "TCC (Terapia Cognitivo-Comportamental)",
    "Psicanálise (Freudiana, Lacaniana, etc.)",
    "Gestalt-Terapia",
    "Existencial-Humanista / ACP",
    "Análise do Comportamento (Behaviorismo)",
    "Psicologia Analítica (Junguiana)",
    "ACT (Terapia de Aceitação e Compromisso)",
    "DBT (Terapia Dialética Comportamental)"
  ];

  const featuresList = [
    "Acesso Vitalício Garantido 🌟",
    "Sem Assinatura ou Mensalidade 🚫",
    "Agenda Sincronizada com Google Calendar 📅",
    "Controle Financeiro sem Planilhas 💰",
    "Prontuários em PDF de Alto Padrão 📄",
    "Anamneses Estruturadas Rápidas 📝",
    "Lixeira e Recuperação Antiacidentes 🛡️",
    "Atualizações Automáticas Inclusas 🚀",
    "Suporte Humano e VIP 👥",
    "Inteligência Artificial por Abordagem 🧠"
  ];

  return (
    <div className="min-h-screen text-[#2E3C2B] font-sans antialiased overflow-x-hidden selection:bg-[#5F7D5C]/20 relative">
      
      {/* Premium Fixed Ambient Background at -z-20 */}
      <div className="fixed inset-0 bg-premium-gradient -z-20 pointer-events-none" />

      {/* 0. Elegant Warning Banner */}
      <div className="w-full bg-[#5F7D5C] text-white py-3 px-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 relative z-50">
        <Clock size={14} className="animate-pulse text-[#FAF9F6]" />
        <span>ÚLTIMAS HORAS: DE <span className="line-through opacity-75">R$ 597</span> POR APENAS R$ 297 COM ACESSO VITALÍCIO</span>
      </div>

      {/* Premium Ambient Background (Floating Glowing Orbs) at -z-10 */}
      <div className="absolute inset-y-0 left-[-20%] right-[-20%] pointer-events-none -z-10">
        {/* Top Left Orb - Sage Green */}
        <motion.div 
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -60, 40, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-28 left-[-10%] w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full bg-[radial-gradient(circle,rgba(95,125,92,0.42)_0%,transparent_70%)] will-change-transform" 
        />
        
        {/* Mid Right Orb - Clay/Terracotta */}
        <motion.div 
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 60, -40, 0],
          }}
          transition={{
            duration: 26,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[600px] right-[-10%] w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] rounded-full bg-[radial-gradient(circle,rgba(179,109,83,0.35)_0%,transparent_70%)] will-change-transform" 
        />
        
        {/* Mid Left Orb - Eucalyptus/Sage */}
        <motion.div 
          animate={{
            x: [0, 40, -40, 0],
            y: [0, 50, -30, 0],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[1600px] left-[-8%] w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] rounded-full bg-[radial-gradient(circle,rgba(138,166,130,0.35)_0%,transparent_70%)] will-change-transform" 
        />
        
        {/* Lower Right Orb - Clay/Terracotta */}
        <motion.div 
          animate={{
            x: [0, -60, 40, 0],
            y: [0, -50, 50, 0],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[2600px] right-[-8%] w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-full bg-[radial-gradient(circle,rgba(197,137,113,0.38)_0%,transparent_70%)] will-change-transform" 
        />
        
        {/* Near Bottom Orb - Sage Green */}
        <motion.div 
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -60, 30, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[800px] left-[-10%] w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] rounded-full bg-[radial-gradient(circle,rgba(95,125,92,0.40)_0%,transparent_70%)] will-change-transform" 
        />
        
        {/* Footer Orb - Clay */}
        <motion.div 
          animate={{
            x: [0, -30, 30, 0],
            y: [0, 40, -20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[-100px] right-[-10%] w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] rounded-full bg-[radial-gradient(circle,rgba(179,109,83,0.28)_0%,transparent_70%)] will-change-transform" 
        />
      </div>

      {/* Elegant Floating Nav */}
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between relative z-40">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-md shadow-[#5F7D5C]/15 border border-[#2E3C2B]/5 flex items-center justify-center bg-white">
            <img src="/apple-touch-icon.png" alt="SimplePsi Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-black text-base sm:text-lg tracking-tight text-[#2E3C2B]">
            Simple<span className="text-[#5F7D5C]">Psi</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-wider text-[#2E3C2B]/85">
          <a href="#dores" className="hover:text-[#5F7D5C] transition-colors tracking-widest">Custo vs Assinatura</a>
          <a href="#abordagem-ia" className="hover:text-[#5F7D5C] transition-colors tracking-widest">Prontuário por Abordagem</a>
          <a href="#funcionalidades" className="hover:text-[#5F7D5C] transition-colors tracking-widest">Módulos Inclusos</a>
          <a href="#faq" className="hover:text-[#5F7D5C] transition-colors tracking-widest">FAQ</a>
        </div>

        <button 
          onClick={onLogin}
          className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-[#FAF9F6] text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#5F7D5C]/10 flex items-center gap-1.5 sm:gap-2 hover:scale-[1.03]"
        >
          Entrar no Sistema
          <ArrowRight size={12} className="hidden sm:inline-block" />
        </button>
      </nav>

      {/* ---------------------------------------------------
          1. HERO SECTION
          --------------------------------------------------- */}
      <section className="pt-8 pb-24 px-6 max-w-6xl mx-auto text-center space-y-12 relative z-30">
        
        {/* Rotating and Floating Platform Logos (Ψ badge) */}
        {/* Spinning logo on the left */}
        <div className="hidden md:flex absolute top-12 left-2 lg:left-8 w-16 h-16 rounded-full overflow-hidden shadow-2xl shadow-[#5F7D5C]/25 animate-spin-slow border border-[#5F7D5C]/25 select-none hover:scale-110 transition-all duration-300 items-center justify-center bg-white">
          <img src="/apple-touch-icon.png" alt="SimplePsi Spinning Logo" className="w-full h-full object-cover" />
        </div>
        {/* Static elegant floating logo on the right */}
        <div className="hidden md:flex absolute top-28 right-2 lg:right-8 w-12 h-12 rounded-full overflow-hidden shadow-xl shadow-[#5F7D5C]/15 border border-[#5F7D5C]/20 animate-bounce select-none hover:scale-110 transition-all duration-300 items-center justify-center bg-white">
          <img src="/apple-touch-icon.png" alt="SimplePsi Bouncing Logo" className="w-full h-full object-cover" />
        </div>
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[#5F7D5C]/10 to-[#8AA682]/10 border border-[#5F7D5C]/15 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#5F7D5C] animate-bounce">
          <Sparkle size={12} className="fill-[#5F7D5C]" />
          Acesso Vitalício • Sem Mensalidade
        </div>

        {/* Headlines */}
        <div className="space-y-6 max-w-4xl mx-auto">
          <h1 className="text-[32px] sm:text-5xl md:text-6xl font-serif font-black tracking-tight text-[#2E3C2B] leading-[1.08] text-pretty">
            Organize sua clínica para sempre pagando <span className="text-[#5F7D5C]">apenas uma vez</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-[#2E3C2B]/70 max-w-2xl mx-auto font-medium leading-relaxed">
            Agenda inteligente, prontuário seguro, controle financeiro completo e a única inteligência clínica do país calibrada para a sua linha teórica de atuação.
          </p>
        </div>

        {/* Prices and CTA */}
        <div className="space-y-4 max-w-md mx-auto">
          <div className="flex flex-col items-center justify-center gap-1 bg-[#EFECE6]/40 p-4 border border-[#2E3C2B]/5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-500/5 px-2.5 py-0.5 rounded-full border border-red-500/10">De R$ 597,00 por apenas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs font-bold text-[#2E3C2B]/60">12x de</span>
              <span className="text-4xl font-serif font-black text-[#5F7D5C]">R$ 30,72</span>
            </div>
            <span className="text-[11px] font-bold text-[#2E3C2B]/85">ou R$ 297,00 à vista (pagamento único)</span>
          </div>

          <button 
            onClick={handleCheckout}
            className="w-full py-5 bg-[#5F7D5C] hover:bg-[#4E674C] text-[#FAF9F6] font-bold rounded-2xl transition-all shadow-xl shadow-[#5F7D5C]/25 hover:scale-[1.02] flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
          >
            <span>Garantir acesso vitalício</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Infinite Premium Scrolling Ticker */}
        <div className="w-full overflow-hidden py-4 border-y border-[#2E3C2B]/5 bg-[#FAF9F6]/30 relative my-6">
          {/* Subtle gradient fades at the edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
          
          <div className="flex gap-16 whitespace-nowrap animate-marquee">
            {/* First sequence */}
            <div className="flex items-center gap-16 text-[9px] font-bold text-[#2E3C2B]/60 uppercase tracking-[0.2em] font-sans">
              <span className="flex items-center gap-2"><Star className="text-yellow-600 fill-yellow-600" size={14} /> 4.9/5 ESTRELAS POR 340+ PSICÓLOGOS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><ShieldCheck className="text-[#5F7D5C]" size={14} /> GARANTIA INCONDICIONAL DE 7 DIAS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><Calendar className="text-[#5F7D5C]" size={14} /> SINCRONIZAÇÃO GOOGLE AGENDA INSTANTÂNEA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><Sparkles className="text-[#5F7D5C]" size={14} /> IA POR ABORDAGEM CLÍNICA EXCLUSIVA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><Lock className="text-[#5F7D5C]" size={14} /> CRIPTOGRAFIA BLINDADA CFP & LGPD</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><FileText className="text-[#5F7D5C]" size={14} /> PRONTUÁRIOS E EVOLUÇÕES EM PDF A4</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><DollarSign className="text-[#5F7D5C]" size={14} /> ACESSO VITALÍCIO SEM MENSALIDADES</span>
            </div>
            
            {/* Second sequence for infinite loop */}
            <div className="flex items-center gap-16 text-[9px] font-bold text-[#2E3C2B]/60 uppercase tracking-[0.2em] font-sans">
              <span className="flex items-center gap-2"><Star className="text-yellow-600 fill-yellow-600" size={14} /> 4.9/5 ESTRELAS POR 340+ PSICÓLOGOS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><ShieldCheck className="text-[#5F7D5C]" size={14} /> GARANTIA INCONDICIONAL DE 7 DIAS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><Calendar className="text-[#5F7D5C]" size={14} /> SINCRONIZAÇÃO GOOGLE AGENDA INSTANTÂNEA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><Sparkles className="text-[#5F7D5C]" size={14} /> IA POR ABORDAGEM CLÍNICA EXCLUSIVA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><Lock className="text-[#5F7D5C]" size={14} /> CRIPTOGRAFIA BLINDADA CFP & LGPD</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><FileText className="text-[#5F7D5C]" size={14} /> PRONTUÁRIOS E EVOLUÇÕES EM PDF A4</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]/40" />
              <span className="flex items-center gap-2"><DollarSign className="text-[#5F7D5C]" size={14} /> ACESSO VITALÍCIO SEM MENSALIDADES</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Mockup - Dashboard White Mode with Olá Roberta mask */}
        <div className="pt-8 max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-transparent to-transparent z-10 pointer-events-none" />
          
          {/* Main Desktop Mockup */}
          <div className="bg-white/60 p-4 sm:p-6 rounded-[32px] sm:rounded-[48px] border border-white/60 shadow-2xl relative overflow-hidden">
            <div className="bg-[#FAF8F5] rounded-[24px] overflow-hidden border border-[#2E3C2B]/5 shadow-inner relative">
              <div className="h-10 border-b border-[#2E3C2B]/5 px-4 flex items-center justify-between bg-white/70">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
                </div>
                <span className="text-[9px] font-mono font-bold text-[#2E3C2B]/40 tracking-widest">SIMPLEPSI APP VIEW • DASHBOARD</span>
                <div className="w-4" />
              </div>
              
              <div className="w-full relative">
                <img 
                  src="/assets/2.png" 
                  alt="SimplePsi Dashboard Geral Real" 
                  className="w-full h-auto object-cover block" 
                />
                
                {/* Pixel-perfect CSS name mask covering Wellington with Roberta */}
                <div 
                  className="absolute bg-[#FAF9F6] font-extrabold text-[#2E3C2B] select-none flex items-center justify-start pointer-events-none"
                  style={{
                    top: '14.1%',
                    left: '20.1%',
                    width: '28%',
                    height: '5.8%',
                    fontSize: 'clamp(9px, 2.1vw, 24px)',
                    fontWeight: 800,
                    lineHeight: '1',
                    fontFamily: 'Outfit, Inter, sans-serif',
                    letterSpacing: '-0.03em'
                  }}
                >
                  Olá Roberta!
                </div>
              </div>
            </div>
            
            {/* Floating Micro Cards */}
            <div className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur border border-[#2E3C2B]/5 px-6 py-4 rounded-2xl shadow-xl hidden md:flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#5F7D5C]/10 flex items-center justify-center text-[#5F7D5C]"><Check size={16} /></div>
              <div className="text-left"><p className="text-[10px] font-bold text-[#2E3C2B]/45 uppercase tracking-wider">Acesso Imediato</p><p className="text-xs font-black text-[#2E3C2B]">Sem Mensalidades</p></div>
            </div>
            
            <div className="absolute top-1/3 -right-8 bg-white/95 backdrop-blur border border-[#2E3C2B]/5 px-6 py-4 rounded-2xl shadow-xl hidden md:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5F7D5C]/10 flex items-center justify-center text-[#5F7D5C]"><Sparkles size={16} /></div>
              <div className="text-left"><p className="text-[10px] font-bold text-[#2E3C2B]/45 uppercase tracking-wider">IA Personalizada</p><p className="text-xs font-black text-[#2E3C2B]">Por Abordagem</p></div>
            </div>
          </div>
        </div>

      </section>

      {/* ---------------------------------------------------
          2. ECONOMIC PAIN / SUBSCRIPTION PAIN
          --------------------------------------------------- */}
      {/* ---------------------------------------------------
          2. ECONOMIC PAIN / SUBSCRIPTION PAIN (INTERACTIVE CALCULATOR)
          --------------------------------------------------- */}
      <section id="dores" className="py-24 px-6 bg-[#EFECE6]/20 border-y border-[#2E3C2B]/5 text-center relative z-20">
        <div className="max-w-4xl mx-auto space-y-16">
          
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5F7D5C]">🌿 Liberdade Financeira Clínica</p>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight">
              Pare de drenar o faturamento do seu consultório
            </h2>
            <p className="text-xs sm:text-sm text-[#2E3C2B]/60 max-w-xl mx-auto leading-relaxed">
              Arraste a simulação abaixo e veja o quanto você desperdiça pagando mensalidades fixas para outros softwares ao longo dos anos.
            </p>
          </div>

          {/* Interactive Cost Calculator Widget */}
          <div className="bg-white/60 border border-[#2E3C2B]/5 rounded-[32px] p-6 sm:p-10 shadow-xl max-w-3xl mx-auto text-left space-y-8">
            
            {/* Slider control */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-[#2E3C2B] tracking-wider">Simular por quanto tempo?</span>
                <span className="px-3 py-1 bg-[#5F7D5C]/10 text-[#5F7D5C] rounded-full text-xs font-mono font-bold">
                  {years === 1 ? '1 Ano' : `${years} Anos`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-2 bg-[#2E3C2B]/10 rounded-lg appearance-none cursor-pointer accent-[#5F7D5C]"
              />
              <div className="flex justify-between text-[9px] font-bold text-[#2E3C2B]/40 uppercase tracking-widest">
                <span>1 Ano</span>
                <span>2 Anos</span>
                <span>3 Anos</span>
                <span>4 Anos</span>
                <span>5 Anos</span>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#2E3C2B]/5">
              
              {/* Other Monthly Platform */}
              <div className="bg-white/50 border border-red-500/10 rounded-2xl p-6 space-y-4 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 bg-red-500/10 text-red-600 px-3 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-bl-xl">Outros Sistemas</div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#2E3C2B]">Assinatura Mensal Média</h4>
                  <p className="text-[11px] text-[#2E3C2B]/60 leading-relaxed">Você paga de forma contínua mesmo quando entra de férias ou tem menos consultas no mês.</p>
                </div>
                <div className="space-y-1 font-mono text-xs pt-4 border-t border-[#2E3C2B]/5">
                  <div className="flex justify-between"><span>Mensalidade Base:</span><span className="text-red-500 font-bold">R$ 49/mês</span></div>
                  <div className="flex justify-between font-black text-sm text-[#2E3C2B] mt-2">
                    <span>Gasto Acumulado:</span>
                    <span className="text-red-600 font-black">R$ {(years * 12 * 49).toLocaleString('pt-BR')},00</span>
                  </div>
                </div>
              </div>

              {/* SimplePsi */}
              <div className="bg-[#5F7D5C]/5 border-2 border-[#5F7D5C]/20 rounded-2xl p-6 space-y-4 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 bg-[#5F7D5C] text-white px-3 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-bl-xl">SimplePsi</div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#2E3C2B]">Pagamento Único Vitalício</h4>
                  <p className="text-[11px] text-[#2E3C2B]/75 leading-relaxed">Você adquire a licença uma única vez e ela é sua para sempre. Sem boletos ou renovações.</p>
                </div>
                <div className="space-y-1 font-mono text-xs pt-4 border-t border-[#5F7D5C]/15">
                  <div className="flex justify-between"><span>Valor de Tabela:</span><span className="line-through text-[#2E3C2B]/40">R$ 597,00</span></div>
                  <div className="flex justify-between font-black text-sm text-[#5F7D5C] mt-2">
                    <span>Investimento Único:</span>
                    <span>R$ 297,00</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Savings banner */}
            <div className="bg-[#5F7D5C]/10 border border-[#5F7D5C]/25 p-4 rounded-2xl text-center text-xs font-bold text-[#5F7D5C] flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 justify-center">🌱 Economia Real Garantida:</span>
              <span className="text-sm font-black text-[#5F7D5C] uppercase tracking-wide">
                Você poupa R$ {(years * 12 * 49 - 297).toLocaleString('pt-BR')},00!
              </span>
            </div>

          </div>

          <div className="text-center font-bold text-[#5F7D5C] text-[10px] uppercase tracking-widest pt-2">
            💡 "Em menos de 3 atendimentos seu investimento vitalício já está 100% pago"
          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          2.5. TIME SAVING & QUALITY OF LIFE SECTION (STORYTELLING TOGGLE)
          --------------------------------------------------- */}
      <section id="tempo-salvo" className="py-24 px-6 max-w-6xl mx-auto relative z-20 text-center space-y-12">
        
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-[#5F7D5C] uppercase tracking-widest block">⏳ Tempo e Qualidade de Vida</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight leading-tight">
            Fique com a melhor parte de clinicar.<br />O SimplePsi cuida de todo o resto.
          </h2>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/60 max-w-xl mx-auto leading-relaxed">
            Você estudou anos para cuidar de pessoas, não de planilhas e papelada burocrática. Compare e escolha como quer viver sua rotina clínica:
          </p>
        </div>

        {/* Storyteller Toggle Widget */}
        <div className="bg-white/60 border border-[#2E3C2B]/5 rounded-[32px] p-6 sm:p-10 shadow-xl max-w-3xl mx-auto space-y-8 text-left">
          
          {/* Segmented Controller */}
          <div className="flex bg-[#FAF9F6] p-1.5 rounded-2xl border border-[#2E3C2B]/5 max-w-md mx-auto">
            <button
              onClick={() => setRoutineMode('current')}
              className={`flex-1 py-3 text-center rounded-xl text-xs font-bold transition-all duration-300 ${
                routineMode === 'current'
                  ? 'bg-red-500/10 text-red-600 shadow-sm border border-red-500/5'
                  : 'text-[#2E3C2B]/40 hover:text-[#2E3C2B]/80'
              }`}
            >
              Rotina Tradicional (Burocrática) 😫
            </button>
            <button
              onClick={() => setRoutineMode('simple')}
              className={`flex-1 py-3 text-center rounded-xl text-xs font-bold transition-all duration-300 ${
                routineMode === 'simple'
                  ? 'bg-[#5F7D5C]/15 text-[#5F7D5C] shadow-sm border border-[#5F7D5C]/5'
                  : 'text-[#2E3C2B]/40 hover:text-[#2E3C2B]/80'
              }`}
            >
              Rotina SimplePsi (Leve e Ágil) 🌿
            </button>
          </div>

          {/* Timeline Cards Container */}
          <div className="relative overflow-hidden">
            
            {/* Rotina Tradicional View */}
            <div className={`transition-all duration-500 space-y-4 ${
              routineMode === 'current'
                ? 'opacity-100 translate-y-0 pointer-events-auto relative block w-full'
                : 'opacity-0 translate-y-4 pointer-events-none absolute inset-x-0 top-0 h-0 overflow-hidden'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[9px] font-bold uppercase">19:00h • Fim do Expediente</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Exaustão Física e Mental</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">Você termina sua última consulta cansado após passar o dia todo ouvindo e acolhendo histórias delicadas.</p>
                </div>
                <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[9px] font-bold uppercase">19:15h às 21:00h • Digitação</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Horas Extras não Pagas</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">Em vez de ir descansar, você passa horas digitando prontuários longos para garantir a segurança jurídica e do CFP.</p>
                </div>
                <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[9px] font-bold uppercase">21:30h • Noite de Lazer</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Jantar Tarde e Estresse</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">Sensação de esgotamento e de estar constantemente carregando trabalho acumulado para casa.</p>
                </div>
                <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[9px] font-bold uppercase">Sábado • Descanso</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Fim de Semana Comprometido</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">O sábado de manhã é sequestrado para colocar a papelada e os prontuários atrasados da semana em ordem.</p>
                </div>
              </div>
              <div className="bg-red-500/5 border border-red-500/15 p-4 rounded-xl text-center text-xs font-bold text-red-600 flex items-center justify-center gap-2">
                <span>⚠️ Rotina cansativa que consome cerca de 8.3 horas de trabalho não pago toda semana!</span>
              </div>
            </div>

            {/* Rotina SimplePsi View */}
            <div className={`transition-all duration-500 space-y-4 ${
              routineMode === 'simple'
                ? 'opacity-100 translate-y-0 pointer-events-auto relative block w-full'
                : 'opacity-0 translate-y-4 pointer-events-none absolute inset-x-0 top-0 h-0 overflow-hidden'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-[#5F7D5C]/[0.02] border border-[#5F7D5C]/15 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-[#5F7D5C]/10 text-[#5F7D5C] rounded-full text-[9px] font-bold uppercase">19:00h • Fim do Expediente</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Dever Cumprido e Mente Limpa</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">Você desliga as luzes do consultório ou fecha o laptop online sabendo que a sua papelada do dia já está pronta.</p>
                </div>
                <div className="p-5 bg-[#5F7D5C]/[0.02] border border-[#5F7D5C]/15 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-[#5F7D5C]/10 text-[#5F7D5C] rounded-full text-[9px] font-bold uppercase">19:01h • Evolução de Prontuário</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Escrita com IA em 20 Segundos</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">Você revisa e salva a evolução gerada em segundos pela IA de acordo com a sua abordagem clínica (TCC, psicanálise...).</p>
                </div>
                <div className="p-5 bg-[#5F7D5C]/[0.02] border border-[#5F7D5C]/15 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-[#5F7D5C]/10 text-[#5F7D5C] rounded-full text-[9px] font-bold uppercase">19:05h • Noite de Lazer</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Desconexão Total Garantida</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">Tempo totalmente livre para jantar com calma, aproveitar o seu tempo livre, treinar ou maratonar sua série favorita com a mente leve.</p>
                </div>
                <div className="p-5 bg-[#5F7D5C]/[0.02] border border-[#5F7D5C]/15 rounded-2xl space-y-2">
                  <span className="inline-block px-2.5 py-0.5 bg-[#5F7D5C]/10 text-[#5F7D5C] rounded-full text-[9px] font-bold uppercase">Sábado • Descanso</span>
                  <h4 className="text-sm font-black text-[#2E3C2B]">Fins de Semana Sagrados</h4>
                  <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">Sábado e domingo são 100% seus para recarregar as energias, com segurança técnica e jurídica total.</p>
                </div>
              </div>
              <div className="bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 p-4 rounded-xl text-center text-xs font-bold text-[#5F7D5C] flex items-center justify-center gap-2">
                <span>🛡️ Organização financeira e clínica blindada com selo de sigilo ético!</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          3. APPROACH-BASED AI SECTION (BIG SECTION)
          --------------------------------------------------- */}
      <section id="abordagem-ia" className="py-28 px-6 max-w-6xl mx-auto relative z-20">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Visual left: Lista de abordagens print */}
          <div className="flex-1 w-full">
            <div className="bg-white/60 p-3 rounded-[32px] border border-white/60 shadow-xl relative overflow-hidden">
              <div className="bg-[#FAF8F5] rounded-[24px] overflow-hidden border border-[#2E3C2B]/5 shadow-inner">
                <img 
                  src="/assets/1.png" 
                  alt="Seletor Clínico de Abordagem do SimplePsi" 
                  className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500 block" 
                />
              </div>
              <div className="absolute bottom-6 right-6 bg-[#5F7D5C] text-white px-4 py-2 rounded-xl shadow-lg text-[10px] font-bold uppercase tracking-widest animate-pulse">
                Exclusividade SimplePsi ⚡
              </div>
            </div>
          </div>

          {/* Content right: The breakthrough IA copy */}
          <div className="flex-1 space-y-8 text-left">
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-[#5F7D5C] uppercase tracking-widest block">⭐ Inovação Tecnológica Exclusiva</span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight leading-tight">
                Uma IA que realmente respeita a sua abordagem clínica
              </h2>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed font-medium">
                A maioria das plataformas de psicologia oferece uma IA genérica baseada em lógicas puramente comportamentais. No SimplePsi, a tecnologia se adapta a você.
              </p>
              <p className="text-xs text-[#2E3C2B]/60 leading-relaxed">
                Nossa IA foi calibrada e ajustada com os prompts ideais de 8 principais correntes teóricas. Ao selecionar sua abordagem nas configurações do perfil, o gerador de relatos e a evolução adaptam a linguagem técnica, os conceitos clínicos fundamentais e até as linhas dos prontuários em PDF para coincidir com a sua metodologia profissional registrada.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-[#2E3C2B]">
              <div className="flex items-center gap-2 text-[#5F7D5C]">
                <Check size={16} /> Respeita sua linha teórica nativa
              </div>
              <div className="flex items-center gap-2 text-[#5F7D5C]">
                <Check size={16} /> Coerência nos termos acadêmicos
              </div>
              <div className="flex items-center gap-2 text-[#5F7D5C]">
                <Check size={16} /> Prontuários em PDF customizados
              </div>
              <div className="flex items-center gap-2 text-[#5F7D5C]">
                <Check size={16} /> Zero respostas genéricas ou robóticas
              </div>
            </div>
          </div>

        </div>

        {/* Animated horizontally moving pills (marquee-like moving pills) */}
        <div className="pt-20 space-y-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-[#2E3C2B]/40">Escolha a sua abordagem teórica e veja a IA calibrar as respostas:</p>
          
          <div className="space-y-4">
            {/* Track 1: Moving Left */}
            <div className="w-full overflow-hidden relative py-4 bg-[#EFECE6]/15 rounded-2xl border border-[#2E3C2B]/5">
              {/* Gradient masks on edges for extreme premium look */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
              
              <div className="flex gap-4 animate-marquee whitespace-nowrap">
                {approaches.concat(approaches).map((ap, i) => (
                  <span 
                    key={i} 
                    className="inline-block px-5 py-2.5 bg-white border border-[#2E3C2B]/5 rounded-full text-xs font-bold text-[#2E3C2B]/80 shadow-sm"
                  >
                    🌿 {ap}
                  </span>
                ))}
              </div>
            </div>

            {/* Track 2: Moving Right (Reverse!) */}
            <div className="w-full overflow-hidden relative py-4 bg-[#EFECE6]/10 rounded-2xl border border-[#2E3C2B]/5">
              {/* Gradient masks on edges for extreme premium look */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#FAF9F6] to-transparent z-10 pointer-events-none" />
              
              <div className="flex gap-4 animate-marquee-reverse whitespace-nowrap">
                {featuresList.concat(featuresList).map((ft, i) => (
                  <span 
                    key={i} 
                    className="inline-block px-5 py-2.5 bg-white border border-[#2E3C2B]/5 rounded-full text-xs font-bold text-[#5F7D5C] shadow-sm"
                  >
                    ✨ {ft}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ---------------------------------------------------
          4. SECURITY SECTION (DARK CONTRAST)
          --------------------------------------------------- */}
      <section className="py-24 px-6 bg-[#2E3C2B] text-white border-y border-white/5 relative z-20 overflow-hidden">
        
        {/* Glow behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[300px] bg-[#5F7D5C]/15 rounded-full filter blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-16 relative z-10">
          <div className="space-y-4">
            <div className="inline-flex p-3 bg-white/5 rounded-2xl text-[#8AA682] border border-white/10">
              <Lock size={28} />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8AA682]">🔐 CONFORMIDADE TOTAL CFP E LGPD</p>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Segurança blindada à altura do seu sigilo profissional
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
              O prontuário do seu paciente é um documento legal e sagrado. Protegemos suas anotações com o mais alto nível de criptografia e conformidade ética de software do mercado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <Shield size={20} className="text-[#8AA682]" />
              <h4 className="font-bold text-sm">Criptografia Ponta a Ponta</h4>
              <p className="text-xs text-white/60">Todos os relatos clínicos e dados pessoais são encriptados na nuvem, invisíveis para pessoas não autorizadas.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <RefreshCw size={20} className="text-[#8AA682]" />
              <h4 className="font-bold text-sm">Backups Diários Automáticos</h4>
              <p className="text-xs text-white/60">Nunca corra o risco de perder anotações. Nossa nuvem realiza cópias de segurança diárias de forma silenciosa.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <Users size={20} className="text-[#8AA682]" />
              <h4 className="font-bold text-sm">Conformidade LGPD & CFP</h4>
              <p className="text-xs text-white/60">Controles estritos de acesso a prontuários e política rígida de privacidade para blindar sua atuação profissional.</p>
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            🛡️ Projetado cientificamente para profissionais que lidam com dados altamente sensíveis todos os dias.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------
          5. FEATURES SECTION (CLEAN ZEBRA STATIC LAYOUT)
          --------------------------------------------------- */}
      <section id="funcionalidades" className="py-28 px-6 max-w-6xl mx-auto relative z-20 text-center space-y-24">
        
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5F7D5C]">⚡ Completo e Intuitivo</p>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight">
            Tudo que seu consultório precisa em um único lugar
          </h2>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/60 max-w-md mx-auto leading-relaxed">
            Explore abaixo todos os módulos e ferramentas que o SimplePsi coloca à disposição do seu consultório de psicologia.
          </p>
        </div>

        {/* Alternating Modules */}
        <div className="space-y-32 max-w-5xl mx-auto text-left">
          {[
            {
              id: 0,
              index: "01",
              icon: DollarSign,
              tag: "Finanças do Consultório",
              title: "Controle financeiro integrado e sem planilhas",
              description: "Lance receitas de atendimentos automaticamente com apenas um clique direto da agenda semanal. Monitore despesas de forma organizada, visualize previsões de caixa e anote referências de Notas Fiscais prontas para exportar ao seu contador no final do mês.",
              check: "Fluxo de caixa limpo com estimativa de faturamento real",
              img: "/assets/3.png"
            },
            {
              id: 1,
              index: "02",
              icon: FileText,
              tag: "Prontuário por abordagem",
              title: "Prontuários extremamente organizados e exportáveis",
              description: "Acesse o histórico completo de evoluções, relatos e fichas clínicas organizadas ininterruptamente em ordem cronológica de forma super limpa. Exporte prontuários em PDFs perfeitamente formatados com sua assinatura e CRP para apresentar a conselhos profissionais ou convênios de saúde.",
              check: "Download de prontuários completos em formato oficial A4",
              img: "/assets/4.png"
            },
            {
              id: 2,
              index: "03",
              icon: Calendar,
              tag: "Sincronização Google",
              title: "Agenda clínica inteligente e no seu celular",
              description: "Gerencie sessões avulsas, recorrências automáticas semanais ou quinzenais. A sincronização de mão dupla com o Google Agenda garante que os compromissos apareçam no aplicativo oficial do seu smartphone em tempo real, sem risco de conflito de horários.",
              check: "Lógica de recorrência flexível de sessões sem esforço",
              img: "/assets/5.png"
            },
            {
              id: 3,
              index: "04",
              icon: Users,
              tag: "Banco de Dados de Clientes",
              title: "Todos os seus pacientes centralizados com facilidade",
              description: "Mantenha a ficha cadastral de cada cliente contendo CPF, telefone, data de nascimento e e-mail organizada em um painel visual limpo. Gerencie o status de inatividade e utilize a lixeira contra exclusões acidentais para total paz de espírito.",
              check: "Pesquisa rápida e lixeira contra remoções por engano",
              img: "/assets/6.png"
            },
            {
              id: 4,
              index: "05",
              icon: Layers,
              tag: "Ficha de Admissão",
              title: "Anamneses estruturadas e organizadas",
              description: "Preencha a queixa inicial, histórico familiar, história de vida e medicamentos em uso do paciente em campos dedicados que servem como ponto de partida conceitual para o consultório e alimentam os resumos inteligentes da IA de forma rica e contextual.",
              check: "Histórico familiar e queixas principais consolidadas",
              img: "/assets/7.png"
            },
            {
              id: 5,
              index: "06",
              icon: Sparkles,
              tag: "Escrita Clínica & Conversor Clínico",
              title: "Documentação clínica com muito mais agilidade",
              description: "Digite um resumo informal ou transcreva o áudio dos seus pensamentos pós-consulta. A IA compila e gera um relato clínico elegante estruturado sob a sua lente teórica, economizando mais de 10 horas semanais de digitação burocrática pós-consulta.",
              check: "Áudio convertido para relato corrido profissional instantaneamente",
              img: "/assets/8.png"
            }
          ].map((feature, i) => {
            const IconComponent = feature.icon;
            const isEven = i % 2 === 0;
            return (
              <div 
                key={feature.id}
                className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                  isEven ? "" : "lg:flex-row-reverse"
                }`}
              >
                {/* Text Block */}
                <div className="w-full lg:w-1/2 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center shadow-inner">
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <p className="font-mono text-[9px] font-bold tracking-widest text-[#5F7D5C]">
                        MÓDULO {feature.index}
                      </p>
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2E3C2B]/85">
                        {feature.tag}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-2xl sm:text-3xl font-serif font-black text-[#2E3C2B] leading-tight">
                      {feature.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-[#2E3C2B]/70 font-medium">
                      {feature.description}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#2E3C2B]/5 rounded-xl text-[10px] font-bold text-[#5F7D5C]">
                    <Check size={12} className="stroke-[3]" /> <span>{feature.check}</span>
                  </div>
                </div>

                {/* Image Block */}
                <div className="w-full lg:w-1/2">
                  <div className="w-full relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#5F7D5C]/10 to-transparent pointer-events-none rounded-[36px] -m-1" />
                    <div className="bg-white/50 p-3 border border-[#2E3C2B]/5 rounded-[36px] shadow-xl hover:shadow-2xl transition-all duration-300">
                      <div className="w-full rounded-[24px] overflow-hidden border border-[#2E3C2B]/5 shadow-sm bg-[#FAF8F5]">
                        <img
                          src={feature.img}
                          alt={feature.tag}
                          className="w-full h-auto object-cover transform hover:scale-[1.01] transition-transform duration-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------
          6. SOCIAL PROOF
          --------------------------------------------------- */}
      <section className="py-24 px-6 bg-[#EFECE6]/35 border-y border-[#2E3C2B]/5 relative z-20">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5F7D5C]">🌿 Opinião de Quem Usa</p>
            <h2 className="text-3xl font-serif font-black text-[#2E3C2B] tracking-tight">Psicólogos reais, consultórios transformados</h2>
            <p className="text-xs sm:text-sm text-[#2E3C2B]/60 max-w-md mx-auto">Profissionais de várias correntes teóricas contam como o SimplePsi otimizou sua rotina.</p>
          </div>

          {/* Testimonial cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6">
            
            <div className="bg-white p-8 rounded-3xl border border-[#2E3C2B]/5 space-y-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex text-yellow-600 gap-0.5"><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /></div>
                <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">
                  "Economizei centenas de reais logo no primeiro mês. Usar um prontuário excelente com IA integrada sem a barreira mental de um boleto todo mês é uma liberdade fantástica!"
                </p>
              </div>
              <div>
                <p className="text-xs font-black text-[#2E3C2B]">Dra. Mariana Alencar</p>
                <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">Terapeuta TCC</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#2E3C2B]/5 space-y-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex text-yellow-600 gap-0.5"><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /></div>
                <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">
                  "A função por abordagem me ganhou. Sendo Psicanalista, eu detesto termos excessivamente comportamentais que outras ferramentas jogam nos prontuários. A IA aqui respeitou perfeitamente minha escuta e dinâmica analítica."
                </p>
              </div>
              <div>
                <p className="text-xs font-black text-[#2E3C2B]">Dr. Gustavo Nogueira</p>
                <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">Psicanalista</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#2E3C2B]/5 space-y-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex text-yellow-600 gap-0.5"><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /><Star size={14} className="fill-yellow-600" /></div>
                <p className="text-xs text-[#2E3C2B]/75 leading-relaxed">
                  "O SimplePsi é o melhor investimento que fiz para o consultório este ano. A agenda sincronizada com o Google Calendar funciona de forma incrível no celular. Recomendo muito!"
                </p>
              </div>
              <div>
                <p className="text-xs font-black text-[#2E3C2B]">Dra. Clarice Mendes</p>
                <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">Psicóloga Clínica</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          7. FAQ / OBJECTION HANDLING
          --------------------------------------------------- */}
      <section id="faq" className="py-24 px-6 max-w-4xl mx-auto relative z-20">
        <div className="space-y-12">
          
          <div className="text-center space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5F7D5C]">🌿 Dúvidas Frequentes</p>
            <h2 className="text-3xl font-serif font-black text-[#2E3C2B]">Faq e Perguntas Comuns</h2>
            <p className="text-xs sm:text-sm text-[#2E3C2B]/60 max-w-md mx-auto">Esclarecemos suas dúvidas técnicas ou burocráticas com clareza e franqueza.</p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="bg-white rounded-2xl border border-[#2E3C2B]/5 overflow-hidden transition-all duration-300"
              >
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-xs sm:text-sm font-bold text-[#2E3C2B]">{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={`text-[#5F7D5C] transition-transform duration-300 ${activeFaq === i ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {activeFaq === i && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-1 text-xs text-[#2E3C2B]/70 leading-relaxed border-t border-[#2E3C2B]/5">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          8. FINAL OFFER CARD
          --------------------------------------------------- */}
      <section className="py-24 px-6 relative z-20">
        
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[350px] bg-[#5F7D5C]/10 rounded-full filter blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-xl mx-auto bg-white border border-[#2E3C2B]/5 rounded-[36px] shadow-2xl p-8 sm:p-12 text-center space-y-8 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 bg-[#5F7D5C] text-[#FAF9F6] px-6 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-bl-3xl">
            Acesso Licença Vitalícia 🌟
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-serif font-black text-[#2E3C2B]">Adquira o SimplePsi</h3>
            <p className="text-xs text-[#2E3C2B]/60">Organização ética, segurança LGPD e IA por abordagem clínica sem mensalidades.</p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 text-left max-w-sm mx-auto text-xs text-[#2E3C2B]/85 font-semibold py-4 border-y border-[#2E3C2B]/5">
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Acesso vitalício para sempre</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Módulos de Agenda, Financeiro e Pacientes</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Smart Notes com IA por Abordagem Clínica</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Prontuários A4 em PDF prontos perante o CFP</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Suporte humano e atualizações gratuitas</span></div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-red-600 bg-red-500/5 py-1 px-3 rounded-full border border-red-500/10 inline-block uppercase tracking-wider">De R$ 597,00 por apenas</p>
            <div className="flex items-baseline justify-center gap-1.5 mt-2">
              <span className="text-xs font-bold text-[#2E3C2B]/50">12x de</span>
              <span className="text-5xl font-serif font-black text-[#5F7D5C]">R$ 30,72</span>
            </div>
            <p className="text-xs font-bold text-[#2E3C2B]/80">ou apenas R$ 297,00 à vista no PIX/Boleto</p>
          </div>

          <button 
            onClick={handleCheckout}
            className="w-full py-5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold rounded-2xl transition-all shadow-xl shadow-[#5F7D5C]/20 hover:scale-[1.02] flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
          >
            <span>Quero acesso vitalício</span>
            <ArrowRight size={16} />
          </button>

          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2E3C2B]/40">
            🔒 Pagamento único. Sem renovação automática. Sem mensalidade.
          </p>

        </div>
      </section>

      {/* ---------------------------------------------------
          9. FINAL CLOSE (EMOTIONAL ACCENT)
          --------------------------------------------------- */}
      <section className="py-24 px-6 border-t border-[#2E3C2B]/5 text-center bg-[#EFECE6]/15 relative z-20">
        <div className="max-w-3xl mx-auto space-y-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-[#2E3C2B] leading-tight text-pretty">
            Invista uma vez na organização da sua clínica e nunca mais pague mensalidade
          </h2>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/60 max-w-lg mx-auto leading-relaxed">
            Junte-se a centenas de terapeutas e psicólogos que reconquistaram o controle de suas finanças e documentação com a única tecnologia adaptada à linguagem teórica da psicologia do Brasil.
          </p>
          
          <button 
            onClick={handleCheckout}
            className="px-10 py-5.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-[#5F7D5C]/25 hover:scale-[1.03] inline-flex items-center gap-3"
          >
            <span>Garantir Licença Vitalícia</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#2E3C2B]/5 text-center text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-widest relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black text-xs text-[#2E3C2B]">Simple<span className="text-[#5F7D5C]">Psi</span></span>
            <span>© 2026 • Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Segurança Criptografada SSL</span>
            <span>Hospedagem Google Firebase Cloud</span>
          </div>
        </div>
      </footer>

      {/* ---------------------------------------------------
          10. STICKY MOBILE CTA
          --------------------------------------------------- */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-[#2E3C2B]/10 p-4 flex items-center justify-between gap-4 md:hidden z-50 shadow-2xl"
          >
            <div className="text-left">
              <p className="text-[8px] font-bold uppercase text-red-600 line-through">De R$ 597,00</p>
              <p className="text-sm font-black text-[#5F7D5C]">Por R$ 297,00</p>
            </div>
            <button 
              onClick={handleCheckout}
              className="px-5 py-3.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <span>Comprar Vitalício</span>
              <ArrowRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
