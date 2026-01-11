import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { useSettingsStore } from '../store/settingsStore';
import { X, Eye, EyeOff } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { apiKey, setApiKey, apiProvider } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">AI Provider</Label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button 
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${apiProvider === 'gemini' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Google Gemini
                </button>
                {/* Placeholder for future providers */}
                <button 
                    className="flex-1 py-1.5 text-sm font-medium rounded-md text-gray-400 cursor-not-allowed"
                    disabled
                >
                    Custom (Soon)
                </button>
            </div>
          </div>

          <div>
             <Label className="mb-2 block">Gemini API Key</Label>
             <div className="relative">
                <Input 
                    type={showKey ? "text" : "password"} 
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)} 
                    placeholder="AIzaSy..."
                    className="pr-10"
                />
                <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowKey(!showKey)}
                >
                    {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
             </div>
             <p className="text-xs text-gray-500 mt-2">
                 Your API key is stored locally in your browser. 
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-600 hover:underline ml-1">
                    Get an API key
                 </a>
             </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
