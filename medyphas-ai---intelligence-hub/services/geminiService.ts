import { GoogleGenAI, Type } from "@google/genai";
import { Patient, RiskLevel } from "../types";

const getAI = () => {
  const customKey = localStorage.getItem('medyphas_api_key');
  // Fallback to env key if custom key is not set. 
  // Note: specific logic depends on if process.env.API_KEY is available in the browser build. 
  // Assuming it is injected or handled by the framework.
  const apiKey = customKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key missing. Please configure it in Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

const TRIAGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    riskLevel: { type: Type.STRING, enum: [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL] },
    diagnosis: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
    recommendedActions: { 
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["riskLevel", "diagnosis", "confidenceScore", "recommendedActions"]
};

export const assessPatientRisk = async (
  age: number,
  gender: string,
  symptoms: string[],
  vitals: any
): Promise<Partial<Patient>> => {
  
  try {
    const ai = getAI();
    const prompt = `
      Act as an emergency triage AI. Analyze the following patient data:
      Age: ${age}
      Gender: ${gender}
      Symptoms: ${symptoms.join(", ")}
      Vitals: BP ${vitals.bpSystolic}/${vitals.bpDiastolic}, HR ${vitals.heartRate}, Temp ${vitals.temp}C, SpO2 ${vitals.spo2}%
      
      Determine the risk level (LOW, MEDIUM, HIGH, CRITICAL), a likely diagnosis, a confidence score (0-100), and 3 recommended immediate actions.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-09-2025',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: TRIAGE_SCHEMA,
        temperature: 0.2, // Low temperature for medical consistency
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      riskLevel: result.riskLevel as RiskLevel,
      diagnosis: result.diagnosis,
      aiConfidence: result.confidenceScore,
      recommendedActions: result.recommendedActions
    };

  } catch (error) {
    console.error("AI Triage Error:", error);
    // Return error state or rethrow
    return {
      riskLevel: RiskLevel.MEDIUM,
      diagnosis: error instanceof Error ? `Error: ${error.message}` : "Assessment Unavailable",
      aiConfidence: 0,
      recommendedActions: ["Check API Key Configuration"]
    };
  }
};

export const runDiagnosticChat = async (history: {role: 'user' | 'model', text: string}[], message: string) => {
  try {
    const ai = getAI();
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash-preview-09-2025',
      config: {
        systemInstruction: "You are Medyphas AI, an advanced medical diagnostic assistant. Provide concise, clinical, and helpful responses to medical professionals. Do not provide medical advice to patients directly without a disclaimer.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Diagnostic Chat Error:", error);
    throw error;
  }
};