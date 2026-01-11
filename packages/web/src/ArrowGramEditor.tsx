import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowGramDiagram, computeDiagram, NodeSpec, ArrowSpec, ComputedDiagram, ComputedArrow } from 'arrowgram';
import { formatSpec } from './utils/specFormatter';
import { useDiagramStore } from './store/diagramStore';

const GRID_SIZE = 40;
const NODE_RADIUS = 25;

interface EditorInteractionState {
  mode: 'idle' | 'panning' | 'moving' | 'connecting';
  startPoint?: { x: number; y: number };
  initialViewBox?: number[];
  source?: string; // Node ID
  initialPos?: { left: number; top: number };
  endPoint?: { x: number; y: number };
}

function useEditorInteraction(
  svgRef: React.RefObject<SVGSVGElement | null>,
  viewBox: number[],
  setViewBox: (vb: number[]) => void,
  nodes: NodeSpec[],
  arrows: ComputedArrow[],
  onSpecChange: (spec: string) => void,
  diagram: ComputedDiagram
) {
  const [interaction, setInteraction] = useState<EditorInteractionState>({ mode: 'idle' });
  const selection = useDiagramStore(state => state.selection);
  const setSelection = useDiagramStore(state => state.setSelection);
  const deleteSelection = useDiagramStore(state => state.deleteSelection);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement | null;
        const activeTag = activeElement?.tagName.toLowerCase();
        const isInputActive = activeTag === 'input' || activeTag === 'textarea' || activeElement?.isContentEditable;

        if ((e.key === 'Delete' || e.key === 'Backspace')) {
            if (isInputActive) return;
            deleteSelection();
        }

        // Undo/Redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (isInputActive) return;
            if (e.shiftKey) {
                useDiagramStore.temporal.getState().redo();
            } else {
                useDiagramStore.temporal.getState().undo();
            }
            e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            if (isInputActive) return;
            useDiagramStore.temporal.getState().redo();
            e.preventDefault();
        }
        
        // Save (Prevent browser save dialog)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            // Trigger save action via a custom event or a shared handler if accessible.
            // For now, let's just dispatch a custom event that App.tsx can listen to, or simpler:
            // Since we don't have direct access to handleSave here, we can rely on the user clicking the button 
            // OR move handleSave to the store (but saving to IDB is an effect).
            // Let's dispatch a custom event 'arrowgram:save'
            window.dispatchEvent(new CustomEvent('arrowgram:save'));
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection]);

  const getSVGPoint = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const CTM = svg.getScreenCTM();
    if (CTM) return pt.matrixTransform(CTM.inverse());
    return pt;
  }, []);

  const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const generateName = (prefix: string, set: Set<string>) => {
    let i = 1;
    while (set.has(`${prefix}${i}`)) i++;
    return `${prefix}${i}`;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const targetIsHandle = target.closest('[data-type]');
    const point = getSVGPoint(e);

    // Canvas Click
    if (!targetIsHandle) {
      if (!e.shiftKey) setSelection({ key: null, item: null });

      // Pan start
      setInteraction({
        mode: 'panning',
        startPoint: { x: e.clientX, y: e.clientY },
        initialViewBox: [...viewBox]
      });
      return;
    }

    e.stopPropagation();
    const handle = targetIsHandle as HTMLElement;
    const type = handle.getAttribute('data-type');
    const id = handle.getAttribute('data-id');

    if (!id) return;

    // Selection Logic
    if (type === 'node') {
      const node = nodes.find(n => n.name === id);
      if (node) {
        setSelection({ key: id, item: node });

        if (e.shiftKey) {
          // Connect Mode
          setInteraction({ mode: 'connecting', source: id, endPoint: point });
        } else {
          // Move Mode
          setInteraction({ mode: 'moving', source: id, startPoint: point, initialPos: { left: node.left, top: node.top } });
        }
      }
    } else if (type === 'arrow') {
      const arrow = diagram.arrows.find(a => a.key === id);
      if (arrow) {
          setSelection({ key: id, item: arrow.spec });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interaction.mode === 'idle') return;
    const point = getSVGPoint(e);

    if (interaction.mode === 'panning' && interaction.startPoint && interaction.initialViewBox && svgRef.current) {
      const dx = (e.clientX - interaction.startPoint.x) * (viewBox[2] / svgRef.current.clientWidth);
      const dy = (e.clientY - interaction.startPoint.y) * (viewBox[3] / svgRef.current.clientHeight);
      setViewBox([
        interaction.initialViewBox[0] - dx,
        interaction.initialViewBox[1] - dy,
        interaction.initialViewBox[2],
        interaction.initialViewBox[3]
      ]);
    } else if (interaction.mode === 'moving' && interaction.source && interaction.initialPos && interaction.startPoint) {
      const dx = point.x - interaction.startPoint.x;
      const dy = point.y - interaction.startPoint.y;

      const newNodes = nodes.map(n => {
        if (n.name === interaction.source) {
          return { 
              ...n, 
              left: snap(interaction.initialPos!.left + dx), 
              top: snap(interaction.initialPos!.top + dy) 
          };
        }
        return n;
      });
      // We map computed arrows back to specs for saving
      const arrowSpecs = arrows.map(a => a.spec);
      onSpecChange(formatSpec({ nodes: newNodes, arrows: arrowSpecs }));
    } else if (interaction.mode === 'connecting') {
      setInteraction(prev => ({ ...prev, endPoint: point }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (interaction.mode === 'connecting' && interaction.source) {
      const target = (e.target as HTMLElement).closest('[data-type="node"]');
      if (target) {
        const targetId = target.getAttribute('data-id');
        if (targetId && targetId !== interaction.source) {
          const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.spec.name).filter(Boolean) as string[]]);
          const newArrow: ArrowSpec = {
            name: generateName('arrow', allNames),
            from: interaction.source,
            to: targetId,
            label: ''
          };
          const arrowSpecs = arrows.map(a => a.spec);
          onSpecChange(formatSpec({ nodes, arrows: [...arrowSpecs, newArrow] }));
        }
      }
    }
    setInteraction({ mode: 'idle' });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-type]')) return;
    const point = getSVGPoint(e);
    const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.spec.name).filter(Boolean) as string[]]);
    const name = generateName('N', allNames);
    const newNode: NodeSpec = { name, label: name, left: snap(point.x), top: snap(point.y) };
    const arrowSpecs = arrows.map(a => a.spec);
    onSpecChange(formatSpec({ nodes: [...nodes, newNode], arrows: arrowSpecs }));
    setSelection({ key: name, item: newNode });
  };

  return {
    interaction,
    selection,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onDoubleClick: handleDoubleClick
    }
  };
}

