import { getDb } from './_firebase.js';
import { 
  sendD1ConfirmationReminder, 
  sendD0StartReminder, 
  formatWhatsAppPhone 
} from './_whatsapp.js';

type Patient = any;
type Session = any;

export default async function handler(req: any, res: any) {
  // Opcional: Proteger a rota com chave secreta caso configurada
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const results = {
    d1Sent: [] as string[],
    d0Sent: [] as string[],
    errors: [] as string[],
    timestamp: new Date().toISOString(),
  };

  try {
    const { db, isAdmin } = getDb();
    if (!isAdmin) {
      console.warn('Executando cron com Client SDK (modo limitado)');
    }

    // Definir Horários no Fuso Horário de Brasília (America/Sao_Paulo)
    const now = new Date();
    const brDateString = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // DD/MM/YYYY
    const [dayStr, monthStr, yearStr] = brDateString.split('/');
    const todayYMD = `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;

    // Amanhã
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const brTomorrowString = tomorrow.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const [tDay, tMonth, tYear] = brTomorrowString.split('/');
    const tomorrowYMD = `${tYear}-${tMonth.padStart(2, '0')}-${tDay.padStart(2, '0')}`;

    // Hora atual em minutos do dia (em Brasília)
    const brTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const [curHour, curMin] = brTimeFormatter.format(now).split(':').map(Number);
    const currentMinutesOfDay = curHour * 60 + curMin;

    console.log(`[Cron Lembretes] Executando em ${todayYMD} às ${curHour}:${curMin} (Amanhã: ${tomorrowYMD})`);

    // 1. Carregar apenas Sessões de Hoje e Amanhã (economiza 99% da cota do Firestore)
    const sessionsSnapshot = await db.collection('sessions')
      .where('date', 'in', [todayYMD, tomorrowYMD])
      .get();

    const recordedSessions: Session[] = [];
    sessionsSnapshot.docs.forEach((doc: any) => {
      recordedSessions.push({ id: doc.id, ...doc.data() } as Session);
    });

    // 2. Carregar apenas os pacientes dessas sessões
    const patientsMap = new Map<string, Patient>();
    const patientIds = Array.from(new Set(recordedSessions.map(s => s.patientId).filter(Boolean)));
    for (const pid of patientIds) {
      try {
        const pDoc = await db.collection('patients').doc(pid).get();
        if (pDoc.exists) {
          const p = { id: pDoc.id, ...pDoc.data() } as Patient;
          if (p.status === 'Ativo' && !p.optOutWhatsapp && p.phone) {
            patientsMap.set(p.id, p);
          }
        }
      } catch (e: any) {
        console.warn(`Erro ao carregar paciente ${pid}:`, e.message);
      }
    }

    // ==========================================
    // DISPARO 1: LEMBRETE DE VÉSPERA (D-1)
    // ==========================================
    // Envia a partir das 08h da manhã até as 21h para sessões do dia seguinte
    const isDaytimeForD1 = curHour >= 8 && curHour <= 21;
    const d1Candidates = isDaytimeForD1
      ? recordedSessions.filter(s => 
          s.date === tomorrowYMD && 
          s.status === 'Agendada' && 
          !s.reminderD1Sent &&
          !s.reminderDisabled
        )
      : [];

    for (const session of d1Candidates) {
      const patient = patientsMap.get(session.patientId);
      if (!patient || !patient.phone) continue;

      try {
        const psyName = session.psychologistName || 'Wellington Coutinho';
        console.log(`[D-1] Enviando lembrete de confirmação para ${patient.name} (${session.date} ${session.time})`);
        
        await sendD1ConfirmationReminder(session, patient, psyName);
        
        if (isAdmin) {
          await db.collection('sessions').doc(session.id).update({
            reminderD1Sent: true,
            reminderD1SentAt: new Date().toISOString(),
            reminderStatus: 'd1_sent',
          });
        }
        results.d1Sent.push(`${patient.name} (${session.time})`);
      } catch (err: any) {
        console.error(`Erro ao enviar D-1 para ${patient.name}:`, err.message);
        results.errors.push(`D-1 ${patient.name}: ${err.message}`);
      }
    }

    // ===================================================
    // DISPARO 2: LEMBRETE IMEDIATO (1h30 antes da sessão)
    // ===================================================
    // Sessões de hoje com status 'Agendada' ou 'Confirmada' que ainda não receberam D-0
    const d0Candidates = recordedSessions.filter(s => 
      s.date === todayYMD && 
      (s.status === 'Agendada' || s.status === 'Confirmada') && 
      !s.reminderD0Sent &&
      !s.reminderDisabled &&
      s.time
    );

    for (const session of d0Candidates) {
      const [sHour, sMin] = session.time.split(':').map(Number);
      const sessionMinutesOfDay = sHour * 60 + (sMin || 0);

      // Diferença em minutos entre a sessão e o momento atual
      const diffMinutes = sessionMinutesOfDay - currentMinutesOfDay;

      // Janela de 1h30 (entre 70 e 110 minutos de antecedência)
      if (diffMinutes >= 70 && diffMinutes <= 110) {
        const patient = patientsMap.get(session.patientId);
        if (!patient || !patient.phone) continue;

        try {
          const psyName = session.psychologistName || 'Wellington Coutinho';
          console.log(`[D-0] Enviando lembrete 1h30 antes para ${patient.name} (${session.time})`);

          await sendD0StartReminder(session, patient, psyName);

          if (isAdmin) {
            await db.collection('sessions').doc(session.id).update({
              reminderD0Sent: true,
              reminderD0SentAt: new Date().toISOString(),
              reminderStatus: 'd0_sent',
            });
          }
          results.d0Sent.push(`${patient.name} (${session.time})`);
        } catch (err: any) {
          console.error(`Erro ao enviar D-0 para ${patient.name}:`, err.message);
          results.errors.push(`D-0 ${patient.name}: ${err.message}`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processamento concluído. D-1 enviados: ${results.d1Sent.length}, D-0 enviados: ${results.d0Sent.length}`,
      results,
    });
  } catch (error: any) {
    console.error('Erro crítico no cron de lembretes:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
