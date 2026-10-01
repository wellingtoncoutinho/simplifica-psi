import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  RefreshCw, 
  Lightbulb, 
  MessageSquareQuote, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  AlertCircle,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { Patient } from '../types';
import { cn } from '../lib/utils';

export interface ContentIdea {
  id: string;
  painTitle: string;
  category: string;
  youDoThis: string;
  youFeelThis: string;
  therapeuticInsight: string;
  hookSuggestions: string[];
  quoteOrAnalogy: string;
  createdAt: string;
  isSaved?: boolean;
}

interface ContentIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
}

const THEME_OPTIONS = [
  { id: 'all', label: 'Todos os Eixos Clínicos' },
  { id: 'impor-limites', label: 'Dificuldade de se Impor & Dizer Não' },
  { id: 'decisao-inseguranca', label: 'Paralisia Decisória & Medo de Errar' },
  { id: 'autocobranca-perfeccionismo', label: 'Autocobrança, Perfeccionismo & Impostor' },
  { id: 'sono-sobrecarga', label: 'Insônia, Sobrecarga Mental & Culpa ao Descansar' },
  { id: 'relacionamentos-abandono', label: 'Relações, Dependência & Medo de Rejeição' },
];

const TIMEFRAME_OPTIONS = [
  { id: '30', label: 'Últimos 30 dias (Recomendado)' },
  { id: '60', label: 'Últimos 60 dias' },
  { id: 'all_recent', label: 'Últimas 3 sessões de cada paciente' },
];

