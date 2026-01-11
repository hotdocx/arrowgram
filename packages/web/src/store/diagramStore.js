import { create } from 'zustand';
import { temporal } from 'zundo';

const initialSpec = JSON.stringify({
    nodes: [
        { name: "A", left: 150, top: 150, label: "A" },
        { name: "B", left: 450, top: 150, label: "B" }
    ],
    arrows: [
        { name: "f", from: "A", to: "B", label: "f" }
    ]
}, null, 2);

export const useDiagramStore = create(
    temporal(
        (set) => ({
            spec: initialSpec,
            filename: 'Untitled Diagram',

            setSpec: (newSpec) => set({ spec: newSpec }),
            setFilename: (name) => set({ filename: name }),

            reset: () => set({ spec: initialSpec, filename: 'Untitled Diagram' }),
        }),
        {
            limit: 100, // Undo history limit
        }
    )
);
