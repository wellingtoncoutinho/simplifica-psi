import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, Lock } from 'lucide-react';

interface OrganicHeroStageProps {
  onLogin: (plan?: 'consultorio' | 'ilimitado' | null) => void;
  scrollToPlans: () => void;
  country?: 'BR' | 'PT';
}

const dynamicPhrasesBR = [
  "mais presença em cada sessão.",
  "evoluções prontas em 15 segundos.",
  "prontuários em 1 clique.",
  "tempo livre além do consultório."
];

const dynamicPhrasesPT = [
  "mais presença em cada consulta.",
  "registos prontos em 15 segundos.",
  "processos clínicos num clique.",
  "tempo livre além do consultório."
];

// Smooth cubic easing helper
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const getProgress = (val: number, start: number, end: number) => {
  if (val <= start) return 0;
  if (val >= end) return 1;
  return easeOutCubic((val - start) / (end - start));
};

export default function OrganicHeroStage({ 
  onLogin, 
  scrollToPlans,
  country = 'BR'
}: OrganicHeroStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const dynamicPhrases = country === 'PT' ? dynamicPhrasesPT : dynamicPhrasesBR;
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // Keep mobile detection updated with window resizing
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cycle dynamic subtitle phrase smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % dynamicPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [dynamicPhrases.length]);

  // Monitor scroll progression through the pinned container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Responsive spring physics for liquid smoothness
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 85,
    damping: 20,
    restDelta: 0.001
  });

  // ========================================================
  // RESPONSIVE SCROLL CHOREOGRAPHY (MOBILE & DESKTOP DUAL MODE)
  // ========================================================

  // Logo & Bubble Horizontal Shift (X)
  const logoX = useTransform(smoothProgress, (val) => {
    if (isMobile) return 0;
    const p = getProgress(val, 0.08, 0.65);
    const maxX = typeof window !== 'undefined' ? Math.min(320, window.innerWidth * 0.24) : 280;
    return p * maxX;
  });

  // Logo & Bubble Vertical Shift (Y)
  const logoY = useTransform(smoothProgress, (val) => {
    const p = getProgress(val, 0.08, 0.65);
    if (isMobile) {
      // Mobile: smoothly glide UP to the upper third of screen
      const targetY = typeof window !== 'undefined' ? Math.max(-145, -window.innerHeight * 0.19) : -135;
      return p * targetY;
    }
    return 0;
  });

  // Logo & Bubble Scale
  const logoScale = useTransform(smoothProgress, (val) => {
    const p = getProgress(val, 0.05, 0.65);
    if (isMobile) {
      // Mobile: shrink from 0.95 down to 0.48 (giving generous room for the text)
      return 0.95 - p * 0.47;
    }
    // Desktop: settle smoothly from 1.12 to 0.98
    return 1.12 - p * 0.14;
  });

  // Full 360-degree rotation on scroll
  const logoRotate = useTransform(smoothProgress, (val) => {
    const p = getProgress(val, 0.06, 0.70);
    return p * 360;
  });

  // Center Splash Subtitle Opacity & Dynamic Vertical Position
  const splashSubOpacity = useTransform(smoothProgress, (val) => {
    if (val <= 0.02) return 1;
    if (val >= 0.14) return 0;
    return 1 - (val - 0.02) / (0.14 - 0.02);
  });

  const splashSubY = useTransform(smoothProgress, (val) => {
    const p = getProgress(val, 0.02, 0.14);
    // Base Y offset calibrated cleanly below bubble:
    // On mobile: 112px (below 92px bubble radius)
    // On desktop: 175px (below 160px bubble radius, leaving 65px+ gap before scroll cue)
    const baseY = isMobile ? 112 : 175;
    return baseY - p * 14;
  });

  // Bottom Scroll Cue Opacity
  const scrollCueOpacity = useTransform(smoothProgress, (val) => {
    if (val <= 0.03) return 1;
    if (val >= 0.16) return 0;
    return 1 - (val - 0.03) / (0.16 - 0.03);
  });

  // Main Text Content Opacity
  const textOpacity = useTransform(smoothProgress, (val) => {
    if (val <= 0.22) return 0;
    if (val >= 0.62) return 1;
    return getProgress(val, 0.22, 0.62);
  });

  // Main Text Content Slide (X for desktop, Y for mobile)
  const textX = useTransform(smoothProgress, (val) => {
    if (isMobile) return 0;
    const p = getProgress(val, 0.22, 0.62);
    return (1 - p) * -40;
  });

  const textY = useTransform(smoothProgress, (val) => {
    if (!isMobile) return 0;
    const p = getProgress(val, 0.22, 0.62);
    return (1 - p) * 35;
  });

  // Track if text is visible enough to allow click interactions
  const [hasTextAppeared, setHasTextAppeared] = useState(false);
  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (latest) => {
      setHasTextAppeared(latest >= 0.25);
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  const handleScrollClick = () => {
    if (containerRef.current) {
      const targetY = containerRef.current.offsetTop + window.innerHeight * 0.95;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative h-[260vh] sm:h-[280vh] w-full bg-[#FAF9F6] text-[#2E3C2B] select-none"
    >
      {/* Sticky Viewport - locks 100% until animation completes */}
      <div className="sticky top-0 h-screen min-h-[100dvh] w-full overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative z-20">
        
        {/* ========================================================
            TOP FLOATING NAVBAR (WITH REAL LOGO)
            ======================================================== */}
        <header className="relative z-40 flex items-center justify-between w-full max-w-6xl mx-auto pt-1 sm:pt-2">
          {/* Logo brand with exact original silhouette */}
          <a href="#" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#2E3C2B]/10 shadow-sm flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              <img 
                src="/logo_clean_silhouette.png" 
                alt="SimplePsi" 
                className="w-full h-full object-contain pointer-events-none select-none" 
              />
            </div>
            <span className="font-serif font-black text-lg sm:text-xl tracking-tight text-[#2E3C2B]">
              Simple<span className="text-[#5F7D5C]">Psi</span>
            </span>
          </a>

          {/* Minimal Navigation Links (desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-[#2E3C2B]/5 p-1 rounded-full border border-[#2E3C2B]/5 text-xs font-bold text-[#2E3C2B]/75">
            <a href="#google-meet" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">Recursos</a>
            <a href="#modulos" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">Abordagens</a>
            <a href="#area-paciente" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">{country === 'PT' ? 'Portal do Utente' : 'Portal'}</a>
            <a href="#planos" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">Preços</a>
            <a href="#faq" className="px-4 py-1.5 rounded-full hover:bg-white hover:text-[#5F7D5C] transition-all">{country === 'PT' ? 'Perguntas Frequentes' : 'Dúvidas'}</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={() => onLogin(null)}
              className="text-xs font-bold text-[#2E3C2B]/80 hover:text-[#5F7D5C] px-2 sm:px-3 py-2 transition-colors cursor-pointer hidden sm:block"
            >
              {country === 'PT' ? 'Iniciar Sessão' : 'Entrar'}
            </button>
            <button
              onClick={() => onLogin(null)}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold text-xs rounded-full transition-all shadow-md shadow-[#5F7D5C]/20 hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
            >
              <span>{country === 'PT' ? 'Começar Grátis' : 'Iniciar Grátis'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </header>

        {/* ========================================================
            STAGE CENTER AREA: BALANCED MOBILE & DESKTOP CHOREOGRAPHY
            ======================================================== */}
        <div className="relative z-20 flex-1 w-full max-w-6xl mx-auto flex items-center justify-center px-4">
          
          {/* =======================================================
              1. THE COMBINED LOGO & ORGANIC BUBBLE UNIT
              ======================================================= */}
          <motion.div
            style={{
              x: logoX,
              y: logoY,
              scale: logoScale
            }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            {/* Organic Gradient Bubble in background (dead centered at 0,0) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Soft Ambient Glow (Sage green & eucalyptus dominant) */}
              <div 
                className="w-[200px] sm:w-[280px] lg:w-[340px] h-[200px] sm:h-[280px] lg:h-[340px] rounded-[48%] bg-gradient-to-tr from-[#5F7D5C]/65 via-[#8AA682]/60 via-[#A3C99F]/50 to-[#C084FC]/30 filter blur-[35px] sm:blur-[50px] animate-morph-blob opacity-85"
              />

              {/* Defined Glassmorphic Border Bubble */}
              <div 
                className="absolute w-[185px] sm:w-[260px] lg:w-[320px] h-[185px] sm:h-[260px] lg:h-[320px] rounded-[46%_54%_63%_37%/43%_41%_59%_57%] bg-gradient-to-br from-[#8AA682]/50 via-[#5F7D5C]/45 via-[#A3C99F]/40 to-[#DDD6FE]/25 backdrop-blur-xl border-2 border-white/80 shadow-[0_20px_60px_rgba(95,125,92,0.22)] animate-morph-blob-reverse"
              />

              {/* Inner Radiant Accent Ring */}
              <div 
                className="absolute w-[150px] sm:w-[210px] lg:w-[265px] h-[150px] sm:h-[210px] lg:h-[265px] rounded-[52%_48%_38%_62%/58%_52%_48%_42%] border border-white/60 bg-gradient-to-tr from-white/30 via-transparent to-[#8AA682]/20 animate-morph-blob opacity-80"
              />
            </div>

            {/* Rotating Logo Silhouette (DEAD CENTER of the bubble!) */}
            <motion.div
              style={{ rotate: logoRotate }}
              className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 lg:w-48 lg:h-48 flex items-center justify-center pointer-events-auto cursor-pointer group select-none"
            >
              <img 
                src="/logo_clean_silhouette.png" 
                alt="SimplePsi Logo" 
                className="w-full h-full object-contain filter drop-shadow-[0_16px_32px_rgba(49,59,61,0.2)] select-none pointer-events-none"
                draggable={false}
              />
            </motion.div>

            {/* Initial Center Subtitle (Positioned below the bubble, completely outside the drawing and above scroll cue!) */}
            <motion.div
              style={{
                opacity: splashSubOpacity,
                y: splashSubY
              }}
              className="absolute text-center whitespace-nowrap pointer-events-none select-none z-20"
            >
              <h2 className="text-xl sm:text-2xl font-serif font-black text-[#2E3C2B] tracking-tight">
                Simple<span className="text-[#5F7D5C]">Psi</span>
              </h2>
              <p className="text-[11px] sm:text-xs font-bold text-[#2E3C2B]/60 mt-0.5 tracking-wide">
                {country === 'PT' ? 'A sua gestão clínica inteligente' : 'Sua gestão clínica inteligente'}
              </p>
            </motion.div>
          </motion.div>

          {/* =======================================================
              2. THE REVEALED TEXT CONTENT
              - On Mobile: positioned comfortably below the shrunken logo
              - On Desktop: positioned on the left side of the stage
              ======================================================= */}
          <motion.div
            style={{
              opacity: textOpacity,
              x: textX,
              y: textY
            }}
            className={`absolute z-20 w-full max-w-lg lg:max-w-xl transition-all ${
              hasTextAppeared ? 'pointer-events-auto' : 'pointer-events-none'
            } ${
              isMobile
                ? 'top-[44%] left-0 right-0 mx-auto px-4 text-center space-y-2 sm:space-y-3'
                : 'top-1/2 -translate-y-1/2 left-4 lg:left-8 text-left space-y-4 lg:space-y-5'
            }`}
          >
            {/* Pill Badge */}
            <div className="flex justify-center lg:justify-start">
              <button
                onClick={() => onLogin(null)}
                className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 bg-white border border-[#5F7D5C]/25 rounded-full text-[11px] sm:text-xs font-bold text-[#2E3C2B] shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <span className="w-2 h-2 rounded-full bg-[#5F7D5C] animate-pulse" />
                <span className="text-[#5F7D5C] font-black">
                  {country === 'PT' ? 'Experimente 7 dias grátis' : 'Teste 7 dias grátis'}
                </span>
                <span className="text-[#2E3C2B]/30">•</span>
                <span className="text-[#2E3C2B]/75 font-medium">Sem cartão</span>
                <ArrowRight size={12} className="text-[#5F7D5C] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Headline with Balanced Proportions */}
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[44px] font-sans font-black tracking-tight text-[#2E3C2B] leading-[1.15]">
                {country === 'PT' ? 'Transforme a sua prática clínica em' : 'Transforme sua clínica em'}
              </h1>
              
              {/* Cycling Dynamic Line in Sage Green */}
              <div className="min-h-[36px] sm:min-h-[44px] lg:min-h-[54px] flex items-center justify-center lg:justify-start">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPhraseIndex}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="text-xl sm:text-2xl md:text-3xl lg:text-[44px] font-sans font-black tracking-tight text-[#5F7D5C] leading-[1.15]"
                  >
                    {dynamicPhrases[currentPhraseIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Direct, Streamlined Subtitle */}
            <p className="text-xs sm:text-sm lg:text-base text-[#2E3C2B]/70 font-medium leading-relaxed max-w-sm sm:max-w-md lg:max-w-lg mx-auto lg:mx-0">
              {country === 'PT'
                ? <>Agenda inteligente, processos clínicos por abordagem teórica e transcrição do <strong>Google Meet</strong> num só ecossistema.</>
                : <>Agenda inteligente, prontuários por abordagem teórica e transcrição do <strong>Google Meet</strong> num só lugar.</>}
            </p>

            {/* CTAs (Compact & Responsive) */}
            <div className="flex flex-row items-center justify-center lg:justify-start gap-2 sm:gap-3 pt-0.5">
              <button
                onClick={() => onLogin(null)}
                className="px-5 sm:px-7 py-2.5 sm:py-3.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold text-xs sm:text-sm rounded-full shadow-md shadow-[#5F7D5C]/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{country === 'PT' ? 'Começar Gratuitamente' : 'Começar Agora'}</span>
                <ArrowRight size={13} />
              </button>

              <button
                onClick={scrollToPlans}
                className="px-4 sm:px-6 py-2.5 sm:py-3.5 bg-white hover:bg-[#2E3C2B]/5 text-[#2E3C2B] border border-[#2E3C2B]/15 font-bold text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
              >
                <Sparkles size={12} className="text-[#5F7D5C]" />
                <span>Ver os Planos</span>
              </button>
            </div>

            {/* Trust Line */}
            <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[10px] sm:text-xs text-[#2E3C2B]/60 font-semibold pt-0.5">
              <Lock size={11} className="text-[#5F7D5C]" />
              <span>
                {country === 'PT'
                  ? 'Padrão deontológico OPP & RGPD • Cancele quando quiser'
                  : 'Padrão ético CFP & LGPD • Cancele quando quiser'}
              </span>
            </div>
          </motion.div>

        </div>

        {/* ========================================================
            BOTTOM SCROLL CUE (INVITING THE USER TO SCROLL)
            ======================================================== */}
        <motion.div
          style={{ opacity: scrollCueOpacity }}
          className="relative z-30 pb-2 sm:pb-3 flex flex-col items-center justify-center cursor-pointer group"
          onClick={handleScrollClick}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#2E3C2B]/50 group-hover:text-[#5F7D5C] transition-colors">
              {country === 'PT' ? 'Deslize para descobrir' : 'Role para descobrir'}
            </span>
            <div className="w-4 sm:w-5 h-7 sm:h-8 rounded-full border-2 border-[#2E3C2B]/20 flex items-start justify-center p-1 group-hover:border-[#5F7D5C] transition-colors">
              <motion.div 
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full bg-[#5F7D5C]"
              />
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
