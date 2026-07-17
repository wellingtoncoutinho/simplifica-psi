import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, writeBatch, query, where } from 'firebase/firestore';

export async function seedDemoData(userEmail: string, userId: string) {
  try {
    console.log("Iniciando semeamento de dados fictícios para:", userEmail, "UID:", userId);
    if (!userId) {
      alert("Erro: Usuário não identificado. Faça login novamente para prosseguir.");
      return;
    }
    
    // 1. Clean existing patients, sessions, transactions for this ownerId
    const patientsRef = collection(db, 'patients');
    const sessionsRef = collection(db, 'sessions');
    const transactionsRef = collection(db, 'transactions');
    
    const pSnap = await getDocs(query(patientsRef, where('ownerId', '==', userId)));
    const sSnap = await getDocs(query(sessionsRef, where('ownerId', '==', userId)));
    const tSnap = await getDocs(query(transactionsRef, where('ownerId', '==', userId)));
    
    const batch = writeBatch(db);
    
    pSnap.forEach((doc) => batch.delete(doc.ref));
    sSnap.forEach((doc) => batch.delete(doc.ref));
    tSnap.forEach((doc) => batch.delete(doc.ref));
    
    await batch.commit();
    console.log("Limpeza de dados anteriores concluída.");

    // 2. Mock Patients List (Exactly 12 ultra-detailed, highly professional patients)
    const mockPatients = [
      {
        ownerId: userId,
        name: "Mariana Silva Ramos",
        status: "Ativo" as const,
        sessions: 8,
        lastSession: "18/05/2026",
        email: "mariana.ramos@email.com",
        phone: "(62) 99122-3344",
        birthDate: "1998-04-12",
        cpf: "123.456.789-00",
        occupation: "Advogada Corporativa",
        address: "Av. T-10, Setor Bueno, Goiânia - GO",
        paymentNotes: "Pagamento por PIX ao final de cada sessão. Emite recibo mensal.",
        sessionDay: "Segunda-feira",
        sessionTime: "14:00",
        sessionAmount: 180,
        recurrence: "Semanal" as const,
        modality: "Online" as const,
        meetingLink: "https://meet.google.com/abc-defg-hij",
        clinicalData: {
          anamnese: {
            mainComplaint: "Ansiedade generalizada intensificada por alta sobrecarga no ambiente corporativo e medo constante de falhar em prazos.",
            familyHistory: "Histórico familiar positivo para transtornos de ansiedade (mãe e tia materna). Relação próxima com os pais, embora sinta cobrança indireta.",
            lifeHistory: "Sempre se cobrou alto desempenho acadêmico. Mudou-se para Goiânia há 3 anos para assumir cargo de liderança corporativa.",
            currentMedication: "Sertralina 50mg (prescrito pelo psiquiatra há 2 meses)."
          },
          evoluções: [
            {
              id: 3,
              date: "18/05/2026",
              time: "14:00",
              sessionNumber: 3,
              note: "Paciente relatou melhora parcial nos episódios de insônia após implementar a higiene do sono recomendada. Trabalhamos na sessão técnicas de reestruturação cognitiva sobre pensamentos catastróficos no trabalho corporativo."
            },
            {
              id: 2,
              date: "11/05/2026",
              time: "14:00",
              sessionNumber: 2,
              note: "Sessão focada na identificação de gatilhos corporativos. Mariana expressou grande frustração com prazos curtos. Traçamos um plano de organização diária e pausas ativas."
            },
            {
              id: 1,
              date: "04/05/2026",
              time: "14:00",
              sessionNumber: 1,
              note: "Primeira sessão de evolução pós-anamnese. Paciente relata pico de crise de ansiedade na última terça-feira. Apresentou sintomas físicos (taquicardia e sudorese)."
            }
          ],
          smartNotes: {
            padroes: "Padrão de autoexigência extremada ligado à performance no escritório. Pensamentos automáticos disfuncionais frequentes do tipo tudo ou nada.",
            progresso: "Evolução visível na autopercepção dos sintomas físicos de ansiedade e adesão satisfatória às tarefas de higiene do sono desenvolvidas na clínica.",
            topicos: [
              "Foco em reestruturação cognitiva sobre cobranças profissionais",
              "Fortalecimento de limites pessoais na rotina diária",
              "Acompanhamento da medicação atual com psiquiatra parceiro"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Carlos Eduardo Nogueira",
        status: "Ativo" as const,
        sessions: 6,
        lastSession: "20/05/2026",
        email: "carlos.software@email.com",
        phone: "(62) 98233-4455",
        birthDate: "1991-08-22",
        cpf: "987.654.321-11",
        occupation: "Engenheiro de Software Tech Lead",
        address: "Rua 15, Setor Oeste, Goiânia - GO",
        paymentNotes: "Faturamento mensal via boleto bancário.",
        sessionDay: "Quarta-feira",
        sessionTime: "10:00",
        sessionAmount: 200,
        recurrence: "Semanal" as const,
        modality: "Online" as const,
        meetingLink: "https://meet.google.com/xyz-mno-pqr",
        clinicalData: {
          anamnese: {
            mainComplaint: "Sintomas graves de esgotamento profissional (Burnout), desmotivação extrema e ideação de transição profissional.",
            familyHistory: "Relacionamento saudável com a esposa. Distanciamento dos pais que vivem em outra cidade, gerando leve sentimento de culpa.",
            lifeHistory: "Trabalha no desenvolvimento de softwares desde os 18 anos. Enfrentou demissões em massa recentes no setor, aumentando o nível de cobrança e medo de desemprego.",
            currentMedication: "Nenhuma medicação em uso no momento."
          },
          evoluções: [
            {
              id: 2,
              date: "13/05/2026",
              time: "10:00",
              sessionNumber: 2,
              note: "Carlos compartilhou reflexões sobre seu trabalho atual. Investigamos crenças de valor pessoal baseadas apenas em conquistas técnicas. Iniciamos mapeamento de valores fora da carreira."
            },
            {
              id: 1,
              date: "06/05/2026",
              time: "10:00",
              sessionNumber: 1,
              note: "Sessão inicial de acolhimento. Paciente apresenta cansaço crônico e apatia. Explicamos o ciclo do Burnout e combinamos foco em atividades prazerosas de curtíssima duração."
            }
          ],
          smartNotes: {
            padroes: "Identidade pessoal excessivamente fundida com a carreira profissional. Crença nuclear de 'só sou valorizado se produzir constantemente'.",
            progresso: "Início de flexibilização de rotina de trabalho. Relatou ter conseguido almoçar longe do computador duas vezes na última semana.",
            topicos: [
              "Trabalho de separação de identidade pessoal vs profissional",
              "Exercício prático de desconexão digital pós 19:00",
              "Identificação de novos hobbys longe de telas"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Beatriz Medeiros Pinto",
        status: "Ativo" as const,
        sessions: 4,
        lastSession: "14/05/2026",
        email: "beatriz.medeiros@email.com",
        phone: "(62) 97144-5566",
        birthDate: "1984-11-05",
        cpf: "456.789.123-22",
        occupation: "Professora Universitária",
        address: "Rua T-28, Setor Bueno, Goiânia - GO",
        paymentNotes: "Transferência bancária regular antes da sessão.",
        sessionDay: "Quinta-feira",
        sessionTime: "16:00",
        sessionAmount: 170,
        recurrence: "Quinzenal" as const,
        modality: "Presencial" as const,
        clinicalData: {
          anamnese: {
            mainComplaint: "Dificuldades de relacionamento conjugal e desgaste na comunicação interpessoal com familiares próximos.",
            familyHistory: "Casada há 12 anos, sem filhos. Relação com a família de origem pautada em dinâmicas de triângulos de cobrança.",
            lifeHistory: "Doutora em Letras, carreira acadêmica sólida. Relata sentir-se muito pressionada a mediar conflitos na família ampliada.",
            currentMedication: "Nenhuma."
          },
          evoluções: [
            {
              id: 1,
              date: "14/05/2026",
              time: "16:00",
              sessionNumber: 1,
              note: "Primeiro encontro focado em compreender a linha do tempo do casamento. Beatriz descreveu o distanciamento afetivo mútuo. Trabalhamos a comunicação assertiva e expressão de sentimentos na relação."
            }
          ],
          smartNotes: {
            padroes: "Comunicação conjugal passivo-agressiva e tendência a assumir a responsabilidade pela felicidade dos outros (codependência relacional).",
            progresso: "Aceitação inicial da necessidade de colocar limites nas intromissões familiares e expressar suas vulnerabilidades na terapia.",
            topicos: [
              "Foco na dinâmica relacional do casal e comunicação",
              "Treino de assertividade verbal em momentos de conflito",
              "Mapeamento de comportamentos de sobrecarga emocional"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Roberto Albuquerque",
        status: "Ativo" as const,
        sessions: 12,
        lastSession: "19/05/2026",
        email: "roberto.art@email.com",
        phone: "(62) 99188-7766",
        birthDate: "1994-06-20",
        cpf: "321.654.987-99",
        occupation: "Diretor de Arte e Designer",
        address: "Rua C-240, Jardim América, Goiânia - GO",
        paymentNotes: "PIX mensal adiantado (Pacote de 4 sessões por R$ 640).",
        sessionDay: "Terça-feira",
        sessionTime: "09:00",
        sessionAmount: 160,
        recurrence: "Semanal" as const,
        modality: "Presencial" as const,
        clinicalData: {
          anamnese: {
            mainComplaint: "Dificuldade severa de concentração, procrastinação crônica nas entregas da agência e suspeita de TDAH tardio.",
            familyHistory: "Irmão mais novo diagnosticado com TDAH na infância. Relação harmoniosa.",
            lifeHistory: "Sempre considerado brilhante, porém muito desorganizado na escola. Teve dificuldades em gerenciar prazos desde o início da carreira profissional.",
            currentMedication: "Nenhuma medicação ativa."
          },
          evoluções: [
            {
              id: 2,
              date: "12/05/2026",
              time: "09:00",
              sessionNumber: 2,
              note: "Mapeamos a rotina diária e criamos o primeiro sistema de blocos de tempo para controle das entregas mais importantes. Roberto respondeu positivamente à técnica de Pomodoro customizada."
            },
            {
              id: 1,
              date: "05/05/2026",
              time: "09:00",
              sessionNumber: 1,
              note: "Sessão diagnóstica inicial. Paciente expressou forte culpa por atrasos frequentes. Focamos em validar o sofrimento e desfazer o rótulo de preguiçoso."
            }
          ],
          smartNotes: {
            padroes: "Dificuldades de autorregulação da atenção e impulsividade na troca constante de tarefas criativas.",
            progresso: "Melhor aceitação de si mesmo e diminuição da culpa paralisante após as primeiras intervenções psicoeducativas de TDAH.",
            topicos: [
              "Implementação de técnicas práticas de foco visual",
              "Gestão de tempo focada no método de blocos diários",
              "Acompanhamento e encaminhamento opcional para neuropsicologia"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Aline Vasconcelos",
        status: "Ativo" as const,
        sessions: 3,
        lastSession: "20/05/2026",
        email: "aline.med@email.com",
        phone: "(62) 98155-2233",
        birthDate: "1996-02-18",
        cpf: "234.567.890-11",
        occupation: "Médica Residente de Pediatria",
        address: "Av. Universitária, Setor Leste Universitário, Goiânia - GO",
        paymentNotes: "Transferência eletrônica PIX ao final de cada atendimento.",
        sessionDay: "Quarta-feira",
        sessionTime: "19:00",
        sessionAmount: 190,
        recurrence: "Semanal" as const,
        modality: "Online" as const,
        meetingLink: "https://meet.google.com/med-aline-psi",
        clinicalData: {
          anamnese: {
            mainComplaint: "Crises frequentes de pânico nos plantões de emergência pediátrica e exaustão física crônica.",
            familyHistory: "Cobrança familiar extrema (pai médico de sucesso). Baixa tolerância familiar a falhas ou vulnerabilidade.",
            lifeHistory: "Trajetória escolar impecável, ingresso direto na faculdade federal de medicina. Elevada autocobrança por performance clínica.",
            currentMedication: "Escitalopram 10mg diário prescrito pelo colega psiquiatra."
          },
          evoluções: [
            {
              id: 1,
              date: "13/05/2026",
              time: "19:00",
              sessionNumber: 1,
              note: "Mapeamos os gatilhos das crises no ambiente de pronto-socorro. Ensinamos a técnica de respiração diafragmática profunda e ancoragem física para controle imediato de taquicardia."
            }
          ],
          smartNotes: {
            padroes: "Pânico gerado pela sobrecarga sensorial e o medo inconsciente de cometer erros clínicos irreversíveis.",
            progresso: "Apresenta excelente insights teóricos. Conseguiu usar a respiração diafragmática durante uma crise leve no plantão.",
            topicos: [
              "Foco em psicoeducação da ansiedade e pânico emergente",
              "Mapeamento de gatilhos específicos no plantão hospitalar",
              "Fortalecimento de autoestima e aceitação de limites biológicos"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Gustavo Fraga",
        status: "Ativo" as const,
        sessions: 9,
        lastSession: "21/05/2026",
        email: "gustavo.emp@email.com",
        phone: "(62) 99233-1122",
        birthDate: "1988-10-30",
        cpf: "345.678.901-22",
        occupation: "Empreendedor e Sócio de Startup",
        address: "Rua 9, Setor Marista, Goiânia - GO",
        paymentNotes: "Emissão de Nota Fiscal corporativa mensal para empresa.",
        sessionDay: "Quinta-feira",
        sessionTime: "11:00",
        sessionAmount: 220,
        recurrence: "Semanal" as const,
        modality: "Online" as const,
        meetingLink: "https://meet.google.com/startup-gustavo",
        clinicalData: {
          anamnese: {
            mainComplaint: "Ansiedade generalizada severa com insônia recorrente ligada a riscos financeiros e captação de investimentos da empresa.",
            familyHistory: "Família com histórico de falência financeira na infância do paciente, gerando trauma familiar marcante.",
            lifeHistory: "Começou a trabalhar cedo como vendedor para ajudar a família. Criou sua primeira startup aos 26 anos.",
            currentMedication: "Nenhuma."
          },
          evoluções: [
            {
              id: 2,
              date: "14/05/2026",
              time: "11:00",
              sessionNumber: 2,
              note: "Sessão focada em relacionar o medo de falência atual com os traumas financeiros vividos na infância. Paciente se emocionou muito e começou a ressignificar o valor da estabilidade."
            },
            {
              id: 1,
              date: "07/05/2026",
              time: "11:00",
              sessionNumber: 1,
              note: "Primeiro encontro. Paciente se apresentou agitado, falando muito rápido. Traçamos a linha do tempo do empreendedorismo e alinhamos metas de higiene de sono imediatas."
            }
          ],
          smartNotes: {
            padroes: "Crença nuclear disfuncional de que 'se eu descansar, a empresa quebrará e eu passarei fome novamente'.",
            progresso: "Reconhecimento das distorções cognitivas sobre escassez financeira e início de meditação guiada antes de deitar.",
            topicos: [
              "Foco em trauma de infância ligado a escassez de recursos",
              "Controle de estresse corporativo e ansiedade de projeção futura",
              "Exercícios de desfusão entre identidade pessoal e o faturamento"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Clara Toledo",
        status: "Ativo" as const,
        sessions: 2,
        lastSession: "15/05/2026",
        email: "clara.toledo@email.com",
        phone: "(62) 99144-8899",
        birthDate: "2001-07-04",
        cpf: "567.890.123-44",
        occupation: "Psicóloga em Início de Carreira",
        address: "Setor Sul, Goiânia - GO",
        paymentNotes: "Desconto social temporário por PIX (R$ 140 por sessão).",
        sessionDay: "Sexta-feira",
        sessionTime: "15:00",
        sessionAmount: 140,
        recurrence: "Quinzenal" as const,
        modality: "Presencial" as const,
        clinicalData: {
          anamnese: {
            mainComplaint: "Síndrome do impostor severa, ansiedade pré-atendimentos de pacientes e medo paralisante de errar intervenções clínicas.",
            familyHistory: "Pais muito acadêmicos e exigentes. Relação de alta expectativa bilateral.",
            lifeHistory: "Graduou-se no final do ano passado com excelentes notas. Resolveu abrir o consultório imediatamente, mas sente-se insegura.",
            currentMedication: "Nenhuma."
          },
          evoluções: [
            {
              id: 1,
              date: "08/05/2026",
              time: "15:00",
              sessionNumber: 1,
              note: "Trabalhamos as crenças de competência profissional. Clara expôs o receio de silêncios durante as consultas. Fizemos um role-play terapêutico de manejo de silêncios na clínica."
            }
          ],
          smartNotes: {
            padroes: "Dificuldade de validação de si mesma e autoexigência irrealista de perfeição no início da carreira prática.",
            progresso: "Apresenta melhora na autoconfiança imediata após exercícios práticos e simulação clínica na sessão.",
            topicos: [
              "Foco na validação da competência clínica e segurança",
              "Treino prático de tolerância ao silêncio e escuta ativa",
              "Supervisão e suporte emocional na prática clínica"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Thiago Lacerda",
        status: "Ativo" as const,
        sessions: 5,
        lastSession: "19/05/2026",
        email: "thiago.atleta@email.com",
        phone: "(62) 98166-4433",
        birthDate: "1997-03-22",
        cpf: "678.901.234-55",
        occupation: "Atleta Profissional de Futebol",
        address: "Parque das Laranjeiras, Goiânia - GO",
        paymentNotes: "PIX mensal direto do clube parceiro.",
        sessionDay: "Terça-feira",
        sessionTime: "11:00",
        sessionAmount: 180,
        recurrence: "Semanal" as const,
        modality: "Online" as const,
        meetingLink: "https://meet.google.com/atleta-thiago",
        clinicalData: {
          anamnese: {
            mainComplaint: "Sintomas depressivos reativos severos após lesão no ligamento cruzado anterior (LCA) e medo de encerrar a carreira precocemente.",
            familyHistory: "Família apoia a carreira, mas depende financeiramente das conquistas esportivas do paciente.",
            lifeHistory: "Joga em clubes desde os 12 anos. Toda a sua vida e identidade são estruturadas ao redor do futebol e da performance física.",
            currentMedication: "Sertralina 25mg receitada pelo departamento médico."
          },
          evoluções: [
            {
              id: 2,
              date: "12/05/2026",
              time: "11:00",
              sessionNumber: 2,
              note: "Thiago expressou profunda tristeza ao assistir treinos de muletas. Validamos a dor do luto temporário pelo corpo ativo. Focamos em atividades de lazer não físicas."
            },
            {
              id: 1,
              date: "05/05/2026",
              time: "11:00",
              sessionNumber: 1,
              note: "Acolhimento pós-cirúrgico. Paciente demonstrou apatia inicial e choro recorrente. Traçamos metas simples de mobilidade e exercícios leves de fisioterapia."
            }
          ],
          smartNotes: {
            padroes: "Dificuldade de estruturar identidade além da persona de 'atleta forte'. Sentimentos de impotência e desamparo.",
            progresso: "Sutil engajamento em novos hobbys passivos (leitura de biografias de superação) e adesão impecável à fisioterapia.",
            topicos: [
              "Trabalho de luto da rotina ativa esportiva pré-lesão",
              "Construção de repertório de valor fora do futebol ativo",
              "Acompanhamento integrado com fisioterapeuta e médicos"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Camila Fontes",
        status: "Ativo" as const,
        sessions: 14,
        lastSession: "21/05/2026",
        email: "camila.arq@email.com",
        phone: "(62) 99155-6677",
        birthDate: "1990-12-15",
        cpf: "789.012.345-66",
        occupation: "Arquiteta e Urbanista Autônoma",
        address: "Jardim Goiás, Goiânia - GO",
        paymentNotes: "Transferência PIX semanal antes de entrar na sessão.",
        sessionDay: "Quinta-feira",
        sessionTime: "17:00",
        sessionAmount: 180,
        recurrence: "Semanal" as const,
        modality: "Presencial" as const,
        clinicalData: {
          anamnese: {
            mainComplaint: "Pensamentos intrusivos recorrentes de contaminação e rituais exaustivos de checagem de portas e janelas (sintomatologia de TOC).",
            familyHistory: "Pai rígido, perfeccionista extremo, com histórico de mania de limpeza implícita.",
            lifeHistory: "Desenvolveu sintomas de ansiedade e organização excessiva na faculdade de arquitetura. O quadro se agravou após mudar-se sozinha.",
            currentMedication: "Fluoxetina 40mg prescrito por psiquiatra particular."
          },
          evoluções: [
            {
              id: 2,
              date: "14/05/2026",
              time: "17:00",
              sessionNumber: 2,
              note: "Fizemos a primeira sessão prática de Exposição e Prevenção de Resposta (EPR) em consultório com objetos leves. Camila demonstrou alto estresse inicial, mas conseguiu tolerar sem rituais."
            },
            {
              id: 1,
              date: "07/05/2026",
              time: "17:00",
              sessionNumber: 1,
              note: "Mapeamos a hierarquia dos medos de Camila. Criamos uma lista de rituais graduais do mais leve ao mais difícil para guiar as intervenções de terapia cognitivo-comportamental."
            }
          ],
          smartNotes: {
            padroes: "Pensamentos automáticos disfuncionais do tipo catastrófico ligados à invasão residencial ou infecção.",
            progresso: "Excelente adesão à conceituação cognitiva do TOC. Demonstrou grande coragem na primeira tarefa de EPR.",
            topicos: [
              "Foco em tarefas graduais de Exposição e Prevenção de Resposta",
              "Ressignificação de pensamentos catastróficos intrusivos",
              "Acompanhamento da dosagem de medicação e efeitos colaterais"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Fernando Diniz",
        status: "Ativo" as const,
        sessions: 7,
        lastSession: "22/05/2026",
        email: "fernando.aposentado@email.com",
        phone: "(62) 98177-3322",
        birthDate: "1956-05-14",
        cpf: "890.123.456-77",
        occupation: "Servidor Público Aposentado",
        address: "Setor Central, Goiânia - GO",
        paymentNotes: "PIX mensal pago pela filha (R$ 600 por 4 sessões).",
        sessionDay: "Sexta-feira",
        sessionTime: "10:00",
        sessionAmount: 150,
        recurrence: "Semanal" as const,
        modality: "Presencial" as const,
        clinicalData: {
          anamnese: {
            mainComplaint: "Tristeza profunda persistente, solidão extrema e perda de sentido de vida pós-aposentadoria e falecimento da esposa.",
            familyHistory: "Filha atenciosa que mora próximo e o visita nos finais de semana. Relacionamento próximo.",
            lifeHistory: "Trabalhou por 35 anos no tribunal de contas. Perdeu a esposa há 1 ano devido a câncer de mama.",
            currentMedication: "Nortriptilina 25mg prescrito pelo geriatra."
          },
          evoluções: [
            {
              id: 1,
              date: "15/05/2026",
              time: "10:00",
              sessionNumber: 1,
              note: "Primeiro acolhimento em consultório. Fernando chorou ao lembrar da rotina com a esposa. Validamos o luto legítimo e focamos na importância da sua caminhada matinal."
            }
          ],
          smartNotes: {
            padroes: "Processo de luto ativo integrado com sentimentos de inutilidade após a saída do serviço ativo de trabalho público.",
            progresso: "Demonstra alívio após expressar sua solidão. Conseguiu caminhar na praça por 15 minutos em três dias.",
            topicos: [
              "Foco em acolhimento emocional do luto e vazio relacional",
              "Ativação comportamental focada em pequenas rotinas diárias",
              "Socialização comunitária e voluntariado opcional em Goiânia"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Juliana Mendes Garcia",
        status: "Ativo" as const,
        sessions: 5,
        lastSession: "15/05/2026",
        email: "juliana.garcia@email.com",
        phone: "(62) 99877-6655",
        birthDate: "2000-02-15",
        cpf: "112.233.445-66",
        occupation: "Estudante de Medicina",
        address: "Av. Universitária, Goiânia - GO",
        paymentNotes: "PIX regular pago pela mãe.",
        sessionDay: "Sexta-feira",
        sessionTime: "11:00",
        sessionAmount: 155,
        recurrence: "Semanal" as const,
        modality: "Presencial" as const,
        clinicalData: {
          anamnese: {
            mainComplaint: "Ansiedade severa pré-provas de internato e estresse de residência médica.",
            familyHistory: "Mãe psicóloga, pai cardiologista. Elevada pressão implícita por aprovações e sucesso acadêmico.",
            lifeHistory: "Estuda 12h por dia na faculdade particular. Dorme em média 5h por noite.",
            currentMedication: "Nenhuma."
          },
          evoluções: [
            {
              id: 1,
              date: "08/05/2026",
              time: "11:00",
              sessionNumber: 1,
              note: "Paciente relata estafa mental extrema e irritabilidade. Trabalhamos na sessão técnicas práticas de descompressão diária e estabelecemos limites de estudo noturno."
            }
          ],
          smartNotes: {
            padroes: "Padrão de estafa mental severo derivado de excesso de estudos acadêmicos sem descanso estruturado.",
            progresso: "Reconheceu a urgência de melhorar a qualidade do seu sono e a importância das pausas mentais.",
            topicos: [
              "Higiene do sono e estratégias de descompressão diária",
              "Ressignificação das expectativas de perfeição dos pais",
              "Acompanhamento preventivo de sintomas de estafa crônica"
            ]
          }
        }
      },
      {
        ownerId: userId,
        name: "Patrícia Rezende",
        status: "Inativo" as const, // Seeds an Inactive/Trash patient perfectly for screenshots of the recovery feature!
        sessions: 3,
        lastSession: "10/05/2026",
        email: "patricia.designer@email.com",
        phone: "(62) 99133-7788",
        birthDate: "1999-09-09",
        cpf: "901.234.567-88",
        occupation: "Designer de Moda Autônoma",
        address: "Setor Marista, Goiânia - GO",
        paymentNotes: "PIX regular ao fim do mês.",
        sessionDay: "Segunda-feira",
        sessionTime: "08:00",
        sessionAmount: 170,
        recurrence: "Nenhuma" as const,
        modality: "Online" as const,
        clinicalData: {
          anamnese: {
            mainComplaint: "Ansiedade social severa, fobia de falar com clientes de marcas de vestuário e isolamento profissional gradual.",
            familyHistory: "Relacionamento saudável, mas família distante vivendo no interior do estado.",
            lifeHistory: "Sempre tímida, sentiu aumento expressivo de fobias após iniciar seu próprio ateliê e precisar fazer reuniões.",
            currentMedication: "Nenhuma."
          },
          evoluções: [
            {
              id: 1,
              date: "03/05/2026",
              time: "08:00",
              sessionNumber: 1,
              note: "Mapeamento cognitivo dos pensamentos de rejeição. Fizemos um treino de role-play para simulação de chamada de apresentação profissional com marcas."
            }
          ],
          smartNotes: {
            padroes: "Crença nuclear de insuficiência técnica profissional e foco catastrófico no julgamento alheio.",
            progresso: "Início sutil de treino assertivo verbal. Fobia social mapeada e classificada com sucesso.",
            topicos: [
              "Foco em treino de assertividade e fobia social verbal",
              "Desfusão de medos e pensamentos de rejeição",
              "Encaminhamento e simulações práticas de apresentação"
            ]
          }
        }
      }
    ];

    // Write patients and capture IDs
    const createdPatients: any[] = [];
    let idx = 0;
    for (const pat of mockPatients) {
      const dateOffset = new Date(Date.now() - (mockPatients.length - idx) * 24 * 60 * 60 * 1000);
      const patWithDates = {
        ...pat,
        createdAt: dateOffset.toISOString(),
        updatedAt: dateOffset.toISOString()
      };
      const pDoc = await addDoc(patientsRef, patWithDates);
      createdPatients.push({ id: pDoc.id, ...patWithDates });
      idx++;
    }
    console.log("Pacientes semeados com sucesso:", createdPatients.length);

    // 3. Semeando Agenda (Upcoming and Past Sessions for the 12 Patients)
    const mockSessions = [
      // Mariana Ramos
      {
        ownerId: userId,
        patientId: createdPatients[0].id,
        date: "2026-05-25", // Monday
        time: "14:00",
        duration: "50 min",
        type: "Online" as const,
        status: "Agendada" as const,
        recurrence: "Semanal" as const,
        amount: 180,
        paid: false
      },
      {
        ownerId: userId,
        patientId: createdPatients[0].id,
        date: "2026-05-18", // Today
        time: "14:00",
        duration: "50 min",
        type: "Online" as const,
        status: "Realizada" as const,
        recurrence: "Semanal" as const,
        amount: 180,
        paid: true
      },
      // Carlos Nogueira
      {
        ownerId: userId,
        patientId: createdPatients[1].id,
        date: "2026-05-20", // Wednesday
        time: "10:00",
        duration: "50 min",
        type: "Online" as const,
        status: "Agendada" as const,
        recurrence: "Semanal" as const,
        amount: 200,
        paid: false
      },
      // Beatriz Medeiros
      {
        ownerId: userId,
        patientId: createdPatients[2].id,
        date: "2026-05-28", // Next Thursday
        time: "16:00",
        duration: "50 min",
        type: "Presencial" as const,
        status: "Agendada" as const,
        recurrence: "Quinzenal" as const,
        amount: 170,
        paid: false
      },
      // Roberto Albuquerque
      {
        ownerId: userId,
        patientId: createdPatients[3].id,
        date: "2026-05-26", // Tuesday
        time: "09:00",
        duration: "50 min",
        type: "Presencial" as const,
        status: "Agendada" as const,
        recurrence: "Semanal" as const,
        amount: 160,
        paid: false
      },
      // Aline Vasconcelos
      {
        ownerId: userId,
        patientId: createdPatients[4].id,
        date: "2026-05-27", // Wednesday
        time: "19:00",
        duration: "50 min",
        type: "Online" as const,
        status: "Agendada" as const,
        recurrence: "Semanal" as const,
        amount: 190,
        paid: false
      },
      // Gustavo Fraga
      {
        ownerId: userId,
        patientId: createdPatients[5].id,
        date: "2026-05-28", // Thursday
        time: "11:00",
        duration: "50 min",
        type: "Online" as const,
        status: "Agendada" as const,
        recurrence: "Semanal" as const,
        amount: 220,
        paid: false
      },
      // Clara Toledo
      {
        ownerId: userId,
        patientId: createdPatients[6].id,
        date: "2026-05-29", // Friday
        time: "15:00",
        duration: "50 min",
        type: "Presencial" as const,
        status: "Agendada" as const,
        recurrence: "Quinzenal" as const,
        amount: 140,
        paid: false
      },
      // Triagem Rápida (Para preencher o calendário de teste)
      {
        ownerId: userId,
        patientId: "",
        triageName: "Rodrigo Alencar (Avaliação)",
        isTriage: true,
        date: "2026-05-22", // Friday
        time: "11:00",
        duration: "50 min",
        type: "Online" as const,
        status: "Agendada" as const,
        amount: 150,
        paid: false
      }
    ];

    for (const sess of mockSessions) {
      await addDoc(sessionsRef, sess);
    }
    console.log("Agenda de consultas semeada com sucesso.");

    // 4. Semeando Financeiro (Receitas e Despesas)
    const mockTransactions = [
      // Receitas
      {
        ownerId: userId,
        patientId: createdPatients[0].id,
        patientName: createdPatients[0].name,
        description: "Sessão 3 Clínica - Mariana Silva Ramos",
        amount: 180,
        date: "2026-05-18",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      {
        ownerId: userId,
        patientId: createdPatients[0].id,
        patientName: createdPatients[0].name,
        description: "Sessão 2 Clínica - Mariana Silva Ramos (PIX)",
        amount: 180,
        date: "2026-05-11",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      {
        ownerId: userId,
        patientId: createdPatients[1].id,
        patientName: createdPatients[1].name,
        description: "Sessão 2 Clínica - Carlos Nogueira",
        amount: 200,
        date: "2026-05-13",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      {
        ownerId: userId,
        patientId: createdPatients[2].id,
        patientName: createdPatients[2].name,
        description: "Primeira consulta de Beatriz Medeiros",
        amount: 170,
        date: "2026-05-14",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      {
        ownerId: userId,
        patientId: createdPatients[3].id,
        patientName: createdPatients[3].name,
        description: "Sessão Pacote Mensal - Roberto Albuquerque (PIX)",
        amount: 640,
        date: "2026-05-05",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      {
        ownerId: userId,
        patientId: createdPatients[4].id,
        patientName: createdPatients[4].name,
        description: "Sessão Clínica de Acolhimento - Aline Vasconcelos",
        amount: 190,
        date: "2026-05-13",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      {
        ownerId: userId,
        patientId: createdPatients[5].id,
        patientName: createdPatients[5].name,
        description: "Atendimento Corporativo - Gustavo Fraga",
        amount: 220,
        date: "2026-05-14",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      {
        ownerId: userId,
        patientId: createdPatients[6].id,
        patientName: createdPatients[6].name,
        description: "Atendimento Social - Clara Toledo",
        amount: 140,
        date: "2026-05-08",
        status: "Pago" as const,
        type: "Receita" as const,
        category: "Atendimento"
      },
      // Despesas (Clinical Overheads)
      {
        ownerId: userId,
        description: "Supervisão Clínica de Casos com Dr. Marcos Abreu",
        amount: 250,
        date: "2026-05-10",
        status: "Pago" as const,
        type: "Despesa" as const,
        category: "Supervisão"
      },
      {
        ownerId: userId,
        description: "Aluguel mensal do consultório físico",
        amount: 850,
        date: "2026-05-05",
        status: "Pago" as const,
        type: "Despesa" as const,
        category: "Aluguel"
      },
      {
        ownerId: userId,
        description: "Assinatura do Teste de Personalidade BFP",
        amount: 120,
        date: "2026-05-12",
        status: "Pago" as const,
        type: "Despesa" as const,
        category: "Materiais"
      }
    ];

    for (const tx of mockTransactions) {
      await addDoc(transactionsRef, tx);
    }
    console.log("Transações financeiras semeadas com sucesso.");
    
    alert("🌿 Sucesso absoluto! O seu consultório modelo foi populado com 12 Pacientes Premium detalhados, Evoluções Clínicas, Histórico de Smart Notes estruturado por IA, Agenda Integrada e Painel Financeiro real completo. Perfeito para fazer os prints da Landing Page!");
  } catch (err) {
    console.error("Erro ao semear banco de dados fictício:", err);
    alert("Ops! Ocorreu um erro no semeamento do banco de dados fictício. Verifique os logs do console.");
  }
}
