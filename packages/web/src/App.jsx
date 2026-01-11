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

    // Find the SVG in the editor.
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
      const options = {
        backgroundColor: 'white',
        scale: 2,
      };

      if (viewBox) {
        const parts = viewBox.split(' ').map(parseFloat);
        options.left = parts[0];
        options.top = parts[1];
        options.width = parts[2];
        options.height = parts[3];
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
    } catch (e) {
      console.error(e);
      alert("Failed to create share URL");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <Toolbar
        onExport={handleExport}
        onShare={handleShare}
        onToggleChat={() => setShowChat(!showChat)}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-4 overflow-hidden">
          <ArrowGramEditor />
        </main>
        {showChat && <AIChatPanel />}
      </div>

      <TikzExportModal
        tikzCode={tikzCode}
        onClose={() => setShowTikz(false)}
        isOpen={showTikz}
      />
    </div>
  );
}