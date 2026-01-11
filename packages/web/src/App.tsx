import { useState, useEffect } from "react";
import { ArrowGramEditor } from "./ArrowGramEditor";
import { Toolbar } from "./components/Toolbar";
import { TikzExportModal } from './TikzExportModal';
import { exportToTikz } from "./utils/tikz";
import { saveSvgAsPng, SaveSVGOptions } from 'save-svg-as-png';
import { saveAs } from 'file-saver';
import { useDiagramStore } from "./store/diagramStore";
import { AIChatPanel } from './components/AIChatPanel';
import { PropertyEditor } from "./PropertyEditor";
import { useToast } from "./context/ToastContext";
import { PanelRight, ChevronLeft, Save } from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { saveProject } from "./utils/storage";

type ViewState = 'dashboard' | 'editor';

export default function App() {
  const spec = useDiagramStore(state => state.spec);
  const setSpec = useDiagramStore(state => state.setSpec);
  const filename = useDiagramStore(state => state.filename);
  const selection = useDiagramStore(state => state.selection);
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [showTikz, setShowTikz] = useState(false);
  const [tikzCode, setTikzCode] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const { addToast } = useToast();

  const handleExport = async (format: 'tikz' | 'svg' | 'png') => {
    if (format === 'tikz') {
      const code = exportToTikz(spec);
      setTikzCode(code);
      setShowTikz(true);
      return;
    }

    const svgElement = document.querySelector('svg');
    if (!svgElement) {
      addToast("Could not find the diagram to export.", "error");
      return;
    }

    if (format === 'svg') {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      saveAs(blob, `${filename || 'diagram'}.svg`);
      addToast("Diagram exported as SVG", "success");
    } else if (format === 'png') {
      const viewBox = svgElement.getAttribute('viewBox');
      const options: SaveSVGOptions = { backgroundColor: 'white', scale: 2 };
      if (viewBox) {
        const parts = viewBox.split(' ').map(parseFloat);
        options.left = parts[0]; 
        options.top = parts[1];
        options.width = parts[2]; 
        options.height = parts[3];
      }
      saveSvgAsPng(svgElement, `${filename || 'diagram'}.png`, options)
        .then(() => addToast("Diagram exported as PNG", "success"))
        .catch((e: any) => {
          console.error("PNG Export failed:", e);
          addToast("Failed to export as PNG.", "error");
        });
    }
  };

  const handleSave = async () => {
      try {
          await saveProject(filename, spec);
          addToast("Project saved successfully!", "success");
      } catch (e) {
          console.error(e);
          addToast("Failed to save project.", "error");
      }
  };

  const handleShare = () => {
    try {
      const uint8Array = new TextEncoder().encode(spec);
      // @ts-ignore
      const charString = String.fromCharCode.apply(null, uint8Array);
      const encodedSpec = btoa(charString);
      const url = `${window.location.origin}${window.location.pathname}?spec=${encodedSpec}`;
      navigator.clipboard.writeText(url);
      addToast("Shareable URL copied to clipboard!", "success");
    } catch (e) { 
      console.error(e); 
      addToast("Failed to create share URL", "error");
    }
  };

  // Check for URL query param to load shared spec
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const specParam = params.get('spec');
      if (specParam) {
          try {
              const decoded = atob(specParam);
              // text decoding might be needed if complex chars
              setSpec(decoded);
              setView('editor');
          } catch(e) { console.error("Failed to load shared spec", e); }
      }
  }, []);

  if (view === 'dashboard') {
      return <Dashboard onOpenProject={() => setView('editor')} />;
  }

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shadow-sm relative">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              A
            </div>
            <span className="font-semibold text-gray-800 text-lg tracking-tight hidden sm:block">Arrowgram</span>
            <div className="h-4 w-px bg-gray-300 mx-2 hidden sm:block"></div>
            <span className="text-gray-600 font-medium">{filename}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button
             onClick={handleSave}
             className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
           >
             <Save size={16} />
             <span className="hidden sm:inline">Save</span>
           </button>
           <button 
            onClick={() => setShowProperties(!showProperties)} 
            className={`p-2 rounded-lg transition-colors ${showProperties ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Toggle Properties"
          >
            <PanelRight size={20} />
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left AI Panel (Collapsible) */}
        <div className={`transition-all duration-300 ease-in-out border-r border-gray-200 bg-white relative z-20 shadow-xl ${showChat ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
          <div className="w-80 h-full absolute right-0">
            <AIChatPanel />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-gray-50 flex flex-col min-w-0">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <Toolbar
              onExport={handleExport}
              onShare={handleShare}
              onToggleChat={() => setShowChat(!showChat)}
              isChatOpen={showChat}
            />
          </div>

          <div className="flex-1 overflow-hidden relative">
            <ArrowGramEditor />
          </div>
        </div>

        {/* Right Property Panel */}
         <div className={`${showProperties ? 'w-80 border-l border-gray-200' : 'w-0'} transition-all duration-300 ease-in-out bg-white z-20 shadow-xl flex flex-col overflow-hidden`}>
            <div className="w-80 h-full flex flex-col">
              <div className="p-4 border-b border-gray-100 font-semibold text-gray-700 bg-gray-50/50 flex justify-between items-center">
                Properties
                <button onClick={() => setShowProperties(false)} className="text-gray-400 hover:text-gray-600 lg:hidden">
                  <PanelRight size={16}/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <PropertyEditor
                  selection={selection}
                  spec={spec}
                  onSpecChange={setSpec}
                />
              </div>
            </div>
        </div>
      </div>

      <TikzExportModal
        tikzCode={tikzCode}
        onClose={() => setShowTikz(false)}
        isOpen={showTikz}
      />
    </div>
  );
}