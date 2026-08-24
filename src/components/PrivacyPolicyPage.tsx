import React from "react";
import { Shield, Lock, ArrowLeft, CheckCircle2, Chrome } from "lucide-react";

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2E3C2B] font-sans antialiased selection:bg-[#5F7D5C]/20">
      {/* Header Bar */}
      <header className="border-b border-[#2E3C2B]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-[#2E3C2B]/10 flex items-center justify-center bg-white">
              <img src="/apple-touch-icon.png" alt="SimplePsi Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif font-black text-lg text-[#2E3C2B]">
              Simple<span className="text-[#5F7D5C]">Psi</span>
            </span>
          </div>

          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#5F7D5C] hover:text-[#4E674C] hover:bg-[#5F7D5C]/10 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={14} /> Voltar ao Início
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Title Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-full text-xs font-bold uppercase tracking-widest text-[#5F7D5C]">
            <Shield size={14} /> Política de Privacidade & Segurança
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-[#2E3C2B] tracking-tight">
            Compromisso com o Sigilo Profissional e a LGPD
          </h1>
          <p className="text-xs sm:text-sm text-[#2E3C2B]/70 leading-relaxed font-medium">
            Última atualização: 24 de agosto de 2026 • Em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e as resoluções do Conselho Federal de Psicologia (CFP).
          </p>
        </div>

        {/* Highlight Banner */}
        <div className="bg-[#5F7D5C]/10 border border-[#5F7D5C]/20 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5F7D5C] text-white flex items-center justify-center shadow-md shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2E3C2B]">Seus dados clínicos pertencem exclusivamente a você</h3>
              <p className="text-xs text-[#2E3C2B]/70">Nenhum dado de prontuário, anotação ou evolução é compartilhado, vendido ou utilizado para fins comerciais ou publicitários.</p>
            </div>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="bg-white border border-[#2E3C2B]/10 rounded-3xl p-8 sm:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-[#2E3C2B]/85">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-[#2E3C2B] flex items-center gap-2">
              <span className="text-[#5F7D5C]">1.</span> Sobre a Plataforma SimplePsi
            </h2>
            <p>
              O <strong>SimplePsi</strong> é uma plataforma de gestão clínica, organização documental e auxílio na elaboração de registros psicológicos voltada a psicólogos, psicanalistas e profissionais de saúde mental devidamente habilitados.
            </p>
            <p>
              Reconhecemos a natureza altamente sensível dos registros psicológicos e pautamos nossa arquitetura técnica na garantia irrestrita do <strong>sigilo profissional</strong> estabelecido pelo Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005) e pela LGPD.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-[#2E3C2B] flex items-center gap-2">
              <span className="text-[#5F7D5C]">2.</span> Dados Coletados e Finalidade do Tratamento
            </h2>
            <p>A plataforma coleta e processa apenas as informações estritamente necessárias para a operação dos módulos contratados:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dados Cadastrais do Profissional:</strong> Nome completo, e-mail de acesso, CRP (registro profissional), endereço profissional e dados para cabeçalho de documentos.</li>
              <li><strong>Dados dos Pacientes inseridos pelo Profissional:</strong> Nome, contato, data de nascimento, documentos, anamnese, relatos de evolução e registros clínicos organizados sob sigilo.</li>
              <li><strong>Dados de Agenda e Financeiro:</strong> Horários de atendimento, periodicidade e valores de honorários para controle de fluxo de caixa e emissão de comprovantes de comparecimento para reembolso de plano de saúde.</li>
            </ul>
          </section>

          {/* Section 3: Chrome Extension */}
          <section className="space-y-3 p-6 bg-[#FAF9F6] border border-[#2E3C2B]/10 rounded-2xl">
            <div className="flex items-center gap-2 text-[#5F7D5C] font-bold">
              <Chrome size={18} />
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#2E3C2B]">
                3. Extensão do Google Meet (SimplePsi Meet CC Recorder)
              </h2>
            </div>
            <p className="text-xs sm:text-sm">
              Nossa extensão de navegador para o Google Meet foi desenvolvida com o princípio de <strong>Privacidade por Design (Privacy by Design)</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Processamento 100% Local:</strong> A extensão captura exclusivamente as legendas geradas na tela durante a sessão autorizada e as transfere diretamente para o navegador do próprio psicólogo.</li>
              <li><strong>Sem Gravação de Áudio:</strong> Nenhum fluxo de voz, vídeo ou áudio bruto é gravado ou transmitido para servidores externos pela extensão.</li>
              <li><strong>Consentimento Informado:</strong> O psicólogo é o responsável ético por obter o consentimento prévio do paciente para utilização de transcrições durante teleconsultas, em respeito à Resolução CFP nº 004/2020.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-[#2E3C2B] flex items-center gap-2">
              <span className="text-[#5F7D5C]">4.</span> Inteligência Artificial e Processamento Clínico
            </h2>
            <p>
              Os recursos de auxílio à escrita clínica (evoluções e formulações de prontuário) utilizam modelos de Inteligência Artificial processados sob canais seguros com criptografia SSL/TLS.
            </p>
            <p>
              Os dados processados na geração de relatos <strong>NÃO são utilizados para treinar modelos públicos de IA</strong> e permanecem confinados à conta do profissional.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-[#2E3C2B] flex items-center gap-2">
              <span className="text-[#5F7D5C]">5.</span> Armazenamento, Segurança e Criptografia
            </h2>
            <p>
              Todos os registros e dados do SimplePsi são armazenados em infraestrutura de nuvem de padrão bancário (Google Cloud Platform / Firebase), contando com:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2E3C2B]">
                <CheckCircle2 size={16} className="text-[#5F7D5C] shrink-0" /> Criptografia em trânsito (HTTPS / TLS 1.3)
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2E3C2B]">
                <CheckCircle2 size={16} className="text-[#5F7D5C] shrink-0" /> Criptografia de dados em repouso (AES-256)
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2E3C2B]">
                <CheckCircle2 size={16} className="text-[#5F7D5C] shrink-0" /> Regras de segurança com isolamento por usuário
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2E3C2B]">
                <CheckCircle2 size={16} className="text-[#5F7D5C] shrink-0" /> Backups automatizados na nuvem
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-[#2E3C2B] flex items-center gap-2">
              <span className="text-[#5F7D5C]">6.</span> Área do Paciente e Assinatura Digital de Contratos
            </h2>
            <p>
              O acesso concedido aos pacientes na Área do Paciente ocorre por meio de autenticação segura e isolada por CPF. Ao assinar o Contrato Terapêutico digitalmente, são registrados a assinatura eletrônica, o carimbo de data/hora e o aceite das cláusulas acordadas, em conformidade com a legislação civil brasileira e normas éticas vigentes.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-[#2E3C2B] flex items-center gap-2">
              <span className="text-[#5F7D5C]">7.</span> Direitos do Titular de Dados e Exclusão
            </h2>
            <p>
              Nos termos da LGPD, o profissional titular da conta tem o direito de acessar, retificar, exportar em PDF ou excluir permanentemente seus dados e os registros de seus pacientes a qualquer momento.
            </p>
            <p>
              O sistema conta com mecanismo de <strong>Lixeira de Segurança</strong> para prevenir perdas acidentais, permitindo a exclusão definitiva imediata quando solicitado pelo profissional.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 pt-4 border-t border-[#2E3C2B]/10">
            <h2 className="text-xl font-serif font-bold text-[#2E3C2B] flex items-center gap-2">
              <span className="text-[#5F7D5C]">8.</span> Contato do Encarregado de Dados e Suporte
            </h2>
            <p>
              Para quaisquer esclarecimentos, solicitações relativas a direitos de privacidade ou suporte técnico, entre em contato diretamente com nossa equipe:
            </p>
            <div className="p-4 bg-[#5F7D5C]/5 border border-[#5F7D5C]/15 rounded-2xl text-xs space-y-1 font-mono">
              <p><strong>Responsável:</strong> SimplePsi Gestão Psicológica</p>
              <p><strong>E-mail de Contato:</strong> wellingtoncoutinho58@gmail.com</p>
              <p><strong>WhatsApp Oficial:</strong> +55 (11) 93921-5473</p>
              <p><strong>Website:</strong> https://simplepsi.com</p>
            </div>
          </section>

        </div>

        {/* Bottom Back Button */}
        <div className="text-center pt-4">
          <button
            onClick={handleBack}
            className="px-8 py-4 bg-[#5F7D5C] hover:bg-[#4E674C] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-[#5F7D5C]/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar para a Página Inicial
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#2E3C2B]/10 text-center text-xs text-[#2E3C2B]/50">
        <p>© 2026 SimplePsi • Plataforma de Gestão Psicológica em Conformidade CFP & LGPD.</p>
      </footer>
    </div>
  );
}
