
/**
 * Agent IA Orchestrator - Bridge n8n & Moteur de Données MySQL/PostgreSQL
 */
import { GoogleGenAI } from "@google/genai";
import { apiClient } from "./api";

const PROD_WEBHOOK = 'https://malvasian-pleonic-fatimah.ngrok-free.dev/webhook/chat-ia';

export interface AIChatResponse {
  formattedResponse: string;
  format: 'list' | 'table' | 'stats' | 'chart' | 'general' | 'excel';
  resultCount: number;
  rawResults?: any[];
  downloadUrl?: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  mode?: 'BRIDGE' | 'TEST' | 'NATIVE';
}

/**
 * Nettoie le texte des artefacts techniques
 */
export const cleanProfessionalText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[#*`_]/g, '')
    .replace(/\[object Object\]/g, '')
    .trim();
};

/**
 * Parseur universel pour extraire les données structurées des réponses textuelles
 */
export const extractDataFromText = (text: string): any[] => {
  const results: any[] = [];
  const regex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\s*-\s*([\d.]+)\s*-\s*([\d.]+)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const dateObj = new Date(match[1]);
    results.push({
      date: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      fullDate: dateObj.toLocaleDateString('fr-FR'),
      Volume: parseFloat(match[2]),
      Montant: parseFloat(match[3])
    });
  }
  return results;
};

export const getAIResponse = async (message: string, tenantId: string): Promise<AIChatResponse> => {
  try {
    const res = await fetch(PROD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ chatInput: message, sessionId: tenantId })
    });
    const rawData = await res.json();
    return processResponse(rawData);
  } catch (e) {
    return await callNativeKernel(message);
  }
};

const processResponse = (rawData: any): AIChatResponse => {
  const data = Array.isArray(rawData) ? rawData[0] : rawData;
  const rawText = data.formattedResponse || data.output || data.text || "";
  
  let format = data.format || 'general';
  let results = data.rawResults || data.data || [];
  
  // Gestion spécifique du format Excel / Téléchargement
  let downloadUrl = data.downloadUrl || null;
  if (format === 'excel') {
    // Simuler ou récupérer un lien d'export n8n/ERP
    downloadUrl = data.downloadUrl || `http://localhost:3000/api/documents/export/${data.sessionId || 'current'}`;
  }

  // Détection auto du format chart si données temporelles trouvées
  const extracted = extractDataFromText(rawText);
  if (extracted.length > 0 && format === 'general') {
    format = 'chart';
    results = extracted;
  }

  return {
    formattedResponse: cleanProfessionalText(rawText) || "Analyse terminée.",
    format: format as any,
    resultCount: results.length,
    rawResults: results,
    downloadUrl,
    status: 'SUCCESS',
    mode: 'BRIDGE'
  };
};

const callNativeKernel = async (message: string): Promise<AIChatResponse> => {
  try {
    // Fixed: Obtained API key exclusively from environment variable process.env.API_KEY and used it directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: "Tu es l'assistant IA de GeStockPro. Réponds de manière concise et professionnelle.",
      },
    });
    return {
      formattedResponse: response.text || "",
      format: 'general',
      resultCount: 0,
      status: 'SUCCESS',
      mode: 'NATIVE'
    };
  } catch {
    return { formattedResponse: "Échec critique Kernel.", format: 'general', resultCount: 0, status: 'ERROR' };
  }
};

export const fetchChatHistory = async (): Promise<any[]> => apiClient.get('/ai/history');
export const fetchPromptTemplates = async (): Promise<any[]> => apiClient.get('/ai/templates');
