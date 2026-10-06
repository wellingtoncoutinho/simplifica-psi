import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Chrome, X, CheckCircle2, Copy, AlertTriangle, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

export const CHROME_EXTENSION_STORE_URL = "https://chromewebstore.google.com/detail/lboplfocolmhdfkkabecjkmlneeffafc?utm_source=item-share-cb";

interface GoogleMeetExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasAccepted: boolean;
  onAccept: () => void;
  country?: 'BR' | 'PT';
}

export const TCLE_TEMPLATE_TEXT_BR = `TERMO DE CONSENTIMENTO PARA TRANSCRIÇÃO DE SESSÃO

Eu autorizo o(a) psicólogo(a) a realizar a transcrição automatizada em tempo real dos diálogos ocorridos em nossas sessões online. Compreendo que esta transcrição é de uso estritamente terapêutico e confidencial, servindo unicamente de base para a elaboração de prontuários clínicos protegidos por criptografia na plataforma Simple Psi, em conformidade com o Código de Ética do CFP e com a Lei Geral de Proteção de Dados (LGPD). A transcrição bruta é processada localmente no navegador do profissional e deletada após a consolidação do prontuário pela IA.`;

export const TCLE_TEMPLATE_TEXT_PT = `TERMO DE CONSENTIMENTO PARA TRANSCRIÇÃO DE CONSULTA PSICOLÓGICA

Eu autorizo o(a) psicólogo(a) a realizar a transcrição automatizada em tempo real dos diálogos decorridos nas nossas consultas online. Compreendo que esta transcrição é de uso estritamente terapêutico e confidencial, servindo unicamente de base para a elaboração de processos clínicos protegidos por encriptação na plataforma SimplePsi, em estrita conformidade com o Código Deontológico da Ordem dos Psicólogos Portugueses (OPP) e com o Regulamento Geral sobre a Proteção de Dados (RGPD - Regulamento UE 2016/679). A transcrição bruta é processada localmente no navegador do profissional e eliminada de imediato após a consolidação do registo clínico pela IA.`;

export const TCLE_TEMPLATE_TEXT = TCLE_TEMPLATE_TEXT_BR;

