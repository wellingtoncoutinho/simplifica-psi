import { Session, Patient } from '../types';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  verifyToken?: string;
}

export const getWhatsAppConfig = (): WhatsAppConfig => {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '1261779623696198',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'EAANsmvCEdG8BStLQbLypOXS0wbrRWoRMfsEkPQIn87LhD1uvZAvoQ6kJ71F1sQZADxVSZBudO6T7hfeLZBXcZAxJHwcndzOoZC3THnHSD4NvQbPtH6dFyO0y8tBYPbzbOH6sJHIfsZCldfgOooQggpVubaHbVJB9kZCO0GOHrA1LBpW1pDamTSelwPZCZC72etRwZDZD',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '1604487048142695',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'simplifica_psi_secret_token_2026',
  };
};

/**
 * Sanitizes and formats phone numbers to WhatsApp E.164 format.
 * Ex: "(11) 93921-5473" -> "5511939215473"
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Se já tiver o código do país Brasil (55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se for celular brasileiro sem 55 (ex: 11 93921 5473 -> 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Retorna dígitos puros caso seja internacional
  return digits;
}

/**
 * Envia uma mensagem direta de texto (usado nas respostas automáticas após clique do paciente)
 */
export async function sendWhatsAppTextMessage(to: string, text: string, config?: WhatsAppConfig) {
  const cfg = config || getWhatsAppConfig();
  const formattedPhone = formatWhatsAppPhone(to);

  const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API Error: ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Envia o modelo de lembrete com botões de confirmação (D-1)
 * Template: lembrete_sessao_confirmacao
 * {{1}} = Nome do paciente
 * {{2}} = Dia e data (ex: segunda-feira, 28/09)
 * {{3}} = Horário (ex: 10:45)
 * {{4}} = Nome do psicólogo(a) (ex: Wellington Coutinho)
 */
export async function sendD1ConfirmationReminder(
  session: Session,
  patient: Patient,
  psychologistName: string,
  config?: WhatsAppConfig
) {
  const cfg = config || getWhatsAppConfig();
  const to = session.patientPhone || patient.phone;
  const formattedPhone = formatWhatsAppPhone(to);

  if (!formattedPhone) {
    throw new Error(`Paciente ${patient.name} não possui telefone válido para WhatsApp.`);
  }

  // Formatar data em português
  const [year, month, day] = session.date.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
  const weekdays = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];
  const dayName = weekdays[dateObj.getDay()];
  const formattedDate = `${dayName}, ${day}/${month}`;
  const formattedTime = session.time || '10:00';
  const psyName = psychologistName || session.psychologistName || 'Seu psicólogo';
  const isPT = formattedPhone.startsWith('351');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'template',
    template: {
      name: 'lembrete_sessao_confirmacao',
      language: {
        code: isPT ? 'pt_PT' : 'pt_BR',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patient.name.trim() },
            { type: 'text', text: formattedDate },
            { type: 'text', text: formattedTime },
            { type: 'text', text: psyName },
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '0',
          parameters: [
            { type: 'payload', payload: `CONFIRM_${session.id}` },
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '1',
          parameters: [
            { type: 'payload', payload: `CANCEL_${session.id}` },
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '2',
          parameters: [
            { type: 'payload', payload: `OPTOUT_${session.id}` },
          ],
        },
      ],
    },
  };

  const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API Error (D-1): ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Envia o lembrete de início de sessão (1h30 antes)
 * Template: lembrete_sessao_inicio
 * {{1}} = Nome do paciente
 * {{2}} = Dia e data (ex: segunda-feira, 28/09)
 * {{3}} = Horário (ex: 10:45)
 * {{4}} = Nome do psicólogo(a) (ex: Wellington Coutinho)
 * {{5}} = Link da videochamada ou local presencial
 */
export async function sendD0StartReminder(
  session: Session,
  patient: Patient,
  psychologistName: string,
  config?: WhatsAppConfig
) {
  const cfg = config || getWhatsAppConfig();
  const to = session.patientPhone || patient.phone;
  const formattedPhone = formatWhatsAppPhone(to);

  if (!formattedPhone) {
    throw new Error(`Paciente ${patient.name} não possui telefone válido para WhatsApp.`);
  }

  const [year, month, day] = session.date.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
  const weekdays = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];
  const dayName = weekdays[dateObj.getDay()];
  const formattedDate = `${dayName}, ${day}/${month}`;
  const formattedTime = session.time || '10:00';
  const psyName = psychologistName || session.psychologistName || 'Seu psicólogo';

  // Determinar link ou local
  let meetingInfo = '';
  const meetLink = session.meetingLink || patient.meetingLink;
  if (session.type === 'Presencial') {
    meetingInfo = 'Atendimento presencial no consultório.';
  } else if (meetLink) {
    meetingInfo = `Link da videochamada: ${meetLink.trim()}`;
  } else {
    meetingInfo = 'Sessão online (seu psicólogo enviará o link da chamada em instantes).';
  }

  const isPT = formattedPhone.startsWith('351');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'template',
    template: {
      name: 'lembrete_sessao_inicio',
      language: {
        code: isPT ? 'pt_PT' : 'pt_BR',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patient.name.trim() },
            { type: 'text', text: formattedDate },
            { type: 'text', text: formattedTime },
            { type: 'text', text: psyName },
            { type: 'text', text: meetingInfo },
          ],
        },
      ],
    },
  };

  const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API Error (D-0): ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Envia notificação imediata para o WhatsApp pessoal do psicólogo quando um paciente desmarcar
 */
export async function sendWhatsAppCancellationAlert(
  to: string,
  patientName: string,
  sessionDate: string,
  sessionTime: string,
  config?: WhatsAppConfig
) {
  const cfg = config || getWhatsAppConfig();
  const formattedPhone = formatWhatsAppPhone(to);
  const isPT = formattedPhone.startsWith('351');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'template',
    template: {
      name: 'notificacao_cancelamento_psi',
      language: {
        code: isPT ? 'pt_PT' : 'pt_BR',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patientName },
            { type: 'text', text: sessionDate },
            { type: 'text', text: sessionTime },
          ],
        },
      ],
    },
  };

  const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API Error (Cancellation Alert): ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}

