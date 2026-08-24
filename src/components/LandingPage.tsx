import React, { useState, useEffect } from "react";
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
  Sparkle,
  Video,
  Chrome,
  PenTool,
  Smile,
  BookOpen,
  FileCheck,
  HeartHandshake,
  TrendingUp,
  Smartphone,
  ExternalLink,
  MessageSquare,
  Activity,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [years, setYears] = useState(3);
  const [selectedApproach, setSelectedApproach] = useState<string>("tcc");

  const handleCheckout = () => {
    window.location.href = "https://pay.hotmart.com/P105903618L";
  };

  const handleOpenPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, "", "/privacidade");
    window.location.href = "/privacidade";
  };

  // Monitor scroll for sticky mobile CTA
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 450) {
            setShowStickyCta(true);
          } else {
            setShowStickyCta(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const approachesData = [
    {
      id: "tcc",
      name: "TCC (Cognitivo-Comportamental)",
      badge: "Judith Beck & Aaron Beck",
      description: "Identifica pensamentos automáticos, distorções cognitivas, crenças nucleares, intermediárias e tarefas de enfrentamento.",
      highlight: "Diagrama de Conceitualização Cognitiva estruturado automaticamente."
    },
    {
      id: "psicanalise",
      name: "Psicanálise",
      badge: "Freud & Lacan",
      description: "Foco na escuta analítica, material de livre associação, demanda manifesta vs. latente, mecanismos de defesa e dinâmica de transferência.",
      highlight: "Linguagem sóbria de escuta, sem impor tarefas ou termos comportamentais."
    },
    {
      id: "gestalt",
      name: "Gestalt-Terapia",
      badge: "Aqui e Agora",
      description: "Mapeamento da experiência imediata, awareness corporal/emocional, figura e fundo e bloqueios no ciclo de contato com o meio.",
      highlight: "Acompanhamento fenomenológico centrado na integração do self."
    },
    {
      id: "act",
      name: "ACT (Aceitação e Compromisso)",
      badge: "Matriz Hexaflex",
      description: "Avaliação de desfusão cognitiva, aceitação, contato com o momento presente, valores nucleares e ações comprometidas.",
      highlight: "Hexaflex calibrado para promover flexibilidade psicológica contínua."
    },
    {
      id: "humanista",
      name: "Humanista / ACP / Existencial",
      badge: "Carl Rogers",
      description: "Escuta empática incondicional, vivência experiencial, movimentos de autoatualização e congruência interna sem rotulações patologizantes.",
      highlight: "Documentação acolhedora focada na potencialidade do cliente."
    },
    {
      id: "dbt",
      name: "DBT (Dialética Comportamental)",
      badge: "Marsha Linehan",
      description: "Análise em cadeia de comportamentos-alvo, manejo dialético entre validação e mudança, e treino de habilidades de regulação emocional.",
      highlight: "Integração direta com o Plano de Segurança de Crise."
    },
    {
      id: "behaviorismo",
      name: "Análise do Comportamento",
      badge: "Behaviorismo Radical",
      description: "Análise funcional minuciosa, tríplice contingência (antecedente, resposta e consequência) e manejo de reforçadores no ambiente.",
      highlight: "Relatos operacionais claros e precisos."
    },
    {
      id: "junguiana",
      name: "Psicologia Analítica (Junguiana)",
      badge: "Carl Jung",
      description: "Amplificação de símbolos, sonhos, dinâmicas de complexos inconscientes, projeções e processos de individuação.",
      highlight: "Compreensão arquetípica e simbólica equilibrada."
    }
  ];

  const faqs = [
    {
      q: "O pagamento é realmente único? Sem mensalidades?",
      a: "Sim! Você faz um único pagamento promocional de R$ 297 (ou até 12x de R$ 30,72) e garante sua licença vitalícia permanente. Nunca haverá mensalidades, renovações automáticas ou taxas extras futuras."
    },
    {
      q: "Como funciona a extensão para o Google Meet?",
      a: "Você instala a extensão oficial do SimplePsi no Chrome. Durante sua teleconsulta no Google Meet, a extensão captura com total sigilo as falas da chamada. Ao encerrar, basta 1 clique para a IA transformar a conversa em uma evolução clínica impecável na sua abordagem teórica e lançar a sessão no prontuário."
    },
    {
      q: "Como o paciente assina o contrato terapêutico e acessa a Área do Paciente?",
      a: "O paciente recebe um link exclusivo do portal. Pelo próprio celular, ele acessa com o CPF, assina o contrato terapêutico desenhando na tela (com validade jurídica e regra de aviso prévio de 24h para cancelamentos), preenche o diário de humor diário e acessa materiais de psicoeducação que você compartilhar."
    },
    {
      q: "A IA realmente respeita a minha abordagem clínica?",
      a: "Sim, esse é o coração do SimplePsi. Diferente de IAs genéricas que usam termos robotizados, calibramos nossa IA com 8 correntes teóricas (TCC, Psicanálise, Gestalt, ACT, Humanista, DBT, Behaviorismo e Junguiana). Os prontuários e análises seguem a linguagem exata da sua linha de formação."
    },
    {
      q: "Como funciona a segurança perante o CFP e a LGPD?",
      a: "Seguimos rigorosamente o Código de Ética Profissional do Psicólogo e a LGPD. Todos os dados clínicos e prontuários são criptografados com padrões de nível bancário e armazenados na nuvem segura do Google Cloud. Nenhum dado é vendido ou compartilhado com terceiros."
    },
    {
      q: "Posso testar antes de comprar?",
      a: "Sim! Você pode criar sua conta e experimentar todas as funcionalidades gratuitamente por 7 dias sem precisar cadastrar cartão de crédito. Além disso, a compra vitalícia na Hotmart conta com garantia incondicional de 7 dias com reembolso total caso não se adapte."
    }
  ];

  return (
    <div className="min-h-screen text-[#2E3C2B] font-sans antialiased overflow-x-hidden selection:bg-[#5F7D5C]/20 relative bg-[#FAF9F6]">
      
      {/* 0. Top Alert Banner */}
      <div className="w-full bg-[#2E3C2B] text-white py-2 px-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 relative z-50 border-b border-white/10">
        <Sparkle size={12} className="text-[#8AA682] shrink-0" />
        <span className="truncate">Oferta Vitalícia: De <span className="line-through opacity-70">R$ 597</span> por R$ 297 à vista • Sem Mensalidade</span>
      </div>

      {/* Clean Floating Header (Influensya Style) */}
      <header className="sticky top-0 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-[#2E3C2B]/5 z-40">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden shadow-sm border border-[#2E3C2B]/10 flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
              <img src="/apple-touch-icon.png" alt="SimplePsi Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif font-black text-base sm:text-lg tracking-tight text-[#2E3C2B]">
              Simple<span className="text-[#5F7D5C]">Psi</span>
            </span>
          </a>
          
          {/* Minimal Center Links (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 bg-[#2E3C2B]/5 p-1 rounded-full border border-[#2E3C2B]/5 text-xs font-bold text-[#2E3C2B]/75">
            <a href="#google-meet" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">Diferenciais</a>
            <a href="#modulos" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">Recursos</a>
            <a href="#economia" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">Preço</a>
            <a href="#faq" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">FAQ</a>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onLogin}
              className="text-xs font-bold text-[#2E3C2B]/80 hover:text-[#5F7D5C] px-2.5 py-1.5 transition-colors cursor-pointer hidden sm:block"
            >
              Entrar
            </button>
            <button 
              onClick={onLogin}
              className="px-3.5 sm:px-4 py-2 bg-[#5F7D5C] hover:bg-[#4E674C] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
            >
              <span>Testar Grátis</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </nav>
      </header>

      {/* ---------------------------------------------------
          1. HERO SECTION WITH ORGANIC CELL BLOB (INFLUNSYA STYLE)
          --------------------------------------------------- */}
      <section className="pt-10 pb-24 px-6 max-w-6xl mx-auto text-center space-y-12 relative z-30 overflow-visible">
        
        {/* ===================================================
            ORGANIC CELL BLOB ANIMATION (FLUID LIQUID MESH)
            =================================================== */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[580px] md:w-[750px] h-[340px] sm:h-[480px] md:h-[550px] -z-10 pointer-events-none opacity-80 sm:opacity-90">
          
          {/* Main Primary Sage/Olive Organic Cell */}
          <div 
            className="absolute inset-0 bg-gradient-to-tr from-[#5F7D5C]/35 via-[#8AA682]/45 to-[#A3C99F]/30 filter blur-[65px] sm:blur-[85px] animate-morph-blob"
          />
          
          {/* Secondary Counter-Rotating Clay/Eucalyptus Orb */}
          <div 
            className="absolute inset-4 bg-gradient-to-br from-[#8AA682]/30 via-[#2E3C2B]/15 to-[#C58971]/20 filter blur-[75px] sm:blur-[95px] animate-morph-blob-reverse"
          />
        </div>

        {/* Top Badge: Teste 7 dias grátis */}
        <div className="flex justify-center">
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-5 py-2 bg-white/80 backdrop-blur-md border border-[#5F7D5C]/25 rounded-full text-xs font-bold text-[#2E3C2B] shadow-sm hover:shadow-md hover:border-[#5F7D5C] transition-all hover:scale-[1.02] cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-[#5F7D5C] animate-pulse" />
            <span className="text-[#5F7D5C] font-black">Teste 7 dias grátis</span>
            <span className="text-[#2E3C2B]/40">•</span>
            <span className="text-[#2E3C2B]/75 font-medium">Sem cartão de crédito</span>
            <ArrowRight size={13} className="text-[#5F7D5C] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* High-Impact Main Headline */}
        <div className="space-y-6 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-tight text-[#2E3C2B] leading-[1.06] text-pretty">
            Transforme seu Consultório em uma <span className="text-[#5F7D5C]">Clínica Inteligente</span>.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#2E3C2B]/75 max-w-2xl mx-auto font-medium leading-relaxed">
            Inteligência Artificial por abordagem, transcrição do <strong>Google Meet</strong>, contratos com assinatura digital e agenda sincronizada — tudo em um <strong>único pagamento vitalício</strong>.
          </p>
        </div>

        {/* Main CTA Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <button 
            onClick={handleCheckout}
            className="w-full sm:w-auto px-8 py-4.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#5F7D5C]/25 hover:scale-[1.03] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Garantir Licença Vitalícia</span>
            <ArrowRight size={15} />
          </button>

          <button 
            onClick={onLogin}
            className="w-full sm:w-auto px-7 py-4.5 bg-white/90 hover:bg-white text-[#2E3C2B] border border-[#2E3C2B]/15 hover:border-[#5F7D5C] font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={15} className="text-[#5F7D5C]" />
            <span>Experimentar Grátis</span>
          </button>
        </div>

        {/* Price & Confidence Micro-Banner */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-[#2E3C2B]/70 font-semibold pt-1">
          <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#5F7D5C]" /> Garantia incondicional de 7 dias</span>
          <span className="hidden sm:inline">•</span>
          <span>12x de R$ 30,72 ou R$ 297 à vista</span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1"><Lock size={13} className="text-[#5F7D5C]" /> Conforme CFP & LGPD</span>
        </div>

        {/* ===================================================
            LIVELY APPLICATION UI MOCKUP WITH ASSET 2.PNG
            =================================================== */}
        <div className="pt-8 max-w-5xl mx-auto relative select-none">
          <div className="bg-white/80 backdrop-blur-xl p-3 sm:p-5 rounded-[32px] sm:rounded-[48px] border border-[#2E3C2B]/10 shadow-2xl relative overflow-hidden">
            <div className="bg-[#FAF8F5] rounded-[24px] overflow-hidden border border-[#2E3C2B]/5 shadow-inner relative">
              
              {/* Window Bar */}
              <div className="h-10 border-b border-[#2E3C2B]/10 px-4 flex items-center justify-between bg-white/90">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[9px] font-mono font-bold text-[#2E3C2B]/50 tracking-widest uppercase">
                  SIMPLEPSI APP VIEW • DASHBOARD CLÍNICO
                </span>
                <div className="w-4" />
              </div>
              
              {/* Main Image 2.png with Pixel-Perfect Name Mask for Carlos */}
              <div className="w-full relative">
                <img 
                  src="/assets/2.png" 
                  alt="SimplePsi Dashboard Geral" 
                  className="w-full h-auto object-cover block pointer-events-none select-none" 
                  draggable={false}
                />
                
                {/* Pixel-perfect CSS name mask covering Wellington with Carlos */}
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
                  Olá Carlos!
                </div>
              </div>
            </div>
            
            {/* Floating Micro Cards */}
            <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur border border-[#2E3C2B]/10 px-5 py-3.5 rounded-2xl shadow-xl hidden md:flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#5F7D5C]/10 flex items-center justify-center text-[#5F7D5C]">
                <Check size={16} />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-bold text-[#2E3C2B]/45 uppercase tracking-wider">Acesso Vitalício</p>
                <p className="text-xs font-black text-[#2E3C2B]">Sem Mensalidades</p>
              </div>
            </div>
            
            <div className="absolute top-1/3 -right-4 bg-white/95 backdrop-blur border border-[#2E3C2B]/10 px-5 py-3.5 rounded-2xl shadow-xl hidden md:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5F7D5C]/10 flex items-center justify-center text-[#5F7D5C]">
                <Sparkles size={16} />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-bold text-[#2E3C2B]/45 uppercase tracking-wider">Google Meet + IA</p>
                <p className="text-xs font-black text-[#2E3C2B]">Evolução em 15s</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ---------------------------------------------------
          2. GOOGLE MEET + IA SUPERFEATURE SECTION
          --------------------------------------------------- */}
      <section id="google-meet" className="py-24 px-6 bg-[#2E3C2B] text-white relative z-20 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-16 relative z-10">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/15 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#8AA682]">
              <Chrome size={14} /> Inovação em Telepsicologia
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-white">
              Atenda no Google Meet. O SimplePsi transcreve e gera sua evolução com IA.
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-2xl mx-auto leading-relaxed">
              Esqueça o tempo perdido digitando anotações após cada consulta online. Nossa extensão oficial captura as falas com segurança e a IA elabora a evolução técnica completa no formato da sua abordagem.
            </p>
          </div>

          {/* 4 Steps Visual Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between hover:bg-white/[0.07] transition-all">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#5F7D5C]/20 text-[#8AA682] flex items-center justify-center font-mono font-bold text-base border border-[#5F7D5C]/30">
                  01
                </div>
                <h3 className="text-base font-serif font-bold text-white">Atenda no Google Meet</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  A extensão oficial inicia a captura de forma automática e discreta. Nenhuma gravação sai do seu navegador: sigilo 100% local.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#8AA682] flex items-center gap-1.5 pt-3 border-t border-white/10">
                <Check size={13} /> Processamento seguro no browser
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between hover:bg-white/[0.07] transition-all">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#5F7D5C]/20 text-[#8AA682] flex items-center justify-center font-mono font-bold text-base border border-[#5F7D5C]/30">
                  02
                </div>
                <h3 className="text-base font-serif font-bold text-white">Envie com 1 Clique</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Ao encerrar a consulta, clique em "Enviar para o SimplePsi". Duração, data, paciente e diálogo são carregados automaticamente.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#8AA682] flex items-center gap-1.5 pt-3 border-t border-white/10">
                <Check size={13} /> Zero digitação manual
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between hover:bg-white/[0.07] transition-all">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#5F7D5C]/20 text-[#8AA682] flex items-center justify-center font-mono font-bold text-base border border-[#5F7D5C]/30">
                  03
                </div>
                <h3 className="text-base font-serif font-bold text-white">Evolução Técnica por IA</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  A IA analisa as falas e redige a evolução clínica formal perfeitamente adaptada à sua linha teórica (TCC, Psicanálise, Gestalt...).
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#8AA682] flex items-center gap-1.5 pt-3 border-t border-white/10">
                <Check size={13} /> Respeita sua abordagem
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-4 flex flex-col justify-between hover:bg-white/[0.07] transition-all">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-[#5F7D5C]/20 text-[#8AA682] flex items-center justify-center font-mono font-bold text-base border border-[#5F7D5C]/30">
                  04
                </div>
                <h3 className="text-base font-serif font-bold text-white">Prontuário Automático</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  O prontuário do paciente é alimentado na hora em ordem cronológica, pronto para exportação em PDF A4 com CRP e receita lançada.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#8AA682] flex items-center gap-1.5 pt-3 border-t border-white/10">
                <Check size={13} /> Prontuário CFP em PDF A4
              </div>
            </div>

          </div>

          {/* Guarantee banner */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center text-xs text-white/80 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
            <ShieldCheck size={20} className="text-[#8AA682] shrink-0" />
            <span><strong>Privacidade Rigorosa:</strong> A extensão não grava áudio ou vídeo. O psicólogo mantém total controle e conformidade com as resoluções do CFP.</span>
          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          3. PATIENT PORTAL & THERAPEUTIC CONTRACT
          --------------------------------------------------- */}
      <section id="area-paciente" className="py-24 px-6 max-w-6xl mx-auto relative z-20 space-y-16">
        
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <Users size={14} /> Portal do Paciente Dedicado
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-[#2E3C2B] tracking-tight">
            Acabe com o estresse de faltas sem aviso prévio e contratos em papel
          </h2>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/70 max-w-2xl mx-auto leading-relaxed">
            Seu paciente ganha um portal moderno e protegido para assinar contratos terapêuticos digitalmente, registrar humor diário e receber tarefas e cartilhas de psicoeducação.
          </p>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Contrato Terapêutico */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-8 shadow-md space-y-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
                <PenTool size={22} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#2E3C2B]">
                Contrato Terapêutico com Assinatura Digital
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                O paciente lê os termos no celular e assina na tela com o dedo. O contrato inclui cláusulas claras de <strong>honorários, sigilo ético e a regra de cobrança de faltas sem aviso prévio de 24 horas</strong>, blindando você contra prejuízos financeiros.
              </p>
            </div>
            <div className="pt-4 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-[#5F7D5C]">
              <Check size={16} /> <span>Validade jurídica com registro de data e documento</span>
            </div>
          </div>

          {/* Card 2: Diário de Humor */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-8 shadow-md space-y-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Smile size={22} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#2E3C2B]">
                Diário de Humor & Emoções (Mood Diary)
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                O paciente registra seus sentimentos diários com emojis e anotações breves. Você acompanha no seu painel os <strong>gráficos de oscilação do humor entre as sessões</strong>, trazendo insights valiosos para a consulta.
              </p>
            </div>
            <div className="pt-4 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-amber-700">
              <Check size={16} /> <span>Acompanhamento terapêutico contínuo e visual</span>
            </div>
          </div>

          {/* Card 3: Plano de Segurança */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-8 shadow-md space-y-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Shield size={22} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#2E3C2B]">
                Plano de Segurança de Crise
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                Para casos de desregulação emocional e risco: formule em conjunto com o paciente os <strong>sinais de alerta, estratégias de autorregulação, contatos de emergência e motivos para viver</strong>, sempre acessíveis no celular do paciente.
              </p>
            </div>
            <div className="pt-4 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-rose-700">
              <Check size={16} /> <span>Manejo clínico responsável e ético</span>
            </div>
          </div>

          {/* Card 4: Biblioteca de PDFs */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-8 shadow-md space-y-5 flex flex-col justify-between hover:shadow-lg transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <BookOpen size={22} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#2E3C2B]">
                Biblioteca Psicoeducativa de PDFs
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                Compartilhe com apenas um clique tarefas de casa, inventários, questionários e cartilhas educativas diretamente para a área do paciente, mantendo todo o material do tratamento centralizado.
              </p>
            </div>
            <div className="pt-4 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-blue-700">
              <Check size={16} /> <span>Envio direto sem precisar anexar em e-mails</span>
            </div>
          </div>

        </div>

      </section>

      {/* ---------------------------------------------------
          4. APPROACH-BASED AI (INTERACTIVE SHOWCASE)
          --------------------------------------------------- */}
      <section id="abordagem-ia" className="py-24 px-6 bg-[#EFECE6]/35 border-y border-[#2E3C2B]/5 relative z-20">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
              <Sparkles size={14} /> IA Especializada por Abordagem
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-[#2E3C2B] tracking-tight">
              Uma Inteligência Artificial que fala a linguagem exata da sua linha teórica
            </h2>
            <p className="text-xs sm:text-sm text-[#2E3C2B]/70 max-w-2xl mx-auto leading-relaxed">
              Chega de IAs genéricas que misturam jargões ou forçam conceitos comportamentais em quem atende por Psicanálise ou Fenomenologia. No SimplePsi, cada abordagem possui calibração e diagramas próprios.
            </p>
          </div>

          {/* Interactive Approach Selector */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto space-y-8">
            
            {/* Approach Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {approachesData.map((appr) => (
                <button
                  key={appr.id}
                  onClick={() => setSelectedApproach(appr.id)}
                  className={`p-3 rounded-2xl text-xs font-bold transition-all text-center cursor-pointer border ${
                    selectedApproach === appr.id
                      ? "bg-[#5F7D5C] text-white border-[#5F7D5C] shadow-md shadow-[#5F7D5C]/20 scale-[1.02]"
                      : "bg-[#FAF9F6] text-[#2E3C2B]/75 border-[#2E3C2B]/5 hover:bg-[#EFECE6]"
                  }`}
                >
                  <p className="truncate">{appr.name.split(" (")[0]}</p>
                </button>
              ))}
            </div>

            {/* Active Approach Display Box */}
            {(() => {
              const current = approachesData.find(a => a.id === selectedApproach) || approachesData[0];
              return (
                <div className="p-6 sm:p-8 bg-[#FAF8F5] border border-[#2E3C2B]/10 rounded-2xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E3C2B]/10 pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-[#5F7D5C] uppercase tracking-wider block">
                        Abordagem Selecionada
                      </span>
                      <h4 className="text-lg sm:text-xl font-serif font-bold text-[#2E3C2B]">
                        {current.name}
                      </h4>
                    </div>
                    <span className="px-3 py-1 bg-[#5F7D5C]/10 text-[#5F7D5C] rounded-full text-xs font-bold border border-[#5F7D5C]/20">
                      {current.badge}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                    {current.description}
                  </p>

                  <div className="p-4 bg-white border border-[#2E3C2B]/10 rounded-xl flex items-center gap-3 text-xs font-bold text-[#5F7D5C]">
                    <Sparkles size={18} className="shrink-0" />
                    <span>{current.highlight}</span>
                  </div>
                </div>
              );
            })()}

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          5. COMPLETE CLINICAL SUITE (MODULAR GRID)
          --------------------------------------------------- */}
      <section id="modulos" className="py-24 px-6 max-w-6xl mx-auto relative z-20 space-y-16">
        
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <Layers size={14} /> Suíte Clínica Completa
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-[#2E3C2B] tracking-tight">
            Tudo o que seu consultório precisa para rodar sem esforço
          </h2>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/70 max-w-2xl mx-auto leading-relaxed">
            Substitua planilhas confusas e cadernos de anotações por um sistema unificado, seguro e intuitivo.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#2E3C2B]">Agenda com Google Calendar</h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              Sincronização de mão dupla em tempo real. Gerencie recorrências semanais ou quinzenais e receba seus compromissos no app nativo do seu smartphone.
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#2E3C2B]">Prontuários Oficiais em PDF</h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              Exporte prontuários e históricos completos em formato oficial A4 com seu CRP e assinatura, prontos para convênios e solicitações éticas.
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#2E3C2B]">Previsibilidade Financeira</h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              Projeção automática de faturamento baseada no volume de sessões ativas. Controle de receitas, despesas e status de pagamento sem estresse.
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#2E3C2B]">Comprovante para Reembolso</h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              Gere em 1 clique a mensagem e declaração formatada de comparecimento para o paciente solicitar reembolso de consultas no plano de saúde.
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#2E3C2B]">Lixeira Antiacidentes</h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              Nunca perca fichas ou relatos por exclusão acidental. Recupere registros com um clique ou exclua em definitivo quando necessário.
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <Lock size={20} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#2E3C2B]">Conformidade CFP & LGPD</h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              Criptografia de ponta a ponta e armazenamento em nuvem de alta segurança no Google Cloud, garantindo sigilo absoluto aos seus pacientes.
            </p>
          </div>

        </div>

      </section>

      {/* ---------------------------------------------------
          6. ECONOMIC COMPARISON (CLEAN CALCULATOR)
          --------------------------------------------------- */}
      <section id="economia" className="py-24 px-6 bg-[#2E3C2B] text-white relative z-20">
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/15 rounded-full text-xs font-bold uppercase tracking-widest text-[#8AA682]">
              <DollarSign size={14} /> Liberdade Financeira Clínica
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Pare de pagar mensalidades recorrentes para gerenciar seu consultório
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
              Enquanto outros softwares cobram de R$ 50 a R$ 120 todo mês (mesmo quando você tira férias), o SimplePsi é seu para sempre em um único pagamento.
            </p>
          </div>

          {/* Calculator Card */}
          <div className="bg-white/10 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-left">
            
            {/* Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="uppercase tracking-wider text-white/80">Simular economia por quanto tempo?</span>
                <span className="px-3 py-1 bg-[#5F7D5C] text-white rounded-full font-mono">
                  {years === 1 ? "1 Ano" : `${years} Anos`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8AA682]"
              />
              <div className="flex justify-between text-[10px] text-white/40 uppercase font-bold tracking-widest">
                <span>1 Ano</span>
                <span>2 Anos</span>
                <span>3 Anos</span>
                <span>4 Anos</span>
                <span>5 Anos</span>
              </div>
            </div>

            {/* Comparison Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              
              <div className="p-5 rounded-2xl bg-white/5 border border-red-500/20 space-y-3">
                <span className="text-[10px] font-bold uppercase text-red-400">Outros Softwares (Assinatura)</span>
                <p className="text-xs text-white/70 leading-relaxed">Mensalidades contínuas que nunca acabam:</p>
                <p className="text-2xl font-serif font-black text-red-400">
                  R$ {(years * 12 * 59).toLocaleString("pt-BR")},00
                </p>
                <p className="text-[10px] text-white/40">Calculado a R$ 59/mês médio</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#5F7D5C]/30 border-2 border-[#8AA682]/40 space-y-3">
                <span className="text-[10px] font-bold uppercase text-[#8AA682]">SimplePsi (Licença Vitalícia)</span>
                <p className="text-xs text-white/80 leading-relaxed">Um único pagamento para a vida toda:</p>
                <p className="text-2xl font-serif font-black text-white">
                  R$ 297,00
                </p>
                <p className="text-[10px] text-[#8AA682]">Sem mensalidade ou taxa de renovação</p>
              </div>

            </div>

            {/* Total Saved Banner */}
            <div className="bg-[#5F7D5C] p-4 rounded-2xl text-center text-xs font-bold text-white flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg">
              <span>🌿 Economia real garantida no seu bolso:</span>
              <span className="text-sm font-black uppercase">
                Você poupa R$ {(years * 12 * 59 - 297).toLocaleString("pt-BR")},00!
              </span>
            </div>

          </div>

          <div className="pt-2">
            <button 
              onClick={handleCheckout}
              className="px-8 py-4 bg-[#8AA682] hover:bg-[#728e6b] text-[#2E3C2B] font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2"
            >
              <span>Aproveitar Licença Vitalícia</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          7. SOCIAL PROOF & TESTIMONIALS
          --------------------------------------------------- */}
      <section className="py-24 px-6 max-w-6xl mx-auto relative z-20 space-y-16">
        
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <Star size={14} className="fill-[#5F7D5C]" /> Opinião de Quem Já Usa
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight">
            Psicólogos que transformaram sua rotina e economizaram tempo
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          <div className="bg-white p-8 rounded-3xl border border-[#2E3C2B]/10 space-y-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500 gap-1">
                <Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" />
              </div>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                "A extensão do Google Meet mudou minha vida clínica. Atendo online o dia todo e agora termino as sessões com a evolução praticamente pronta, perfeitamente no modelo da TCC. Vale cada centavo!"
              </p>
            </div>
            <div>
              <p className="text-xs font-black text-[#2E3C2B]">Dra. Mariana Alencar</p>
              <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">Terapeuta Cognitivo-Comportamental</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#2E3C2B]/10 space-y-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500 gap-1">
                <Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" />
              </div>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                "O contrato terapêutico digital com a cláusula de aviso prévio de 24h acabou com o problema de faltas sem aviso. E a assinatura na tela pelo celular é super prática para o paciente."
              </p>
            </div>
            <div>
              <p className="text-xs font-black text-[#2E3C2B]">Dr. Gustavo Nogueira</p>
              <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">Psicanalista Clínico</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#2E3C2B]/10 space-y-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500 gap-1">
                <Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" /><Star size={14} className="fill-amber-500" />
              </div>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                "O fato de não ter mensalidade é libertador. O sistema é rápido, sincroniza direto com a minha agenda do Google no celular e os prontuários em PDF são impecáveis."
              </p>
            </div>
            <div>
              <p className="text-xs font-black text-[#2E3C2B]">Dra. Clarice Mendes</p>
              <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">Psicóloga Humanista</p>
            </div>
          </div>

        </div>

      </section>

      {/* ---------------------------------------------------
          8. FAQ SECTION
          --------------------------------------------------- */}
      <section id="faq" className="py-24 px-6 max-w-4xl mx-auto relative z-20 space-y-12">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <HeartHandshake size={14} /> Esclarecimentos Frequentes
          </div>
          <h2 className="text-3xl font-serif font-black text-[#2E3C2B]">Perguntas e Respostas</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl border border-[#2E3C2B]/10 overflow-hidden shadow-sm transition-all"
            >
              <button 
                onClick={() => toggleFaq(i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-bold text-[#2E3C2B]">{faq.q}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-[#5F7D5C] transition-transform duration-300 ${activeFaq === i ? "rotate-180" : ""}`} 
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
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed border-t border-[#2E3C2B]/5">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

      </section>

      {/* ---------------------------------------------------
          9. FINAL OFFER SECTION
          --------------------------------------------------- */}
      <section className="py-24 px-6 relative z-20">
        
        <div className="max-w-xl mx-auto bg-white border border-[#2E3C2B]/10 rounded-[36px] shadow-2xl p-8 sm:p-12 text-center space-y-8 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 bg-[#5F7D5C] text-white px-6 py-2 text-[9px] font-extrabold uppercase tracking-widest rounded-bl-3xl">
            Acesso Vitalício Garantido 🌟
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-2xl sm:text-3xl font-serif font-black text-[#2E3C2B]">Adquira o SimplePsi</h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              Google Meet integrado, Área do Paciente, Contratos Digitais e IA por abordagem clínica sem mensalidades.
            </p>
          </div>

          {/* Included list */}
          <div className="space-y-2.5 text-left max-w-sm mx-auto text-xs text-[#2E3C2B]/85 font-semibold py-4 border-y border-[#2E3C2B]/10">
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Licença vitalícia para sempre (sem mensalidade)</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Extensão oficial para Google Meet incluída</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Área do Paciente + Contratos com Assinatura</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>IA por Abordagem Clínica (8 correntes teóricas)</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Agenda sincronizada com Google Calendar</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Prontuários e Comprovantes em PDF conforme CFP</span></div>
            <div className="flex items-center gap-2.5"><Check size={16} className="text-[#5F7D5C]" /> <span>Garantia incondicional de 7 dias ou reembolso</span></div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-red-600 bg-red-50 py-1 px-3.5 rounded-full border border-red-200 inline-block uppercase tracking-wider">
              De R$ 597,00 por apenas
            </span>
            <div className="flex items-baseline justify-center gap-1.5 mt-2">
              <span className="text-xs font-bold text-[#2E3C2B]/50">12x de</span>
              <span className="text-5xl font-serif font-black text-[#5F7D5C]">R$ 30,72</span>
            </div>
            <p className="text-xs font-bold text-[#2E3C2B]/80">ou R$ 297,00 à vista (PIX, cartão ou boleto)</p>
          </div>

          <div className="space-y-3 pt-2">
            <button 
              onClick={handleCheckout}
              className="w-full py-5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold rounded-2xl transition-all shadow-xl shadow-[#5F7D5C]/25 hover:scale-[1.02] flex items-center justify-center gap-3 uppercase tracking-widest text-xs cursor-pointer"
            >
              <span>Quero Acesso Vitalício</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={onLogin}
              className="text-xs font-bold text-[#5F7D5C] hover:text-[#4E674C] transition-colors underline decoration-2 underline-offset-4 cursor-pointer block mx-auto"
            >
              Ou experimente 7 dias grátis sem cartão
            </button>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2E3C2B]/40 pt-2">
            🔒 Pagamento 100% seguro via Hotmart • Garantia de 7 dias
          </p>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#2E3C2B]/10 text-center text-xs text-[#2E3C2B]/60 font-medium relative z-20 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black text-sm text-[#2E3C2B]">Simple<span className="text-[#5F7D5C]">Psi</span></span>
            <span>• © 2026 Todos os direitos reservados.</span>
          </div>
          
          <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-wider">
            <a 
              href="/privacidade" 
              onClick={handleOpenPrivacy}
              className="text-[#5F7D5C] hover:underline cursor-pointer"
            >
              Política de Privacidade & LGPD
            </a>
            <span>•</span>
            <span>Google Cloud Security</span>
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
            className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#2E3C2B]/10 p-4 flex items-center justify-between gap-4 md:hidden z-50 shadow-2xl"
          >
            <div className="text-left">
              <p className="text-[9px] font-bold uppercase text-red-600 line-through">De R$ 597,00</p>
              <p className="text-sm font-black text-[#5F7D5C]">Por R$ 297,00 vitalício</p>
            </div>
            <button 
              onClick={handleCheckout}
              className="px-5 py-3 bg-[#5F7D5C] hover:bg-[#4E674C] text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>Garantir</span>
              <ArrowRight size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
