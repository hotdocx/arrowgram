import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  apiKey: string;
  setApiKey: (key: string) => void;
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
