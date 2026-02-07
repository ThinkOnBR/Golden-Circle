import { GoogleGenAI, Type } from "@google/genai";

export interface EngagementAnalysis {
  classification: 'Conector' | 'Mentor' | 'Passivo' | 'Em risco';
  suggestion: 'Conversa' | 'Mentoria' | 'Alerta' | 'Possível desligamento';
  insight: string;
  lastRun: string;
}

export const analyzeEngagement = async (userData: any, forceRefresh = false): Promise<EngagementAnalysis | null> => {
  const cacheKey = `gemini_analysis_${userData.userId}`;
  
  // 1. Check Cache (Optimization & Cost Control)
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Simple validity check (e.g. valid for 24h)
        const lastRun = new Date(parsed.lastRun).getTime();
        const now = new Date().getTime();
        if (now - lastRun < 24 * 60 * 60 * 1000) {
          return parsed;
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // 2. Validate API Key
  // As per guidelines, use process.env.API_KEY directly.
  // We maintain the fallback check to gracefully handle missing keys in the demo UI.
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing. Returning mock analysis for UI demo.");
    return {
      classification: "Conector",
      suggestion: "Mentoria",
      insight: "Modo demonstração (Sem API Key). O usuário apresenta bons índices de participação em desafios e reuniões.",
      lastRun: new Date().toISOString()
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // 3. Construct Prompt with Aggregated Data
    const prompt = `
      Analise os dados de engajamento deste membro da Confraria Empresarial:
      
      DADOS:
      - Desafios Criados: ${userData.challenges}
      - Contribuições em Desafios: ${userData.contributions}
      - Presença em Reuniões: ${userData.attendance}%
      
      REGRAS DE CLASSIFICAÇÃO:
      - Conector: Alta interação, muitas contribuições.
      - Mentor: Equilíbrio entre desafios e conselhos, presença sólida.
      - Passivo: Baixa contribuição, apenas assiste.
      - Em risco: Baixa presença (<50%) e zero contribuição recente.
      
      REGRAS DE SUGESTÃO:
      - Conversa: Para Passivos (entender o momento).
      - Mentoria: Para Conectores (potencializar) ou Mentores (liderar).
      - Alerta: Para presença baixa.
      - Possível desligamento: Para "Em risco" crítico.
    `;

    // 4. Call Gemini 3 with Schema for Structured JSON
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: { 
              type: Type.STRING, 
              enum: ['Conector', 'Mentor', 'Passivo', 'Em risco'] 
            },
            suggestion: { 
              type: Type.STRING, 
              enum: ['Conversa', 'Mentoria', 'Alerta', 'Possível desligamento'] 
            },
            insight: { 
              type: Type.STRING, 
              description: "Uma frase analítica curta e direta (max 20 palavras) explicando o motivo da classificação." 
            }
          },
          required: ['classification', 'suggestion', 'insight']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from Gemini");
    
    const analysis = JSON.parse(resultText);
    const finalResult: EngagementAnalysis = { 
      ...analysis, 
      lastRun: new Date().toISOString() 
    };
    
    // 5. Cache Success
    localStorage.setItem(cacheKey, JSON.stringify(finalResult));
    
    return finalResult;

  } catch (error) {
    console.error("Gemini Analysis Failed", error);
    // Return null or a fallback to handle UI gracefully
    return null;
  }
};