async function generateContentWithFallback(
  ai: any,
  options: {
    model?: string;
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ];
  
  const modelQueue = options.model 
    ? [options.model, ...modelsToTry.filter(m => m !== options.model)]
    : modelsToTry;

  let lastError: any = null;

  for (const model of modelQueue) {
    let attempts = 2;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[ContentIdeas] Trying Gemini model: ${model} (attempt ${attempt}/${attempts})`);
        const response = await ai.models.generateContent({
          ...options,
          model: model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        console.warn(`[ContentIdeas] Error on model ${model} (attempt ${attempt}):`, msg);
        
        const isTransient = 
          msg.includes('503') || 
          msg.includes('UNAVAILABLE') || 
          msg.includes('high demand') ||
          msg.includes('429') || 
          msg.includes('RESOURCE_EXHAUSTED') || 
          msg.includes('quota');

        if (isTransient && attempt < attempts) {
          const waitMs = msg.includes('429') ? 2000 : 500 * attempt;
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Falha ao comunicar com os modelos Gemini.");
}

export default function ContentIdeasModal({ isOpen, onClose, patients }: ContentIdeasModalProps) {
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [timeframe, setTimeframe] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'generated' | 'saved'>('generated');
  const [generatedIdeas, setGeneratedIdeas] = useState<ContentIdea[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<ContentIdea[]>(() => {
    try {
      const stored = localStorage.getItem('simplepsi_saved_content_ideas');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState(() => {
    return localStorage.getItem('simplepsi_gemini_api_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  // Sincronizar savedIdeas no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('simplepsi_saved_content_ideas', JSON.stringify(savedIdeas));
    } catch (e) {
      console.error('Falha ao salvar ideias no localStorage:', e);
    }
  }, [savedIdeas]);

  // Contagem de pacientes e evoluções elegíveis
  const eligibleStats = useMemo(() => {
    const active = patients.filter(p => p.status === 'Ativo');
    let totalEvolucoes = 0;
    active.forEach(p => {
      totalEvolucoes += (p.clinicalData?.evoluções || []).length;
    });
    return { activeCount: active.length, totalEvolucoes };
  }, [patients]);

  const handleCopyIdea = (idea: ContentIdea) => {
    const text = `PADRÃO / DOR INVISÍVEL: ${idea.painTitle} [${idea.category}]

O COMPORTAMENTO COTIDIANO ("Você faz isso"):
${idea.youDoThis}

A DOR INTERNA OCULTA ("Você sente isso"):
${idea.youFeelThis}

A VIRADA TERAPÊUTICA (Reflexão clínica):
${idea.therapeuticInsight}

GANCHOS DE ABERTURA / SUGESTÕES DE TÍTULO:
${idea.hookSuggestions.map(h => `- ${h}`).join('\n')}

METÁFORA / ANALOGIA PRÁTICA:
${idea.quoteOrAnalogy}`;

    navigator.clipboard.writeText(text);
    setCopiedId(idea.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleSave = (idea: ContentIdea) => {
    const exists = savedIdeas.some(s => s.id === idea.id);
    if (exists) {
      setSavedIdeas(prev => prev.filter(s => s.id !== idea.id));
    } else {
      setSavedIdeas(prev => [{ ...idea, isSaved: true }, ...prev]);
    }
  };

  const handleRemoveSaved = (id: string) => {
    setSavedIdeas(prev => prev.filter(s => s.id !== id));
  };

function parseCustomDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

  const handleGenerate = async (overrideKey?: any) => {
    const passedKey = typeof overrideKey === 'string' ? overrideKey : '';
    const keyToUse = (passedKey || import.meta.env.VITE_GEMINI_API_KEY || customApiKey || localStorage.getItem('simplepsi_gemini_api_key') || '').trim();
    if (!keyToUse) {
      setShowKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setLoadingStep("Varrendo queixas e evoluções recentes dos pacientes...");

    try {
      const patientList = Array.isArray(patients) ? patients : [];
      const activePatients = patientList.filter(p => !p.status || p.status === 'Ativo' || p.status === 'ativo');
      if (activePatients.length === 0) {
        alert("Nenhum paciente encontrado para analisar.");
        setIsGenerating(false);
        return;
      }

      // Preparação dos dados anonimizados
      const now = new Date();
      const timeframeDays = timeframe === '30' ? 30 : timeframe === '60' ? 60 : null;
      const cutoffDate = timeframeDays 
        ? new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000) 
        : null;

      const anonymizedCases: string[] = [];

      activePatients.forEach((patient, idx) => {
        const caseNumber = idx + 1;
        const mainComplaint = patient.mainComplaint?.trim() || '';
        const problemList = patient.clinicalData?.tccData?.problemList?.trim() || '';
        const smartPatterns = patient.clinicalData?.smartNotes?.padroes?.trim() || '';

        const allEvolucoes = patient.clinicalData?.evoluções || [];
        let filteredEvolucoes = allEvolucoes;
        
        if (cutoffDate) {
          const matching = allEvolucoes.filter(e => {
            if (!e.date) return false;
            const parsed = parseCustomDate(e.date);
            return parsed && parsed >= cutoffDate;
          });
          // Se encontrou dentro do período, usa; se não, pega as últimas 2 para não perder o contexto
          filteredEvolucoes = matching.length > 0 ? matching : allEvolucoes.slice(-2);
        } else {
          filteredEvolucoes = allEvolucoes.slice(-3);
        }

        // Filtra notas puramente burocráticas
        const usefulNotes = filteredEvolucoes
          .map(e => e.note?.trim() || '')
          .filter(note => {
            if (note.length < 10) return false;
            const lower = note.toLowerCase();
            if (lower.startsWith('pix') || lower.startsWith('comprovante')) return false;
            return true;
          })
          .slice(-3);

        // Se tem qualquer dado relevante, compila
        if (mainComplaint || problemList || smartPatterns || usefulNotes.length > 0) {
          const notesText = usefulNotes.length > 0 
            ? usefulNotes.map((n, i) => `   - Registro ${i+1}: ${n}`).join('\n')
            : '   (Sem notas recentes registradas)';

          anonymizedCases.push(`
CASO CLÍNICO #${caseNumber}:
- Queixa Principal: ${mainComplaint || 'Não especificada'}
- Lista de Problemas/Metas: ${problemList || 'Não especificada'}
- Padrões Comportamentais: ${smartPatterns || 'Não especificados'}
- Trechos e Relatos Recentes de Sessão:
${notesText}
`.trim());
        }
      });

      if (anonymizedCases.length === 0) {
        alert("Não encontramos anotações clínicas suficientes nos pacientes ativos para extrair padrões.");
        setIsGenerating(false);
        return;
      }

      setLoadingStep("Cruzando padrões emocionais e filtrando dores invisíveis...");

      const themePromptPart = selectedTheme !== 'all' 
        ? `FOCO TEMÁTICO PRIORITÁRIO: Por favor, dê prioridade máxima para identificar nuances dentro do tema "${THEME_OPTIONS.find(t => t.id === selectedTheme)?.label}".`
        : `FOCO TEMÁTICO: Identifique os temas mais recorrentes e universais que emergem espontaneamente dos casos.`;

      const prompt = `
Você é um psicólogo clínico experiente com vasta prática terapêutica e um dos maiores especialistas em produção de conteúdo psicoeducativo e de identificação ("efeito espelho") para redes sociais (Instagram, Reels, Carrosséis).

Seu objetivo é analisar os fragmentos clínicos reais (100% anonimizados) de diversos pacientes em terapia e identificar **dores invisíveis, contradições cotidianas e paradoxos comportamentais** que mais se repetem.

${themePromptPart}

---
CASOS CLÍNICOS ANONIMIZADOS PARA ANÁLISE:
${anonymizedCases.join('\n\n')}
---

DIRETRIZES FUNDAMENTAIS DE CONTEÚDO (LEIA COM ATENÇÃO):
1. **O que é uma "Dor Invisível"?**: É algo que o paciente sente ou faz no dia a dia, mas ele nunca parou para refletir ou não sabe colocar em palavras. Não é um diagnóstico abstrato ("depressão", "TOC"), é a CENA PRÁTICA da vida dele.
   - Exemplo clássico: Ter dificuldade de se impor e inventar uma desculpa gigante ou passar mal de ansiedade só para não ir a um aniversário.
   - Exemplo: Paralisia de decisão, onde a pessoa pede opinião para 5 pessoas diferentes porque tem pavor de arcar com a responsabilidade de errar sozinha.
   - Exemplo: A pessoa que é hiperfuncional no trabalho, mas quando deita a cabeça no travesseiro rumina cada frase dita durante o dia.
2. **A "Reflexão de Choque" / Virada Terapêutica**: Aquela frase ou reflexão cirúrgica que o terapeuta traz na sessão e o paciente fica em silêncio pensando: *"Nossa, você me descreveu perfeitamente, nunca tinha pensado nisso por esse lado"*.
3. **NUNCA crie posts prontos com introduçãozinha boba**: Não escreva "Olá pessoal, hoje vamos falar sobre...". Gere insights puros, ricos e profundos.
4. **SIGILO ABSOLUTO**: Sob nenhuma hipótese use nomes, detalhes biográficos ou fatos identificáveis. Abstraia apenas o mecanismo psicológico humano universal.

RETORNE ESTRITAMENTE UM JSON no seguinte formato (sem markdown, sem blocos explicativos antes ou depois):
{
  "ideas": [
    {
      "id": "idea_1",
      "painTitle": "Título curto e instigante da dor invisível",
      "category": "Nome da Categoria (ex: Limites & Assertividade, Ansiedade & Decisão, Autocobrança, Relações)",
      "youDoThis": "Descrição vívida e realista do comportamento observável ('Você faz isso')",
      "youFeelThis": "A dor interna, o medo inconsciente e a angústia oculta ('Você sente isso')",
      "therapeuticInsight": "A reflexão terapêutica profunda / virada de chave para confrontar com acolhimento",
      "hookSuggestions": [
        "Gancho 1 em formato de pergunta ou provocação de abertura",
        "Gancho 2 alternativo focado na cena do dia a dia"
      ],
      "quoteOrAnalogy": "Uma analogia cotidiana ou metáfora simples que ilustre o ponto de forma brilhante"
    }
  ]
}

Gere entre 4 e 6 ideias profundas, diversificadas e ricas. Retorne APENAS o JSON válido.
`;

      setLoadingStep("Escrevendo reflexões e sintetizando viradas terapêuticas com IA...");

      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        }
      });

      const rawText = response?.text || '{}';
      let parsed: { ideas: ContentIdea[] } = { ideas: [] };
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        console.error("Falha ao analisar JSON retornado:", rawText, parseErr);
        // Tenta extrair bloco JSON se houver
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Não foi possível decodificar o resultado da IA.");
        }
      }

      if (parsed.ideas && Array.isArray(parsed.ideas)) {
        const enrichedIdeas = parsed.ideas.map((item, i) => ({
          ...item,
          id: `idea_${Date.now()}_${i}`,
          createdAt: new Date().toLocaleDateString('pt-BR'),
          isSaved: false
        }));
        setGeneratedIdeas(enrichedIdeas);
        setActiveSubTab('generated');
      } else {
        throw new Error("Formato de retorno inválido da IA.");
      }

    } catch (err: any) {
      console.error("Erro ao gerar ideias de conteúdo:", err);
      alert(`Erro ao processar as sessões: ${err.message || 'Tente novamente em instantes.'}`);
    } finally {
      setIsGenerating(false);
      setLoadingStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#121614] border border-emerald-500/20 max-w-5xl w-full rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-text-main relative">
        
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-950/30 via-transparent to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                <Lightbulb size={20} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Laboratório de Conteúdo & Dores Clínicas
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                <ShieldCheck size={12} /> Exclusivo Wellington
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
              Cruza queixas, conflitos e relatos recentes das sessões para extrair <strong className="text-emerald-400 font-semibold">dores invisíveis</strong> e reflexões de alta identificação para suas redes — 100% anonimizado e sem violar o sigilo.
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

        {/* Barra de Filtros e Disparo */}
        <div className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Eixo Temático */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-xl">
              <SlidersHorizontal size={14} className="text-emerald-400" />
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                disabled={isGenerating}
                aria-label="Filtro de Eixo Clínico"
                className="bg-transparent text-text-main text-xs font-medium focus:outline-none cursor-pointer pr-2"
              >
                {THEME_OPTIONS.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#1a201c] text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Janela de Tempo */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] text-text-muted">Período:</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                disabled={isGenerating}
                aria-label="Filtro de Período das Sessões"
                className="bg-transparent text-text-main text-xs font-medium focus:outline-none cursor-pointer pr-2"
              >
                {TIMEFRAME_OPTIONS.map(tf => (
                  <option key={tf.id} value={tf.id} className="bg-[#1a201c] text-white">
                    {tf.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Contador sutil */}
            <div className="text-[11px] text-text-muted/70 hidden md:block">
              Base: <strong className="text-emerald-400 font-semibold">{eligibleStats.activeCount} pacientes ativos</strong> analisados
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Alternador de Abas Internas */}
            <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveSubTab('generated')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  activeSubTab === 'generated'
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-text-muted hover:text-white"
                )}
              >
                Novas Ideias ({generatedIdeas.length})
              </button>
              <button
                onClick={() => setActiveSubTab('saved')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  activeSubTab === 'saved'
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-text-muted hover:text-white"
                )}
              >
                <Bookmark size={13} />
                Banco Salvo ({savedIdeas.length})
              </button>
            </div>

            {/* Botão de Geração */}
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all",
                isGenerating 
                  ? "bg-emerald-500/30 text-emerald-200 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-emerald-300" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Cruzar Sessões & Gerar Ideias</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading Banner Dinâmico */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-3 overflow-hidden text-xs text-emerald-300"
            >
              <RefreshCw size={16} className="animate-spin text-emerald-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Processando com IA:</span> {loadingStep}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conteúdo Principal / Lista de Ideias */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeSubTab === 'generated' ? (
            generatedIdeas.length > 0 ? (
              <div className="grid grid-cols-1 gap-5">
                {generatedIdeas.map((idea) => {
                  const isSaved = savedIdeas.some(s => s.id === idea.id);
                  return (
                    <IdeaCard 
                      key={idea.id}
                      idea={idea}
                      isSaved={isSaved}
                      copied={copiedId === idea.id}
                      onCopy={() => handleCopyIdea(idea)}
                      onToggleSave={() => handleToggleSave(idea)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3 bg-white/[0.01] rounded-3xl border border-dashed border-white/5 p-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/15">
                  <Lightbulb size={24} />
                </div>
                <h3 className="text-base font-bold text-white">Nenhum insight gerado ainda</h3>
                <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                  Clique no botão <strong className="text-emerald-400 font-semibold">"Cruzar Sessões & Gerar Ideias"</strong> acima para a IA analisar de forma inteligente as notas recentes dos seus pacientes ativos e extrair padrões e ganchos de identificação.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => handleGenerate()}
                    disabled={isGenerating}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Sparkles size={14} /> Começar Análise Agora
                  </button>
                </div>
              </div>
            )
          ) : (
            savedIdeas.length > 0 ? (
              <div className="grid grid-cols-1 gap-5">
                {savedIdeas.map((idea) => (
                  <IdeaCard 
                    key={idea.id}
                    idea={idea}
                    isSaved={true}
                    copied={copiedId === idea.id}
                    onCopy={() => handleCopyIdea(idea)}
                    onToggleSave={() => handleRemoveSaved(idea.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-2 bg-white/[0.01] rounded-3xl border border-dashed border-white/5 p-6">
                <Bookmark size={28} className="text-text-muted/30 mx-auto" />
                <h3 className="text-sm font-bold text-white">Seu banco de ideias salvas está vazio</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Quando gerar ideias, clique no ícone de marcador para guardá-las aqui e consultá-las sempre que for gravar ou escrever posts.
                </p>
              </div>
            )
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3.5 px-6 bg-black/40 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Totalmente seguro: todos os nomes e dados sensíveis são removidos antes da análise da IA.</span>
          </div>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}

function IdeaCard({
  idea,
  isSaved,
  copied,
  onCopy,
  onToggleSave
}: {
  idea: ContentIdea;
  isSaved: boolean;
  copied: boolean;
  onCopy: () => void;
  onToggleSave: () => void;
}) {
  return (
    <div className="bg-[#171d19] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl transition-all group">
      
      {/* Topo do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
              {idea.category}
            </span>
            <span className="text-[10px] text-text-muted/60">
              {idea.createdAt}
            </span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            {idea.painTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={onToggleSave}
            className={cn(
              "p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border",
              isSaved
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-white/5 border-white/5 text-text-muted hover:text-white hover:bg-white/10"
            )}
            title={isSaved ? "Remover dos salvos" : "Salvar no banco pessoal"}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            <span className="text-[11px] font-medium hidden sm:inline">{isSaved ? "Salvo" : "Salvar"}</span>
          </button>

          <button
            onClick={onCopy}
            className={cn(
              "px-3 py-2 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 border",
              copied 
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30"
            )}
            title="Copiar estrutura completa"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="text-[11px]">{copied ? "Copiado!" : "Copiar Roteiro"}</span>
          </button>
        </div>
      </div>

      {/* Grid de Seções: O Comportamento e A Dor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Você faz isso */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
            <Eye size={14} className="text-amber-400" />
            <span>O Comportamento Cotidiano ("Você faz isso")</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed font-sans">
            {idea.youDoThis}
          </p>
        </div>

        {/* Você sente isso */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wide">
            <AlertCircle size={14} className="text-rose-400" />
            <span>A Dor Oculta Invisível ("Você sente isso")</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed font-sans">
            {idea.youFeelThis}
          </p>
        </div>
      </div>

      {/* A Virada Terapêutica / O que você fala na sessão */}
      <div className="bg-gradient-to-r from-emerald-950/40 to-black/40 rounded-xl p-4 border border-emerald-500/20 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
          <Sparkles size={14} /> A Virada Terapêutica (Reflexão de Sessão)
        </div>
        <p className="text-xs text-emerald-100/90 leading-relaxed font-medium italic">
          "{idea.therapeuticInsight}"
        </p>
      </div>

      {/* Ganchos e Analogia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
        {/* Ganchos */}
        <div className="md:col-span-2 bg-white/[0.02] rounded-xl p-3 border border-white/5 space-y-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
            Ganchos de Abertura / Ideias de Título:
          </span>
          <div className="space-y-1.5">
            {idea.hookSuggestions.map((hook, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-text-main group/hook">
                <span className="text-emerald-400 font-bold">•</span>
                <span className="flex-1 font-medium">{hook}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(hook)}
                  className="opacity-0 group-hover/hook:opacity-100 transition-opacity p-1 text-text-muted hover:text-emerald-400"
                  title="Copiar apenas este gancho"
                >
                  <Copy size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Analogia */}
        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 space-y-1.5">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
            Metáfora / Analogia Prática:
          </span>
          <p className="text-[11px] text-text-muted leading-relaxed italic">
            "{idea.quoteOrAnalogy}"
          </p>
        </div>
      </div>

    </div>
  );
}
