import React, { useState } from "react";
import { useDiagramStore } from "../store/diagramStore";
// @ts-ignore
import { useStore } from "zustand";
import {
  Undo,
  Redo,
  Download,
  Share2,
  FileCode,
  Bot,
  Settings,
  CircleHelp,
  ChevronDown,
  Check,
} from "lucide-react";
import { SettingsDialog } from "./SettingsDialog";
import { SpecJsonEditor } from "./SpecJsonEditor";
import { QuiverDialog } from "./QuiverDialog";
import { HelpDialog } from "./HelpDialog";

interface ToolbarProps {
  onExport: (
    format: "tikz" | "svg" | "png",
    options?: { fitView?: boolean; showGrid?: boolean }
  ) => void;
  onShare: () => void;
  enableChat?: boolean;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  isChatBusy?: boolean;
}

export function Toolbar({
  onExport,
  onShare,
  enableChat = true,
  onToggleChat,
  isChatOpen = false,
  isChatBusy,
}: ToolbarProps) {
  const { filename } = useDiagramStore();
  // @ts-ignore
  const { undo, redo, pastStates, futureStates } = useStore(useDiagramStore.temporal);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [isQuiverOpen, setIsQuiverOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({ fitView: true, showGrid: true });

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const btnClass =
    "p-2 rounded-lg text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95";
  const divider = <div className="h-5 w-px bg-gray-200 mx-1"></div>;

  return (
    <div className="flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-xl ring-1 ring-black/5">
      <button className={btnClass} onClick={() => undo()} disabled={!canUndo} title="Undo">
        <Undo size={18} />
      </button>
      <button className={btnClass} onClick={() => redo()} disabled={!canRedo} title="Redo">
        <Redo size={18} />
      </button>

      {divider}

      {enableChat ? (
        <button
          className={`${btnClass} relative ${isChatOpen ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : ""}`}
          onClick={onToggleChat}
          title="AI Assistant"
        >
          <Bot size={18} />
          {!isChatOpen && isChatBusy ? (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 animate-spin rounded-full border-2 border-purple-200 border-t-purple-700" />
          ) : null}
        </button>
      ) : null}

      <button className={btnClass} onClick={() => setIsSettingsOpen(true)} title="Settings">
        <Settings size={18} />
      </button>
      <button className={btnClass} onClick={() => setIsHelpOpen(true)} title="Help">
        <CircleHelp size={18} />
      </button>

      <button className={btnClass} onClick={() => setIsSpecOpen(true)} title="Edit JSON Spec">
        <FileCode size={18} />
      </button>

      <button className={btnClass} onClick={() => setIsQuiverOpen(true)} title="Quiver Integration">
        <Share2 size={18} className="rotate-90" />
      </button>

      {divider}

      <div className="relative flex items-center">
        <button
          className={`${btnClass} rounded-r-none border-r border-gray-200/50 pr-1`}
          onClick={() => onExport("svg", exportOptions)}
          title="Export SVG"
        >
          <Download size={18} />
        </button>
        <button
          className={`${btnClass} rounded-l-none px-1`}
          onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
          title="Export Options"
        >
          <ChevronDown size={14} />
        </button>

        {isExportMenuOpen && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="text-xs font-semibold text-gray-500 px-2 py-1 uppercase tracking-wider">
              Export Settings
            </div>

            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
              onClick={() => setExportOptions((prev) => ({ ...prev, fitView: !prev.fitView }))}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${exportOptions.fitView ? "bg-purple-600 border-purple-600 text-white" : "border-gray-300"}`}
              >
                {exportOptions.fitView && <Check size={10} />}
              </div>
              Fit View to Content
            </button>

            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
              onClick={() => setExportOptions((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${exportOptions.showGrid ? "bg-purple-600 border-purple-600 text-white" : "border-gray-300"}`}
              >
                {exportOptions.showGrid && <Check size={10} />}
              </div>
              Include Grid
            </button>

            <div className="h-px bg-gray-100 my-2"></div>

            <button
              className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 font-medium transition-colors"
              onClick={() => {
                onExport("svg", exportOptions);
                setIsExportMenuOpen(false);
              }}
            >
              Export SVG
            </button>
            <button
              className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 font-medium transition-colors"
              onClick={() => {
                onExport("png", exportOptions);
                setIsExportMenuOpen(false);
              }}
            >
              Export PNG
            </button>
          </div>
        )}
      </div>

      <button className={btnClass} onClick={() => onExport("tikz")} title="Export TikZ">
        <span className="font-mono font-bold text-xs">TeX</span>
      </button>
      <button className={btnClass} onClick={onShare} title="Share Link">
        <Share2 size={18} />
      </button>

      {divider}

      <div
        className="px-3 py-1 font-medium text-sm text-gray-500 max-w-[150px] truncate select-none"
        title={filename}
      >
        {filename}
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <SpecJsonEditor isOpen={isSpecOpen} onClose={() => setIsSpecOpen(false)} />
      <QuiverDialog isOpen={isQuiverOpen} onClose={() => setIsQuiverOpen(false)} />
    </div>
  );
}
