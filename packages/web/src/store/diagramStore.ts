import { create } from 'zustand';
import { temporal } from 'zundo';
import { NodeSpec, ArrowSpec } from 'arrowgram';

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
  reset: () => void;
}

const initialSpec = JSON.stringify({
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
        (set) => ({
            spec: initialSpec,
            filename: 'Untitled Diagram',
            selection: { key: null, item: null },

            setSpec: (newSpec) => set({ spec: newSpec }),
            setFilename: (name) => set({ filename: name }),
            setSelection: (selection) => set({ selection }),

            reset: () => set({ spec: initialSpec, filename: 'Untitled Diagram' }),
        }),
        {
            limit: 100,
        }
    )
);