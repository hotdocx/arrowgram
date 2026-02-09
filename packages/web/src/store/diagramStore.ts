import { create } from 'zustand';
import { temporal } from 'zundo';
import { NodeSpec, ArrowSpec, DiagramSpec } from '@hotdocx/arrowgram';
import { formatSpec } from '../utils/specFormatter';

export type SelectionState = {
    key?: string;
};

interface DiagramState {
    spec: string;
    filename: string;
    selectedIds: Set<string>;
    setSpec: (newSpec: string) => void;
    setFilename: (name: string) => void;
    setSelection: (ids: Set<string>) => void;
    toggleSelection: (id: string) => void;
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
            selectedIds: new Set(),

            setSpec: (newSpec) => set({ spec: newSpec }),
            setFilename: (name) => set({ filename: name }),
            setSelection: (selectedIds) => set({ selectedIds }),
            toggleSelection: (id) => {
                const { selectedIds } = get();
                const newSet = new Set(selectedIds);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                set({ selectedIds: newSet });
            },

            deleteSelection: () => {
                const { selectedIds, spec: specString } = get();
                if (selectedIds.size === 0) return;

                try {
                    const spec: DiagramSpec = JSON.parse(specString);

                    // Filter out deleted nodes
                    const newNodes = (spec.nodes || []).filter(n => !selectedIds.has(n.name));

                    // Filter out deleted arrows AND arrows connected to deleted nodes
                    const newArrows = (spec.arrows || []).filter(a => {
                        if (a.name && selectedIds.has(a.name)) return false;
                        if (selectedIds.has(a.from) || selectedIds.has(a.to)) return false;
                        return true;
                    });

                    set({
                        spec: formatSpec({ nodes: newNodes, arrows: newArrows }),
                        selectedIds: new Set()
                    });
                } catch (e) {
                    console.error("Failed to delete items:", e);
                }
            },

            reset: () => set({
                spec: JSON.stringify({ version: 1, nodes: [], arrows: [] }, null, 2),
                filename: 'Untitled Diagram',
                selectedIds: new Set()
            }),

            createNew: () => {
                set({
                    spec: JSON.stringify({
                        version: 1,
                        nodes: [],
                        arrows: []
                    }, null, 2),
                    filename: 'Untitled Diagram',
                    selectedIds: new Set()
                });
                useDiagramStore.temporal.getState().clear();
            }
        }),
        {
            limit: 100,
            partialize: (state) => ({ spec: state.spec }), // Only track spec in history
        }
    )
);
