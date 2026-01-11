import { GoogleGenAI } from "@google/genai";
import { useSettingsStore } from "../store/settingsStore";

const SYSTEM_INSTRUCTION = `
You are an expert in Category Theory and Commutative Diagrams. 
Your goal is to generate "Arrowgram" diagram specifications based on the user's description.

Output ONLY valid JSON. Do not include markdown formatting.

The JSON specification format is as follows (TypeScript interface):

interface NodeSpec {
  name: string; // Unique ID
  label: string; // LaTeX label (e.g. "A", "A \\times B")
  left: number; // X coordinate (pixels)
  top: number; // Y coordinate (pixels)
}

interface ArrowSpec {
  from: string; // Node ID
  to: string; // Node ID
  label?: string; // LaTeX label
  curve?: number; // Curvature (-100 to 100), 0 is straight
  shift?: number; // Parallel shift
  label_alignment?: "over" | "left" | "right";
  style?: {
    head?: { name?: "normal" | "none" | "epi" | "hook" | "maps_to" }; // epi=->>, hook=subset, maps_to=|->
    tail?: { name?: "normal" | "none" | "mono" | "hook" | "maps_to" }; // mono=>->, maps_to=|->
    body?: { name?: "solid" | "dashed" | "dotted" | "wavy" };
    level?: number; // 1 for single (->), 2 for double (=>)
  };
}

interface DiagramSpec {
  version: 1;
  nodes: NodeSpec[];
  arrows: ArrowSpec[];
}

Layout Guidelines:
- Coordinate system: (0,0) is top-left.
- Standard spacing: Nodes are usually 100-200 pixels apart.
- Centered diagrams usually look best around (300, 300) or similar.
- Use standard LaTeX for labels (e.g., "\\pi", "f \\circ g").

CRITICAL RULES FOR UPDATES:
1. When provided with an existing spec ("Current Diagram Spec"), you must return the FULL merged JSON.
2. PRESERVE the coordinates (left, top) of existing nodes unless the user explicitly asks to move them or reorganize the layout.
3. PRESERVE existing node IDs ("name") to maintain arrow connections.
4. If adding a new node, place it intelligently relative to connected nodes (e.g., forming a square or triangle).

Example (Pullback Square):
{
  "version": 1,
  "nodes": [
    { "name": "P", "left": 100, "top": 100, "label": "P" },
    { "name": "A", "left": 300, "top": 100, "label": "A" },
    { "name": "B", "left": 100, "top": 300, "label": "B" },
    { "name": "C", "left": 300, "top": 300, "label": "C" }
  ],
  "arrows": [
    { "from": "P", "to": "A", "label": "p_1" },
    { "from": "P", "to": "B", "label": "p_2" },
    { "from": "A", "to": "C", "label": "f" },
    { "from": "B", "to": "C", "label": "g" }
  ]
}
`;

export async function generateDiagram(prompt: string, currentSpec?: string): Promise<string> {
  const { apiKey, apiProvider } = useSettingsStore.getState();

  if (!apiKey && apiProvider === 'gemini') {
    throw new Error("API Key is missing. Please set it in Settings.");
  }

  let fullPrompt = prompt;
  if (currentSpec) {
      fullPrompt += `\n\nCurrent Diagram Spec:\n${currentSpec}\n\nTask: Update this diagram based on the request. Return the FULL updated JSON spec.`;
  } else {
      fullPrompt += `\n\nTask: Generate a new diagram. Return the FULL JSON spec.`;
  }

  try {
    if (apiProvider === 'gemini') {
      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      let text = response.text;
      if (!text) {
        throw new Error("No response from Gemini.");
      }

      // Cleanup Markdown if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return text;
    } else {
        throw new Error("Custom provider not implemented yet.");
    }
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(error.message || "Failed to generate diagram.");
  }
}