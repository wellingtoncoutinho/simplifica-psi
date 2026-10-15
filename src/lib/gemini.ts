import { GoogleGenAI } from '@google/genai';

/**
 * Lista de chaves sabidamente suspensas ou revogadas pela Google Cloud.
 * Impede que o frontend quebre caso uma chave antiga ainda esteja gravada
 * em variáveis de ambiente na Vercel ou no localStorage do navegador.
 */
const SUSPENDED_KEYS = new Set([
  'AIzaSyAMCIOPEy1gMJUtJq4SM_r9ZWfbQFFH648',
]);

/**
 * Chave ativa padrão do SimplePsi no Google AI Studio (verificada e ativa).
 */
export const DEFAULT_ACTIVE_GEMINI_KEY = 'AIzaSyDjrxSHcdWHamCwgwNniBueEll_XrM7A3Q';

/**
 * Obtém a chave de API segura do Gemini:
 * 1. Chave personalizada passada por parâmetro (se não estiver suspensa)
 * 2. Chave salva pelo usuário no localStorage (se não estiver suspensa)
 * 3. Chave configurada no ambiente VITE_GEMINI_API_KEY (se não estiver suspensa)
 * 4. Fallback automático para a chave ativa padrão do SimplePsi
 */
export function getGeminiApiKey(customKey?: string): string {
  const custom = (customKey || '').trim();
  if (custom && !SUSPENDED_KEYS.has(custom)) {
    return custom;
  }

  const userStoredKey = (typeof window !== 'undefined' ? (localStorage.getItem('simplepsi_gemini_api_key') || '') : '').trim();
  if (userStoredKey && !SUSPENDED_KEYS.has(userStoredKey)) {
    return userStoredKey;
  }

  const envKey = (import.meta.env?.VITE_GEMINI_API_KEY || '').trim();
  if (envKey && !SUSPENDED_KEYS.has(envKey)) {
    return envKey;
  }

  return DEFAULT_ACTIVE_GEMINI_KEY;
}

/**
 * Executa uma chamada à API do Gemini com fallback ordenado de modelos
 * e auto-recuperação caso a chave seja temporariamente rejeitada.
 */
export async function generateGeminiContentWithFallback(
  aiOrKey: any,
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

  const requestedModel = (options.model && !options.model.includes('2.5') && !options.model.includes('2.0') && !options.model.includes('1.5'))
    ? options.model
    : "gemini-3.5-flash";

  const modelQueue = [
    requestedModel,
    ...modelsToTry.filter(m => m !== requestedModel)
  ];

  let ai = aiOrKey;
  if (typeof aiOrKey === 'string' || !aiOrKey) {
    const key = getGeminiApiKey(typeof aiOrKey === 'string' ? aiOrKey : undefined);
    ai = new GoogleGenAI({ apiKey: key });
  }

  let lastError: any = null;

  for (const model of modelQueue) {
    let attempts = 2;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...options,
          model: model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);

        // Se o erro for de suspensão de chave (403 CONSUMER_SUSPENDED / PERMISSION_DENIED), tenta trocar para a chave padrão
        if (msg.includes('CONSUMER_SUSPENDED') || msg.includes('has been suspended') || msg.includes('PERMISSION_DENIED')) {
          console.warn('[Gemini] Chave suspensa detectada, alternando para a chave ativa de fallback...');
          ai = new GoogleGenAI({ apiKey: DEFAULT_ACTIVE_GEMINI_KEY });
        }

        const isTransient = 
          msg.includes('503') || 
          msg.includes('UNAVAILABLE') || 
          msg.includes('high demand') ||
          msg.includes('429') || 
          msg.includes('RESOURCE_EXHAUSTED') || 
          msg.includes('quota');

        if (isTransient && attempt < attempts) {
          const waitMs = msg.includes('429') ? 2000 : 600 * attempt;
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Falha ao comunicar com os modelos Gemini.");
}
