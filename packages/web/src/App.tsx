import { useState, useEffect } from "react";
import { ArrowGramEditor } from "./ArrowGramEditor";
import { PaperEditor } from "./components/PaperEditor/PaperEditor";
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
import { saveProject, ProjectMeta } from "./utils/storage";
import PrintPreview from "./PrintPreview";
import { computeDiagram } from "@hotdocx/arrowgram";
// @ts-ignore
import katexCss from 'katex/dist/katex.min.css?inline';

type ViewState = 'dashboard' | 'editor';

export default function App() {
  // Simple routing for Print Preview
  if (window.location.pathname === '/print-preview') {
    return <PrintPreview />;
  }

  const spec = useDiagramStore(state => state.spec);
  const setSpec = useDiagramStore(state => state.setSpec);
  const filename = useDiagramStore(state => state.filename);
  const selectedIds = useDiagramStore(state => state.selectedIds);
  const selection = { key: selectedIds.values().next().value };

  const [view, setView] = useState<ViewState>('dashboard');
  const [activeProject, setActiveProject] = useState<ProjectMeta | null>(null);

  const [showTikz, setShowTikz] = useState(false);
  const [tikzCode, setTikzCode] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const { addToast } = useToast();

  const handleExport = async (format: 'tikz' | 'svg' | 'png', options: { fitView?: boolean, showGrid?: boolean } = { fitView: true, showGrid: true }) => {
    if (format === 'tikz') {
      const code = exportToTikz(spec);
      setTikzCode(code);
      setShowTikz(true);
      return;
    }

    const svgElement = document.getElementById('arrowgram-canvas');
    if (!svgElement) {
      addToast("Could not find the diagram to export.", "error");
      return;
    }

    // Determine viewBox
    let viewBoxToUse = svgElement.getAttribute('viewBox') || "0 0 1000 600";
    if (options.fitView) {
      const computed = computeDiagram(spec);
      if (computed.viewBox) viewBoxToUse = computed.viewBox;
    }

    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Apply viewBox
      clonedSvg.setAttribute('viewBox', viewBoxToUse);

      // Remove Grid if requested
      if (!options.showGrid) {
        const gridRect = clonedSvg.querySelector('rect[fill*="#grid"]');
        if (gridRect) gridRect.remove();
      }

      // Use inline KaTeX CSS
      let cssText = katexCss;
      // Fix relative font paths to absolute CDN paths
      cssText = cssText.replace(/url\((['"]?)fonts\//g, (match: any, quote: string) => {
        return `url(${quote}https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/`;
      });

      const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleEl.textContent = cssText;
      clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);

      if (format === 'svg') {
        const svgString = new XMLSerializer().serializeToString(clonedSvg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        saveAs(blob, `${filename || 'diagram'}.svg`);
        addToast("Diagram exported as SVG", "success");
      } else if (format === 'png') {
        const parts = viewBoxToUse.split(' ').map(parseFloat);
        const pngOptions: SaveSVGOptions = {
          backgroundColor: 'white',
          scale: 2,
          left: parts[0],
          top: parts[1],
          width: parts[2],
          height: parts[3]
        };

        // Mount the cloned SVG into a hidden container
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.visibility = 'hidden';
        container.appendChild(clonedSvg);
        document.body.appendChild(container);

        try {
          await saveSvgAsPng(clonedSvg, `${filename || 'diagram'}.png`, pngOptions);
          addToast("Diagram exported as PNG", "success");
        } finally {
          document.body.removeChild(container);
        }
      }
    } catch (e) {
      console.error("Export failed:", e);
      addToast("Failed to export diagram.", "error");
    }
  };

  const handleSave = async () => {
    try {
      await saveProject(filename, spec, 'diagram');
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
        const decodedString = atob(specParam);
        const bytes = new Uint8Array(decodedString.length);
        for (let i = 0; i < decodedString.length; i++) {
          bytes[i] = decodedString.charCodeAt(i);
        }
        const decodedSpec = new TextDecoder().decode(bytes);
        setSpec(decodedSpec);
        setView('editor');
        // Implicitly a diagram if loaded from URL share
        setActiveProject({ name: 'Shared Diagram', spec: decodedSpec, updatedAt: '', type: 'diagram' });
      } catch (e) { console.error("Failed to load shared spec", e); }
    }
  }, []);

  const handleOpenProject = (type: 'diagram' | 'paper' = 'diagram', project?: ProjectMeta) => {
    setView('editor');
    if (project) {
      setActiveProject(project);
    } else {
      // Fallback for typesafety, but Dashboard always passes project now for Papers
      setActiveProject({ name: filename, spec: spec, updatedAt: '', type });
    }
  };

  if (view === 'dashboard') {
    return <Dashboard onOpenProject={handleOpenProject} />;
  }

  // --- PAPER EDITOR RENDER ---
  if (activeProject?.type === 'paper') {
    return (
      <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
        {/* Top Nav for Paper Mode is Inside PaperEditor or we reuse common Nav?
                 PaperEditor has its own Toolbar because it's quite specific.
                 But we want to share the "Home" button context.
             */}

        {/* We wrap PaperEditor but inject back button behavior */}
        <div className="flex-1 relative flex overflow-hidden">
          {/* Left AI Panel (Collapsible) - Available in Paper Mode too! */}
          <div className={`transition-all duration-300 ease-in-out border-r border-gray-200 bg-white relative z-30 shadow-xl ${showChat ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
            <div className="w-80 h-full absolute right-0">
              <AIChatPanel
                context={{
                  type: 'paper',
                  content: activeProject.spec,
                  onUpdate: (newSpec) => setActiveProject(prev => prev ? ({ ...prev, spec: newSpec }) : null)
                }}
              />
            </div>
          </div>

          <div className="flex-1 relative flex flex-col min-w-0">
            <div className="absolute top-3 left-4 z-40">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 bg-white/50 hover:bg-white text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 rounded-lg transition-all shadow-sm backdrop-blur"
                title="Back to Dashboard"
              >
                <ChevronLeft size={20} />
              </button>
            </div>

            <div className="absolute top-3 right-20 z-40">
              <button
                onClick={() => setShowChat(!showChat)}
                className={`p-2 rounded-lg transition-colors border shadow-sm ${showChat ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
              >
                {showChat ? "Close AI" : "Ask AI"}
              </button>
            </div>

            <PaperEditor
              initialMarkdown={activeProject.spec}
              filename={activeProject.name}
              onPersist={async (content) => {
                await saveProject(activeProject.name, content, 'paper');
                setActiveProject(prev => prev ? ({ ...prev, spec: content }) : null);
              }}
              onChange={(content) => {
                setActiveProject(prev => prev ? ({ ...prev, spec: content }) : null);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // --- DIAGRAM EDITOR RENDER (Legacy/Standard) ---
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
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
                <PanelRight size={16} />
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
