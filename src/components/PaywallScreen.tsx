import React from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Check, 
  HelpCircle, 
  LogOut, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface PaywallScreenProps {
  email: string;
  checkoutUrl?: string;
  onSignOut: () => void;
}

export default function PaywallScreen({ 
  email, 
  checkoutUrl = 'https://pay.hotmart.com/P105903618L', 
  onSignOut 
}: PaywallScreenProps) {
  
  const benefits = [
    { title: "Acesso Vitalício Garantido", desc: "Faça um único pagamento e use para sempre. Sem mensalidades." },
    { title: "Inteligência Artificial por Abordagem", desc: "Gere evoluções e prontuários estruturados na linguagem técnica da sua linha clínica." },
    { title: "Sincronização com Google Agenda", desc: "Seus atendimentos integrados automaticamente no calendário oficial do celular." },
    { title: "Controle Financeiro Descomplicado", desc: "Acompanhe faturamento, receitas e despesas de forma visual e rápida." },
    { title: "Segurança CFP & LGPD", desc: "Criptografia avançada para blindar o sigilo profissional de seus pacientes." }
  ];

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-[#2E3C2B] font-sans antialiased overflow-y-auto relative flex items-center justify-center p-4 sm:p-6 selection:bg-[#5F7D5C]/20">
      
      {/* Background Glowing Orbs (Premium look matching landing page) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(95,125,92,0.15)_0%,transparent_70%)]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(179,109,83,0.1)_0%,transparent_70%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-2xl w-full bg-white border border-[#2E3C2B]/10 rounded-[32px] shadow-2xl relative z-10 overflow-hidden"
      >
        {/* Banner de Alerta superior */}
        <div className="w-full bg-[#5F7D5C] text-white py-3 px-6 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <Lock size={14} className="animate-pulse" />
          <span>Período de Testes Encerrado</span>
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          
          {/* Cabeçalho */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border border-[#2E3C2B]/5 flex items-center justify-center bg-white">
              <img src="/apple-touch-icon.png" alt="SimplePsi Logo" className="w-full h-full object-cover" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight leading-tight">
              Obrigado por experimentar o <span className="text-[#5F7D5C]">SimplePsi</span>!
            </h2>
            <p className="text-sm text-[#2E3C2B]/70 max-w-md">
              Os seus 7 dias de avaliação gratuita terminaram para a conta <strong className="text-[#2E3C2B] font-bold">{email}</strong>. Adquira sua licença vitalícia para continuar organizando seu consultório.
            </p>
          </div>

          {/* Grid de Benefícios */}
          <div className="bg-[#EFECE6]/35 border border-[#2E3C2B]/5 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#5F7D5C] flex items-center gap-1.5">
              <Sparkles size={14} className="fill-[#5F7D5C]/20" />
              O que está incluso na licença vitalícia:
            </h3>
            
            <div className="space-y-3.5">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#5F7D5C]/10 flex items-center justify-center text-[#5F7D5C] shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2E3C2B]">{b.title}</h4>
                    <p className="text-[11px] text-[#2E3C2B]/60 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco de Preço e Ação Principal */}
          <div className="space-y-4">
            <div className="bg-[#FAF9F6] border border-[#2E3C2B]/5 rounded-2xl p-5 text-center space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F7D5C]">Investimento Único Vitalício</span>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-xs text-[#2E3C2B]/60">12x de</span>
                <span className="text-3xl font-serif font-black text-[#5F7D5C]">R$ 30,72</span>
              </div>
              <p className="text-[10px] font-bold text-[#2E3C2B]/60 uppercase tracking-widest">ou R$ 297,00 à vista • Sem mensalidades</p>
            </div>

            <a 
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-[#FAF9F6] font-bold rounded-2xl transition-all shadow-xl shadow-[#5F7D5C]/20 hover:scale-[1.02] flex items-center justify-center gap-3 text-sm uppercase tracking-widest select-none"
            >
              <span>Destravar Acesso Vitalício</span>
              <ArrowRight size={16} />
            </a>
          </div>

          {/* Ações Secundárias e Rodapé */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#2E3C2B]/5 text-xs text-[#2E3C2B]/60">
            <a 
              href="https://wa.me/5562983208784"
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-[#5F7D5C] transition-colors font-semibold"
            >
              <HelpCircle size={15} />
              <span>Já comprei e continuo travado? Fale conosco</span>
            </a>

            <button 
              onClick={onSignOut}
              className="flex items-center gap-1.5 hover:text-red-500 transition-colors font-semibold py-1 px-3 bg-[#2E3C2B]/5 hover:bg-red-500/10 rounded-lg"
            >
              <LogOut size={14} />
              <span>Sair da Conta</span>
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
