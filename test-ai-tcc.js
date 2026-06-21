import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function run() {
  const promptInstructions = `
        INSTRUÇÕES — retorne SOMENTE o JSON, sem markdown, sem texto extra. O JSON deve ter EXATAMENTE esta estrutura na raiz:
        {
          "lifeHistory": "narrativa em 4-6 parágrafos densos (mín. 500 palavras) separados por \\n, cobrindo infância, dinâmica familiar, adolescência, vida afetiva, carreira e estressores atuais.",
          "problemList": "mín. 8 problemas clínicos específicos separados por ;\\n",
          "diagnosisAndMeds": "Hipótese diagnóstica de... — NUNCA diagnóstico definitivo.",
          "beliefs": [
            {
              "title": "Nome Curto da Crença (ex: Desamparo)",
              "coreBelief": "Nome da Crença.\\nSobre si mesmo: \\"frase1\\".\\nSobre os outros: \\"frase1\\".\\nSobre o futuro: \\"frase\\".",
              "intermediateBelief": "Regras:\\n\\"Regra 1.\\"\\n\\"Regra 2.\\"\\n\\"Regra 3.\\"\\n\\"Regra 4.\\"\\n\\"Regra 5.\\"\\nPressupostos:\\n\\"Se... então....\\"\\n\\"Se... então....\\"",
              "activatingSituations": "5+ gatilhos separados por \\n",
              "compensatoryStrategies": "4+ estratégias separadas por \\n",
              "goals": "metas terapêuticas separadas por / ",
              "strengths": "recursos e pontos fortes do paciente",
              "situations": [
                { "situation": "...", "automaticThought": "...", "meaning": "...", "emotion": "...", "behavior": "..." },
                { "situation": "...", "automaticThought": "...", "meaning": "...", "emotion": "...", "behavior": "..." },
                { "situation": "...", "automaticThought": "...", "meaning": "...", "emotion": "...", "behavior": "..." }
              ]
            }
          ]
        }
        (Gere até 3 objetos dentro do array 'beliefs')
      `;
      
      const prompt = `
        Você é um terapeuta TCC sênior especialista em conceitualização cognitiva de Judith Beck.
        Gere uma Conceitualização Cognitiva completa em português com base no contexto clínico abaixo.

        CONTEXTO CLÍNICO DO PACIENTE:
        PACIENTE: Teste da Silva
        HISTÓRIA DE VIDA: Nasceu no interior. Teve problemas com os pais. Atualmente ansioso.
        LISTA DE PROBLEMAS: Ansiedade, medo, insegurança.
        DIAGNÓSTICO E MEDICAMENTOS: Não toma remédios.

        ---
        ${promptInstructions}
      `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      }
    });
    console.log("Raw Response:");
    console.log(response.text);
    
    // Try to parse
    try {
        JSON.parse(response.text);
        console.log("JSON is valid!");
    } catch(e) {
        console.error("JSON PARSE ERROR:", e.message);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
