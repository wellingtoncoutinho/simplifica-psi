import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  X,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Sparkles,
  BookOpen,
  Compass,
  CheckCircle2,
  Target,
  Lightbulb,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  MessageSquareText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Patient } from '../types';
import { cn } from '../lib/utils';
import { getGeminiApiKey, generateGeminiContentWithFallback } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';

export interface StudyRadarItem {
  id: string;
  title: string;
  category: string;
  patientContextLabel: string;
  whatYouAlreadyMaster: string;
  whereToDeepen: string;
  psychoeducationImprovement: string;
  alternativeApproaches: string[];
  bookAndStudyRecommendations: Array<{
    reference: string;
    whyAndWhatToRead: string;
  }>;
  deepDiveLesson?: string;
  createdAt: string;
  isSaved?: boolean;
}

interface StudyRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  user?: any;
  clinicalApproach?: string;
}

const SESSION_COUNT_OPTIONS = [
  { id: '1', label: 'Última 1 sessão' },
  { id: '3', label: 'Últimas 3 sessões (Recomendado)' },
  { id: '5', label: 'Últimas 5 sessões' },
  { id: '10', label: 'Últimas 10 sessões' },
];

const QUICK_FOCUS_SUGGESTIONS = [
  'Aprofundar além do básico no diagnóstico do caso',
  'Melhorar minha psicoeducação (explicar de forma mais clara e vivencial)',
  'Testar outras formas de entrar onde a intervenção atual travou',
  'Autocompaixão e manejo de autocrítica severa',
  'TOC: rituais sutis, ruminação e exposição sem reasseguração',
];

