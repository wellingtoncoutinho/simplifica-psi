import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  resetPassword 
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: 'consultorio' | 'ilimitado' | null;
  country?: 'BR' | 'PT';
  onSuccess?: (plan?: 'consultorio' | 'ilimitado' | null) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  selectedPlan,
  country = 'BR',
  onSuccess
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const getPlanDetails = () => {
    if (selectedPlan === 'consultorio') {
      return {
        title: country === 'PT' ? 'Plano Consultório (€ 19,00/mês)' : 'Plano Consultório (R$ 49,90/mês)',
        desc: country === 'PT'
          ? 'Até 15 utentes, robô de WhatsApp e processos clínicos completos (OPP).'
          : 'Até 15 pacientes, robô de WhatsApp e prontuários completos.'
      };
    }
    if (selectedPlan === 'ilimitado') {
      return {
        title: country === 'PT' ? 'Plano Ilimitado Pro (€ 29,00/mês)' : 'Plano Ilimitado Pro (R$ 79,90/mês)',
        desc: country === 'PT'
          ? 'Utentes e IA ilimitados, robô completo e radar de conteúdo.'
          : 'Pacientes e IA ilimitados, robô completo e radar de conteúdo.'
      };
    }
    return {
      title: 'Acesso SimplePsi',
      desc: country === 'PT'
        ? 'Experimente 7 dias grátis de todos os recursos sem compromisso.'
        : 'Teste 7 dias grátis de todos os recursos sem compromisso.'
    };
  };

  const planInfo = getPlanDetails();

  const parseFirebaseError = (err: any): string => {
    const code = err?.code || '';
    const msg = String(err?.message || '');

    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
      return 'O provedor de E-mail e Senha ainda não está ativado no Firebase Console do projeto. Ative "E-mail/senha" em Authentication > Sign-in method, ou utilize o botão "Continuar com o Google (1 Clique)" acima.';
    }
    if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
      return 'Nenhuma conta encontrada com este e-mail. Que tal criar uma nova?';
    }
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || msg.includes('invalid-credential')) {
      return 'E-mail ou senha incorretos. Verifique seus dados.';
    }
    if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
      return 'Este e-mail já está cadastrado. Alterne para a aba "Fazer Login" logo abaixo.';
    }
    if (code === 'auth/weak-password' || msg.includes('weak-password')) {
      return 'A senha deve conter no mínimo 6 caracteres.';
    }
    if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
      return 'Por favor, insira um endereço de e-mail válido.';
    }
    if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed')) {
      return 'Login com Google cancelado antes da conclusão.';
    }
    if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
      return 'Falha de conexão com os servidores do Firebase. Verifique sua internet.';
    }
    return err?.message || 'Ocorreu um erro ao processar. Tente novamente.';
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (country && selectedPlan) {
        localStorage.setItem('pending_checkout_country', country);
      }
      if (selectedPlan) {
        localStorage.setItem('pending_checkout_plan', selectedPlan);
      }
      await signInWithGoogle();
      onSuccess?.(selectedPlan);
      onClose();
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      setError(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    if (mode === 'forgot') {
      try {
        setIsLoading(true);
        await resetPassword(cleanEmail);
        setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      } catch (err: any) {
        setError(parseFirebaseError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setIsLoading(true);
      if (country && mode === 'register') {
        localStorage.setItem('simplepsi_country', country);
        localStorage.setItem('pending_checkout_country', country);
      } else if (country && selectedPlan) {
        localStorage.setItem('pending_checkout_country', country);
      }
      if (selectedPlan) {
        localStorage.setItem('pending_checkout_plan', selectedPlan);
      }

      if (mode === 'register') {
        await signUpWithEmail(cleanEmail, password, name.trim() || undefined);
      } else {
        await signInWithEmail(cleanEmail, password);
      }

      onSuccess?.(selectedPlan);
      onClose();
    } catch (err: any) {
      console.error('Erro de autenticação por e-mail:', err);
      setError(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl max-w-md w-full border border-[#2E3C2B]/10 shadow-2xl overflow-hidden relative my-6 text-[#2E3C2B]"
        >
          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#2E3C2B]/40 hover:text-[#2E3C2B] hover:bg-black/5 rounded-full transition-colors z-20 cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Cabeçalho */}
          <div className="p-6 sm:p-7 text-center space-y-2 border-b border-[#2E3C2B]/5 bg-[#FAF9F6]">
            {selectedPlan ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5F7D5C]/15 border border-[#5F7D5C]/30 rounded-full text-[11px] font-black text-[#5F7D5C] uppercase tracking-wider">
                <Sparkles size={12} />
                <span>{planInfo.title}</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5F7D5C] bg-[#5F7D5C]/10 py-1 px-3 rounded-full inline-block">
                SimplePsi • Portal Clínico
              </span>
            )}

            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[#2E3C2B]">
              {mode === 'forgot'
                ? 'Recuperar Acesso'
                : mode === 'register'
                ? 'Criar Conta de Psicólogo'
                : 'Acessar sua Conta'}
            </h2>

            <p className="text-xs text-[#2E3C2B]/65 max-w-xs mx-auto leading-relaxed">
              {selectedPlan
                ? 'Entre com sua conta para vincular o plano e prosseguir para a confirmação segura da Stripe.'
                : mode === 'forgot'
                ? 'Digite o e-mail da sua conta para receber instruções de recuperação.'
                : 'Experimente a tecnologia que simplifica a prática clínica ética.'}
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Feedback Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Opção 1: Google 1-Click (Destacado) */}
            {mode !== 'forgot' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-white hover:bg-[#FAF9F6] text-[#2E3C2B] border-2 border-[#2E3C2B]/15 hover:border-[#5F7D5C] rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continuar com o Google (1 Clique)</span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-[#2E3C2B]/10 w-full" />
                  <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[#2E3C2B]/40 absolute">
                    ou com e-mail e senha
                  </span>
                </div>
              </div>
            )}

            {/* Opção 2: Formulário de E-mail e Senha */}
            <form onSubmit={handleSubmitEmail} className="space-y-3.5">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#2E3C2B]/75 block">Nome Completo</label>
                  <div className="relative flex items-center">
                    <User size={15} className="absolute left-3.5 text-[#2E3C2B]/40" />
                    <input
                      type="text"
                      placeholder="Dra. Mariana Alencar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#2E3C2B]/15 rounded-xl text-xs text-[#2E3C2B] placeholder:text-[#2E3C2B]/35 focus:outline-none focus:border-[#5F7D5C] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#2E3C2B]/75 block">E-mail Profissional</label>
                <div className="relative flex items-center">
                  <Mail size={15} className="absolute left-3.5 text-[#2E3C2B]/40" />
                  <input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#2E3C2B]/15 rounded-xl text-xs text-[#2E3C2B] placeholder:text-[#2E3C2B]/35 focus:outline-none focus:border-[#5F7D5C] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#2E3C2B]/75">
                      {country === 'PT' ? 'Palavra-passe' : 'Senha'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                        }}
                        className="text-[10px] font-bold text-[#5F7D5C] hover:underline cursor-pointer"
                      >
                        {country === 'PT' ? 'Esqueceu a palavra-passe?' : 'Esqueceu a senha?'}
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3.5 text-[#2E3C2B]/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[#FAF9F6] border border-[#2E3C2B]/15 rounded-xl text-xs text-[#2E3C2B] placeholder:text-[#2E3C2B]/35 focus:outline-none focus:border-[#5F7D5C] focus:bg-white transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#2E3C2B]/40 hover:text-[#2E3C2B] p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#5F7D5C]/20 hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : mode === 'forgot' ? (
                  <>
                    <span>{country === 'PT' ? 'Enviar Ligação de Recuperação' : 'Enviar Link de Recuperação'}</span>
                    <ArrowRight size={14} />
                  </>
                ) : mode === 'register' ? (
                  <>
                    <span>Criar Minha Conta Grátis</span>
                    <ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    <span>{country === 'PT' ? 'Iniciar Sessão na Plataforma' : 'Entrar na Plataforma'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Alternador de Modo */}
            <div className="pt-2 text-center border-t border-[#2E3C2B]/5 text-xs text-[#2E3C2B]/60">
              {mode === 'login' ? (
                <p>
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="font-bold text-[#5F7D5C] hover:underline cursor-pointer"
                  >
                    {country === 'PT' ? 'Registe-se grátis' : 'Cadastre-se grátis'}
                  </button>
                </p>
              ) : mode === 'register' ? (
                <p>
                  Já possui uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="font-bold text-[#5F7D5C] hover:underline cursor-pointer"
                  >
                    {country === 'PT' ? 'Iniciar sessão' : 'Fazer login'}
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-[#5F7D5C] hover:underline cursor-pointer"
                >
                  {country === 'PT' ? '← Voltar para Iniciar Sessão' : '← Voltar para o Login'}
                </button>
              )}
            </div>

            {/* Rodapé de Segurança */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-[#2E3C2B]/50 font-semibold pt-1">
              <ShieldCheck size={14} className="text-[#5F7D5C]" />
              <span>
                {country === 'PT'
                  ? 'Conformidade com OPP & RGPD (UE 2016/679) • Dados Encriptados'
                  : 'Conformidade com CFP & LGPD • Dados Criptografados'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
