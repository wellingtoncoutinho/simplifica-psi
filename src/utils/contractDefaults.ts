/**
 * Modelo padrão e utilitários para Contrato Terapêutico (Brasil e Portugal)
 */

export const DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS (CONTRATO TERAPÊUTICO)

Pelo presente instrumento particular, de um lado:

PSICÓLOGO(A): {{NOME_PSICOLOGO}}, inscrito(a) no Conselho Regional de Psicologia sob o CRP nº {{CRP_PSICOLOGO}}, com domicílio profissional em {{ENDERECO_PSICOLOGO}}, doravante denominado(a) simplesmente PSICÓLOGO(A);

E, de outro lado:

PACIENTE / CLIENTE: {{NOME_PACIENTE}}, portador(a) do CPF nº {{CPF_PACIENTE}}, residente e domiciliado(a) em {{ENDERECO_PACIENTE}}, doravante denominado(a) simplesmente PACIENTE (ou seu respectivo responsável legal);

Celebram o presente CONTRATO TERAPÊUTICO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS, regido pelas cláusulas e condições seguintes:

CLÁUSULA 1ª – DO OBJETO
1.1. O presente contrato tem por objeto a prestação de serviços profissionais de psicoterapia clínica individual pelo(a) PSICÓLOGO(A) ao(à) PACIENTE, visando o cuidado com a saúde mental, autoconhecimento e desenvolvimento emocional.

CLÁUSULA 2ª – DA DURAÇÃO, FREQUÊNCIA E HORÁRIOS DAS SESSÕES
2.1. Os atendimentos terão duração média de 50 (cinquenta) minutos por sessão.
2.2. A frequência das sessões será acordada entre as partes, ocorrendo nos dias e horários previamente estabelecidos na agenda.
2.3. A pontualidade é essencial para o desenvolvimento do processo terapêutico. Eventuais atrasos por parte do(a) PACIENTE não implicarão na extensão do horário final previamente reservado para a sessão.

CLÁUSULA 3ª – DOS HONORÁRIOS E FORMAS DE PAGAMENTO
3.1. O valor acordado por sessão de psicoterapia é de R$ {{VALOR_SESSAO}}.
3.2. Os pagamentos serão efetuados de acordo com a periodicidade ajustada (por sessão, semanal ou mensal), preferencialmente via Pix ou transferência bancária.
3.3. Mediante solicitação, o(a) PSICÓLOGO(A) emitirá recibo ou declaração de comparecimento para fins de comprovação, reembolso de plano de saúde ou declaração de Imposto de Renda.

CLÁUSULA 4ª – DE FALTAS, CANCELAMENTOS E REMARCAÇÕES
4.1. O horário agendado fica reservado com exclusividade para o(a) PACIENTE.
4.2. Caso o(a) PACIENTE necessite desmarcar ou remarcar uma sessão, deverá comunicar o(a) PSICÓLOGO(A) com antecedência mínima de 24 (vinte e quatro) horas.
4.3. Faltas sem aviso prévio de 24 horas ou cancelamentos no mesmo dia da consulta serão cobrados normalmente, tendo em vista a reserva do tempo e do espaço clínico.
4.4. Caso o(a) PSICÓLOGO(A) precise desmarcar a sessão por motivo de força maior ou imprevisto, o atendimento será reposto em data e horário mutuamente acordados, sem qualquer ônus financeiro ao(à) PACIENTE.

CLÁUSULA 5ª – DO SIGILO PROFISSIONAL E PRIVACIDADE (CFP & LGPD)
5.1. O(A) PSICÓLOGO(A) compromete-se a guardar absoluto e estrito sigilo profissional sobre todas as informações e fatos revelados no decorrer dos atendimentos, em estrita conformidade com o Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005).
5.2. A quebra do sigilo ético só ocorrerá em situações estritamente excepcionais previstas em lei ou pelo Código de Ética, tais como em casos de risco iminente à vida ou integridade física do(a) paciente ou de terceiros.
5.3. Em consonância com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), os dados cadastrais e registros de prontuário clínico são armazenados com segurança, confidencialidade e exclusivamente para fins de acompanhamento clínico terapêutico.

