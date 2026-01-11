import React, { useState } from "react";
import { ArrowGramEditor } from "./ArrowGramEditor";
import { Toolbar } from "./components/Toolbar";
import { TikzExportModal } from './TikzExportModal';
import { exportToTikz } from "./utils/tikz";
import { saveSvgAsPng } from 'save-svg-as-png';
import { saveAs } from 'file-saver';
import { useDiagramStore } from "./store/diagramStore";
import { AIChatPanel } from './components/AIChatPanel';

export default function App() {
  const spec = useDiagramStore(state => state.spec);
  const [showTikz, setShowTikz] = useState(false);
  const [tikzCode, setTikzCode] = useState('');
  const [showChat, setShowChat] = useState(false);

  const handleExport = async (format) => {
    if (format === 'tikz') {
      const code = exportToTikz(spec);
      setTikzCode(code);
      setShowTikz(true);
      return;
    }

    const svgElement = document.querySelector('svg');
    if (!svgElement) {
      alert("Could not find the diagram to export.");
      return;
    }

    if (format === 'svg') {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      saveAs(blob, 'diagram.svg');
    } else if (format === 'png') {
      const viewBox = svgElement.getAttribute('viewBox');
      const options = { backgroundColor: 'white', scale: 2 };
      if (viewBox) {
        const parts = viewBox.split(' ').map(parseFloat);
        options.left = parts[0]; options.top = parts[1];
        options.width = parts[2]; options.height = parts[3];
      }
      saveSvgAsPng(svgElement, 'diagram.png', options).catch(e => {
        console.error("PNG Export failed:", e);
        alert("Failed to export as PNG.");
      });
    }
  };

  const handleShare = () => {
    try {
      const uint8Array = new TextEncoder().encode(spec);
      const charString = String.fromCharCode.apply(null, uint8Array);
      const encodedSpec = btoa(charString);
      const url = `${window.location.origin}${window.location.pathname}?spec=${encodedSpec}`;
      navigator.clipboard.writeText(url);
      alert("Shareable URL copied to clipboard!");
    } catch (e) { console.error(e); alert("Failed to create share URL"); }
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shadow-sm relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            A
          </div>
          <span className="font-semibold text-gray-800 text-lg tracking-tight">Arrowgram</span>
        </div>
        <div>
          {/* Center Placeholder or Title */}
        </div>
        <div>
          {/* Right Profile or Account Placeholder */}
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
        <div className="flex-1 relative bg-gray-50 flex flex-col">
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
      </div>

      <TikzExportModal
        tikzCode={tikzCode}
        onClose={() => setShowTikz(false)}
        isOpen={showTikz}
      />
    </div>
  );
}