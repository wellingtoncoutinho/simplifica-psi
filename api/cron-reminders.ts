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

    // Definir Horários no Fuso Horário de Brasília (America/Sao_Paulo) e Portugal (Europe/Lisbon)
    const now = new Date();
    const getDatesForTz = (tz: string) => {
      const dStr = now.toLocaleDateString('pt-BR', { timeZone: tz });
      const [dayStr, monthStr, yearStr] = dStr.split('/');
      const todayYMD = `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;

      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomStr = tomorrow.toLocaleDateString('pt-BR', { timeZone: tz });
      const [tDay, tMonth, tYear] = tomStr.split('/');
      const tomorrowYMD = `${tYear}-${tMonth.padStart(2, '0')}-${tDay.padStart(2, '0')}`;

      const dayFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'long' });
      const capDay = (d: Date) => {
        const formatted = dayFormatter.format(d);
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      };

      return {
        todayYMD,
        tomorrowYMD,
        todayDayName: capDay(now),
        tomorrowDayName: capDay(tomorrow)
      };
    };

    const brTzInfo = getDatesForTz('America/Sao_Paulo');
    const ptTzInfo = getDatesForTz('Europe/Lisbon');

    const relevantDates = Array.from(new Set([
      brTzInfo.todayYMD,
      brTzInfo.tomorrowYMD,
      ptTzInfo.todayYMD,
      ptTzInfo.tomorrowYMD
    ]));

    console.log(`[Cron Lembretes] Executando datas relevantes: ${relevantDates.join(', ')}`);

    // 1. Carregar apenas Sessões das datas relevantes (economiza cota do Firestore)
    const sessionsSnapshot = await db.collection('sessions')
      .where('date', 'in', relevantDates)
      .get();

    const recordedSessions: Session[] = [];
    sessionsSnapshot.docs.forEach((doc: any) => {
      recordedSessions.push({ id: doc.id, ...doc.data() } as Session);
    });

    // 2. Carregar pacientes ativos e projetar sessões recorrentes para hoje e amanhã
    const patientsMap = new Map<string, Patient>();

    try {
      const activePatientsSnap = await db.collection('patients')
        .where('status', '==', 'Ativo')
        .get();

      activePatientsSnap.forEach((doc: any) => {
        const p = { id: doc.id, ...doc.data() } as Patient;
        if (!p.optOutWhatsapp && p.phone) {
          patientsMap.set(p.id, p);

          const isPatientPT = p.phone.replace(/\D/g, '').startsWith('351');
          const tzInfo = isPatientPT ? ptTzInfo : brTzInfo;

          // Projetar recorrência para hoje e amanhã no fuso correspondente (BR ou PT)
          [ { date: tzInfo.todayYMD, dayName: tzInfo.todayDayName }, { date: tzInfo.tomorrowYMD, dayName: tzInfo.tomorrowDayName } ].forEach(({ date, dayName }) => {
            if (p.sessionDay === dayName && p.sessionTime) {
              const hasExisting = recordedSessions.some(s => s.patientId === p.id && s.date === date);
              if (!hasExisting) {
                const pRecurrenceStart = p.recurrenceStart || p.firstSessionDate || p.createdAt || '2024-01-01';
                const startDateObj = new Date(pRecurrenceStart.split('T')[0] + 'T00:00:00');
                const targetDateObj = new Date(date + 'T00:00:00');
                if (targetDateObj >= startDateObj) {
                  const diffWeeks = Math.floor((targetDateObj.getTime() - startDateObj.getTime()) / (7 * 24 * 60 * 60 * 1000));
                  let shouldInclude = false;
                  if (!p.recurrence || p.recurrence === 'Semanal') shouldInclude = true;
                  else if (p.recurrence === 'Quinzenal') shouldInclude = diffWeeks % 2 === 0;
                  else if (p.recurrence === 'Mensal') shouldInclude = diffWeeks % 4 === 0;

                  if (shouldInclude) {
                    recordedSessions.push({
                      id: `virtual-${p.id}-${date}`,
                      patientId: p.id,
                      patientName: p.name,
                      date,
                      time: p.sessionTime,
                      status: 'Agendada',
                      type: p.modality || 'Online',
                      ownerId: p.ownerId,
                      isVirtualSlot: true,
                      reminderDisabled: false,
                      reminderD1Sent: false,
                      reminderD0Sent: false
                    });
                  }
                }
              }
            }
          });
        }
      });
    } catch (e: any) {
      console.warn('Erro ao carregar pacientes ativos no cron:', e.message);
    }

    // Carregar pacientes faltantes de sessões gravadas que não foram capturados
    const patientIds = Array.from(new Set(recordedSessions.map(s => s.patientId).filter(Boolean)));
    for (const pid of patientIds) {
      if (!patientsMap.has(pid)) {
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
    }

    // 3. Carregar perfis dos donos das sessões (para validar plano e regras de WhatsApp)
    const ownerIds = Array.from(new Set(recordedSessions.map(s => s.ownerId).filter(Boolean)));
    const profilesMap = new Map<string, any>();
    for (const oid of ownerIds) {
      try {
        const pDoc = await db.collection('profiles').doc(oid).get();
        let profData = pDoc.exists ? pDoc.data() : {};
        if (!profData?.email && isAdmin) {
          try {
            const { getAuth } = await import('firebase-admin/auth');
            const uRecord = await getAuth().getUser(oid);
            if (uRecord?.email) {
              profData = { ...profData, email: uRecord.email };
            }
          } catch {}
        }
        profilesMap.set(oid, profData);
      } catch (e: any) {
        console.warn(`Erro ao carregar perfil do psicólogo ${oid}:`, e.message);
      }
    }

    // Carregar lista de authorized_emails para suporte a clientes vitalícios legados
    const authEmailsSet = new Set<string>();
    try {
      const authSnap = await db.collection('authorized_emails').get();
      authSnap.forEach((doc: any) => {
        if (doc.data()?.active !== false) {
          authEmailsSet.add(doc.id.toLowerCase().trim());
        }
      });
    } catch (e: any) {
      console.warn('Erro ao carregar authorized_emails no cron:', e.message);
    }

    const checkWhatsAppAccess = (ownerId: string): { allowD1: boolean; allowD0: boolean } => {
      // Administrador Wellington e contas admin sempre têm acesso total para disparos
      if (
        ownerId === 'xezsKkfVNyUvu7iCeX9lCNPWhbx2' ||
        ownerId === 'BnlJbXzAmRSzCYAOKbA9rwycLam1'
      ) {
        return { allowD1: true, allowD0: true };
      }

      const profile = profilesMap.get(ownerId);
      if (!profile) return { allowD1: false, allowD0: false };

      const email = (profile.email || '').toLowerCase().trim();
      if (
        email === 'wellcoutinho99@gmail.com' ||
        email === 'juniorcoutinho58@gmail.com' ||
        email === 'psiwellingtoncoutinho@gmail.com'
      ) {
        return { allowD1: true, allowD0: true };
      }

      // Regra de Negócio: Lembretes de WhatsApp via Meta Graph API possuem custo unitário por disparo.
      // Usuários com licença vitalícia mantêm acesso perpétuo a todo o sistema, MAS NÃO aos disparos automáticos de WhatsApp.
      // Para ter o robô de WhatsApp, o profissional precisa de uma assinatura mensal ativa (Consultório ou Ilimitado).
      const sub = profile.subscription;
      const plan = sub?.plan;
      const status = sub?.status;

      // Se não tiver assinatura mensal ativa, não dispara WhatsApp
      if (status !== 'active' || !plan) {
        return { allowD1: false, allowD0: false };
      }

      // Plano Ilimitado (Véspera D-1 e Dia da Sessão D-0)
      if (plan === 'ilimitado') {
        return { allowD1: true, allowD0: true };
      }

      // Plano Consultório (Apenas Véspera D-1)
      if (plan === 'consultorio') {
        return { allowD1: true, allowD0: false };
      }

      // Plano Start / Gratuito: sem disparos automáticos
      return { allowD1: false, allowD0: false };
    };

    const getOwnerTimeInfo = (ownerId: string, patientPhone?: string) => {
      const profile = profilesMap.get(ownerId);
      const isPT = profile?.country === 'PT' || (patientPhone && patientPhone.replace(/\D/g, '').startsWith('351'));
      const timeZone = isPT ? 'Europe/Lisbon' : 'America/Sao_Paulo';

      const dStr = now.toLocaleDateString('pt-BR', { timeZone });
      const [dayStr, monthStr, yearStr] = dStr.split('/');
      const todayYMD = `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;

      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomStr = tomorrow.toLocaleDateString('pt-BR', { timeZone });
      const [tDay, tMonth, tYear] = tomStr.split('/');
      const tomorrowYMD = `${tYear}-${tMonth.padStart(2, '0')}-${tDay.padStart(2, '0')}`;

      const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const [h, min] = timeFormatter.format(now).split(':').map(Number);
      const currentMinutesOfDay = h * 60 + min;

      return {
        isPT,
        timeZone,
        todayYMD,
        tomorrowYMD,
        curHour: h,
        currentMinutesOfDay
      };
    };

    // ==========================================
    // DISPARO 1: LEMBRETE DE VÉSPERA (D-1)
    // ==========================================
    // Envia a partir das 08h da manhã até as 21h no horário local do psicólogo/paciente para sessões do dia seguinte
    const d1Candidates = recordedSessions.filter(s => {
      if (s.date && s.status === 'Agendada' && !s.reminderD1Sent && !s.reminderDisabled && checkWhatsAppAccess(s.ownerId).allowD1) {
        const patient = patientsMap.get(s.patientId);
        const timeInfo = getOwnerTimeInfo(s.ownerId, patient?.phone || s.patientPhone);
        const isDaytime = timeInfo.curHour >= 8 && timeInfo.curHour <= 21;
        return isDaytime && s.date === timeInfo.tomorrowYMD;
      }
      return false;
    });

    for (const session of d1Candidates) {
      const patient = patientsMap.get(session.patientId);
      if (!patient || !patient.phone) continue;

      try {
        const psyName = session.psychologistName || 'Wellington Coutinho';
        console.log(`[D-1] Enviando lembrete de confirmação para ${patient.name} (${session.date} ${session.time})`);
        
        await sendD1ConfirmationReminder(session, patient, psyName);
        
        if (isAdmin) {
          const updateData = {
            reminderD1Sent: true,
            reminderD1SentAt: new Date().toISOString(),
            reminderStatus: 'd1_sent',
          };
          if (session.id.startsWith('virtual-')) {
            await db.collection('sessions').doc(session.id).set({
              patientId: session.patientId,
              patientName: session.patientName || patient.name,
              date: session.date,
              time: session.time,
              status: 'Agendada',
              type: session.type || 'Online',
              ownerId: session.ownerId,
              ...updateData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } else {
            await db.collection('sessions').doc(session.id).update(updateData);
          }
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
    const d0Candidates = recordedSessions.filter(s => {
      if ((s.status === 'Agendada' || s.status === 'Confirmada') && !s.reminderD0Sent && !s.reminderDisabled && s.time && checkWhatsAppAccess(s.ownerId).allowD0) {
        const patient = patientsMap.get(s.patientId);
        const timeInfo = getOwnerTimeInfo(s.ownerId, patient?.phone || s.patientPhone);
        if (s.date !== timeInfo.todayYMD) return false;

        const [sHour, sMin] = s.time.split(':').map(Number);
        const sessionMinutesOfDay = sHour * 60 + (sMin || 0);
        const diffMinutes = sessionMinutesOfDay - timeInfo.currentMinutesOfDay;

        // Janela de 1h30 (entre 70 e 110 minutos de antecedência no fuso local)
        return diffMinutes >= 70 && diffMinutes <= 110;
      }
      return false;
    });

    for (const session of d0Candidates) {
      const patient = patientsMap.get(session.patientId);
      if (!patient || !patient.phone) continue;

      try {
        const psyName = session.psychologistName || 'Wellington Coutinho';
        console.log(`[D-0] Enviando lembrete 1h30 antes para ${patient.name} (${session.time})`);

        await sendD0StartReminder(session, patient, psyName);

          if (isAdmin) {
            const updateData = {
              reminderD0Sent: true,
              reminderD0SentAt: new Date().toISOString(),
              reminderStatus: 'd0_sent',
            };
            if (session.id.startsWith('virtual-')) {
              await db.collection('sessions').doc(session.id).set({
                patientId: session.patientId,
                patientName: session.patientName || patient.name,
                date: session.date,
                time: session.time,
                status: 'Agendada',
                type: session.type || 'Online',
                ownerId: session.ownerId,
                ...updateData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } else {
              await db.collection('sessions').doc(session.id).update(updateData);
            }
          }
          results.d0Sent.push(`${patient.name} (${session.time})`);
        } catch (err: any) {
          console.error(`Erro ao enviar D-0 para ${patient.name}:`, err.message);
          results.errors.push(`D-0 ${patient.name}: ${err.message}`);
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