CLÁUSULA 6ª – DO ENCERRAMENTO E ALTA TERAPÊUTICA
6.1. O processo terapêutico pode ser finalizado a qualquer momento por iniciativa do(a) PACIENTE ou por mútuo acordo com o(a) PSICÓLOGO(A) (alta terapêutica).
6.2. Recomenda-se a realização de uma sessão final de encerramento para elaboração do término e avaliação dos avanços alcançados ao longo do processo.

Por estarem de pleno e mútuo acordo, as partes firmam o presente Contrato Terapêutico por meio de aceite e assinatura digital eletrônica, reconhecendo sua validade e eficácia.`;

export const DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE_PT = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS (CONTRATO TERAPÊUTICO)

Pelo presente instrumento particular, de um lado:

PSICÓLOGO(A): {{NOME_PSICOLOGO}}, inscrito(a) na Ordem dos Psicólogos Portugueses sob a Cédula Profissional nº {{OPP_PSICOLOGO}}, NIF nº {{NIF_PSICOLOGO}}, com domicílio profissional em {{ENDERECO_PSICOLOGO}}, doravante denominado(a) simplesmente PSICÓLOGO(A);

E, de outro lado:

UTENTE / CLIENTE: {{NOME_PACIENTE}}, titular do NIF nº {{CPF_PACIENTE}}, residente em {{ENDERECO_PACIENTE}}, doravante denominado(a) simplesmente UTENTE (ou o seu respetivo representante legal);

Celebram o presente CONTRATO TERAPÊUTICO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS, que se rege pelas cláusulas e condições seguintes:

CLÁUSULA 1ª – DO OBJETO
1.1. O presente contrato tem por objeto a prestação de serviços profissionais de consulta psicológica individual pelo(a) PSICÓLOGO(A) ao(à) UTENTE, visando a promoção da saúde mental, autoconhecimento e bem-estar psicológico.

CLÁUSULA 2ª – DA DURAÇÃO, REGULARIDADE E HORÁRIOS DAS CONSULTAS
2.1. As consultas terão uma duração média de 50 (cinquenta) minutos por sessão.
2.2. A periodicidade das consultas será acordada entre as partes, realizando-se nos dias e horários previamente fixados na agenda.
2.3. A pontualidade é essencial para o processo terapêutico. Eventuais atrasos por parte do(a) UTENTE não implicarão o prolongamento do horário previamente reservado.

CLÁUSULA 3ª – DOS HONORÁRIOS E FORMAS DE PAGAMENTO
3.1. O valor acordado por consulta de psicologia é de € {{VALOR_SESSAO}}.
3.2. Os pagamentos serão efetuados de acordo com a periodicidade acordada (por consulta, semanal ou mensal), preferencialmente por MB WAY ou transferência bancária (IBAN).
3.3. Mediante solicitação, o(a) PSICÓLOGO(A) emitirá declaração formal de comparência para efeitos de comparticipação junto de subsistemas ou seguradoras de saúde (ADSE, Médis, Multicare, AdvanceCare) ou declaração para efeitos fiscais (IRS).

CLÁUSULA 4ª – DE FALTAS, CANCELAMENTOS E REAGENDAMENTOS
4.1. O horário agendado fica reservado com exclusividade para o(a) UTENTE.
4.2. Caso o(a) UTENTE necessite de desmarcar ou reagendar uma consulta, deve comunicar o(a) PSICÓLOGO(A) com uma antecedência mínima de 24 (vinte e quatro) horas.
4.3. Faltas sem aviso prévio de 24 horas ou cancelamentos no próprio dia serão faturados na totalidade, salvaguardando a reserva do tempo clínico.
4.4. Na eventualidade de o(a) PSICÓLOGO(A) ter de desmarcar a consulta por motivo de força maior, a mesma será reposta em data e hora de mútuo acordo, sem qualquer encargo financeiro para o(a) UTENTE.

CLÁUSULA 5ª – DO SIGILO PROFISSIONAL E PRIVACIDADE (OPP & RGPD)
5.1. O(A) PSICÓLOGO(A) compromete-se a guardar absoluto e estrito sigilo profissional sobre todas as informações reveladas no decorrer das consultas, em rigoroso cumprimento do Código Deontológico da Ordem dos Psicólogos Portugueses (OPP).
5.2. A quebra de confidencialidade só ocorrerá em situações estritamente excecionais legalmente previstas, nomeadamente em casos de risco grave e iminente para a vida ou integridade física do(a) utente ou de terceiros.
5.3. Em harmonia com o Regulamento Geral sobre a Proteção de Dados (RGPD - Regulamento UE 2016/679), os dados de registo e os processos clínicos são guardados com encriptação, confidencialidade e exclusivamente para fins de acompanhamento psicológico.

CLÁUSULA 6ª – DA CONCLUSÃO E ALTA CLÍNICA
6.1. O acompanhamento psicológico pode ser concluído a qualquer momento por iniciativa do(a) UTENTE ou por mútuo acordo com o(a) PSICÓLOGO(A) (alta clínica).
6.2. Recomenda-se a realização de uma consulta final de encerramento para reflexão conjunta sobre os objetivos atingidos.

Por estarem de pleno acordo, as partes firmam o presente Contrato Terapêutico através de aceitação e assinatura digital no ecrã, conferindo-lhe plena validade jurídica.`;

