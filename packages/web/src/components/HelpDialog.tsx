import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function HelpDialog(props: { isOpen: boolean; onClose: () => void }) {
  if (!props.isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-[720px] max-w-[95vw] ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Help</h3>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <div className="font-semibold text-gray-900 mb-1">Modes</div>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
              <li>
                <span className="font-medium text-gray-800">Diagram editor</span>: build Arrowgram JSON diagrams,
                export SVG/PNG/TikZ, integrate with Quiver, share links.
              </li>
              <li>
                <span className="font-medium text-gray-800">Paper editor</span>: write Markdown with YAML frontmatter,
                live preview (Paged.js or Reveal.js), print to PDF, embed diagrams and charts.
              </li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-gray-900 mb-1">Paper Templates</div>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
              <li>
                <span className="font-medium text-gray-800">Paged</span>: paginated article/book preview (Paged.js).
              </li>
              <li>
                <span className="font-medium text-gray-800">Slides</span>: Reveal.js deck. Separate slides with a line containing only{" "}
                <span className="font-mono">---</span>.
              </li>
            </ul>
            <div className="text-xs text-gray-500 mt-2">
              Slides print: use “Print PDF” while in Slides mode (it opens a Reveal print view and triggers the browser print dialog).
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-900 mb-1">Custom CSS</div>
            <div className="text-gray-600">
              Open the <span className="font-medium text-gray-800">Styles</span> panel in the paper editor to customize the output CSS.
              The placeholder includes copy/paste-ready snippets for common tasks (font size, colors, diagram backgrounds).
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-900 mb-1">Paper Embeds</div>
            <div className="text-gray-600">In paper Markdown, these blocks are supported:</div>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
              <li>
                Arrowgram: <span className="font-mono">&lt;div class="arrowgram"&gt;{"{...json...}"}&lt;/div&gt;</span>
              </li>
              <li>
                Mermaid: <span className="font-mono">&lt;div class="mermaid"&gt;...&lt;/div&gt;</span>
              </li>
              <li>
                Vega-Lite: <span className="font-mono">&lt;div class="vega-lite"&gt;{"{...json...}"}&lt;/div&gt;</span>
              </li>
              <li>KaTeX math: inline <span className="font-mono">$...$</span> and display <span className="font-mono">$$...$$</span></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-gray-900 mb-1">URL Import</div>
            <div className="text-gray-600">Open Arrowgram with content preloaded via query params:</div>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Diagram inline: <span className="font-mono">/?spec=&lt;base64url(utf8-json)&gt;</span>
              </li>
              <li>
                Paper inline: <span className="font-mono">/?paper=&lt;base64url(utf8-markdown)&gt;</span>
              </li>
              <li>
                Fetch by URL:{" "}
                <span className="font-mono">/?link=&lt;https://… or /path&gt;&amp;type=paper|diagram</span>
              </li>
              <li>
                Load from localStorage:{" "}
                <span className="font-mono">/?link=ls:my_key&amp;type=paper</span>
              </li>
            </ul>
            <div className="text-xs text-gray-500 mt-2">
              Note: cross-origin <span className="font-mono">?link=</span> requires CORS from that origin.
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-900 mb-1">Security</div>
            <div className="text-gray-600">
              Only open papers from trusted sources. The viewer sanitizes rendered HTML, but untrusted content can
              still be misleading and may load external resources.
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={props.onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
