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
import { PanelRight, ChevronLeft, Save, Paperclip, Upload } from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import PrintPreview from "./PrintPreview";
import { computeDiagram } from "@hotdocx/arrowgram";
// @ts-ignore
import katexCss from 'katex/dist/katex.min.css?inline';
import { useProjectRepository } from "./context/ProjectRepositoryContext";
import { useEditorHostConfig } from "./context/EditorHostContext";
import type { Project } from "./utils/projectRepository";
import { AttachmentsPanel } from "./components/AttachmentsPanel";
import { PublishGalleryModal } from './components/PublishGalleryModal';
import { captureDiagramScreenshot, capturePaperScreenshot } from './utils/screenshot';
import {
  decodeBase64Utf8ToString,
  detectImportedType,
  encodeStringToBase64UrlUtf8,
  resolveRequestedImport,
} from "./utils/urlImport";

type ViewState = 'dashboard' | 'editor';

export default function App() {
  const repo = useProjectRepository();
  const hostConfig = useEditorHostConfig();
  const canPersist = hostConfig.permissions?.canPersist ?? true;
  const disableDashboard = Boolean(hostConfig.disableDashboard);
  const disableAI = Boolean(hostConfig.disableAI);
  const disableAttachments = Boolean(hostConfig.disableAttachments);

  // Simple routing for Print Preview (supports GitHub Pages subpaths, e.g. /arrowgram/print-preview)
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(
    /\/$/,
    ''
  );
  const relativePath = window.location.pathname.startsWith(basePath + '/')
    ? window.location.pathname.slice(basePath.length)
    : window.location.pathname;

  if (
    hostConfig.enablePrintPreview &&
    ((hostConfig.printPreviewPath &&
      (window.location.pathname === hostConfig.printPreviewPath ||
        window.location.pathname === hostConfig.printPreviewPath + "/")) ||
      relativePath === "/print-preview" ||
      relativePath === "/print-preview/")
  ) {
    return <PrintPreview />;
  }

  const spec = useDiagramStore(state => state.spec);
  const setSpec = useDiagramStore(state => state.setSpec);
  const filename = useDiagramStore(state => state.filename);
  const selectedIds = useDiagramStore(state => state.selectedIds);
  const selection = { key: selectedIds.values().next().value };

  const [view, setView] = useState<ViewState>(() =>
    hostConfig.initialProjectId ? "editor" : "dashboard"
  );
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [showTikz, setShowTikz] = useState(false);
  const [tikzCode, setTikzCode] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<"properties" | "files">(
    "properties"
  );
  const [isEditingDiagramTitle, setIsEditingDiagramTitle] = useState(false);
  const [diagramTitleDraft, setDiagramTitleDraft] = useState("");
  const { addToast } = useToast();

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);

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
      cssText = cssText.replace(/url\((['"]?)(?:\.\/)?fonts\//g, (match: any, quote: string) => {
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
      if (!canPersist) throw new Error("Persistence is disabled in this host.");
      if (!activeProject) throw new Error("No active project");
      const updated = await repo.update({
        id: activeProject.id,
        title: filename,
        content: spec,
      });
      setActiveProject(updated);
      addToast("Project saved successfully!", "success");
    } catch (e) {
      console.error(e);
      addToast("Failed to save project.", "error");
    }
  };

  const commitDiagramTitle = async () => {
    if (!canPersist) return;
    const nextTitle = diagramTitleDraft.trim();
    setIsEditingDiagramTitle(false);
    if (!nextTitle || nextTitle === filename) {
      setDiagramTitleDraft(filename);
      return;
    }
    useDiagramStore.getState().setFilename(nextTitle);
    try {
      if (activeProject) {
        const updated = await repo.update({ id: activeProject.id, title: nextTitle });
        setActiveProject(updated);
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to rename project.", "error");
    }
  };

  const handleShare = async () => {
    try {
      if (activeProject && repo.getPublicUrl && repo.capabilities.sharing?.canGetPublicUrl) {
        const url = await repo.getPublicUrl(activeProject.id);
        await navigator.clipboard.writeText(url);
        setShareUrl(url);
        addToast("Share link copied to clipboard!", "success");
        return url;
      }

      const content =
        activeProject?.type === "paper" ? activeProject.content.markdown : spec;
      const param = activeProject?.type === "paper" ? "paper" : "spec";
      const encoded = encodeStringToBase64UrlUtf8(content);
      const url = `${window.location.origin}${window.location.pathname}?${param}=${encoded}`;
      navigator.clipboard.writeText(url);
      setShareUrl(url);
      addToast("Shareable URL copied to clipboard!", "success");
      return url;
    } catch (e) {
      console.error(e);
      addToast("Failed to create share URL", "error");
      return null;
    }
  };

  const handlePublish = async () => {
    const svgElement = document.getElementById('arrowgram-canvas') as unknown as SVGElement;
    if (!svgElement) {
        addToast("Could not find diagram to publish", "error");
        return;
    }
    try {
        const blob = await captureDiagramScreenshot(svgElement, filename);
        setScreenshotBlob(blob);
        setShowPublishModal(true);
    } catch (e) {
        console.error(e);
        addToast("Failed to generate screenshot", "error");
    }
  };

  useEffect(() => {
    // Avoid showing a stale share URL when switching projects.
    setShareUrl(null);
    setIsEditingDiagramTitle(false);
    setDiagramTitleDraft(filename);
  }, [activeProject?.id]);

  useEffect(() => {
    if (disableAI && showChat) setShowChat(false);
  }, [disableAI, showChat]);

  useEffect(() => {
    if (disableAttachments && showFiles) setShowFiles(false);
    if (disableAttachments && rightPanelTab === "files") setRightPanelTab("properties");
  }, [disableAttachments, rightPanelTab, showFiles]);

  useEffect(() => {
    if (view === "dashboard") {
      setActiveProjectId(null);
      setActiveProject(null);
    }
  }, [view]);

  const handleOpenProject = async (projectId: string) => {
    setActiveProjectId(projectId);
    setView("editor");
    const project = await repo.get(projectId);
    setActiveProject(project);
    if (project.type === "diagram") {
      useDiagramStore.getState().setFilename(project.title);
      setSpec(project.content);
    }
  };

  useEffect(() => {
    if (!hostConfig.initialProjectId) return;
    let cancelled = false;
    void (async () => {
      try {
        await handleOpenProject(hostConfig.initialProjectId!);
      } catch (e) {
        console.error(e);
        if (!cancelled) addToast("Failed to load project.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostConfig.initialProjectId]);

  const openImportedProject = (p: { type: "diagram" | "paper"; title: string; content: string }) => {
    const id = `imported:${Date.now()}`;
    setView("editor");
    setActiveProjectId(id);
    if (p.type === "paper") {
      setActiveProject({
        id,
        title: p.title,
        type: "paper",
        updatedAt: "",
        isPublic: false,
        paper: { renderTemplate: "paged" },
        content: { markdown: p.content, renderTemplate: "paged", customCss: "" },
      });
    } else {
      setActiveProject({
        id,
        title: p.title,
        content: p.content,
        updatedAt: "",
        type: p.type,
      } as any);
    }

    if (p.type === "diagram") {
      useDiagramStore.getState().setFilename(p.title);
      setSpec(p.content);
    }
  };

  // Load content via URL parameters (?spec= / ?paper= / ?link=).
  useEffect(() => {
    if (hostConfig.initialProjectId) return;
    const params = new URLSearchParams(window.location.search);

    const specParam = params.get("spec");
    if (specParam) {
      try {
        openImportedProject({
          type: "diagram",
          title: "Imported Diagram",
          content: decodeBase64Utf8ToString(specParam),
        });
      } catch (e) {
        console.error("Failed to load ?spec", e);
        addToast("Failed to load diagram from URL.", "error");
      }
      return;
    }

    const paperParam = params.get("paper");
    if (paperParam) {
      try {
        openImportedProject({
          type: "paper",
          title: "Imported Paper",
          content: decodeBase64Utf8ToString(paperParam),
        });
      } catch (e) {
        console.error("Failed to load ?paper", e);
        addToast("Failed to load paper from URL.", "error");
      }
      return;
    }

    const requested = params.get("link");
    if (!requested) return;

    const forcedType = params.get("type");
    const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const src = resolveRequestedImport(requested, baseUrl);
    if (!src) {
      addToast("Invalid URL import source.", "error");
      return;
    }

    setView("editor");
    setActiveProject(null);

    let cancelled = false;
    const controller = new AbortController();
    void (async () => {
      try {
        let text: string;
        if (src.kind === "localStorage") {
          const stored = localStorage.getItem(src.key);
          if (stored == null) throw new Error(`localStorage key not found: ${src.key}`);
          text = stored;
        } else if (src.kind === "url") {
          const res = await fetch(src.url, { method: "GET", signal: controller.signal });
          if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
          text = await res.text();
        } else {
          throw new Error("Invalid import source");
        }

        const detected = detectImportedType(text, forcedType);
        if (cancelled) return;
        openImportedProject({
          type: detected,
          title: detected === "diagram" ? "Imported Diagram" : "Imported Paper",
          content: text,
        });
      } catch (e) {
        console.error("Failed to import via ?url/?link", e);
        if (!cancelled) addToast("Failed to load content from URL.", "error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);
  
    let content;
  
    const backAction = () => {
      if (disableDashboard) {
        if (hostConfig.exit?.href) window.location.href = hostConfig.exit.href;
        return;
      }
      setView("dashboard");
    };

    if (view === "editor" && !activeProject) {
      content = (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-sm text-gray-500">Loading…</div>
        </div>
      );
    } else if (view === 'dashboard') {
      if (disableDashboard) {
        content = (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-sm text-gray-500">Loading…</div>
          </div>
        );
      } else {
      content = <Dashboard onOpenProject={handleOpenProject} />;
      }
    } else if (activeProject?.type === 'paper') {
      // --- PAPER EDITOR RENDER ---
      content = (
        <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
          {/* Top Nav for Paper Mode is Inside PaperEditor or we reuse common Nav?
                   PaperEditor has its own Toolbar because it's quite specific.
                   But we want to share the "Home" button context.
               */}
  
          {/* We wrap PaperEditor but inject back button behavior */}
          <div className="flex-1 relative flex overflow-hidden">
            {/* Left AI Panel (Collapsible) - Available in Paper Mode too! */}
            {!disableAI ? (
              <div className={`transition-all duration-300 ease-in-out border-r border-gray-200 bg-white relative z-30 shadow-xl ${showChat ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
                <div className="w-80 h-full absolute right-0">
                  <AIChatPanel
                    context={{
                      type: 'paper',
                      projectId: activeProjectId ?? activeProject.id,
                      content: activeProject.content.markdown,
                      getCurrentContent: () => activeProject.content.markdown,
                      onUpdate: (newContent) =>
                        setActiveProject((prev) => {
                          if (!prev || prev.type !== "paper") return prev as any;
                          return { ...prev, content: { ...prev.content, markdown: newContent } };
                        }),
                    }}
                    onBusyChange={setAiBusy}
                  />
                </div>
              </div>
            ) : null}
  
            <div className="flex-1 relative flex flex-col min-w-0">
              <div className="absolute top-3 left-4 z-40">
                <button
                  onClick={backAction}
                  className="p-2 bg-white/50 hover:bg-white text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 rounded-lg transition-all shadow-sm backdrop-blur"
                  title={disableDashboard ? (hostConfig.exit?.label ?? "Back") : "Back to Dashboard"}
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
  
              <PaperEditor
                initialPaper={activeProject.content}
                filename={activeProject.title}
                initialFilesView={hostConfig.paperInitialFilesView}
                showSaveButton={canPersist}
                onRename={
                  canPersist
                    ? async (nextTitle) => {
                        const updated = await repo.update({
                          id: activeProject.id,
                          title: nextTitle,
                        });
                        setActiveProject(updated);
                      }
                    : undefined
                }
                onPersist={
                  canPersist
                    ? async (paper) => {
                        const updated = await repo.update({
                          id: activeProject.id,
                          title: activeProject.title,
                          paper,
                        });
                        setActiveProject(updated);
                      }
                    : undefined
                }
                onChange={(paper) => {
                  setActiveProject((prev) => {
                    if (!prev || prev.type !== "paper") return prev as any;
                    return { ...prev, content: paper, paper: { renderTemplate: paper.renderTemplate, themeId: paper.themeId } };
                  });
                }}
                showPrintButton={hostConfig.enablePrintPreview}
                panelControls={{
                  files: disableAttachments
                    ? undefined
                    : {
                        isOpen: showFiles,
                        onToggle: () => setShowFiles(!showFiles),
                      },
                  chat: disableAI
                    ? undefined
                    : {
                        isOpen: showChat,
                        isBusy: aiBusy,
                        onToggle: () => setShowChat(!showChat),
                      },
                }}
                sharing={
                  canPersist &&
                  repo.capabilities.sharing?.canTogglePublic &&
                  repo.getPublicUrl &&
                  repo.capabilities.sharing?.canGetPublicUrl
                    ? {
                        isPublic: Boolean(activeProject.isPublic),
                        publicUrl: shareUrl ?? undefined,
                        onTogglePublic: async (next) => {
                          const updated = await repo.update({
                            id: activeProject.id,
                            isPublic: next,
                          });
                          setActiveProject(updated);
                          if (!next) {
                            setShareUrl(null);
                          }
                        },
                        onCopyShareLink: async () => {
                          await handleShare();
                        },
                        onPublishToGallery: repo.capabilities.sharing.canPublishToGallery
                          ? async () => {
                              const element = document.querySelector('.paper-content-wrapper') as HTMLElement;
                              if (!element) {
                                  addToast("Could not find paper content", "error");
                                  return;
                              }
                              try {
                                  const blob = await capturePaperScreenshot(element);
                                  setScreenshotBlob(blob);
                                  setShowPublishModal(true);
                              } catch (e) {
                                  console.error(e);
                                  addToast("Failed to generate screenshot", "error");
                              }
                          }
                          : undefined
                      }
                    : undefined
                }
              />
            </div>
  
            {/* Right Files Panel (Collapsible) */}
            {!disableAttachments ? (
              <div
                className={`transition-all duration-300 ease-in-out border-l border-gray-200 bg-white relative z-30 shadow-xl ${
                  showFiles ? "w-80 translate-x-0" : "w-0 translate-x-full opacity-0"
                }`}
              >
                <div className="w-80 h-full absolute left-0">
                  <AttachmentsPanel projectId={activeProject.id} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    } else {
      // --- DIAGRAM EDITOR RENDER (Legacy/Standard) ---
      content = (
        <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
          {/* Top Navigation Bar */}
          <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shadow-sm relative">
            <div className="flex items-center gap-4">
              <button
                onClick={backAction}
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
                {canPersist ? (
                  isEditingDiagramTitle ? (
                    <input
                      className="min-w-0 max-w-[380px] w-[28ch] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      value={diagramTitleDraft}
                      onChange={(e) => setDiagramTitleDraft(e.target.value)}
                      onBlur={() => void commitDiagramTitle()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitDiagramTitle();
                        if (e.key === "Escape") {
                          setIsEditingDiagramTitle(false);
                          setDiagramTitleDraft(filename);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-gray-600 font-medium hover:underline min-w-0 truncate text-left"
                      title="Click to rename"
                      onClick={() => {
                        setDiagramTitleDraft(filename);
                        setIsEditingDiagramTitle(true);
                      }}
                    >
                      {filename}
                    </button>
                  )
                ) : (
                  <div className="text-gray-600 font-medium min-w-0 truncate" title={filename}>
                    {filename}
                  </div>
                )}
              </div>
            </div>
  
            <div className="flex items-center gap-2">
              {canPersist ? (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                >
                  <Save size={16} />
                  <span className="hidden sm:inline">Save</span>
                </button>
              ) : null}
              {activeProject &&
                canPersist &&
                repo.capabilities.sharing?.canTogglePublic &&
                repo.getPublicUrl &&
                repo.capabilities.sharing?.canGetPublicUrl && (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          const updated = await repo.update({
                            id: activeProject.id,
                            isPublic: !Boolean(activeProject.isPublic),
                          });
                          setActiveProject(updated);
                          addToast(
                            updated.isPublic ? "Diagram is now public" : "Diagram is now private",
                            "success"
                          );
                        } catch (e) {
                          console.error(e);
                          addToast("Failed to update sharing", "error");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                        activeProject.isPublic
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                      title={activeProject.isPublic ? "Public (click to make private)" : "Private (click to make public)"}
                    >
                      {activeProject.isPublic ? "Public" : "Private"}
                    </button>
                    <button
                      onClick={() => handleShare()}
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      title="Copy share link"
                    >
                      Share
                    </button>
                    {repo.capabilities.sharing.canPublishToGallery && canPersist && (
                      <button
                        onClick={handlePublish}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                        title="Publish to Community Gallery"
                      >
                        <Upload size={16} />
                        <span className="hidden sm:inline">Publish</span>
                      </button>
                    )}
                  </>
                )}
              <button
                onClick={() => setShowProperties(!showProperties)}
                className={`p-2 rounded-lg transition-colors ${showProperties ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Toggle Right Panel"
              >
                <PanelRight size={20} />
              </button>
              {!disableAttachments ? (
                <button
                  onClick={() => {
                    setRightPanelTab("files");
                    setShowProperties(true);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showProperties && rightPanelTab === "files"
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                  title="Files"
                >
                  <Paperclip size={20} />
                </button>
              ) : null}
            </div>
          </nav>
  
          {/* Main Workspace */}
          <div className="flex-1 flex overflow-hidden relative">
  
            {/* Left AI Panel (Collapsible) */}
            {!disableAI ? (
              <div className={`transition-all duration-300 ease-in-out border-r border-gray-200 bg-white relative z-20 shadow-xl ${showChat ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
                <div className="w-80 h-full absolute right-0">
                      <AIChatPanel
                        context={{
                          type: "diagram",
                          projectId: activeProjectId ?? activeProject?.id,
                          content: spec,
                          getCurrentContent: () => useDiagramStore.getState().spec,
                          onUpdate: setSpec,
                        }}
                        onBusyChange={setAiBusy}
                      />
                </div>
              </div>
            ) : null}
  
            {/* Canvas Area */}
            <div className="flex-1 relative bg-gray-50 flex flex-col min-w-0">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                <Toolbar
                  onExport={handleExport}
                  onShare={handleShare}
                  enableChat={!disableAI}
                  onToggleChat={!disableAI ? () => setShowChat(!showChat) : undefined}
                  isChatOpen={!disableAI ? showChat : false}
                  isChatBusy={!disableAI ? aiBusy : false}
                />
              </div>
  
              <div className="flex-1 overflow-hidden relative">
                <ArrowGramEditor />
              </div>
            </div>
  
            {/* Right Property Panel */}
            <div className={`${showProperties ? 'w-80 border-l border-gray-200' : 'w-0'} transition-all duration-300 ease-in-out bg-white z-20 shadow-xl flex flex-col overflow-hidden`}>
              <div className="w-80 h-full flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRightPanelTab("properties")}
                      className={`text-sm font-semibold px-2 py-1 rounded ${
                        rightPanelTab === "properties"
                          ? "bg-white shadow text-gray-800"
                          : "text-gray-600 hover:bg-white/60"
                      }`}
                    >
                      Properties
                    </button>
                    {!disableAttachments ? (
                      <button
                        onClick={() => setRightPanelTab("files")}
                        className={`text-sm font-semibold px-2 py-1 rounded ${
                          rightPanelTab === "files"
                            ? "bg-white shadow text-gray-800"
                            : "text-gray-600 hover:bg-white/60"
                        }`}
                      >
                        Files
                      </button>
                    ) : null}
                  </div>
                  <button onClick={() => setShowProperties(false)} className="text-gray-400 hover:text-gray-600 lg:hidden">
                    <PanelRight size={16} />
                  </button>
                </div>
                {rightPanelTab === "properties" ? (
                  <div className="flex-1 overflow-y-auto p-4">
                    <PropertyEditor
                      selection={selection}
                      spec={spec}
                      onSpecChange={setSpec}
                    />
                  </div>
                ) : !disableAttachments ? (
                  <div className="flex-1 overflow-hidden">
                    {activeProject ? (
                      <AttachmentsPanel projectId={activeProject.id} />
                    ) : (
                      <div className="p-4 text-sm text-gray-500">No project selected.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );
    }
  
    return (
      <>
        {content}
        <TikzExportModal
          tikzCode={tikzCode}
          onClose={() => setShowTikz(false)}
          isOpen={showTikz}
        />
        
        <PublishGalleryModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          initialTitle={activeProject?.title || filename}
          screenshotBlob={screenshotBlob}
          onConfirm={async (metadata) => {
            if (!activeProject || !repo.publishToGallery) return;
            try {
              const res = await repo.publishToGallery(activeProject.id, metadata);
              addToast(`Published! ${res.postUrl}`, "success");
              // Optimistically update the UI to reflect the project is now public
              setActiveProject((prev) => (prev ? { ...prev, isPublic: true } : null));
            } catch (e) {
              console.error(e);
              addToast("Failed to publish", "error");
            }
          }}
        />
      </>
    );
  }