export interface ContractData {
  psychologistName?: string;
  psychologistCrp?: string;
  psychologistOpp?: string;
  psychologistCpfCnpj?: string;
  psychologistNif?: string;
  psychologistAddress?: string;
  patientName?: string;
  patientCpf?: string;
  patientNif?: string;
  patientBirthDate?: string;
  patientAddress?: string;
  patientPhone?: string;
  sessionAmount?: number | string;
  paymentPeriodicity?: string;
  date?: string;
  country?: 'BR' | 'PT';
}

export function fillContractTemplate(template: string, data: ContractData): string {
  const isPT = data.country === 'PT' || (typeof window !== 'undefined' && (localStorage.getItem('simplepsi_country') === 'PT' || localStorage.getItem('prof_country') === 'PT'));
  const baseTpl = template || (isPT ? DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE_PT : DEFAULT_THERAPEUTIC_CONTRACT_TEMPLATE);
  
  let formattedAmount = 'A combinar';
  if (data.sessionAmount !== undefined && data.sessionAmount !== null && data.sessionAmount !== '') {
    const num = typeof data.sessionAmount === 'number' ? data.sessionAmount : parseFloat(String(data.sessionAmount).replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      formattedAmount = num.toFixed(2).replace('.', ',');
    }
  }

  const currentDate = data.date || new Date().toLocaleDateString(isPT ? 'pt-PT' : 'pt-BR');

  const oppOrCrp = data.psychologistOpp || data.psychologistCrp || 'Não informado';
  const nifOrDoc = data.psychologistNif || data.psychologistCpfCnpj || 'Não informado';
  const patientDoc = data.patientNif || data.patientCpf || 'Não informado';

  return baseTpl
    .replace(/\{\{NOME_PSICOLOGO\}\}/g, data.psychologistName || (isPT ? 'Psicólogo(a)' : 'Psicólogo(a)'))
    .replace(/\{\{CRP_PSICOLOGO\}\}/g, oppOrCrp)
    .replace(/\{\{OPP_PSICOLOGO\}\}/g, oppOrCrp)
    .replace(/\{\{CPF_CNPJ_PSICOLOGO\}\}/g, nifOrDoc)
    .replace(/\{\{NIF_PSICOLOGO\}\}/g, nifOrDoc)
    .replace(/\{\{ENDERECO_PSICOLOGO\}\}/g, data.psychologistAddress || (isPT ? 'Consultório / Consulta Online' : 'Consultório / Atendimento Online'))
    .replace(/\{\{NOME_PACIENTE\}\}/g, data.patientName || (isPT ? 'Utente' : 'Paciente'))
    .replace(/\{\{CPF_PACIENTE\}\}/g, patientDoc)
    .replace(/\{\{NIF_PACIENTE\}\}/g, patientDoc)
    .replace(/\{\{DATA_NASCIMENTO_PACIENTE\}\}/g, data.patientBirthDate || 'Não informado')
    .replace(/\{\{ENDERECO_PACIENTE\}\}/g, data.patientAddress || 'Não informado')
    .replace(/\{\{TELEFONE_PACIENTE\}\}/g, data.patientPhone || 'Não informado')
    .replace(/\{\{VALOR_SESSAO\}\}/g, formattedAmount)
    .replace(/\{\{PERIODICIDADE_PAGAMENTO\}\}/g, data.paymentPeriodicity || (isPT ? 'Por Consulta' : 'Por Sessão'))
    .replace(/\{\{DATA_ATUAL\}\}/g, currentDate);
}