export function ArrowGramEditor() {
  const specString = useDiagramStore((state) => state.spec);
  const setSpec = useDiagramStore((state) => state.setSpec);
  const selection = useDiagramStore(state => state.selection);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState([0, 0, 1000, 600]);

  const onSpecChange = useCallback((newSpec: string) => setSpec(newSpec), [setSpec]);

  const { nodes, arrows, diagram } = useMemo(() => {
    try {
      // Use the computeDiagram from the library which is now robust
      const result = computeDiagram(specString);
      return { nodes: result.nodes, arrows: result.arrows, diagram: result };
    } catch {
      return { nodes: [], arrows: [], diagram: { arrows: [], nodes: [], viewBox: "0 0 100 100", error: null } };
    }
  }, [specString]);

  const { interaction, handlers } = useEditorInteraction(svgRef, viewBox, setViewBox, nodes, arrows, onSpecChange, diagram);

  const cursor = interaction.mode === 'panning' ? 'grabbing' : interaction.mode === 'connecting' ? 'crosshair' : 'default';

  return (
    <div className="flex bg-gray-50 h-full w-full relative group" style={{ cursor: 'auto' }}>
      <div className="flex-1 relative overflow-hidden h-full">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox.join(' ')}
          style={{ cursor, touchAction: 'none' }}
          {...handlers}
        >
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x={viewBox[0]} y={viewBox[1]} width={viewBox[2]} height={viewBox[3]} fill="url(#grid)" />

          <ArrowGramDiagram diagram={diagram} />

          {/* Interaction Layer */}
          {nodes.map(node => (
            <rect
              key={node.name}
              x={node.left - NODE_RADIUS - 5}
              y={node.top - NODE_RADIUS - 5}
              width={(NODE_RADIUS + 5) * 2}
              height={(NODE_RADIUS + 5) * 2}
              fill="transparent"
              stroke={selection.key === node.name ? "#9333ea" : "transparent"}
              strokeWidth="2"
              data-type="node"
              data-id={node.name}
              style={{ cursor: 'move' }}
            />
          ))}

          {diagram.arrows.map(arrow => (
            <g key={arrow.key} data-type="arrow" data-id={arrow.key} style={{ cursor: 'pointer' }}>
              {arrow.paths.map((p, i) => (
                <path key={i} d={p.d} fill="none" stroke="transparent" strokeWidth="15" />
              ))}
              {/* Visual selection highlight */}
              {selection.key === arrow.key && arrow.paths.map((p, i) => (
                <path key={i} d={p.d} fill="none" stroke="#9333ea" strokeWidth="1" strokeDasharray="4 2" />
              ))}
            </g>
          ))}

          {interaction.mode === 'connecting' && (
             <line
              // @ts-ignore
              x1={nodes.find(n => n.name === interaction.source)?.left}
              // @ts-ignore
              y1={nodes.find(n => n.name === interaction.source)?.top}
              x2={interaction.endPoint?.x}
              y2={interaction.endPoint?.y}
              stroke="#9333ea"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
          )}

        </svg>

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border shadow-sm text-xs text-gray-500 pointer-events-none select-none">
          Double-click: Add Node • Drag: Move • Shift+Drag: Connect • Scroll: Zoom • Ctrl+Z: Undo • Ctrl+S: Save
        </div>
      </div>
    </div>
  );
}
