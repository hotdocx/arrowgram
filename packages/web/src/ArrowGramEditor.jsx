import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowGramDiagram, computeDiagram } from 'arrowgram';
import { PropertyEditor } from './PropertyEditor.jsx';
import { formatSpec } from './utils/specFormatter.js';
import { useDiagramStore } from './store/diagramStore.js';

const GRID_SIZE = 40;
const NODE_RADIUS = 25;

// Hook for managing interactions (state machine)
function useEditorInteraction(svgRef, viewBox, setViewBox, nodes, arrows, onSpecChange, diagram) {
  const [interaction, setInteraction] = useState({ mode: 'idle' });
  const selection = useDiagramStore(state => state.selection);
  const setSelection = useDiagramStore(state => state.setSelection);

  const getSVGPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const CTM = svg.getScreenCTM();
    if (CTM) return pt.matrixTransform(CTM.inverse());
    return pt;
  }, []);

  const snap = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const generateName = (prefix, set) => {
    let i = 1;
    while (set.has(`${prefix}${i}`)) i++;
    return `${prefix}${i}`;
  };

  const handlePointerDown = (e) => {
    const targetIsHandle = e.target.closest('[data-type]');
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
    const type = targetIsHandle.getAttribute('data-type');
    const id = targetIsHandle.getAttribute('data-id');

    // Selection Logic
    if (type === 'node') {
      const node = nodes.find(n => n.name === id);
      setSelection({ key: id, item: node });

      if (e.ctrlKey || e.metaKey) {
        // Connect Mode
        setInteraction({ mode: 'connecting', source: id, endPoint: point });
      } else {
        // Move Mode
        setInteraction({ mode: 'moving', source: id, startPoint: point, initialPos: { left: node.left, top: node.top } });
      }
    } else if (type === 'arrow') {
      const arrow = diagram.arrows.find(a => a.key === id);
      setSelection({ key: id, item: arrow?.spec });
    }
  };

  const handlePointerMove = (e) => {
    if (interaction.mode === 'idle') return;
    const point = getSVGPoint(e);

    if (interaction.mode === 'panning') {
      const dx = (e.clientX - interaction.startPoint.x) * (viewBox[2] / svgRef.current.clientWidth);
      const dy = (e.clientY - interaction.startPoint.y) * (viewBox[3] / svgRef.current.clientHeight);
      setViewBox([
        interaction.initialViewBox[0] - dx,
        interaction.initialViewBox[1] - dy,
        interaction.initialViewBox[2],
        interaction.initialViewBox[3]
      ]);
    } else if (interaction.mode === 'moving') {
      const dx = point.x - interaction.startPoint.x;
      const dy = point.y - interaction.startPoint.y;

      const newNodes = nodes.map(n => {
        if (n.name === interaction.source) {
          return { ...n, left: snap(interaction.initialPos.left + dx), top: snap(interaction.initialPos.top + dy) };
        }
        return n;
      });
      // Optimization: Don't update global spec on every frame, use local ref? 
      // For now, simplicity:
      onSpecChange(formatSpec({ nodes: newNodes, arrows }));
    } else if (interaction.mode === 'connecting') {
      setInteraction(prev => ({ ...prev, endPoint: point }));
    }
  };

  const handlePointerUp = (e) => {
    if (interaction.mode === 'connecting') {
      const target = e.target.closest('[data-type="node"]');
      if (target) {
        const targetId = target.getAttribute('data-id');
        if (targetId && targetId !== interaction.source) {
          const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.name).filter(Boolean)]);
          const newArrow = {
            name: generateName('arrow', allNames),
            from: interaction.source,
            to: targetId,
            label: ''
          };
          onSpecChange(formatSpec({ nodes, arrows: [...arrows, newArrow] }));
        }
      }
    }
    setInteraction({ mode: 'idle' });
  };

  const handleDoubleClick = (e) => {
    if (e.target.closest('[data-type]')) return;
    const point = getSVGPoint(e);
    const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.name).filter(Boolean)]);
    const name = generateName('N', allNames);
    const newNode = { name, label: name, left: snap(point.x), top: snap(point.y) };
    onSpecChange(formatSpec({ nodes: [...nodes, newNode], arrows }));
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
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState([0, 0, 1000, 600]);

  const onSpecChange = useCallback((newSpec) => setSpec(newSpec), [setSpec]);

  const { nodes, arrows, diagram } = useMemo(() => {
    try {
      const spec = JSON.parse(specString);
      const n = spec.nodes || [];
      const a = spec.arrows || [];
      return { nodes: n, arrows: a, diagram: computeDiagram(specString) };
    } catch {
      return { nodes: [], arrows: [], diagram: { arrows: [], viewBox: "0 0 100 100" } };
    }
  }, [specString]);

  useEffect(() => {
    // Auto-fit on load?
    if (diagram.viewBox && viewBox[2] === 1000) {
      // const vb = diagram.viewBox.split(' ').map(Number);
      // if (vb.length === 4) setViewBox(vb);
    }
  }, [diagram.viewBox]);

  const { interaction, selection, handlers } = useEditorInteraction(svgRef, viewBox, setViewBox, nodes, arrows, onSpecChange, diagram);

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
              x1={nodes.find(n => n.name === interaction.source)?.left}
              y1={nodes.find(n => n.name === interaction.source)?.top}
              x2={interaction.endPoint.x}
              y2={interaction.endPoint.y}
              stroke="#9333ea"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
          )}

        </svg>

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border shadow-sm text-xs text-gray-500 pointer-events-none select-none">
          Double-click: Add Node • Drag: Move • Ctrl+Drag: Connect • Scroll: Zoom
        </div>
      </div>
      {/* Removed Property Editor from here, as it is in the App layout */}
    </div>
  );
}