export function GoogleMeetExtensionModal({
  isOpen,
  onClose,
  hasAccepted,
  onAccept,
  country
}: GoogleMeetExtensionModalProps) {
  const [tempCheckedTerms, setTempCheckedTerms] = useState(hasAccepted);
  const [copiedTcle, setCopiedTcle] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  const isPT = country ? country === 'PT' : (typeof window !== 'undefined' && (
    localStorage.getItem('prof_country') === 'PT' || 
    (localStorage.getItem('simplepsi_country') === 'PT' && !localStorage.getItem('prof_crp')) || 
    window.location.pathname.startsWith('/pt')
  ));

  const activeTcle = isPT ? TCLE_TEMPLATE_TEXT_PT : TCLE_TEMPLATE_TEXT_BR;

  if (!isOpen) return null;

  const handleCopyTcle = () => {
    navigator.clipboard.writeText(activeTcle);
    setCopiedTcle(true);
    setTimeout(() => setCopiedTcle(false), 2500);
  };

  const handleConfirmAndActivate = () => {
    localStorage.setItem("simplepsi_meet_extension_consent", "true");
    onAccept();
    setJustActivated(true);
    window.open(CHROME_EXTENSION_STORE_URL, "_blank", "noopener,noreferrer");
  };

  const handleOpenStoreDirectly = () => {
    window.open(CHROME_EXTENSION_STORE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card w-full max-w-2xl bg-card border border-primary/20 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 text-left"
        >
          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-muted transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>

          {/* Cabeçalho */}
          <div className="flex items-center gap-4 border-b border-white/5 pb-5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-lg shadow-primary/10">
              <Chrome size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-text-main">Extensão Oficial do Google Meet</h3>
                <span className="text-[10px] bg-primary/15 text-primary border border-primary/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Chrome Web Store
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {isPT
                  ? "Transcreva consultas online com confidencialidade e gere registos clínicos automáticos com IA."
                  : "Transcreva teleconsultas com segurança e gere relatos clínicos automáticos com IA."}
              </p>
            </div>
          </div>

          {/* Conteúdo com Scroll Suave */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar text-xs leading-relaxed text-text-main">
            
            {/* Se acabou de ativar ou já ativou, mostra banner de sucesso/acesso rápido à loja */}
            {(hasAccepted || justActivated) && (
              <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                  <div>
                    <p className="font-bold text-green-400 text-xs uppercase tracking-wide">
                      {isPT ? "Extensão Ativada & Termos Aceites" : "Extensão Ativada & Termos Aceitos"}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {isPT
                        ? "Já aceitou o termo deontológico. Caso precise de instalar ou atualizar no Chrome, utilize a ligação abaixo."
                        : "Você já aceitou o termo ético. Caso precise instalar ou atualizar no Chrome, use o link abaixo."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenStoreDirectly}
                  className="w-full sm:w-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 shrink-0 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  Abrir Chrome Store
                </button>
              </div>
            )}

            {/* 1. LGPD / RGPD e Privacidade */}
            <div className="bg-surface-muted/60 border border-border-ui rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-primary flex items-center gap-2 text-xs">
                <ShieldCheck size={16} /> {isPT ? "Processamento 100% Local e Seguro (RGPD)" : "Processamento 100% Local e Seguro (LGPD)"}
              </h4>
              <p className="text-text-muted text-[11.5px] leading-relaxed">
                {isPT ? (
                  <>A nossa extensão oficial capta exclusivamente as <strong>legendas em tempo real</strong> do seu Google Meet e processa-as de forma encriptada no seu navegador local. <strong>Nenhum ficheiro de áudio ou vídeo é gravado ou transmitido para servidores externos</strong>, assegurando integralmente o sigilo profissional da OPP.</>
                ) : (
                  <>Nossa extensão oficial captura exclusivamente as <strong>legendas em tempo real</strong> do seu Google Meet e as envia de forma criptografada apenas para o seu navegador local. <strong>Nenhum arquivo de áudio ou vídeo é gravado ou transmitido para servidores externos</strong>, preservando integralmente o sigilo profissional.</>
                )}
              </p>
            </div>

            {/* 2. ALERTA OBRIGATÓRIO DE LEGENDAS */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <AlertTriangle size={17} className="shrink-0" />
                <span>⭐ REQUISITO OBRIGATÓRIO: Legendas do Google Meet</span>
              </div>
              <p className="text-amber-200 text-[11.5px] leading-relaxed">
                {isPT
                  ? "A tecnologia da extensão lê os diálogos através das legendas (Closed Captions / CC) geradas pelo Google Meet. Para que a extensão transcreva a sua consulta:"
                  : "A tecnologia da extensão lê os diálogos através das legendas (Closed Captions / CC) geradas nativamente pelo Google Meet. Para que a extensão transcreva a sua consulta:"}
              </p>
              <ul className="text-amber-100 text-[11px] space-y-1.5 list-disc list-inside font-medium bg-black/20 p-3 rounded-xl border border-amber-500/20">
                <li>
                  <strong className="text-amber-300">{isPT ? "A legenda do Google Meet NÃO PODE ser desligada" : "A legenda do Google Meet NÃO PODE ser desativada"}</strong> durante a chamada online.
                </li>
                <li>
                  {isPT ? (
                    <>Certifique-se de que o idioma da legenda no Google Meet está definido em <strong className="text-amber-300">Português</strong>.</>
                  ) : (
                    <>Certifique-se de que o idioma da legenda no Google Meet está definido em <strong className="text-amber-300">Português (Brasil)</strong>.</>
                  )}
                </li>
                <li>
                  <em>{isPT ? "Nota útil:" : "Dica visual:"}</em> {isPT ? "A extensão pode ocultar o texto das legendas no seu ecrã para não perturbar a visualização, mas a funcionalidade de legendas do Meet deve permanecer ligada." : "A extensão pode ocultar o texto das legendas na sua tela para não atrapalhar seu campo de visão, mas o botão de legenda do Meet deve permanecer ligado."}
                </li>
              </ul>
            </div>

            {/* 3. ALERTA ÉTICO / DEONTOLÓGICO */}
            <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-red-400 flex items-center gap-2 text-xs">
                ⚖️ {isPT ? "Conformidade Deontológica e Legal do Consentimento (OPP & RGPD)" : "Obrigatoriedade Ética e Legal do Consentimento (CFP & LGPD)"}
              </h4>
              <p className="text-red-300 text-[11px] leading-relaxed">
                {isPT
                  ? "Em conformidade com o RGPD e o Código Deontológico da Ordem dos Psicólogos Portugueses (OPP), é dever do profissional de psicologia recolher o consentimento informado prévio e expresso do utente antes de utilizar transcrição ou ferramentas digitais de apoio ao processo clínico."
                  : "De acordo com as normas da LGPD e do Código de Ética do CFP (Resolução nº 004/2020), é expressamente obrigatório que o profissional de psicologia obtenha o consentimento prévio e expresso do paciente antes de realizar qualquer registro, transcrição ou automatização clínica."}
              </p>
              <p className="text-red-300 text-[10.5px] font-bold">
                {isPT
                  ? "O SimplePsi atua exclusivamente como operador tecnológico local. O profissional assume a responsabilidade deontológica pelo cumprimento das obrigações de consentimento junto do utente."
                  : "O SimplePsi atua estritamente como operador da tecnologia de apoio. Nós nos eximimos integralmente de qualquer responsabilidade ética, jurídica ou civil decorrente do uso desta extensão sem a documentada autorização do paciente."}
              </p>
            </div>

            {/* 4. MODELO DE TCLE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                  {isPT ? "Modelo de Consentimento Informado (Copiar para o Utente)" : "Modelo de Consentimento Clínico (TCLE para Copiar)"}
                </label>
                <button
                  type="button"
                  onClick={handleCopyTcle}
                  className="flex items-center gap-1.5 text-[11px] text-primary hover:underline font-bold transition-all cursor-pointer"
                >
                  {copiedTcle ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
                  {copiedTcle ? (isPT ? "Termo Copiado!" : "Termo Copiado com Sucesso!") : (isPT ? "Copiar Minuta de Termo" : "Copiar Modelo de Termo")}
                </button>
              </div>
              <div className="bg-surface-muted/50 border border-border-ui rounded-xl p-3 text-[10.5px] text-text-muted select-all font-mono leading-relaxed max-h-[110px] overflow-y-auto">
                {activeTcle}
              </div>
            </div>

            {/* 5. PASSO A PASSO OFICIAL DA CHROME WEB STORE */}
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={15} /> {isPT ? "Como Utilizar a Extensão no seu Dia a Dia (3 Passos)" : "Como Usar a Extensão no seu Dia a Dia (3 Passos)"}
              </h4>
              <ol className="list-decimal pl-4 space-y-2 text-[11.5px] text-text-muted leading-relaxed">
                <li>
                  <strong>{isPT ? "Instale a partir da Chrome Web Store:" : "Instale na Loja do Chrome:"}</strong> {isPT ? <>Ao carregar no botão abaixo, a página oficial da Chrome Web Store abre-se. Clique em <strong className="text-text-main">"Usar no Chrome"</strong> (ou <em>"Adicionar ao Chrome"</em>).</> : <>Ao clicar no botão abaixo, a página oficial da Chrome Web Store será aberta. Clique em <strong className="text-text-main">"Usar no Chrome"</strong> (ou <em>"Adicionar ao Chrome"</em>).</>}
                </li>
                <li>
                  <strong>{isPT ? "Fixe o ícone no navegador:" : "Fixe o ícone no navegador:"}</strong> {isPT ? <>No canto superior direito do Chrome, clique no ícone do puzzle 🧩 e depois no alfinete 📌 junto a <strong className="text-text-main">Simple Psi - Google Meet CC Recorder</strong>.</> : <>No canto superior direito do Chrome, clique no ícone do quebra-cabeça 🧩 e depois no alfinete 📌 ao lado de <strong className="text-text-main">Simple Psi - Google Meet CC Recorder</strong>.</>}
                </li>
                <li>
                  <strong>{isPT ? "Realize a consulta com legendas ativas:" : "Atenda com Legendas Ativadas:"}</strong> {isPT ? <>Ao entrar na sala do Google Meet, confirme que as legendas em Português estão ligadas. Ao terminar a consulta, carregue em <strong className="text-text-main">"Terminar Chamada"</strong> ou na janela da extensão clique em <strong className="text-text-main">"🚀 Enviar para o Simple Psi"</strong> para gerar de imediato o registo clínico com IA!</> : <>Ao abrir a sala do Google Meet, certifique-se de que as legendas em Português estão ativas. Ao encerrar a sessão, clique em <strong className="text-text-main">"Encerrar Chamada"</strong> ou no popup da extensão clique em <strong className="text-text-main">"🚀 Enviar para o Simple Psi"</strong> para gerar a evolução imediata com IA!</>}
                </li>
              </ol>
            </div>

            {/* 6. Checkbox de Aceite */}
            <label className="flex items-start gap-3 p-3.5 bg-primary/5 border border-primary/20 rounded-2xl cursor-pointer select-none hover:bg-primary/10 transition-colors">
              <input
                type="checkbox"
                checked={tempCheckedTerms}
                onChange={(e) => setTempCheckedTerms(e.target.checked)}
                className="mt-0.5 rounded border-border-ui text-primary focus:ring-primary bg-surface-muted h-4 w-4 shrink-0 cursor-pointer"
              />
              <div className="text-left space-y-0.5">
                <span className="font-bold text-[11.5px] text-text-main block">
                  {isPT ? "Declaro-me Ciente e Responsável" : "Declaro-me Ciente e Responsável"}
                </span>
                <span className="text-[10.5px] text-text-muted block leading-relaxed">
                  {isPT
                    ? "Declaro que recolhi ou recolherei o consentimento informado do utente para a realização da transcrição e que o SimplePsi funciona estritamente como operador tecnológico local."
                    : "Declaro que obtive/obterei o consentimento prévio do paciente para a realização de transcrições e que o SimplePsi atua estritamente como operador da tecnologia local, eximindo-se de qualquer responsabilidade pela ausência deste aceite."}
                </span>
              </div>
            </label>
          </div>

          {/* Botões de Rodapé */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="sm:w-32 bg-surface-muted text-text-muted hover:text-text-main py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={!tempCheckedTerms}
              onClick={handleConfirmAndActivate}
              className={`flex-1 py-3.5 px-6 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tempCheckedTerms
                  ? "bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.99]"
                  : "bg-surface-muted text-text-muted cursor-not-allowed opacity-50"
              }`}
            >
              <Chrome size={16} />
              {hasAccepted 
                ? (isPT ? "Aceder à Loja do Chrome & Reinstalar ↗" : "Acessar Loja do Chrome & Reinstalar ↗")
                : (isPT ? "Confirmar e Instalar no Chrome ↗" : "Confirmar e Instalar no Chrome ↗")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
