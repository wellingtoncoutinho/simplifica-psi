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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FolderSync,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OrganicHeroStage from "./OrganicHeroStage";

interface LandingPageProps {
  onLogin: (plan?: 'consultorio' | 'ilimitado' | null, country?: 'BR' | 'PT') => void;
  initialCountry?: 'BR' | 'PT';
}

export default function LandingPage({ onLogin, initialCountry }: LandingPageProps) {
  const [country, setCountry] = useState<'BR' | 'PT'>(() => {
    if (initialCountry) return initialCountry;
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/pt') || window.location.search.includes('country=pt')) {
        return 'PT';
      }
    }
    return 'BR';
  });

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [weeklySessions, setWeeklySessions] = useState(15);
  const [sessionPrice, setSessionPrice] = useState(() => (country === 'PT' ? 50 : 150));
  const [selectedApproach, setSelectedApproach] = useState<string>("tcc");
  const [activeMeetStep, setActiveMeetStep] = useState<number>(0);
  const [activeMigrationSource, setActiveMigrationSource] = useState<'pdf' | 'docx' | 'platforms' | 'sheets'>('pdf');

  useEffect(() => {
    if (initialCountry && initialCountry !== country) {
      setCountry(initialCountry);
      setSessionPrice(initialCountry === 'PT' ? 50 : 150);
    }
  }, [initialCountry]);

  const monthlySessions = weeklySessions * 4;
  const missedSessions = Math.max(1, Math.round(monthlySessions * 0.10));
  const lostRevenue = missedSessions * sessionPrice;
  const savedSessions = Math.max(1, Math.round(missedSessions * 0.90));
  const recoveredRevenue = savedSessions * sessionPrice;

  const scrollToPlans = () => {
    const el = document.getElementById('planos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCheckout = (plan?: 'consultorio' | 'ilimitado' | null) => {
    onLogin(plan || null, country);
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
      description: country === 'PT'
        ? "Identifica pensamentos automáticos, distorções cognitivas, crenças nucleares, intermédias e estratégias de confronto."
        : "Identifica pensamentos automáticos, distorções cognitivas, crenças nucleares, intermediárias e tarefas de enfrentamento.",
      highlight: country === 'PT'
        ? "Diagrama de Concetualização Cognitiva estruturado automaticamente."
        : "Diagrama de Conceitualização Cognitiva estruturado automaticamente."
    },
    {
      id: "psicanalise",
      name: "Psicanálise",
      badge: "Freud & Lacan",
      description: country === 'PT'
        ? "Foco na escuta analítica, material de associação livre, pedido manifesto vs. latente, mecanismos de defesa e dinâmica de transferência."
        : "Foco na escuta analítica, material de livre associação, demanda manifesta vs. latente, mecanismos de defesa e dinâmica de transferência.",
      highlight: country === 'PT'
        ? "Linguagem sóbria de escuta, sem impor tarefas ou terminologia comportamental."
        : "Linguagem sóbria de escuta, sem impor tarefas ou termos comportamentais."
    },
    {
      id: "gestalt",
      name: "Gestalt-Terapia",
      badge: "Aqui e Agora",
      description: country === 'PT'
        ? "Mapeamento da experiência imediata, awareness corporal e emocional, figura e fundo e bloqueios no ciclo de contacto com o meio."
        : "Mapeamento da experiência imediata, awareness corporal/emocional, figura e fundo e bloqueios no ciclo de contato com o meio.",
      highlight: country === 'PT'
        ? "Acompanhamento fenomenológico focado na integração do self."
        : "Acompanhamento fenomenológico centrado na integração do self."
    },
    {
      id: "act",
      name: "ACT (Aceitação e Compromisso)",
      badge: "Matriz Hexaflex",
      description: country === 'PT'
        ? "Avaliação de desfusão cognitiva, aceitação, contacto com o momento presente, valores nucleares e ações comprometidas."
        : "Avaliação de desfusão cognitiva, aceitação, contato com o momento presente, valores nucleares e ações comprometidas.",
      highlight: country === 'PT' ? "Hexaflex calibrado para promover a flexibilidade psicológica do utente." : "Hexaflex calibrado para promover flexibilidade psicológica contínua."
    },
    {
      id: "humanista",
      name: "Humanista / ACP / Existencial",
      badge: "Carl Rogers",
      description: country === 'PT'
        ? "Escuta empática incondicional, vivência experiencial, movimentos de autorrealização e congruência interna sem rotulagens patologizantes."
        : "Escuta empática incondicional, vivência experiencial, movimentos de autoatualização e congruência interna sem rotulações patologizantes.",
      highlight: country === 'PT' ? "Documentação acolhedora focada na potencialidade do utente." : "Documentação acolhedora focada na potencialidade do cliente."
    },
    {
      id: "dbt",
      name: "DBT (Dialética Comportamental)",
      badge: "Marsha Linehan",
      description: country === 'PT'
        ? "Análise em cadeia de comportamentos-alvo, gestão dialética entre validação e mudança, e treino de competências de regulação emocional."
        : "Análise em cadeia de comportamentos-alvo, manejo dialético entre validação e mudança, e treino de habilidades de regulação emocional.",
      highlight: country === 'PT'
        ? "Integração direta com o Plano de Segurança de Crise."
        : "Integração direta com o Plano de Segurança de Crise."
    },
    {
      id: "behaviorismo",
      name: "Análise do Comportamento",
      badge: "Behaviorismo Radical",
      description: country === 'PT'
        ? "Análise funcional minuciosa, tríplice contingência (antecedente, resposta e consequência) e gestão de reforços no ambiente."
        : "Análise funcional minuciosa, tríplice contingência (antecedente, resposta e consequência) e manejo de reforçadores no ambiente.",
      highlight: country === 'PT'
        ? "Registos operacionais claros e rigorosos."
        : "Relatos operacionais claros e precisos."
    },
    {
      id: "junguiana",
      name: "Psicologia Analítica (Junguiana)",
      badge: "Carl Jung",
      description: country === 'PT'
        ? "Amplificação de símbolos, sonhos, dinâmicas de complexos inconscientes, projeções e processos de individuação."
        : "Amplificação de símbolos, sonhos, dinâmicas de complexos inconscientes, projeções e processos de individuação.",
      highlight: country === 'PT'
        ? "Compreensão arquetípica e simbólica equilibrada."
        : "Compreensão arquetípica e simbólica equilibrada."
    }
  ];

  const faqsBR = [
    {
      q: "Como funcionam os planos e assinaturas?",
      a: "Você pode começar no plano Gratuito (Start) para até 5 pacientes, ou escolher os planos Consultório (R$ 49,90/mês para até 15 pacientes) ou Ilimitado Pro (R$ 79,90/mês com pacientes e IA infinitos). Não há fidelidade ou multas: você pode cancelar ou alterar seu plano a qualquer momento pelo portal seguro da Stripe."
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
      q: "Posso testar antes de assinar?",
      a: "Sim! Você pode criar sua conta e experimentar todas as funcionalidades gratuitamente por 7 dias sem precisar cadastrar cartão de crédito."
    }
  ];

  const faqsPT = [
    {
      q: "Como funcionam os planos e pagamentos em Portugal?",
      a: "Pode começar no plano Gratuito (Start) para até 5 utentes, ou escolher o Plano Consultório (€ 19,00/mês para até 15 utentes) ou Ilimitado Pro (€ 29,00/mês com utentes e IA sem limites). Não há fidelização: pode cancelar ou alterar a sua subscrição a qualquer momento pela Stripe com faturação europeia."
    },
    {
      q: "Como funciona a extensão para o Google Meet?",
      a: "Instala a extensão oficial do SimplePsi no Chrome. Durante a sua consulta online no Google Meet, a extensão capta com total confidencialidade o diálogo da chamada. Ao terminar, basta 1 clique para a IA transformar a conversa num registo clínico impecável na sua abordagem teórica e arquivar a consulta no processo clínico do utente."
    },
    {
      q: "A IA respeita realmente a minha abordagem clínica?",
      a: "Sim, esse é o grande diferencial do SimplePsi. Em vez de termos genéricos robotizados, calibrámos a IA com 8 correntes teóricas reconhecidas (TCC, Psicanálise, Gestalt, ACT, Humanista, DBT, Behaviorismo e Junguiana). Os registos clínicos seguem rigorosamente a terminologia da sua linha de especialização."
    },
    {
      q: "Como funciona a conformidade perante a OPP e o RGPD?",
      a: "Cumprimos rigorosamente o Código Deontológico da Ordem dos Psicólogos Portugueses (OPP) e o RGPD (Regulamento UE 2016/679). Todos os dados clínicos e processos são encriptados com padrões bancários. Nenhuma informação de consulta é partilhada ou utilizada para treino de modelos públicos de inteligência artificial."
    },
    {
      q: "Os processos clínicos ficam guardados pelo período legal de 10 anos?",
      a: "Sim. A plataforma assegura o arquivo confidencial e backups contínuos dos processos clínicos pelo período obrigatório de 10 anos estipulado pela legislação de saúde portuguesa e pelas diretrizes da OPP, com exportação em PDF num clique."
    },
    {
      q: "Consigo emitir declarações para utentes com seguro ou ADSE?",
      a: "Sim! O módulo de Comparticipação & Seguros emite declarações formais de comparência com as datas das consultas, NIF e a sua Cédula OPP para o utente submeter à ADSE, Médis, Multicare ou AdvanceCare."
    },
    {
      q: "Como o utente assina o contrato e acede à Área do Utente?",
      a: "O utente recebe uma ligação exclusiva para o portal. Diretamente no telemóvel, acede com o seu NIF ou E-mail, assina o contrato de prestação de serviços desenhando no ecrã (com aviso de cancelamento prévio de 24h) e acede aos dados para pagamento por MB WAY ou IBAN."
    },
    {
      q: "Posso experimentar antes de subscrever?",
      a: "Sim! Pode criar a sua conta e experimentar todas as funcionalidades da plataforma gratuitamente por 7 dias sem necessidade de cartão de crédito."
    }
  ];

  const faqs = country === 'PT' ? faqsPT : faqsBR;

  return (
    <div className="min-h-screen text-[#2E3C2B] font-sans antialiased overflow-x-clip selection:bg-[#5F7D5C]/20 relative bg-[#FAF9F6]">
      
      {/* ===================================================
          1. ORGANIC HERO STAGE (PINNED SCROLL CHOREOGRAPHY)
          =================================================== */}
      <OrganicHeroStage 
        onLogin={handleCheckout} 
        scrollToPlans={scrollToPlans} 
        country={country}
      />

      {/* ---------------------------------------------------
          2. GOOGLE MEET + IA SUPERFEATURE SECTION (INTERACTIVE HORIZONTAL)
          --------------------------------------------------- */}
      <section id="google-meet" className="py-12 sm:py-16 px-4 sm:px-6 bg-[#2E3C2B] text-white relative z-20 overflow-hidden">
        {/* Organic Liquid Fluid Mesh Blob Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[600px] h-[380px] sm:h-[480px] -z-0 pointer-events-none opacity-40">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#5F7D5C]/40 via-[#8AA682]/45 to-[#A3C99F]/30 filter blur-[80px] animate-morph-blob" />
          <div className="absolute inset-8 bg-gradient-to-br from-[#8AA682]/30 via-[#2E3C2B]/20 to-[#C58971]/20 filter blur-[90px] animate-morph-blob-reverse" />
        </div>

        <div className="max-w-6xl mx-auto space-y-7 sm:space-y-9 relative z-10">
          
          <div className="text-center space-y-2.5 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 border border-white/15 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#8AA682]">
              <Chrome size={13} /> Inovação em Telepsicologia
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-tight text-white leading-tight">
              {country === 'PT' ? 'Atenda no Google Meet. O registo clínico nasce pronto.' : 'Atenda no Google Meet. A evolução nasce pronta.'}
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
              {country === 'PT'
                ? 'Esqueça as horas a redigir apontamentos à noite. A extensão do SimplePsi capta os diálogos com sigilo deontológico e a IA estrutura o registo clínico na sua abordagem teórica.'
                : 'Esqueça as horas digitando anotações à noite. A extensão do SimplePsi captura os diálogos com sigilo ético e a IA formata a evolução clínica na sua abordagem.'}
            </p>
          </div>

          {/* Interactive Stepper Navigation (Responsive 2x2 on Mobile, 4-col on Desktop - ZERO CUTOFF) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 max-w-3xl mx-auto p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            {[
              { idx: 0, num: "01", label: "No Google Meet" },
              { idx: 1, num: "02", label: country === 'PT' ? "Envio num Clique" : "Envio em 1 Clique" },
              { idx: 2, num: "03", label: country === 'PT' ? "Registo com IA" : "Evolução com IA" },
              { idx: 3, num: "04", label: country === 'PT' ? "Processo OPP" : "Prontuário CFP" },
            ].map((step) => (
              <button
                key={step.idx}
                onClick={() => setActiveMeetStep(step.idx)}
                className={`w-full py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  activeMeetStep === step.idx
                    ? "bg-[#8AA682] text-[#2E3C2B] shadow-md shadow-[#8AA682]/20 font-black"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeMeetStep === step.idx ? "bg-[#2E3C2B]/20 text-[#2E3C2B]" : "bg-white/10 text-white/70"}`}>
                  {step.num}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
            ))}
          </div>

          {/* Interactive Stage & Horizontal Visual Carousel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 backdrop-blur-md relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              
              {/* Left Column: Step Details & Quick Switch Controls */}
              <div className="lg:col-span-5 space-y-4 text-left">
                {activeMeetStep === 0 && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8AA682]/20 text-[#8AA682] border border-[#8AA682]/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                      {country === 'PT' ? 'Passo 01 de 04 • Consulta' : 'Passo 01 de 04 • Atendimento'}
                    </span>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-serif font-black text-white leading-snug">
                      {country === 'PT' ? 'Extensão discreta e confidencial no Meet' : 'Extensão discreta e sigilosa no Meet'}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
                      {country === 'PT'
                        ? <>A extensão oficial funciona em segundo plano durante a sua consulta online. O processamento de voz ocorre <strong>100% no seu navegador</strong>, garantindo total conformidade com as diretrizes da Ordem dos Psicólogos Portugueses (OPP).</>
                        : <>A extensão oficial atua em segundo plano durante a sua sessão online. O processamento de voz ocorre <strong>100% no seu navegador</strong>, garantindo total conformidade com o Código de Ética do Psicólogo.</>}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8AA682]">
                      <Check size={14} /> <span>Nenhuma gravação de áudio ou vídeo sai do seu computador</span>
                    </div>
                  </div>
                )}

                {activeMeetStep === 1 && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8AA682]/20 text-[#8AA682] border border-[#8AA682]/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                      Passo 02 de 04 • Sincronização
                    </span>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-serif font-black text-white leading-snug">
                      {country === 'PT' ? 'Envio instantâneo ao terminar a consulta' : 'Envio instantâneo ao fim da sessão'}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
                      {country === 'PT'
                        ? <>Ao terminar a consulta no Google Meet, basta carregar em <strong>"Enviar para o SimplePsi"</strong>. Duração, utente, data e apontamentos são transferidos sem precisar de redigitar uma única linha.</>
                        : <>Ao finalizar a consulta no Google Meet, basta clicar em <strong>"Enviar para o SimplePsi"</strong>. Duração, paciente, data e anotações brutas são transferidas sem você precisar redigitar uma única linha.</>}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8AA682]">
                      <Check size={14} /> <span>{country === 'PT' ? 'Zero trabalho manual entre consultas' : 'Zero trabalho manual entre uma consulta e outra'}</span>
                    </div>
                  </div>
                )}

                {activeMeetStep === 2 && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8AA682]/20 text-[#8AA682] border border-[#8AA682]/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                      Passo 03 de 04 • Inteligência Clínica
                    </span>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-serif font-black text-white leading-snug">
                      {country === 'PT' ? 'Registo técnico na sua abordagem' : 'Evolução técnica na sua abordagem'}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
                      {country === 'PT'
                        ? <>A nossa IA calibrada interpreta os diálogos e redige o registo da consulta com vocabulário técnico rigoroso da sua linha teórica (TCC, Psicanálise, Gestalt, ACT, etc.), preservando o seu estilo clínico com total precisão.</>
                        : <>Nossa IA calibrada interpreta as falas e redige a evolução clínica com vocabulário técnico rigoroso da sua linha teórica (TCC, Psicanálise, Gestalt, ACT, etc.), preservando seu estilo clínico com total precisão.</>}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8AA682]">
                      <Check size={14} /> <span>{country === 'PT' ? 'Pronto em 15 segundos para revisão e ajuste' : 'Pronta em 15 segundos para revisão e ajuste'}</span>
                    </div>
                  </div>
                )}

                {activeMeetStep === 3 && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8AA682]/20 text-[#8AA682] border border-[#8AA682]/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                      {country === 'PT' ? 'Passo 04 de 04 • Conformidade OPP' : 'Passo 04 de 04 • Conformidade CFP'}
                    </span>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-serif font-black text-white leading-snug">
                      {country === 'PT' ? 'Processo Clínico pronto e exportável em PDF' : 'Prontuário pronto e exportável em PDF'}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
                      {country === 'PT'
                        ? <>O registo é gravado na linha do tempo do utente. A qualquer momento, gere o <strong>PDF A4 oficial do processo clínico</strong> com Cédula OPP, cabeçalho e histórico para seguradoras (ADSE, Médis) ou arquivo legal de 10 anos.</>
                        : <>A evolução é gravada na linha do tempo do paciente. A qualquer momento, gere o <strong>PDF A4 oficial do prontuário</strong> com CRP, cabeçalho e histórico para convênios ou solicitações do Conselho.</>}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8AA682]">
                      <Check size={14} /> <span>{country === 'PT' ? 'PDF no padrão deontológico da Ordem dos Psicólogos Portugueses' : 'PDF no padrão exigido pela Resolução CFP nº 01/2009'}</span>
                    </div>
                  </div>
                )}

                {/* Horizontal Navigation Controls */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveMeetStep((prev) => (prev > 0 ? prev - 1 : 3))}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
                    title="Passo Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((dot) => (
                      <button
                        key={dot}
                        onClick={() => setActiveMeetStep(dot)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          activeMeetStep === dot ? "w-6 bg-[#8AA682]" : "w-2 bg-white/20 hover:bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveMeetStep((prev) => (prev < 3 ? prev + 1 : 0))}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
                    title="Próximo Passo"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Right Column: Dynamic Interactive Simulator Stage */}
              <div className="lg:col-span-7">
                <div className="bg-[#1F291D] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                  
                  {/* Window Bar Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-white/50 font-mono ml-2">SimplePsi TeleMeet Engine</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#5F7D5C]/30 text-[#8AA682] border border-[#5F7D5C]/40">
                      Sigilo Ponta a Ponta
                    </span>
                  </div>

                  {/* Simulator Screen Based on Active Step */}
                  <div className="min-h-[220px] sm:min-h-[240px] flex flex-col justify-center">
                    {activeMeetStep === 0 && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#5F7D5C]/40 border border-[#8AA682]/40 flex items-center justify-center text-[#8AA682]">
                              <Video size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">
                                {country === 'PT' ? 'Google Meet • Consulta Individual' : 'Google Meet • Sessão Individual'}
                              </p>
                              <p className="text-[11px] text-white/50">
                                {country === 'PT' ? 'Utente: Carlos M. • 48:12 decorridos' : 'Paciente: Carlos M. • 48:12 decorridos'}
                              </p>
                            </div>
                          </div>
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Extensão Ativa
                          </span>
                        </div>

                        {/* Animated Voice Waveform Simulator */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            {country === 'PT' ? 'Frequência da Voz (Processamento Local no Browser)' : 'Frequência da Fala (Captura Local no Browser)'}
                          </p>
                          <div className="flex items-center justify-center gap-1.5 h-8">
                            {[40, 80, 55, 95, 30, 70, 100, 60, 45, 85, 65, 35, 90, 50, 75, 40].map((h, i) => (
                              <div
                                key={i}
                                className="w-1.5 bg-[#8AA682] rounded-full animate-pulse"
                                style={{
                                  height: `${h}%`,
                                  animationDelay: `${i * 0.08}s`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeMeetStep === 1 && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">Extensão SimplePsi Chrome</span>
                            <span className="text-[10px] text-[#8AA682] font-mono">
                              {country === 'PT' ? 'Chamada Terminada' : 'Chamada Encerrada'}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/70">
                            {country === 'PT'
                              ? <>Consulta com <strong>Carlos M.</strong> terminada (50 minutos). 4.230 palavras analisadas.</>
                              : <>Consulta com <strong>Carlos M.</strong> concluída (50 minutos). 4.230 palavras capturadas.</>}
                          </p>
                          <button
                            onClick={() => setActiveMeetStep(2)}
                            className="w-full py-3 bg-[#8AA682] hover:bg-[#728e6b] text-[#2E3C2B] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Sparkles size={14} />
                            <span>Enviar para o SimplePsi (1 Clique)</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-center text-white/50">
                          {country === 'PT'
                            ? '⚡ O áudio foi descartado no momento. Apenas o conteúdo relevante alimenta o registo clínico.'
                            : '⚡ O áudio foi descartado na hora. Apenas as falas essenciais alimentam o gerador clínico.'}
                        </p>
                      </div>
                    )}

                    {activeMeetStep === 2 && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-[#8AA682]" />
                            <span className="text-xs font-bold text-white">IA Clínica • Abordagem TCC</span>
                          </div>
                          <span className="text-[10px] bg-[#5F7D5C]/30 text-[#8AA682] px-2 py-0.5 rounded font-mono">
                            Estruturada em 12s
                          </span>
                        </div>
                        <div className="bg-black/30 border border-white/10 rounded-xl p-3.5 space-y-2 text-left">
                          <p className="text-[11px] font-bold text-[#8AA682]">
                            {country === 'PT' ? 'Registo de Consulta nº 08' : 'Evolução de Sessão nº 08'}
                          </p>
                          <p className="text-[11px] text-white/80 leading-relaxed font-mono">
                            {country === 'PT'
                              ? '"Utente refere diminuição de pensamentos automáticos disfuncionais no trabalho. Identificada crença intermediária de desvalor. Realizada reestruturação cognitiva. Tarefa: registo semanal de pensamentos."'
                              : '"Paciente relata redução de pensamentos automáticos catastróficos no ambiente corporativo. Identificada crença intermediária de desvalor. Realizado RPD com reestruturação cognitiva. Tarefa: monitoramento semanal."'}
                          </p>
                        </div>
                        <div className="flex justify-between text-[10px] text-white/50">
                          <span>Vocabulário Técnico Validado</span>
                          <span>{country === 'PT' ? 'Pronto para Validação' : 'Pronto para Assinatura'}</span>
                        </div>
                      </div>
                    )}

                    {activeMeetStep === 3 && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="bg-white/10 border border-white/15 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#8AA682]">
                              <FileCheck size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">
                                {country === 'PT' ? 'Processo Clínico do Utente' : 'Prontuário Oficial do Paciente'}
                              </p>
                              <p className="text-[10px] text-white/50">
                                {country === 'PT' ? 'Conforme Código Deontológico OPP • PDF A4' : 'Conforme Resolução CFP nº 01/2009 • PDF A4'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded-lg">
                            ✓ {country === 'PT' ? 'Guardado' : 'Registrado'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                            {country === 'PT' ? '📄 Cabeçalho com Cédula OPP' : '📄 Cabeçalho com CRP Oficial'}
                          </span>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                            🔒 {country === 'PT' ? 'Assinatura Eletrónica' : 'Assinatura Eletrônica'}
                          </span>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                            📅 Linha do Tempo Cronológica
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center text-xs text-white/80 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
            <ShieldCheck size={18} className="text-[#8AA682] shrink-0" />
            <span>
              {country === 'PT'
                ? <><strong>Sigilo Deontológico Absoluto:</strong> A extensão não armazena áudio ou vídeo. O psicólogo mantém total controlo sobre o que é guardado no processo clínico.</>
                : <><strong>Sigilo Ético Absoluto:</strong> A extensão não armazena áudio ou vídeo. O psicólogo mantém total controle sobre o que é salvo no prontuário.</>}
            </span>
          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          NEW: 3. MIGRAÇÃO INTELIGENTE DE PRONTUÁRIOS (PDF, WORD, PLATAFORMAS)
          --------------------------------------------------- */}
      <section id="migracao" className="py-12 sm:py-16 px-4 sm:px-6 bg-[#FAF9F6] border-b border-[#2E3C2B]/5 relative z-20">
        <div className="max-w-6xl mx-auto space-y-7 sm:space-y-9">
          
          <div className="text-center space-y-2.5 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
              <FolderSync size={13} /> Migração Sem Perdas
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight leading-tight">
              {country === 'PT'
                ? 'Importe os seus processos clínicos e registos antigos em minutos'
                : 'Traga seus prontuários e evoluções antigas em minutos'}
            </h2>
            <p className="text-xs sm:text-sm text-[#2E3C2B]/70 max-w-2xl mx-auto leading-relaxed">
              {country === 'PT'
                ? 'Não comece do zero e mantenha o histórico dos seus utentes seguro. A nossa inteligência artificial lê os seus PDFs, ficheiros Word ou folhas de cálculo antigas e organiza cada registo na linha temporal do SimplePsi.'
                : 'Não comece do zero e nunca deixe o histórico dos seus pacientes para trás. Nossa inteligência artificial lê seus PDFs, arquivos do Word ou planilhas antigas e estrutura cada evolução na linha do tempo do SimplePsi.'}
            </p>
          </div>

          {/* Interactive Source Tabs & Migration Simulator */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-lg max-w-5xl mx-auto space-y-5">
            
            {/* Format Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'pdf', label: country === 'PT' ? 'PDFs de Processos' : 'PDFs de Prontuários', icon: FileText, note: country === 'PT' ? 'Relatórios e registos' : 'Relatórios e evoluções' },
                { id: 'docx', label: 'Word (.docx)', icon: PenTool, note: country === 'PT' ? 'Documentos de texto' : 'Textos digitados' },
                { id: 'platforms', label: 'Outras Plataformas', icon: UploadCloud, note: country === 'PT' ? 'Exportações anteriores' : 'Zenklub, Vittude, etc.' },
                { id: 'sheets', label: country === 'PT' ? 'Folhas de Cálculo' : 'Planilhas (Excel/CSV)', icon: FileSpreadsheet, note: country === 'PT' ? 'Tabelas e registos' : 'Tabelas e cadastros' },
              ].map((src) => {
                const IconComponent = src.icon;
                const isSelected = activeMigrationSource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => setActiveMigrationSource(src.id as any)}
                    className={`p-2.5 sm:p-3 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-[#5F7D5C] text-white border-[#5F7D5C] shadow-md shadow-[#5F7D5C]/20 scale-[1.01]"
                        : "bg-[#FAF9F6] text-[#2E3C2B]/75 border-[#2E3C2B]/5 hover:bg-[#EFECE6]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <IconComponent size={15} className={isSelected ? "text-white" : "text-[#5F7D5C]"} />
                      <span className="text-xs font-bold truncate">{src.label}</span>
                    </div>
                    <p className={`text-[10px] truncate ${isSelected ? "text-white/80" : "text-[#2E3C2B]/50"}`}>
                      {src.note}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Interactive Showcase Box */}
            <div className="p-4 sm:p-5 bg-[#FAF8F5] border border-[#2E3C2B]/10 rounded-xl sm:rounded-2xl space-y-5">
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                
                {/* File Dropzone Simulator */}
                <div className="w-full md:w-5/12 bg-white border-2 border-dashed border-[#5F7D5C]/30 rounded-2xl p-6 text-center space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-[#5F7D5C]/10 text-[#5F7D5C] mx-auto flex items-center justify-center">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2E3C2B]">
                      {activeMigrationSource === 'pdf' && (country === 'PT' ? "processos_utentes_completo.pdf" : "prontuario_pacientes_completo.pdf")}
                      {activeMigrationSource === 'docx' && (country === 'PT' ? "registos_clinicos_2025.docx" : "evolucoes_clinicas_2024.docx")}
                      {activeMigrationSource === 'platforms' && "export_plataforma_anterior.zip"}
                      {activeMigrationSource === 'sheets' && (country === 'PT' ? "utentes_e_consultas.xlsx" : "pacientes_e_sessoes.xlsx")}
                    </p>
                    <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">
                      {country === 'PT' ? 'Arraste os seus ficheiros para o importador' : 'Arraste seus arquivos para o migrador'}
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 bg-[#5F7D5C]/10 text-[#5F7D5C] text-[10px] font-bold rounded-full">
                    {country === 'PT' ? '✓ Ficheiro Detetado' : '✓ Arquivo Detectado'}
                  </span>
                </div>

                {/* Center Engine Indicator */}
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className="w-9 h-9 rounded-full bg-[#5F7D5C] text-white flex items-center justify-center shadow-md animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F7D5C]">
                    IA Extratora SimplePsi
                  </p>
                  <p className="text-[9px] text-[#2E3C2B]/50 max-w-[120px]">
                    {country === 'PT' ? 'A identificar datas, utente e apontamentos' : 'Identificando datas, paciente e anotações'}
                  </p>
                </div>

                {/* Output Ready Timeline */}
                <div className="w-full md:w-5/12 bg-white border border-[#2E3C2B]/10 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#2E3C2B]/5 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#5F7D5C]/15 text-[#5F7D5C] flex items-center justify-center text-xs font-bold">
                        C
                      </div>
                      <span className="text-xs font-bold text-[#2E3C2B]">Carlos M. (Importado)</span>
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Pronto
                    </span>
                  </div>

                  <div className="space-y-1.5 text-left text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#2E3C2B]/80 font-medium">
                      <CheckCircle2 size={13} className="text-[#5F7D5C] shrink-0" />
                      <span><strong>14 {country === 'PT' ? 'Consultas' : 'Sessões'}</strong> {country === 'PT' ? 'associadas com datas exatas' : 'vinculadas com datas exatas'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#2E3C2B]/80 font-medium">
                      <CheckCircle2 size={13} className="text-[#5F7D5C] shrink-0" />
                      <span>{country === 'PT' ? 'Registos guardados no histórico clínico' : 'Evoluções salvas no histórico clínico'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#2E3C2B]/80 font-medium">
                      <CheckCircle2 size={13} className="text-[#5F7D5C] shrink-0" />
                      <span>{country === 'PT' ? 'Processo clínico OPP pronto para acompanhamento' : 'Prontuário CFP pronto para continuação'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3 Micro-Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#2E3C2B]/10">
                <div className="space-y-1 text-left">
                  <p className="text-xs font-bold text-[#2E3C2B]">⚡ {country === 'PT' ? 'Carregamento em Lote' : 'Upload em Lote'}</p>
                  <p className="text-[11px] text-[#2E3C2B]/60">{country === 'PT' ? 'Carregue múltiplos ficheiros ou relatórios de uma só vez sem redigitar.' : 'Suba múltiplos arquivos ou relatórios unificados sem redigitar.'}</p>
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-xs font-bold text-[#2E3C2B]">🧠 Reconhecimento Inteligente</p>
                  <p className="text-[11px] text-[#2E3C2B]/60">{country === 'PT' ? 'A IA separa cada consulta e organiza tudo em ordem cronológica.' : 'A IA separa cada consulta e organiza tudo em ordem cronológica.'}</p>
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-xs font-bold text-[#2E3C2B]">🔒 {country === 'PT' ? 'Sigilo OPP & RGPD' : 'Sigilo Ético CFP'}</p>
                  <p className="text-[11px] text-[#2E3C2B]/60">{country === 'PT' ? 'Ficheiros processados com segurança e encriptados no padrão da OPP e do RGPD.' : 'Arquivos processados localmente e criptografados no padrão CFP.'}</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          3. PATIENT PORTAL & THERAPEUTIC CONTRACT
          --------------------------------------------------- */}
      <section id="area-paciente" className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto relative z-20 space-y-7 sm:space-y-9">
        
        <div className="text-center space-y-2.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <Users size={13} /> {country === 'PT' ? 'Área do Utente Dedicada' : 'Portal do Paciente Dedicado'}
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight leading-tight">
            {country === 'PT'
              ? 'Acabe com o desgaste de faltas de última hora e acordos em papel'
              : 'Acabe com o estresse de faltas sem aviso prévio e contratos em papel'}
          </h2>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/70 max-w-2xl mx-auto leading-relaxed">
            {country === 'PT'
              ? 'O seu utente recebe um portal moderno e protegido para assinar contratos de prestação de serviços digitalmente, registar o humor diário, aceder a tarefas e consultar dados de pagamento por MB WAY ou IBAN.'
              : 'Seu paciente ganha um portal moderno e protegido para assinar contratos terapêuticos digitalmente, registrar humor diário e receber tarefas e cartilhas de psicoeducação.'}
          </p>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Card 1: Contrato Terapêutico */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
                <PenTool size={18} />
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#2E3C2B]">
                {country === 'PT' ? 'Contrato com Assinatura Digital no Ecrã' : 'Contrato Terapêutico com Assinatura Digital'}
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                {country === 'PT'
                  ? <>O utente lê os termos no telemóvel e assina diretamente no ecrã. O documento inclui cláusulas claras de <strong>honorários, sigilo deontológico da OPP e a regra de cobrança de faltas sem aviso prévio de 24 horas</strong>.</>
                  : <>O paciente lê os termos no celular e assina na tela com o dedo. O contrato inclui cláusulas claras de <strong>honorários, sigilo ético e a regra de cobrança de faltas sem aviso prévio de 24 horas</strong>, blindando você contra prejuízos financeiros.</>}
              </p>
            </div>
            <div className="pt-3 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-[#5F7D5C]">
              <Check size={14} /> <span>{country === 'PT' ? 'Validade legal com registo de data e documento' : 'Validade jurídica com registro de data e documento'}</span>
            </div>
          </div>

          {/* Card 2: Diário de Humor */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Smile size={18} />
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#2E3C2B]">
                {country === 'PT' ? 'Diário de Humor & Emoções' : 'Diário de Humor & Emoções (Mood Diary)'}
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                {country === 'PT'
                  ? 'O utente regista os seus sentimentos diários com emojis e breves apontamentos. Acompanhe no seu painel os gráficos de oscilação do humor entre consultas, obtendo dados valiosos para a sessão.'
                  : 'O paciente registra seus sentimentos diários com emojis e anotações breves. Você acompanha no seu painel os gráficos de oscilação do humor entre as sessões, trazendo insights valiosos para a consulta.'}
              </p>
            </div>
            <div className="pt-3 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-amber-700">
              <Check size={14} /> <span>{country === 'PT' ? 'Acompanhamento clínico contínuo e visual' : 'Acompanhamento terapêutico contínuo e visual'}</span>
            </div>
          </div>

          {/* Card 3: Plano de Segurança */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Shield size={18} />
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#2E3C2B]">
                Plano de Segurança de Crise
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                {country === 'PT'
                  ? 'Para casos de desregulação emocional ou risco: formule em conjunto com o utente os sinais de alerta, estratégias de autorregulação, contactos de emergência e motivos para viver, sempre acessíveis no telemóvel.'
                  : 'Para casos de desregulação emocional e risco: formule em conjunto com o paciente os sinais de alerta, estratégias de autorregulação, contatos de emergência e motivos para viver, sempre acessíveis no celular do paciente.'}
              </p>
            </div>
            <div className="pt-3 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-rose-700">
              <Check size={14} /> <span>{country === 'PT' ? 'Acompanhamento clínico responsável e seguro' : 'Manejo clínico responsável e ético'}</span>
            </div>
          </div>

          {/* Card 4: Biblioteca de PDFs */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#2E3C2B]">
                {country === 'PT' ? 'Biblioteca de Recursos & Psicoeducação' : 'Biblioteca Psicoeducativa de PDFs'}
              </h3>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed">
                {country === 'PT'
                  ? 'Partilhe num só clique tarefas para casa, inventários, questionários e folhas informativas diretamente na área do utente, mantendo todo o material centralizado.'
                  : 'Compartilhe com apenas um clique tarefas de casa, inventários, questionários e cartilhas educativas diretamente para a área do paciente, mantendo todo o material do tratamento centralizado.'}
              </p>
            </div>
            <div className="pt-3 border-t border-[#2E3C2B]/5 flex items-center gap-2 text-xs font-bold text-blue-700">
              <Check size={14} /> <span>{country === 'PT' ? 'Partilha direta sem necessidade de anexar em e-mails' : 'Envio direto sem precisar anexar em e-mails'}</span>
            </div>
          </div>

        </div>

      </section>

      {/* ---------------------------------------------------
          4. APPROACH-BASED AI (INTERACTIVE SHOWCASE)
          --------------------------------------------------- */}
      <section id="abordagem-ia" className="py-12 sm:py-16 px-4 sm:px-6 bg-[#EFECE6]/35 border-y border-[#2E3C2B]/5 relative z-20">
        <div className="max-w-6xl mx-auto space-y-7 sm:space-y-9">
          
          <div className="text-center space-y-2.5 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
              <Sparkles size={13} /> IA Especializada por Abordagem
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight leading-tight">
              Uma Inteligência Artificial que fala a linguagem exata da sua linha teórica
            </h2>
            <p className="text-xs sm:text-sm text-[#2E3C2B]/70 max-w-2xl mx-auto leading-relaxed">
              {country === 'PT'
                ? 'Basta de IA genéricas que misturam jargão ou impõem conceitos comportamentais a quem dá consultas em Psicanálise ou Fenomenologia. No SimplePsi, cada abordagem possui calibração e diagramas próprios.'
                : 'Chega de IAs genéricas que misturam jargões ou forçam conceitos comportamentais em quem atende por Psicanálise ou Fenomenologia. No SimplePsi, cada abordagem possui calibração e diagramas próprios.'}
            </p>
          </div>

          {/* Interactive Approach Selector */}
          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-lg max-w-4xl mx-auto space-y-5">
            
            {/* Approach Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {approachesData.map((appr) => (
                <button
                  key={appr.id}
                  onClick={() => setSelectedApproach(appr.id)}
                  className={`p-2.5 sm:p-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                    selectedApproach === appr.id
                      ? "bg-[#5F7D5C] text-white border-[#5F7D5C] shadow-md shadow-[#5F7D5C]/20 scale-[1.01]"
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
                <div className="p-4 sm:p-5 bg-[#FAF8F5] border border-[#2E3C2B]/10 rounded-xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E3C2B]/10 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#5F7D5C] uppercase tracking-wider block">
                        Abordagem Selecionada
                      </span>
                      <h4 className="text-base sm:text-lg font-serif font-bold text-[#2E3C2B]">
                        {current.name}
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-[#5F7D5C]/10 text-[#5F7D5C] rounded-full text-[11px] font-bold border border-[#5F7D5C]/20">
                      {current.badge}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                    {current.description}
                  </p>

                  <div className="p-3 bg-white border border-[#2E3C2B]/10 rounded-xl flex items-center gap-2.5 text-xs font-bold text-[#5F7D5C]">
                    <Sparkles size={16} className="shrink-0" />
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
      <section id="modulos" className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto relative z-20 space-y-7 sm:space-y-9">
        
        <div className="text-center space-y-2.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <Layers size={13} /> O Consultório Completo
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight leading-tight">
            {country === 'PT' ? 'Tudo o que o seu consultório precisa para funcionar sem esforço' : 'Tudo o que seu consultório precisa para rodar sem esforço'}
          </h2>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/70 max-w-2xl mx-auto leading-relaxed">
            {country === 'PT'
              ? 'Substitua folhas de cálculo confusas e cadernos de apontamentos por um sistema unificado, seguro e intuitivo.'
              : 'Substitua planilhas confusas e cadernos de anotações por um sistema unificado, seguro e intuitivo.'}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          
          <div className="bg-white border-2 border-[#5F7D5C]/30 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#5F7D5C] text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded-bl-lg">
              Antifaltas
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageSquare size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#2E3C2B]">
              {country === 'PT' ? 'Lembretes de WhatsApp Automáticos' : 'Robô de WhatsApp Automático'}
            </h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              {country === 'PT'
                ? 'Confirmação de comparência na véspera (D-1) com botões interativos e envio da ligação do Google Meet no dia (D-0). Reduza as não comparências a quase zero.'
                : 'Confirmação de presença na véspera (D-1) com botões interativos e envio do link do Google Meet no dia (D-0). Reduza as faltas a quase zero.'}
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <FileText size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#2E3C2B]">
              {country === 'PT' ? 'Processos Clínicos Oficiais em PDF' : 'Prontuários Oficiais em PDF'}
            </h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              {country === 'PT'
                ? 'Histórico cronológico completo no padrão da OPP. Exporte relatórios em formato A4 com a sua Cédula Profissional e assinatura para companhias de seguros e solicitações éticas.'
                : 'Histórico cronológico completo no padrão do CFP. Exporte relatórios em formato A4 com seu CRP e assinatura para convênios e solicitações éticas.'}
            </p>
          </div>

          <div className="bg-white border-2 border-[#5F7D5C]/20 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm hover:shadow-md transition-all relative">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#2E3C2B] flex items-center gap-1.5">
              <span>{country === 'PT' ? 'Radar de Ideias Clínicas' : 'Radar de Conteúdo Clínico'}</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase">Pro</span>
            </h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              {country === 'PT'
                ? 'Gere ideias de publicações para o Instagram e LinkedIn a partir de desafios clínicos reais, com sigilo 100% preservado e comunicação ética.'
                : 'Gere ideias de posts para Instagram e LinkedIn a partir de dores e eixos clínicos reais, com sigilo 100% preservado e ganchos profissionais autênticos.'}
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <Users size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#2E3C2B]">
              {country === 'PT' ? 'Área do Utente & Contratos' : 'Área do Paciente & Contratos'}
            </h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              {country === 'PT'
                ? 'Contrato de prestação de serviços assinado pelo utente direto no telemóvel, com validade jurídica, além de diário de humor diário e tarefas partilhadas.'
                : 'Contrato terapêutico assinado pelo paciente direto no celular, com validade jurídica, além de diário de humor diário e tarefas compartilhadas.'}
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <FileCheck size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#2E3C2B]">
              {country === 'PT' ? 'Declarações para Seguros & ADSE' : 'Comprovante para Reembolso'}
            </h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              {country === 'PT'
                ? 'Gere num clique a declaração formal de comparência para o seu utente solicitar comparticipação (regime livre) junto da ADSE, Médis, Multicare ou AdvanceCare.'
                : 'Gere em 1 clique a declaração formal de comparecimento para seu paciente solicitar reembolso de consultas particulares junto ao plano de saúde.'}
            </p>
          </div>

          <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#5F7D5C]/10 text-[#5F7D5C] flex items-center justify-center">
              <Lock size={18} />
            </div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#2E3C2B]">
              {country === 'PT' ? 'Conformidade OPP & RGPD' : 'Conformidade CFP & LGPD'}
            </h3>
            <p className="text-xs text-[#2E3C2B]/70 leading-relaxed">
              {country === 'PT'
                ? 'Encriptação de ponta a ponta e arquivo em nuvem segura na UE, garantindo sigilo absoluto aos seus utentes conforme o Código Deontológico da OPP.'
                : 'Criptografia de ponta a ponta e armazenamento em nuvem de alta segurança no Google Cloud, garantindo sigilo absoluto aos seus pacientes.'}
            </p>
          </div>

        </div>

      </section>

      {/* ---------------------------------------------------
          6. CALCULADORA ANTIFALTAS & RETORNO DO INVESTIMENTO
          --------------------------------------------------- */}
      <section id="economia" className="py-12 sm:py-16 px-4 sm:px-6 bg-[#2E3C2B] text-white relative z-20">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 text-center">
          
          <div className="space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 border border-white/15 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#8AA682]">
              <MessageSquare size={13} /> {country === 'PT' ? 'Lembretes de WhatsApp Antifaltas' : 'Robô de WhatsApp Antifaltas'}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-white tracking-tight leading-tight">
              {country === 'PT'
                ? 'Quanto perde o seu consultório por mês com faltas e esquecimentos?'
                : 'Quanto seu consultório perde por mês com faltas e esquecimentos?'}
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
              {country === 'PT'
                ? 'Em Portugal, psicólogos perdem em média 10% a 20% do rendimento mensal com consultas desmarcadas à última hora. Com confirmação automática no WhatsApp (D-1) e ligação da sala no dia (D-0), acaba com os horários vagos.'
                : 'No Brasil, psicólogos perdem em média de 10% a 20% do faturamento por sessões desmarcadas de última hora. Com confirmação automática no WhatsApp (D-1) e link da sala no dia (D-0), você acaba com os horários ociosos.'}
            </p>
          </div>

          {/* Calculator Card */}
          <div className="bg-white/10 border border-white/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-xl space-y-5 text-left">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Slider 1: Sessões por semana */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="uppercase tracking-wider text-white/80">
                    {country === 'PT' ? 'Utentes atendidos por semana' : 'Pacientes atendidos por semana'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-[#5F7D5C] text-white rounded-full font-mono text-xs">
                    {weeklySessions} {country === 'PT' ? 'utentes' : 'pacientes'}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={weeklySessions}
                  onChange={(e) => setWeeklySessions(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8AA682]"
                />
                <div className="flex justify-between text-[10px] text-white/40 uppercase font-bold tracking-widest">
                  <span>5/sem</span>
                  <span>15/sem</span>
                  <span>25/sem</span>
                  <span>35/sem</span>
                </div>
              </div>

              {/* Slider 2: Valor da sessão */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="uppercase tracking-wider text-white/80">
                    {country === 'PT' ? 'Honorário médio por consulta' : 'Valor médio da sua sessão'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-[#5F7D5C] text-white rounded-full font-mono text-xs">
                    {country === 'PT' ? `€ ${sessionPrice},00` : `R$ ${sessionPrice},00`}
                  </span>
                </div>
                <input
                  type="range"
                  min={country === 'PT' ? "20" : "80"}
                  max={country === 'PT' ? "150" : "300"}
                  step={country === 'PT' ? "5" : "10"}
                  value={sessionPrice}
                  onChange={(e) => setSessionPrice(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8AA682]"
                />
                <div className="flex justify-between text-[10px] text-white/40 uppercase font-bold tracking-widest">
                  <span>{country === 'PT' ? '€ 20' : 'R$ 80'}</span>
                  <span>{country === 'PT' ? '€ 50' : 'R$ 150'}</span>
                  <span>{country === 'PT' ? '€ 90' : 'R$ 220'}</span>
                  <span>{country === 'PT' ? '€ 150' : 'R$ 300'}</span>
                </div>
              </div>
            </div>

            {/* Comparison Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
              
              <div className="p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-red-500/20 space-y-2">
                <span className="text-[10px] font-bold uppercase text-red-400">Sem lembretes automáticos</span>
                <p className="text-xs text-white/70 leading-relaxed">
                  Cerca de <strong>{missedSessions} {country === 'PT' ? 'consultas perdidas' : 'sessões perdidas'}</strong> por mês por esquecimento:
                </p>
                <p className="text-xl sm:text-2xl font-serif font-black text-red-400">
                  - {country === 'PT' ? `€ ${lostRevenue.toLocaleString("pt-PT")},00` : `R$ ${lostRevenue.toLocaleString("pt-BR")},00`} /mês
                </p>
                <p className="text-[10px] text-white/40">
                  {country === 'PT' ? 'Rendimento que se perde todos os meses' : 'Faturamento que escorre pelo ralo todo mês'}
                </p>
              </div>

              <div className="p-4 rounded-xl sm:rounded-2xl bg-[#5F7D5C]/30 border-2 border-[#8AA682]/40 space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#8AA682]">Com SimplePsi (D-1 + D-0)</span>
                <p className="text-xs text-white/80 leading-relaxed">
                  Até <strong>{savedSessions} {country === 'PT' ? 'consultas protegidas' : 'sessões protegidas'}</strong> com confirmações na véspera:
                </p>
                <p className="text-xl sm:text-2xl font-serif font-black text-emerald-400">
                  + {country === 'PT' ? `€ ${recoveredRevenue.toLocaleString("pt-PT")},00` : `R$ ${recoveredRevenue.toLocaleString("pt-BR")},00`} /mês
                </p>
                <p className="text-[10px] text-[#8AA682]">
                  {country === 'PT' ? 'Honorários preservados na sua conta' : 'Faturamento preservado no seu bolso'}
                </p>
              </div>

            </div>

            {/* Total Saved Banner */}
            <div className="bg-[#5F7D5C] p-3 sm:p-3.5 rounded-xl text-center text-xs font-bold text-white flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md">
              <span>{country === 'PT' ? '🌿 Retorno comprovado: O SimplePsi compensa o investimento logo na primeira semana!' : '🌿 Retorno comprovado: O SimplePsi se paga logo na primeira semana!'}</span>
              <span className="text-xs sm:text-sm font-black uppercase">
                {country === 'PT'
                  ? `Ganho líquido de € ${Math.max(0, recoveredRevenue - 29).toLocaleString("pt-PT")},00 /mês`
                  : `Ganho líquido de R$ ${Math.max(0, recoveredRevenue - 79).toLocaleString("pt-BR")},00 /mês`}
              </span>
            </div>

          </div>

          <div className="pt-1">
            <button 
              onClick={() => handleCheckout(null)}
              className="px-6 sm:px-7 py-3 sm:py-3.5 bg-[#8AA682] hover:bg-[#728e6b] text-[#2E3C2B] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2"
            >
              <span>{country === 'PT' ? 'Experimentar 7 Dias Grátis' : 'Começar Teste de 7 Dias Grátis'}</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </div>
      </section>

      {/* ---------------------------------------------------
          7. SOCIAL PROOF & TESTIMONIALS
          --------------------------------------------------- */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto relative z-20 space-y-7 sm:space-y-9">
        
        <div className="text-center space-y-2.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <Star size={13} className="fill-[#5F7D5C]" /> Opinião de Quem Já Usa
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight leading-tight">
            {country === 'PT' ? 'Psicólogos que transformaram a sua rotina e pouparam tempo' : 'Psicólogos que transformaram sua rotina e economizaram tempo'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 text-left">
          
          <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#2E3C2B]/10 space-y-3.5 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex text-amber-500 gap-1">
                <Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" />
              </div>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                {country === 'PT'
                  ? '"A extensão para o Google Meet poupa-me horas de trabalho todas as noites. Termino a consulta online e o registo clínico fica estruturado no padrão da TCC com o rigor exigido pela OPP. Fantástico!"'
                  : '"A extensão do Google Meet mudou minha vida clínica. Atendo online o dia todo e agora termino as sessões com a evolução praticamente pronta, perfeitamente no modelo da TCC. Vale cada centavo!"'}
              </p>
            </div>
            <div>
              <p className="text-xs font-black text-[#2E3C2B]">
                {country === 'PT' ? 'Dra. Sofia Lourenço' : 'Dra. Mariana Alencar'}
              </p>
              <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">
                {country === 'PT' ? 'Psicóloga Clínica • Cédula OPP 24192 (Lisboa)' : 'Terapeuta Cognitivo-Comportamental • São Paulo'}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#2E3C2B]/10 space-y-3.5 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex text-amber-500 gap-1">
                <Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" />
              </div>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                {country === 'PT'
                  ? '"A assinatura do contrato no ecrã do telemóvel com o aviso prévio de 24h e o acesso por NIF acabou com as faltas sem aviso. E os comprovativos para a ADSE e seguros saem num clique."'
                  : '"O contrato terapêutico digital com a cláusula de aviso prévio de 24h acabou com o problema de faltas sem aviso. E a assinatura na tela pelo celular é super prática para o paciente."'}
              </p>
            </div>
            <div>
              <p className="text-xs font-black text-[#2E3C2B]">
                {country === 'PT' ? 'Dr. Tiago Moreira' : 'Dr. Gustavo Nogueira'}
              </p>
              <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">
                {country === 'PT' ? 'Terapeuta Cognitivo-Comportamental • Cédula OPP 18745 (Porto)' : 'Psicanalista Clínico • Rio de Janeiro'}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#2E3C2B]/10 space-y-3.5 shadow-sm flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex text-amber-500 gap-1">
                <Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" /><Star size={13} className="fill-amber-500" />
              </div>
              <p className="text-xs sm:text-sm text-[#2E3C2B]/80 leading-relaxed font-medium">
                {country === 'PT'
                  ? '"A tranquilidade de ter os processos clínicos guardados em nuvem encriptada em conformidade com o RGPD por € 19/mês é imbatível. A sincronização com o Google Calendar funciona sem falhas."'
                  : '"A facilidade do sistema é libertadora. O sistema é rápido, sincroniza direto com a minha agenda do Google no celular e os prontuários em PDF são impecáveis."'}
              </p>
            </div>
            <div>
              <p className="text-xs font-black text-[#2E3C2B]">
                {country === 'PT' ? 'Dra. Inês Ferreira' : 'Dra. Clarice Mendes'}
              </p>
              <p className="text-[10px] text-[#2E3C2B]/50 font-bold uppercase tracking-wider">
                {country === 'PT' ? 'Psicoterapeuta • Cédula OPP 29310 (Coimbra)' : 'Psicóloga Humanista • Belo Horizonte'}
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* ---------------------------------------------------
          8. FAQ SECTION
          --------------------------------------------------- */}
      <section id="faq" className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto relative z-20 space-y-6 sm:space-y-8">
        
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <HeartHandshake size={13} /> Esclarecimentos Frequentes
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2E3C2B]">Perguntas e Respostas</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="bg-white rounded-xl sm:rounded-2xl border border-[#2E3C2B]/10 overflow-hidden shadow-sm transition-all"
            >
              <button 
                onClick={() => toggleFaq(i)}
                className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-bold text-[#2E3C2B]">{faq.q}</span>
                <ChevronDown 
                  size={15} 
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
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#2E3C2B]/75 leading-relaxed border-t border-[#2E3C2B]/5">
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
          9. FINAL PLANS & PRICING SECTION
          --------------------------------------------------- */}
      <section id="planos" className="py-12 sm:py-16 px-4 sm:px-6 relative z-20">
        
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          
          <div className="text-center space-y-2.5 max-w-xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5F7D5C] bg-[#5F7D5C]/10 py-1 px-3 rounded-full inline-block">
              {country === 'PT' ? 'Planos Transparentes em Euro' : 'Planos Transparentes'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2E3C2B]">
              Escolha o plano ideal para a sua prática clínica
            </h2>
            <p className="text-xs sm:text-sm text-[#2E3C2B]/70">
              {country === 'PT'
                ? 'Sem contratos com fidelização ou custos ocultos. Comece gratuitamente ou avance quando o seu consultório crescer.'
                : 'Sem contratos presos ou fidelidade. Comece gratuitamente ou evolua quando seus atendimentos crescerem.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            
            {/* PLANO 1: START */}
            <div className="bg-white border border-[#2E3C2B]/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F7D5C] bg-[#5F7D5C]/10 py-0.5 px-2 rounded-full">
                    Plano Start
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#2E3C2B] mt-1.5">Gratuito</h3>
                  <p className="text-xs text-[#2E3C2B]/60 mt-0.5">
                    {country === 'PT' ? 'Para quem está a iniciar os atendimentos privados.' : 'Para quem está no início dos atendimentos particulares.'}
                  </p>
                </div>

                <div className="py-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-serif font-black text-[#2E3C2B]">
                      {country === 'PT' ? '€ 0' : 'R$ 0'}
                    </span>
                    <span className="text-xs text-[#2E3C2B]/60 font-medium">/mês</span>
                  </div>
                  <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">Para sempre • Sem cartão de crédito</p>
                </div>

                <div className="space-y-2 pt-2.5 border-t border-[#2E3C2B]/10 text-xs text-[#2E3C2B]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" />
                    <span><strong>Até 5 {country === 'PT' ? 'utentes' : 'pacientes'}</strong> {country === 'PT' ? 'registados' : 'cadastrados'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" />
                    <span>{country === 'PT' ? 'Processo clínico digital completo' : 'Prontuário eletrônico completo'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" />
                    <span>Extensão Google Meet incluída</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" />
                    <span>Até 5 gerações de IA por dia</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#2E3C2B]/50">
                    <X size={14} className="text-red-500/80 shrink-0" strokeWidth={2.5} />
                    <span>{country === 'PT' ? 'Sem envio automático de WhatsApp' : 'Sem robô de WhatsApp automático'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => onLogin(null, country)}
                  className="w-full py-3 bg-white hover:bg-[#2E3C2B]/5 text-[#2E3C2B] border-2 border-[#2E3C2B]/15 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  {country === 'PT' ? 'Começar Gratuitamente' : 'Começar Grátis'}
                </button>
              </div>
            </div>

            {/* PLANO 2: CONSULTÓRIO */}
            <div className="bg-white border border-[#2E3C2B]/15 hover:border-[#5F7D5C]/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F7D5C] bg-[#5F7D5C]/10 py-0.5 px-2 rounded-full">
                    Plano Consultório
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#2E3C2B] mt-1.5">Consultório</h3>
                  <p className="text-xs text-[#2E3C2B]/60 mt-0.5">
                    {country === 'PT' ? 'Para o psicólogo com prática clínica em expansão.' : 'Para o psicólogo com carteira em expansão.'}
                  </p>
                </div>

                <div className="py-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-[#2E3C2B]/60 font-semibold">{country === 'PT' ? '€' : 'R$'}</span>
                    <span className="text-2xl sm:text-3xl font-serif font-black text-[#2E3C2B]">
                      {country === 'PT' ? '19,00' : '49,90'}
                    </span>
                    <span className="text-xs text-[#2E3C2B]/60 font-medium">/mês</span>
                  </div>
                  <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">
                    {country === 'PT' ? 'Cobrança mensal em cartão de crédito ou SEPA' : 'Cobrança mensal no cartão de crédito'}
                  </p>
                </div>

                <div className="space-y-2 pt-2.5 border-t border-[#2E3C2B]/10 text-xs text-[#2E3C2B]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={2.5} />
                    <span><strong>Até 15 {country === 'PT' ? 'utentes' : 'pacientes'}</strong> {country === 'PT' ? 'ativos' : 'ativos'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={2.5} />
                    <span>{country === 'PT' ? 'Processo clínico completo & Anamnese' : 'Prontuário completo & Anamnese'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={2.5} />
                    <span><strong>Lembretes no WhatsApp (D-1)</strong> <span className="text-[10px] text-[#5F7D5C] font-semibold">(ativo)</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={2.5} />
                    <span>{country === 'PT' ? 'IA por abordagem clínica (padrão OPP)' : 'IA por abordagem terapêutica'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={2.5} />
                    <span>{country === 'PT' ? 'Contratos digitais com assinatura no ecrã' : 'Contratos digitais com assinatura'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => onLogin('consultorio', country)}
                  className="w-full py-3 bg-white hover:bg-[#5F7D5C]/10 text-[#2E3C2B] border-2 border-[#5F7D5C] font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  {country === 'PT' ? 'Subscrever Consultório' : 'Assinar Consultório'}
                </button>
              </div>
            </div>

            {/* PLANO 3: ILIMITADO (DESTAQUE) */}
            <div className="bg-[#5F7D5C]/5 border-2 border-[#5F7D5C] rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xl relative">
              <div className="absolute -top-3 right-5 bg-[#5F7D5C] text-white text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded-full shadow flex items-center gap-1">
                <Sparkles size={11} className="fill-white" />
                <span>{country === 'PT' ? 'Mais Popular' : 'Mais Escolhido'}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F7D5C] bg-[#5F7D5C]/15 py-0.5 px-2 rounded-full">
                    Plano Ilimitado
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#2E3C2B] mt-1.5">Ilimitado (Pro)</h3>
                  <p className="text-xs text-[#2E3C2B]/60 mt-0.5">
                    {country === 'PT' ? 'Automação total para psicólogos estabelecidos.' : 'Automação total para psicólogos estabelecidos.'}
                  </p>
                </div>

                <div className="py-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-[#2E3C2B]/60 font-semibold">{country === 'PT' ? '€' : 'R$'}</span>
                    <span className="text-2xl sm:text-3xl font-serif font-black text-[#5F7D5C]">
                      {country === 'PT' ? '29,00' : '79,90'}
                    </span>
                    <span className="text-xs text-[#2E3C2B]/60 font-medium">/mês</span>
                  </div>
                  <p className="text-[10px] text-[#2E3C2B]/50 mt-0.5">
                    {country === 'PT' ? 'Sem limites de utilização • Acesso prioritário' : 'Sem limites de uso • Acesso prioritário'}
                  </p>
                </div>

                <div className="space-y-2 pt-2.5 border-t border-[#2E3C2B]/10 text-xs text-[#2E3C2B]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>{country === 'PT' ? 'Utentes Ilimitados' : 'Pacientes Ilimitados'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>WhatsApp Véspera (D-1) + Dia (D-0)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span>{country === 'PT' ? 'Ligação do Meet enviada no WhatsApp' : 'Link do Meet enviado no WhatsApp'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>{country === 'PT' ? 'Radar de Ideias Clínicas' : 'Radar de Conteúdo'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span><strong>IA Clínica Ilimitada</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#5F7D5C] shrink-0" strokeWidth={3} />
                    <span>Integração Google Calendar</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => onLogin('ilimitado', country)}
                  className="w-full py-3 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold rounded-xl transition-all shadow-md shadow-[#5F7D5C]/25 text-xs uppercase tracking-wider cursor-pointer"
                >
                  {country === 'PT' ? 'Subscrever Plano Ilimitado' : 'Quero Acesso Ilimitado'}
                </button>
              </div>
            </div>

          </div>

          <div className="bg-white/80 border border-[#2E3C2B]/10 rounded-xl p-3.5 max-w-2xl mx-auto text-left flex items-start gap-2.5 mt-3 shadow-sm">
            <span className="text-sm shrink-0 mt-0.5">⭐</span>
            <p className="text-[11px] sm:text-xs text-[#2E3C2B]/75 leading-relaxed">
              {country === 'PT'
                ? <><strong>No período experimental de 7 dias grátis:</strong> Todas as funcionalidades clínicas, IA e processos clínicos ficam disponíveis para a sua prática diária. O envio automático de mensagens no WhatsApp é ativado após a confirmação da subscrição devido aos requisitos da Meta Cloud API.</>
                : <><strong>No teste de 7 dias grátis:</strong> Todos os recursos clínicos, IA e prontuários ficam liberados para sua prática diária. Os disparos automáticos de WhatsApp são ativados após a confirmação da assinatura devido aos requisitos da Meta Cloud API.</>}
            </p>
          </div>

          <p className="text-center text-[11px] sm:text-xs text-[#2E3C2B]/50 font-medium pt-1">
            {country === 'PT'
              ? '🔒 Pagamentos processados com segurança bancária pela Stripe • Cancele quando quiser'
              : '🔒 Pagamentos processados de forma 100% segura pela Stripe • Cancele quando quiser'}
          </p>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-10 px-4 sm:px-6 border-t border-[#2E3C2B]/10 text-center text-xs text-[#2E3C2B]/60 font-medium relative z-20 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black text-sm text-[#2E3C2B]">Simple<span className="text-[#5F7D5C]">Psi</span></span>
            <span>• © 2026 Todos os direitos reservados.</span>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
            <a 
              href="/privacidade" 
              onClick={handleOpenPrivacy}
              className="text-[#5F7D5C] hover:underline cursor-pointer"
            >
              {country === 'PT' ? 'Política de Privacidade & RGPD' : 'Política de Privacidade & LGPD'}
            </a>
            <span>•</span>
            <span>{country === 'PT' ? 'Conformidade Código Deontológico OPP' : 'Google Cloud Security'}</span>
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
              <p className="text-[10px] font-bold uppercase text-[#5F7D5C]">
                {country === 'PT' ? 'Plano Start Gratuito' : 'Plano Start Grátis'}
              </p>
              <p className="text-sm font-black text-[#2E3C2B]">
                {country === 'PT' ? 'Até 5 utentes • € 0' : 'Até 5 pacientes • R$ 0'}
              </p>
            </div>
            <button 
              onClick={() => handleCheckout(null)}
              className="px-5 py-3 bg-[#5F7D5C] hover:bg-[#4E674C] text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>{country === 'PT' ? 'Começar Grátis' : 'Começar Grátis'}</span>
              <ArrowRight size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