export default function StudyRadarModal({
  isOpen,
  onClose,
  patients,
  user,
  clinicalApproach = 'TCC (Terapia Cognitivo-Comportamental)'
}: StudyRadarModalProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all');
  const [sessionLimit, setSessionLimit] = useState<string>('3');
  const [customFocus, setCustomFocus] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [deepeningId, setDeepeningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [savedStudies, setSavedStudies] = useState<StudyRadarItem[]>(() => {
    try {
      const stored = localStorage.getItem('simplepsi_saved_study_radar');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [generatedStudies, setGeneratedStudies] = useState<StudyRadarItem[]>(() => {
    try {
      const stored = localStorage.getItem('simplepsi_last_generated_study_radar');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeSubTab, setActiveSubTab] = useState<'generated' | 'saved'>(() => {
    try {
      const storedGen = localStorage.getItem('simplepsi_last_generated_study_radar');
      const genCount = storedGen ? JSON.parse(storedGen).length : 0;
      if (genCount > 0) return 'generated';
      const storedSaved = localStorage.getItem('simplepsi_saved_study_radar');
      const savedCount = storedSaved ? JSON.parse(storedSaved).length : 0;
      if (savedCount > 0) return 'saved';
    } catch {}
    return 'generated';
  });

  useEffect(() => {
    try {
      localStorage.setItem('simplepsi_last_generated_study_radar', JSON.stringify(generatedStudies));
    } catch (e) {
      console.error('Falha ao salvar últimos estudos gerados:', e);
    }
  }, [generatedStudies]);

  useEffect(() => {
    if (!user?.uid) return;
    const loadFromFirestore = async () => {
      try {
        const docRef = doc(db, 'study_radar', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.savedStudies) && data.savedStudies.length > 0) {
            setSavedStudies(prev => {
              const map = new Map<string, StudyRadarItem>();
              data.savedStudies.forEach((item: StudyRadarItem) => map.set(item.id, item));
              prev.forEach(item => map.set(item.id, item));
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Falha ao buscar estudos salvos do Firestore:', err);
      }
    };
    loadFromFirestore();
  }, [user?.uid]);

  useEffect(() => {
    try {
      localStorage.setItem('simplepsi_saved_study_radar', JSON.stringify(savedStudies));
    } catch (e) {
      console.error('Falha ao salvar estudos no localStorage:', e);
    }

    if (user?.uid) {
      const saveToFirestore = async () => {
        try {
          const docRef = doc(db, 'study_radar', user.uid);
          await setDoc(docRef, { savedStudies, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
          console.warn('Falha ao salvar estudos no Firestore:', e);
        }
      };
      saveToFirestore();
    }
  }, [savedStudies, user?.uid]);

  const activePatients = useMemo(() => {
    return (Array.isArray(patients) ? patients : []).filter(
      p => !p.status || p.status === 'Ativo' || (p.status as string) === 'ativo'
    );
  }, [patients]);

  const handleCopyStudy = (item: StudyRadarItem) => {
    const booksText = (item.bookAndStudyRecommendations || [])
      .map(b => `- ${b.reference}: ${b.whyAndWhatToRead}`)
      .join('\n');

    const text = `🎯 RECORTE DE ESTUDO: ${item.title} [${item.category}]
Contexto: ${item.patientContextLabel}

✅ ONDE JÁ HÁ FACILIDADE / BOM MANEJO:
${item.whatYouAlreadyMaster}

🔬 ONDE APROFUNDAR (ALÉM DO BÁSICO):
${item.whereToDeepen}

💡 COMO MELHORAR A PSICOEDUCAÇÃO NESTE PONTO:
${item.psychoeducationImprovement}

🔄 OUTRAS FORMAS DE ENTRAR (ROTAS ALTERNATIVAS DE MANEJO):
${(item.alternativeApproaches || []).map(a => `- ${a}`).join('\n')}

📚 ONDE ESTUDAR (LIVROS, CAPÍTULOS E CONCEITOS):
${booksText}${item.deepDiveLesson ? `\n\n🎓 AULA DE APROFUNDAMENTO:\n${item.deepDiveLesson}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleSave = (item: StudyRadarItem) => {
    const exists = savedStudies.some(s => s.id === item.id);
    if (exists) {
      setSavedStudies(prev => prev.filter(s => s.id !== item.id));
    } else {
      setSavedStudies(prev => [{ ...item, isSaved: true }, ...prev]);
    }
  };

  const handleRemoveSaved = (id: string) => {
    setSavedStudies(prev => prev.filter(s => s.id !== id));
  };

  const handleDeepenStudy = async (item: StudyRadarItem) => {
    const keyToUse = getGeminiApiKey();
    if (!keyToUse) {
      alert('Chave da API do Gemini não configurada no ambiente.');
      return;
    }

    setDeepeningId(item.id);
    try {
      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const prompt = `Você é um professor de pós-graduação e supervisor clínico sênior na abordagem ${clinicalApproach}.
O psicólogo já domina o básico e pediu um APROFUNDAMENTO PRÁTICO E DIRETO sobre este recorte clínico específico:

TEMA ESPECÍFICO: "${item.title}" (${item.category})
ONDE PRECISA APROFUNDAR: "${item.whereToDeepen}"
MELHORIA DE PSICOEDUCAÇÃO: "${item.psychoeducationImprovement}"

Elabore uma MINI-AULA PRÁTICA DE ESPECIALISTA (tempo de leitura de 3 a 5 minutos), sem enrolação introdutória e sem chover no molhado, dividida exatamente nestas 4 partes:

### 1. A Mecânica Oculta (O que os livros básicos não contam)
Explique de forma profunda e clara o mecanismo psicológico exato por trás dessa trava clínica. Por que o manejo tradicional muitas vezes bate na trave aqui?

### 2. Script de Psicoeducação Vivencial (Como explicar para o paciente)
Escreva um exemplo prático de fala, analogia ou metáfora que o psicólogo pode usar na sessão para explicar esse ponto ao paciente de um jeito que toque na emoção e faça sentido imediato (sem soar como aula teórica fria).

### 3. Passo a Passo de Manejo Alternativo (Como conduzir na próxima sessão)
Mostre um roteiro prático em 3 passos (com perguntas exatas entre aspas) para entrar nesse tema por uma porta diferente quando o paciente racionalizar, fugir ou repetir o padrão.

### 4. Mapa de Leitura Rápida
Cite os conceitos técnicos exatos e capítulos/autores para o psicólogo ir direto na fonte se quiser ler mais.

Seja acolhedor, técnico, pragmático e focado na clínica real.`;

      const response = await generateGeminiContentWithFallback(ai, {
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const lessonText = response?.text || 'Não foi possível gerar o aprofundamento no momento.';

      setGeneratedStudies(prev =>
        prev.map(s => (s.id === item.id ? { ...s, deepDiveLesson: lessonText } : s))
      );
      setSavedStudies(prev =>
        prev.map(s => (s.id === item.id ? { ...s, deepDiveLesson: lessonText } : s))
      );
    } catch (err: any) {
      console.error('Erro ao aprofundar estudo:', err);
      alert('Erro ao gerar a aula de aprofundamento. Tente novamente.');
    } finally {
      setDeepeningId(null);
    }
  };

  const handleGenerate = async () => {
    const keyToUse = getGeminiApiKey();
    if (!keyToUse) {
      alert('Chave da API do Gemini não configurada no ambiente.');
      return;
    }

    const targetPatients =
      selectedPatientId === 'all'
        ? activePatients
        : activePatients.filter(p => p.id === selectedPatientId);

    if (targetPatients.length === 0) {
      alert('Nenhum paciente encontrado para analisar.');
      return;
    }

    setIsGenerating(true);
    setLoadingStep(
      selectedPatientId === 'all'
        ? 'Analisando cápsulas de manejo e evoluções recentes dos seus pacientes...'
        : 'Analisando histórico, cápsulas de supervisão e sessões recentes do paciente selecionado...'
    );

    try {
      const limitNum = parseInt(sessionLimit, 10) || 3;
      const compiledCases: string[] = [];

      targetPatients.forEach((patient, idx) => {
        const mainComplaint = patient.mainComplaint?.trim() || '';
        const problemList = patient.clinicalData?.tccData?.problemList?.trim() || '';
        const diagnosis = patient.clinicalData?.tccData?.diagnosisAndMeds?.trim() || '';
        const coreBelief = patient.clinicalData?.tccData?.unifiedFormulation?.coreBelief?.trim() || '';
        const compensatory = patient.clinicalData?.tccData?.unifiedFormulation?.compensatoryStrategies?.trim() || '';
        const treatmentGoals = (patient.clinicalData?.treatmentPlan || [])
          .map(tp => `${tp.goal} (${tp.status})`)
          .join('; ');

        const allEvolucoes = patient.clinicalData?.evoluções || [];
        // Evoluções podem estar ordenadas da mais recente para a mais antiga ou vice-versa; ordenamos por sessionNumber desc ou pegamos as mais recentes
        const sortedEvolucoes = [...allEvolucoes].sort((a, b) => (b.sessionNumber || 0) - (a.sessionNumber || 0));
        const recentEvolucoes = sortedEvolucoes
          .filter(e => {
            const note = (e.note || '').trim();
            if (note.length < 15 && !e.supervisionDigest) return false;
            const lower = note.toLowerCase();
            if (lower.startsWith('pix') || lower.startsWith('comprovante')) return false;
            return true;
          })
          .slice(0, limitNum);

        if (mainComplaint || problemList || recentEvolucoes.length > 0) {
          const sessionsText =
            recentEvolucoes.length > 0
              ? recentEvolucoes
                  .map((e, i) => {
                    const digestPart = e.supervisionDigest
                      ? `\n     [Cápsula de Manejo/Supervisão extraída da Transcrição]: ${e.supervisionDigest}`
                      : '';
                    return `   • Sessão #${e.sessionNumber || i + 1} (${e.date || 'Recente'}):\n     [Relato Clínico]: ${e.note}${digestPart}`;
                  })
                  .join('\n\n')
              : '   (Sem relatos recentes detalhados)';

          const label =
            selectedPatientId === 'all'
              ? `CASO CLÍNICO #${idx + 1} (Iniciais: ${patient.name
                  .split(' ')
                  .map(n => n[0])
                  .join('.')})`
              : `PACIENTE EM FOCO (Iniciais: ${patient.name
                  .split(' ')
                  .map(n => n[0])
                  .join('.')})`;

          compiledCases.push(
            `
${label}:
- Queixa Principal / Demanda: ${mainComplaint || 'Não especificada'}
- Hipótese / Diagnóstico / Sintomas: ${diagnosis || problemList || 'Não especificado'}
- Crenças / Estratégias Identificadas: ${coreBelief ? `Crença: ${coreBelief} | ` : ''}${compensatory ? `Estratégias: ${compensatory}` : 'Em construção'}
- Metas do Plano de Tratamento: ${treatmentGoals || 'Em construção'}
- Últimas ${recentEvolucoes.length} Sessões Analisadas:
${sessionsText}
`.trim()
          );
        }
      });

      if (compiledCases.length === 0) {
        alert('Não há relatos ou anotações suficientes nas sessões selecionadas para gerar o Radar de Estudos.');
        setIsGenerating(false);
        return;
      }

      setLoadingStep('Mapeando pontos de facilidade, gargalos de aprofundamento e referências bibliográficas...');

      const focusInstruction = customFocus.trim()
        ? `FOCO ESPECÍFICO SOLICITADO PELO PSICÓLOGO: "${customFocus.trim()}".
Dê prioridade máxima a responder e destrinchar esse ponto solicitado, conectando-o diretamente com os dados das sessões abaixo, mostrando onde aprofundar além do óbvio, como melhorar a psicoeducação e quais outras portas de entrada testar.`
        : `MODO RADAR AUTOMÁTICO: Identifique nos relatos e nas cápsulas de manejo das sessões quais são os pontos onde o psicólogo já conduz bem, mas onde a terapia pede um aprofundamento teórico/técnico mais fino (além do básico), melhorias na psicoeducação ou novas formas de entrar em demandas que estão se repetindo.`;

      const prompt = `
Você é um Supervisor Clínico Sênior e Mentor de Desenvolvimento Profissional para Psicólogos, especialista na abordagem ${clinicalApproach}.

Seu objetivo é criar um **RADAR DE ESTUDOS E APROFUNDAMENTO CLÍNICO** personalizado para o psicólogo a partir das sessões abaixo.

${focusInstruction}

---
DADOS CLÍNICOS DAS SESSÕES ANALISADAS:
${compiledCases.join('\n\n---\n\n')}
---

DIRETRIZES FUNDAMENTAIS DE SUPERVISÃO INTELIGENTE (LEIA COM MÁXIMA ATENÇÃO):
1. **PROIBIDO SER "CRICRI" OU FISCAL DE MANUAL ENGESSADO**:
   - NUNCA critique o estilo pessoal e humano do psicólogo (ex: falar um pouco mais na sessão, trazer um exemplo pessoal / autorrevelação que gerou conexão no contexto, usar tom conversacional ou não seguir um checklist robótico).
   - Na clínica madura, autorrevelação pontual, metáforas pessoais e conversas mais ativas fazem parte da aliança terapêutica. NÃO aponte isso como erro!
2. **SAIA DO SUPERFICIAL (NADA DE "ESTUDE TOC" OU "ESTUDE ANSIEDADE")**:
   - O psicólogo já sabe o básico (já sabe o que é TOC, o que é exposição, o que é autocompaixão, o que é pensamento automático).
   - Ele sente um "vazio" na hora de estudar porque não sabe **ONDE especificamente aprofundar**.
   - Portanto, recorte **subtemas cirúrgicos e avançados** (ex: em vez de "Estudar TOC", aponte "Manejo de Rituais Mentais Encobertos e Busca de Reasseguração Sutil dentro do próprio Diálogo Socrático"; em vez de "Estudar Autocompaixão", aponte "O Medo da Compaixão [Fears of Compassion - Paul Gilbert] em pacientes que associam gentileza interna à perda de desempenho").
3. **DESTAQUE A PSICOEDUCAÇÃO E ROTAS ALTERNATIVAS DE ENTRADA**:
   - Quando perceber que uma intervenção não está entrando tão bem ou que a psicoeducação pode ficar mais potente, mostre **como melhorar a psicoeducação** (com uma analogia/explicação clara) e dê **2 a 3 formas alternativas de entrar no problema** (ex: sair do debate racional e usar uma técnica vivencial/imagética, pergunta paradoxal, etc.).
4. **INDIQUE ONDE ESTUDAR DE VERDADE (LIVROS E REFERÊNCIAS REAIS)**:
   - Para cada ponto, indique **livros específicos reais, autores de referência e capítulos/conceitos exatos** para o psicólogo saber exatamente onde estudar sem ficar perdido.

RETORNE ESTRITAMENTE UM JSON VÁLIDO no seguinte formato (sem blocos markdown ao redor):
{
  "studies": [
    {
      "id": "study_1",
      "title": "Nome específico e avançado do recorte de estudo (nunca genérico)",
      "category": "Eixo Técnico (ex: Aprofundamento em TOC, Psicoeducação & Aliança, Manejo de Resistência, Terapia Focada na Compaixão)",
      "patientContextLabel": "Contexto clínico resumido (ex: Padrão observado no manejo de ruminação/TOC ou nas sessões recentes)",
      "whatYouAlreadyMaster": "O que já está sólido no seu manejo (reconheça o estilo do terapeuta, o vínculo e o que ele já faz bem para ele saber até onde já tem facilidade)",
      "whereToDeepen": "Onde está a lacuna real de aprofundamento técnico (o ponto sutil além do básico que vai destravar o caso ou a condução)",
      "psychoeducationImprovement": "Como elevar o nível da psicoeducação neste tema: uma forma muito mais clara, concreta ou metafórica de explicar esse mecanismo ao paciente",
      "alternativeApproaches": [
        "Rota Alternativa 1: Outra forma prática de entrar nesse ponto quando o jeito atual trava (inclua exemplo de pergunta ou técnica)",
        "Rota Alternativa 2: Manejo experiencial/comportamental alternativo para testar na próxima sessão"
      ],
      "bookAndStudyRecommendations": [
        {
          "reference": "Nome do Livro / Autor / Protocolo específico (ex: 'Terapia Focada na Compaixão - Paul Gilbert' ou 'Vencendo o TOC - Christine Purdon & David Clark')",
          "whyAndWhatToRead": "Qual capítulo, conceito ou parte exata buscar nesse material e por que ele resolve essa dúvida"
        },
        {
          "reference": "Segunda referência complementar (Livro, Artigo clássico ou Conceito-chave de busca)",
          "whyAndWhatToRead": "O que pesquisar exatamente para ir direto ao ponto"
        }
      ]
    }
  ]
}

Gere entre 3 e 5 trilhas de estudo ricas, profundas e pragmáticas. Retorne APENAS o JSON.
`;

      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const response = await generateGeminiContentWithFallback(ai, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
        },
      });

      const rawText = response?.text || '{}';
      let parsed: { studies: StudyRadarItem[] } = { studies: [] };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Não foi possível decodificar a resposta da IA.');
        }
      }

      if (parsed.studies && Array.isArray(parsed.studies)) {
        const enriched = parsed.studies.map((item, i) => ({
          ...item,
          id: `study_${Date.now()}_${i}`,
          createdAt: new Date().toLocaleDateString('pt-BR'),
          isSaved: false,
        }));
        setGeneratedStudies(enriched);
        setActiveSubTab('generated');
      } else {
        throw new Error('Formato de retorno inesperado da IA.');
      }
    } catch (err: any) {
      console.error('Erro ao gerar Radar de Estudos:', err);
      alert(`Erro ao mapear estudos: ${err.message || 'Tente novamente em instantes.'}`);
    } finally {
      setIsGenerating(false);
      setLoadingStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#11151c] border border-indigo-500/25 max-w-5xl w-full rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-text-main relative">
        
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-950/40 via-sky-950/20 to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/25 shadow-inner">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Radar de Estudos & Aprofundamento Clínico
              </h2>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
              Descubra exatamente <strong className="text-indigo-400 font-semibold">onde e como aprofundar seus estudos</strong> além do básico, como lapidar sua psicoeducação e quais rotas alternativas testar quando uma intervenção trava — sem julgamentos engessados.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-text-muted hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors shrink-0"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Painel de Filtros e Bússola de Foco */}
        <div className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Seletor de Paciente (Todos vs Específico) */}
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                <Users size={14} className="text-indigo-400 shrink-0" />
                <span className="text-[11px] text-text-muted">Alvo:</span>
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  disabled={isGenerating}
                  aria-label="Selecionar paciente ou todos"
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-2 max-w-[220px] truncate"
                >
                  <option value="all" className="bg-[#161b24] text-white">
                    🌍 Todos os Pacientes Ativos ({activePatients.length})
                  </option>
                  {activePatients.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#161b24] text-white">
                      👤 {p.name} ({(p.clinicalData?.evoluções || []).length} sessões)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade de Sessões */}
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                <Layers size={14} className="text-sky-400 shrink-0" />
                <span className="text-[11px] text-text-muted">Explorar:</span>
                <select
                  value={sessionLimit}
                  onChange={e => setSessionLimit(e.target.value)}
                  disabled={isGenerating}
                  aria-label="Número de sessões para explorar"
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  {SESSION_COUNT_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#161b24] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Alternador de Abas */}
              <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setActiveSubTab('generated')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    activeSubTab === 'generated'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-text-muted hover:text-white'
                  )}
                >
                  Trilhas Geradas ({generatedStudies.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('saved')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                    activeSubTab === 'saved'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-text-muted hover:text-white'
                  )}
                >
                  <Bookmark size={13} />
                  Meus Estudos ({savedStudies.length})
                </button>
              </div>

              {/* Botão de Disparo */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={cn(
                  'px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer',
                  isGenerating
                    ? 'bg-indigo-500/30 text-indigo-200 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30 hover:scale-[1.02] active:scale-[0.98]'
                )}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-indigo-300" />
                    <span>Mapeando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Mapear Onde Aprofundar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Campo opcional para direcionar um tema ou dificuldade específica */}
          <div className="space-y-2 pt-1">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3.5 text-indigo-400/80 pointer-events-none" />
              <input
                type="text"
                value={customFocus}
                onChange={e => setCustomFocus(e.target.value)}
                disabled={isGenerating}
                placeholder="Opcional: Digite um tema onde quer aprofundar ou algo que travou (ex: 'Autocompaixão', 'Paciente TOC além do básico', 'Melhorar psicoeducação')..."
                className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/50 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder:text-text-muted/50 focus:outline-none transition-all"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isGenerating) handleGenerate();
                }}
              />
              {customFocus && (
                <button
                  onClick={() => setCustomFocus('')}
                  className="absolute right-3 text-[10px] text-text-muted hover:text-white font-semibold"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Sugestões rápidas clicáveis */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-text-muted/70 font-medium">Atalhos de foco:</span>
              {QUICK_FOCUS_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCustomFocus(sug)}
                  className={cn(
                    'text-[10px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer',
                    customFocus === sug
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-semibold'
                      : 'bg-white/[0.03] border-white/5 text-text-muted hover:text-white hover:border-white/15'
                  )}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Banner */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-indigo-500/10 border-b border-indigo-500/20 px-6 py-3 flex items-center gap-3 overflow-hidden text-xs text-indigo-300"
            >
              <RefreshCw size={16} className="animate-spin text-indigo-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Mentor de Estudos IA:</span> {loadingStep}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de Cards de Estudo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeSubTab === 'generated' ? (
            generatedStudies.length > 0 ? (
              <div className="grid grid-cols-1 gap-5">
                {generatedStudies.map(item => {
                  const isSaved = savedStudies.some(s => s.id === item.id);
                  return (
                    <StudyCard
                      key={item.id}
                      item={item}
                      isSaved={isSaved}
                      copied={copiedId === item.id}
                      isDeepening={deepeningId === item.id}
                      onCopy={() => handleCopyStudy(item)}
                      onToggleSave={() => handleToggleSave(item)}
                      onDeepen={() => handleDeepenStudy(item)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3 bg-white/[0.01] rounded-3xl border border-dashed border-white/5 p-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <GraduationCap size={24} />
                </div>
                <h3 className="text-base font-bold text-white">Pronto para mapear seus próximos estudos</h3>
                <p className="text-xs text-text-muted max-w-lg mx-auto leading-relaxed">
                  Selecione acima <strong className="text-indigo-400">Todos os Pacientes</strong> ou um <strong className="text-indigo-400">Paciente Específico</strong>, escolha quantas sessões explorar e clique em <strong className="text-white">"Mapear Onde Aprofundar"</strong>. A IA vai apontar recortes avançados, melhorias de psicoeducação, outras formas de entrar e livros específicos.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Sparkles size={14} /> Gerar Radar de Estudos Agora
                  </button>
                </div>
              </div>
            )
          ) : savedStudies.length > 0 ? (
            <div className="grid grid-cols-1 gap-5">
              {savedStudies.map(item => (
                <StudyCard
                  key={item.id}
                  item={item}
                  isSaved={true}
                  copied={copiedId === item.id}
                  isDeepening={deepeningId === item.id}
                  onCopy={() => handleCopyStudy(item)}
                  onToggleSave={() => handleRemoveSaved(item.id)}
                  onDeepen={() => handleDeepenStudy(item)}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-2 bg-white/[0.01] rounded-3xl border border-dashed border-white/5 p-6">
              <Bookmark size={28} className="text-text-muted/30 mx-auto" />
              <h3 className="text-sm font-bold text-white">Sua biblioteca de estudos salvos está vazia</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Salve aqui os recortes de estudo, referências de livros e aulas de aprofundamento para consultar quando for estudar.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3.5 px-6 bg-black/40 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>
              100% Ético e Leve: analisa os relatos e cápsulas técnicas de manejo sem armazenar transcrições brutas.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudyCard({
  item,
  isSaved,
  copied,
  isDeepening,
  onCopy,
  onToggleSave,
  onDeepen,
}: {
  item: StudyRadarItem;
  isSaved: boolean;
  copied: boolean;
  isDeepening: boolean;
  onCopy: () => void;
  onToggleSave: () => void;
  onDeepen: () => void;
}) {
  const [showLesson, setShowLesson] = useState(true);

  return (
    <div className="bg-[#161b24] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl transition-all">
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-white/5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/25">
              {item.category}
            </span>
            {item.patientContextLabel && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-text-muted text-[10px] font-medium">
                {item.patientContextLabel}
              </span>
            )}
            <span className="text-[10px] text-text-muted/60">{item.createdAt}</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={onToggleSave}
            className={cn(
              'p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border cursor-pointer',
              isSaved
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/5 text-text-muted hover:text-white hover:bg-white/10'
            )}
            title={isSaved ? 'Remover dos estudos salvos' : 'Salvar na minha trilha de estudos'}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            <span className="text-[11px] font-medium hidden sm:inline">
              {isSaved ? 'Salvo' : 'Salvar Estudo'}
            </span>
          </button>

          <button
            onClick={onCopy}
            className={cn(
              'px-3 py-2 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 border cursor-pointer',
              copied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'
            )}
            title="Copiar resumo completo do estudo"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="text-[11px]">{copied ? 'Copiado!' : 'Copiar Guia'}</span>
          </button>
        </div>
      </div>

      {/* Grid 1: Onde você já vai bem vs Onde Aprofundar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-950/20 rounded-xl p-4 border border-emerald-500/15 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>Onde você já tem facilidade & bom manejo</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {item.whatYouAlreadyMaster}
          </p>
        </div>

        <div className="bg-indigo-950/25 rounded-xl p-4 border border-indigo-500/25 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wide">
            <Target size={14} className="shrink-0 text-indigo-400" />
            <span>Onde Aprofundar (O Ponto Além do Básico)</span>
          </div>
          <p className="text-xs text-indigo-100/90 leading-relaxed font-medium">
            {item.whereToDeepen}
          </p>
        </div>
      </div>

      {/* Bloco 2: Como elevar a Psicoeducação */}
      <div className="bg-gradient-to-r from-amber-950/30 via-black/30 to-black/30 rounded-xl p-4 border border-amber-500/20 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
          <Lightbulb size={14} className="text-amber-400 shrink-0" />
          <span>Como Melhorar a Psicoeducação (Explicação Viva & Metáfora)</span>
        </div>
        <p className="text-xs text-amber-100/90 leading-relaxed">
          {item.psychoeducationImprovement}
        </p>
      </div>

      {/* Grid 3: Outras Formas de Entrar + Onde Estudar (Livros/Capítulos) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
        {/* Outras formas de entrar */}
        <div className="md:col-span-6 bg-black/30 rounded-xl p-4 border border-white/5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wide">
            <Compass size={14} className="text-sky-400 shrink-0" />
            <span>Outras Formas de Entrar (Quando Trava)</span>
          </div>
          <div className="space-y-2">
            {(item.alternativeApproaches || []).map((route, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-text-main leading-relaxed">
                <span className="text-sky-400 font-bold mt-0.5">•</span>
                <span>{route}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Livros e Referências */}
        <div className="md:col-span-6 bg-black/30 rounded-xl p-4 border border-white/5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wide">
            <BookOpen size={14} className="text-purple-400 shrink-0" />
            <span>Onde Estudar (Livros, Autores & Capítulos)</span>
          </div>
          <div className="space-y-2.5">
            {(item.bookAndStudyRecommendations || []).map((book, i) => (
              <div key={i} className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5 space-y-1">
                <p className="text-xs font-bold text-purple-200">{book.reference}</p>
                <p className="text-[11px] text-text-muted leading-relaxed">{book.whyAndWhatToRead}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botão / Seção de Aula Prática de Aprofundamento na Hora */}
      <div className="pt-2 border-t border-white/5">
        {!item.deepDiveLesson ? (
          <button
            onClick={onDeepen}
            disabled={isDeepening}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeepening ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Preparando Mini-Aula Avançada e Scripts de Sessão...</span>
              </>
            ) : (
              <>
                <GraduationCap size={15} />
                <span>🎓 Aprofundar Agora: Gerar Mini-Aula Prática + Exemplos de Fala para Sessão</span>
              </>
            )}
          </button>
        ) : (
          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <GraduationCap size={16} className="text-indigo-400" />
                <span>Mini-Aula de Aprofundamento & Scripts Práticos</span>
              </div>
              <button
                onClick={() => setShowLesson(!showLesson)}
                className="text-xs text-text-muted hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showLesson ? (
                  <>
                    <span>Recolher</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Expandir Aula</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>

            {showLesson && (
              <div className="markdown-content text-xs text-text-main leading-relaxed space-y-2 pt-2 border-t border-white/5">
                <ReactMarkdown>{item.deepDiveLesson}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
