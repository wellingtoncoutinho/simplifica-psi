import { getDb } from './_firebase.js';
import { 
  sendWhatsAppTextMessage, 
  sendWhatsAppCancellationAlert,
  formatWhatsAppPhone, 
  getWhatsAppConfig 
} from './_whatsapp.js';

export default async function handler(req: any, res: any) {
  // 1. Verificação do Webhook pela Meta (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url || '', 'https://www.simplepsi.com');
    const query = req.query || Object.fromEntries(url.searchParams.entries());

    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const config = getWhatsAppConfig();
    const expectedToken = config.verifyToken;

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('✅ Webhook do WhatsApp verificado com sucesso pela Meta!');
      if (res.status && res.send) {
        return res.status(200).send(challenge);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      return res.end(challenge);
    } else {
      console.warn('❌ Falha na verificação do Webhook. Token incorreto.');
      if (res.status && res.send) {
        return res.status(403).send('Forbidden');
      }
      res.statusCode = 403;
      return res.end('Forbidden');
    }
  }

  // 2. Recebimento de Mensagens e Eventos (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // Se for apenas status de entrega (sent, delivered, read), retorna 200 OK imediatamente
      if (!message) {
        return res.status(200).json({ status: 'ignored_status_update' });
      }

      const fromPhone = formatWhatsAppPhone(message.from || '');
      let buttonPayload = '';
      let buttonText = '';

      if (message.type === 'button') {
        buttonPayload = message.button?.payload || '';
        buttonText = message.button?.text || '';
      } else if (message.type === 'interactive') {
        buttonPayload = message.interactive?.button_reply?.id || '';
        buttonText = message.interactive?.button_reply?.title || '';
      } else if (message.type === 'text') {
        buttonText = message.text?.body || '';
      }

      const normalizedAction = (buttonPayload + ' ' + buttonText).toLowerCase();
      console.log(`📩 Mensagem recebida de ${fromPhone}: "${buttonText}" (payload: "${buttonPayload}")`);

      const { db, isAdmin } = getDb();

      // Localizar o paciente e a sessão correspondente
      let targetSessionId = '';
      if (buttonPayload.startsWith('CONFIRM_')) {
        targetSessionId = buttonPayload.replace('CONFIRM_', '').trim();
      } else if (buttonPayload.startsWith('CANCEL_')) {
        targetSessionId = buttonPayload.replace('CANCEL_', '').trim();
      } else if (buttonPayload.startsWith('OPTOUT_')) {
        targetSessionId = buttonPayload.replace('OPTOUT_', '').trim();
      }

      // Buscar a sessão no Firestore
      let sessionData: any = null;
      let sessionRef: any = null;
      let matchedPatient: any = null;

      if (targetSessionId && !targetSessionId.startsWith('virtual-')) {
        if (isAdmin) {
          sessionRef = db.collection('sessions').doc(targetSessionId);
          const snap = await sessionRef.get();
          if (snap.exists) sessionData = { id: snap.id, ...snap.data() };
        }
      }

      // Se não achou por ID direto, busca pela sessão mais próxima do paciente com esse telefone
      if (!sessionData && isAdmin) {
        const patientsSnap = await db.collection('patients').get();

        for (const doc of patientsSnap.docs) {
          const p = doc.data();
          if (p.phone && formatWhatsAppPhone(p.phone) === fromPhone) {
            matchedPatient = { id: doc.id, ...p };
            break;
          }
        }

        if (matchedPatient) {
          // Buscar sessões desse paciente com status 'Agendada'
          const sessQuery = await db.collection('sessions')
            .where('patientId', '==', matchedPatient.id)
            .where('status', '==', 'Agendada')
            .limit(1)
            .get();

          if (!sessQuery.empty) {
            sessionRef = sessQuery.docs[0].ref;
            sessionData = { id: sessQuery.docs[0].id, ...sessQuery.docs[0].data(), patientName: matchedPatient.name };
          }
        }
      }

      const patientName = sessionData?.patientName || 'Paciente';
      const sessionDate = sessionData?.date || 'sua próxima sessão';
      const sessionTime = sessionData?.time || '';

      // TRATAMENTO DA RESPOSTA:
      // A) CONFIRMAR PRESENÇA
      if (normalizedAction.includes('confirm') || normalizedAction.includes('confirmar')) {
        if (sessionRef && isAdmin) {
          await sessionRef.update({
            status: 'Confirmada',
            reminderStatus: 'confirmed',
            confirmedAt: new Date().toISOString(),
          });
          console.log(`✅ Sessão ${sessionData?.id} marcada como Confirmada!`);
        }

        const replyMsg = `Perfeito, ${patientName}! Sua sessão está confirmada para ${sessionDate} às ${sessionTime} 💜. Essa é uma mensagem automática, para qualquer outra informação gostaria de pedir para você mandar mensagem diretamente para seu psi.`;
        await sendWhatsAppTextMessage(fromPhone, replyMsg);
      }
      // B) DESMARCAR SESSÃO
      else if (normalizedAction.includes('desmarcar') || normalizedAction.includes('cancelar')) {
        if (sessionRef && isAdmin) {
          await sessionRef.update({
            status: 'Desmarcou',
            reminderStatus: 'cancelled',
            desmarcouAt: new Date().toISOString(),
          });
          console.log(`⚠️ Sessão ${sessionData?.id} marcada como Desmarcou.`);
        }

        const replyMsg = `Entendido, ${patientName}. Registramos o cancelamento da sua sessão de ${sessionDate} às ${sessionTime} e o seu psicólogo já foi notificado 🤝. Caso precise remarcar para um novo horário, por favor entre em contato diretamente com ele.`;
        await sendWhatsAppTextMessage(fromPhone, replyMsg);

        // Notificar o psicólogo (Wellington) imediatamente no WhatsApp pessoal dele
        const wellingtonPhone = process.env.WELLINGTON_PERSONAL_PHONE || '5562983208784';
        try {
          await sendWhatsAppCancellationAlert(wellingtonPhone, patientName, sessionDate, sessionTime);
          console.log(`📢 Alerta de cancelamento enviado via template para o WhatsApp do Wellington (${wellingtonPhone})!`);
        } catch (alertErr: any) {
          console.warn('⚠️ Falha ao enviar template de cancelamento para o psicólogo, tentando texto simples:', alertErr?.message);
          try {
            await sendWhatsAppTextMessage(
              wellingtonPhone, 
              `🚨 *Aviso do Consultório*\n\nO paciente *${patientName}* acabou de desmarcar a sessão que estava agendada para *${sessionDate}* às *${sessionTime}*.\n\nAcesse sua agenda no Simple Psi para ver os detalhes.`
            );
          } catch (textErr: any) {
            console.error('❌ Falha ao enviar aviso de cancelamento:', textErr);
          }
        }
      }
      // C) PARAR LEMBRETES (OPT-OUT)
      else if (normalizedAction.includes('parar') || normalizedAction.includes('optout')) {
        const targetPatientId = sessionData?.patientId || matchedPatient?.id;
        if (targetPatientId && isAdmin) {
          await db.collection('patients').doc(targetPatientId).update({
            optOutWhatsapp: true,
          });

          // Desativa lembretes em todas as sessões agendadas deste paciente
          const futureSessionsSnap = await db.collection('sessions')
            .where('patientId', '==', targetPatientId)
            .get();

          for (const sDoc of futureSessionsSnap.docs) {
            const sData = sDoc.data();
            if (sData.status === 'Agendada' || sData.status === 'Confirmada') {
              await sDoc.ref.update({ reminderDisabled: true });
            }
          }
          console.log(`🛑 Opt-out ativado para paciente ${targetPatientId}. Lembretes cancelados com sucesso.`);
        }
        const replyMsg = `Você não receberá mais lembretes automáticos por WhatsApp. Caso deseje reativar no futuro, avise seu psicólogo. Um abraço!`;
        await sendWhatsAppTextMessage(fromPhone, replyMsg);
      }

      return res.status(200).json({ status: 'success' });
    } catch (err: any) {
      console.error('Erro no processamento do webhook do WhatsApp:', err);
      // Retorna 200 para a Meta não ficar retentando em loop infinito
      return res.status(200).json({ status: 'error_handled', error: err.message });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
