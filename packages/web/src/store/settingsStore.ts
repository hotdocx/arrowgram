import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GeminiModelOption = {
  id: string;
  label: string;
};

export const OSS_GEMINI_MODELS: GeminiModelOption[] = [
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
];

export const DEFAULT_GEMINI_MODEL_ID = OSS_GEMINI_MODELS[0].id;

export function resolveGeminiModelId(modelId: string | null | undefined): string {
  if (!modelId) return DEFAULT_GEMINI_MODEL_ID;
  return OSS_GEMINI_MODELS.some((m) => m.id === modelId)
    ? modelId
    : DEFAULT_GEMINI_MODEL_ID;
}

interface SettingsState {
  apiKey: string;
  setApiKey: (key: string) => void;
  geminiModelId: string;
  setGeminiModelId: (modelId: string) => void;
  apiProvider: 'gemini' | 'custom'; // For future backend support
  setApiProvider: (provider: 'gemini' | 'custom') => void;
  customEndpoint: string;
  setCustomEndpoint: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),
      geminiModelId: DEFAULT_GEMINI_MODEL_ID,
      setGeminiModelId: (modelId) => set({ geminiModelId: resolveGeminiModelId(modelId) }),
      apiProvider: 'gemini',
      setApiProvider: (provider) => set({ apiProvider: provider }),
      customEndpoint: '',
      setCustomEndpoint: (url) => set({ customEndpoint: url }),
    }),
    {
      name: 'arrowgram-settings',
    }
  )
);
