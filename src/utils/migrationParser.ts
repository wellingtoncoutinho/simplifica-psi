import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from '@google/genai';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Patient } from '../types';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ImportedEvolutionPreview {
  id?: string;
  sessionNumber: number;
  date: string;
  time?: string;
  note: string;
}

export interface ImportedPatientPreview {
  tempId: string;
  selected: boolean;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  profession?: string;
  address?: string;
  mainComplaint?: string;
  lifeHistory?: string;
  familyHistory?: string;
  currentMedication?: string;
  emergencyContact?: string;
  sessionAmount?: number;
  sessionDay?: string;
  sessionTime?: string;
  modality?: 'Online' | 'Presencial';
  evolucoes: ImportedEvolutionPreview[];
  isExpanded?: boolean;
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => item.str || '')
        .filter((s: string) => s.length > 0);
      fullText += `\n[PÁGINA ${pageNum} - ${file.name}]\n` + pageStrings.join(' ') + '\n';
    }
    return fullText.trim();
  } catch (error: any) {
    console.error('Erro ao extrair texto do PDF:', error);
    throw new Error(`Falha ao ler o PDF "${file.name}": ${error.message || 'Arquivo protegido ou inválido'}`);
  }
}

export function extractTextFromPlainFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error(`Erro ao ler o arquivo "${file.name}"`));
    reader.readAsText(file);
  });
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileNameLower = file.name.toLowerCase();
  if (fileNameLower.endsWith('.pdf')) {
    return extractTextFromPdfFile(file);
  }
  return extractTextFromPlainFile(file);
}

function safeJsonClean(rawText: string): any {
  let sanitized = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  
  const firstBrace = sanitized.indexOf('{');
  const firstBracket = sanitized.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = sanitized.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = sanitized.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    sanitized = sanitized.slice(startIdx, endIdx + 1);
  }

  // Handle escaping control chars
  let inString = false;
  let escaped = false;
  let cleaned = '';
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    if (inString) {
      if (char === '\n') cleaned += '\\n';
      else if (char === '\r') cleaned += '\\r';
      else if (char === '\t') cleaned += '\\t';
      else cleaned += char;
    } else {
      cleaned += char;
    }
    if (char === '\\' && !escaped) escaped = true;
    else escaped = false;
  }
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(cleaned);
}

export async function parseMigrationDataWithGemini(
  extractedText: string,
  apiKey: string
): Promise<ImportedPatientPreview[]> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Você é um especialista em migração de dados clínicos para a plataforma SimplePsi (prontuários psicológicos).
Analise o texto a seguir extraído de relatórios, prontuários, planilhas ou documentos clínicos (exportados de qualquer sistema de psicologia ou anotações de consultório).

TEXTO BRUTO EXTRAÍDO:
---
${extractedText}
---

SUA MISSÃO:
Identificar com máxima precisão cada paciente presente no texto, seus dados cadastrais e TODO o histórico de relatos de sessões/evoluções clínicas registradas.

REGRAS:
1. Extraia o nome completo de cada paciente encontrado.
2. Identifique dados cadastrais disponíveis: CPF, telefone/WhatsApp, e-mail, data de nascimento (formato YYYY-MM-DD ou DD/MM/YYYY), profissão, gênero, endereço, queixa principal (mainComplaint), histórico de vida/anamnese (lifeHistory), histórico familiar (familyHistory), medicamentos em uso (currentMedication), contato de emergência.
3. Extraia TODOS os relatos de sessões/evoluções clínicas (evolucoes). Para cada uma:
   - sessionNumber: número sequencial (1, 2, 3...)
   - date: data da sessão no formato YYYY-MM-DD ou DD/MM/YYYY
   - time: horário da sessão se houver (ex: 14:00) ou deixe ""
   - note: O relato CLÍNICO COMPLETO e INTEGRAL da evolução (transcreva fielmente sem resumir ou cortar dados importantes do atendimento!).
4. Se o texto contiver múltiplos pacientes, retorne todos no array "patients".
5. Se o texto contiver apenas 1 paciente com várias sessões, retorne o paciente com todas as sessões listadas.

