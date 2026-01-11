import { create } from 'zustand';
import { temporal } from 'zundo';
import { NodeSpec, ArrowSpec, DiagramSpec } from 'arrowgram';
import { formatSpec } from '../utils/specFormatter';

export interface SelectionState {
  key: string | null;
  item: NodeSpec | ArrowSpec | null;
}

interface DiagramState {
  spec: string;
  filename: string;
  selection: SelectionState;
  setSpec: (newSpec: string) => void;
  setFilename: (name: string) => void;
  setSelection: (selection: SelectionState) => void;
  deleteSelection: () => void;
  reset: () => void;
  createNew: () => void;
}

const initialSpec = JSON.stringify({
    version: 1,
    nodes: [
        { name: "A", left: 150, top: 150, label: "A" },
        { name: "B", left: 450, top: 150, label: "B" }
    ],
    arrows: [
        { name: "f", from: "A", to: "B", label: "f" }
    ]
}, null, 2);

export const useDiagramStore = create<DiagramState>()(
    temporal(
        (set, get) => ({
            spec: initialSpec,
            filename: 'Untitled Diagram',
            selection: { key: null, item: null },

            setSpec: (newSpec) => set({ spec: newSpec }),
            setFilename: (name) => set({ filename: name }),
            setSelection: (selection) => set({ selection }),
            
            deleteSelection: () => {
                const { selection, spec: specString } = get();
                if (!selection.key || !selection.item) return;

                try {
                    const spec: DiagramSpec = JSON.parse(specString);
                    const { key, item } = selection;
                    
                    // Determine if it's a node or arrow based on properties
                    const isNode = 'left' in item && 'top' in item;
                    
                    if (isNode) {
                        const nodeName = (item as NodeSpec).name;
                        // Filter out the node
                        const newNodes = (spec.nodes || []).filter(n => n.name !== nodeName);
                        // Filter out arrows connected to this node
                        const newArrows = (spec.arrows || []).filter(a => a.from !== nodeName && a.to !== nodeName);
                        
                        set({ 
                            spec: formatSpec({ nodes: newNodes, arrows: newArrows }),
                            selection: { key: null, item: null }
                        });
                    } else {
                        // It's an arrow
                        // For arrows, key is composite, but we can match by object identity or name if unique.
                        // Ideally we use the unique name if present, or filtering by matching properties if not.
                        // In ArrowGramEditor, we treat keys as unique identifiers.
                        // Let's rely on the fact that arrows usually have names generated.
                        const arrowItem = item as ArrowSpec;
                        const newArrows = (spec.arrows || []).filter(a => {
                             // Match by name if available
                             if (a.name && arrowItem.name) return a.name !== arrowItem.name;
                             // Fallback: match by content (deep equality check would be better but this is a simple heuristic)
                             return JSON.stringify(a) !== JSON.stringify(arrowItem);
                        });
                        
                        set({ 
                            spec: formatSpec({ nodes: spec.nodes, arrows: newArrows }),
                            selection: { key: null, item: null }
                        });
                    }
                } catch (e) {
                    console.error("Failed to delete item:", e);
                }
            },

            reset: () => set({ 
                spec: JSON.stringify({ version: 1, nodes: [], arrows: [] }, null, 2), 
                filename: 'Untitled Diagram' 
            }),
            
            createNew: () => {
                set({
                    spec: JSON.stringify({
                        version: 1,
                        nodes: [],
                        arrows: []
                    }, null, 2),
                    filename: 'Untitled Diagram',
                    selection: { key: null, item: null }
                });
                useDiagramStore.temporal.getState().clear();
            }
        }),
        {
            limit: 100,
        }
    )
);