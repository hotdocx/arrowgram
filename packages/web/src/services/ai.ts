import { GoogleGenAI } from "@google/genai";
import { useSettingsStore } from "../store/settingsStore";
import { DIAGRAM_SYSTEM_PROMPT, PAPER_SYSTEM_PROMPT } from "./prompts";

export async function generateDiagram(prompt: string, currentContext: string, type: 'diagram' | 'paper' = 'diagram'): Promise<string> {
  const { apiKey, apiProvider } = useSettingsStore.getState();

  if (!apiKey && apiProvider === 'gemini') {
    throw new Error("API Key is missing. Please set it in Settings.");
  }

  const systemInstruction = type === 'paper' 
    ? PAPER_SYSTEM_PROMPT + "\n\n" + DIAGRAM_SYSTEM_PROMPT 
    : DIAGRAM_SYSTEM_PROMPT;

  let fullPrompt = prompt;
  if (currentContext) {
    fullPrompt += `\n\nTask: Update this based on the request. Return the FULL updated content.\n\nCurrent ${type === 'paper' ? 'Paper Content' : 'Diagram Spec'}:\n${currentContext}`;
  } else {
    fullPrompt += `\n\nTask: Generate new content. Return the FULL content.`;
  }

  try {
    if (apiProvider === 'gemini') {
      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      let text = response.text;
      if (!text) {
        throw new Error("No response from Gemini.");
      }

      // Cleanup Markdown if present (for JSON mode)
      if (type === 'diagram') {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      } else {
        // For paper, we might get markdown code blocks wrapping the whole thing, but usually we want raw markdown.
        // If the LLM wraps the entire output in ```markdown ... ```, strip it.
        if (text.startsWith('```markdown')) {
          text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
        }
      }

      return text;
    } else {
      throw new Error("Custom provider not implemented yet.");
    }
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(error.message || "Failed to generate content.");
  }
}