Retorne EXCLUSIVAMENTE um objeto JSON no formato:
{
  "patients": [
    {
      "name": "Nome Completo",
      "cpf": "123.456.789-00",
      "phone": "(11) 98765-4321",
      "email": "email@exemplo.com",
      "birthDate": "1992-08-15",
      "gender": "Feminino",
      "profession": "Advogada",
      "address": "Av. Paulista, 1000",
      "mainComplaint": "Sintomas de ansiedade e sobrecarga profissional",
      "lifeHistory": "Histórico geral de vida relatado",
      "familyHistory": "Histórico familiar relevante",
      "currentMedication": "Fluoxetina 20mg",
      "emergencyContact": "Irmão (11) 98888-8888",
      "sessionAmount": 160,
      "sessionDay": "Terça-feira",
      "sessionTime": "15:00",
      "modality": "Online",
      "evolucoes": [
        {
          "sessionNumber": 1,
          "date": "2024-02-10",
          "time": "15:00",
          "note": "Relato detalhado da evolução da primeira sessão..."
        }
      ]
    }
  ]
}
`;

  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash-lite'
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '';
      const parsed = safeJsonClean(responseText);
      const rawPatients = Array.isArray(parsed) ? parsed : (parsed.patients || []);

      const result: ImportedPatientPreview[] = rawPatients
        .filter((p: any) => p && typeof p.name === 'string' && p.name.trim().length > 0)
        .map((p: any, pIndex: number) => ({
          tempId: `mig_${Date.now()}_${pIndex}_${Math.random().toString(36).substring(2, 6)}`,
          selected: true,
          name: p.name.trim(),
          cpf: p.cpf || '',
          phone: p.phone || '',
          email: p.email || '',
          birthDate: p.birthDate || '',
          gender: p.gender || '',
          profession: p.profession || '',
          address: p.address || '',
          mainComplaint: p.mainComplaint || '',
          lifeHistory: p.lifeHistory || '',
          familyHistory: p.familyHistory || '',
          currentMedication: p.currentMedication || '',
          emergencyContact: p.emergencyContact || '',
          sessionAmount: typeof p.sessionAmount === 'number' ? p.sessionAmount : (parseFloat(p.sessionAmount) || 0),
          sessionDay: p.sessionDay || '',
          sessionTime: p.sessionTime || '',
          modality: p.modality === 'Presencial' ? 'Presencial' : 'Online',
          isExpanded: false,
          evolucoes: Array.isArray(p.evolucoes) ? p.evolucoes.map((evo: any, eIndex: number) => ({
            id: `evo_preview_${Date.now()}_${eIndex}`,
            sessionNumber: Number(evo.sessionNumber) || (eIndex + 1),
            date: evo.date || new Date().toISOString().split('T')[0],
            time: evo.time || p.sessionTime || '14:00',
            note: evo.note || ''
          })) : []
        }));

      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`Tentativa com modelo ${model} falhou:`, err);
    }
  }

  throw lastError || new Error('Não foi possível estruturar os dados com a IA.');
}

export async function saveImportedPatientsToFirestore(
  patientsToImport: ImportedPatientPreview[],
  ownerId: string
): Promise<{ count: number; evolucoesCount: number }> {
  const selected = patientsToImport.filter(p => p.selected && p.name.trim().length > 0);
  if (selected.length === 0) return { count: 0, evolucoesCount: 0 };

  let totalEvolucoes = 0;
  const chunkSize = 250; // Safe batch limit

  for (let i = 0; i < selected.length; i += chunkSize) {
    const chunk = selected.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const patientsRef = collection(db, 'patients');

    for (const item of chunk) {
      const newDocRef = doc(patientsRef);

      const evoluções = (item.evolucoes || []).map((evo, idx) => {
        totalEvolucoes++;
        let formattedDate = evo.date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(evo.date)) {
          const [yyyy, mm, dd] = evo.date.split('-');
          formattedDate = `${dd}/${mm}/${yyyy}`;
        }
        return {
          id: evo.id || `evo_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          date: formattedDate,
          time: evo.time || item.sessionTime || '14:00',
          sessionNumber: Number(evo.sessionNumber) || (idx + 1),
          note: evo.note || ''
        };
      });

      // Sort evoluções descending by session number
      evoluções.sort((a, b) => (b.sessionNumber || 0) - (a.sessionNumber || 0));

      const newPatient: Partial<Patient> & { ownerId: string } = {
        id: newDocRef.id,
        name: item.name.trim(),
        status: 'Ativo',
        sessions: evoluções.length,
        lastSession: item.sessionDay ? `Toda ${item.sessionDay}` : (evoluções.length > 0 ? `Sessão ${evoluções[0].sessionNumber}` : undefined),
        email: item.email?.trim() || '',
        phone: item.phone?.trim() || '',
        cpf: item.cpf?.trim() || '',
        birthDate: item.birthDate?.trim() || '',
        gender: item.gender?.trim() || '',
        profession: item.profession?.trim() || '',
        address: item.address?.trim() || '',
        mainComplaint: item.mainComplaint?.trim() || '',
        lifeHistory: item.lifeHistory?.trim() || '',
        familyHistory: item.familyHistory?.trim() || '',
        currentMedication: item.currentMedication?.trim() || '',
        emergencyContact: item.emergencyContact?.trim() || '',
        amount: item.sessionAmount || 0,
        sessionAmount: item.sessionAmount || 0,
        sessionDay: item.sessionDay || '',
        sessionTime: item.sessionTime || '',
        modality: item.modality || 'Online',
        ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clinicalData: {
          evoluções
        }
      };

      batch.set(newDocRef, newPatient);
    }

    await batch.commit();
  }

  return { count: selected.length, evolucoesCount: totalEvolucoes };
}
