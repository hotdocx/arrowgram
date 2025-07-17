import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowGramDiagram } from './ArrowGramDiagram.jsx';
import { computeDiagram } from './diagramModel.js';
import { PropertyEditor } from './PropertyEditor.jsx';

const GRID_SIZE = 40;
const NODE_RADIUS = 25; // From ArrowGram.jsx

// A simple utility to generate unique names
const generateUniqueName = (prefix, existingNames) => {
  let i = 1;
  while (existingNames.has(`${prefix}${i}`)) {
    i++;
  }
  return `${prefix}${i}`;
};

export function ArrowGramEditor({ spec: specString, onSpecChange }) {
  const { nodes, arrows } = useMemo(() => {
    try {
      const spec = JSON.parse(specString);
      return { nodes: spec.nodes || [], arrows: spec.arrows || [] };
    } catch (e) {
      console.error("Invalid spec for editor:", e);
      return { nodes: [], arrows: [] };
    }
  }, [specString]);

  const diagram = useMemo(() => computeDiagram(specString), [specString]);

  const [selection, setSelection] = useState(new Set());
  const [interaction, setInteraction] = useState({ mode: 'default' });
  const svgRef = useRef(null);
  
  const getSVGPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const CTM = svg.getScreenCTM();
    if (CTM) {
        return pt.matrixTransform(CTM.inverse());
    }
    return pt;
  }, []);

  const handleCanvasPointerDown = useCallback((e) => {
    const targetIsHandle = e.target.closest('[data-node-name], [data-arrow-name]');
    if (targetIsHandle) return;

    const point = getSVGPoint(e);
    const snappedX = Math.round(point.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(point.y / GRID_SIZE) * GRID_SIZE;

    if (!e.shiftKey) {
      setSelection(new Set());
    }

    const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.name).filter(Boolean)]);
    const newNodeName = generateUniqueName('N', allNames);
    const newNode = {
      name: newNodeName,
      label: newNodeName,
      left: snappedX,
      top: snappedY,
    };
    const newNodes = [...nodes, newNode];
    if (onSpecChange) {
      onSpecChange(JSON.stringify({ nodes: newNodes, arrows }, null, 2));
    }
    
    const newSelection = new Set([newNodeName]);
    setSelection(newSelection);

    const startPositions = new Map();
    startPositions.set(newNode.name, { left: newNode.left, top: newNode.top });

    setInteraction({
        mode: 'moving',
        selection: newSelection,
        dragStart: point,
        startPositions: startPositions
    });
  }, [getSVGPoint, nodes, arrows, onSpecChange]);

  const handleNodePointerDown = useCallback((e, nodeName) => {
    e.stopPropagation();
    const point = getSVGPoint(e);
    
    let newSelection;
    if (e.shiftKey) {
        newSelection = new Set(selection);
        if (newSelection.has(nodeName)) {
            newSelection.delete(nodeName);
        } else {
            newSelection.add(nodeName);
        }
    } else {
        newSelection = selection.has(nodeName) ? selection : new Set([nodeName]);
    }
    
    setSelection(newSelection);

    if (e.ctrlKey || e.metaKey) {
        setInteraction({ mode: 'connecting', source: nodeName, phantomEnd: point });
    } else {
        const startPositions = new Map();
        nodes.forEach(node => {
            if (newSelection.has(node.name)) {
                startPositions.set(node.name, { left: node.left, top: node.top });
            }
        });
        setInteraction({ 
            mode: 'moving', 
            selection: newSelection, 
            dragStart: point,
            startPositions: startPositions
        });
    }
  }, [getSVGPoint, nodes, selection, onSpecChange]);

  const handleArrowPointerDown = useCallback((e, arrowName) => {
    e.stopPropagation();
    const point = getSVGPoint(e);
    
    let newSelection;
    if (e.shiftKey) {
        newSelection = new Set(selection);
        if (newSelection.has(arrowName)) {
            newSelection.delete(arrowName);
        } else {
            newSelection.add(arrowName);
        }
    } else {
        newSelection = selection.has(arrowName) ? selection : new Set([arrowName]);
    }
    
    setSelection(newSelection);

    if (e.ctrlKey || e.metaKey) {
        setInteraction({ mode: 'connecting', source: arrowName, phantomEnd: point });
    }
  }, [getSVGPoint, selection]);

  const handlePointerMove = useCallback((e) => {
    if (interaction.mode === 'default') return;
    
    const point = getSVGPoint(e);

    if (interaction.mode === 'moving') {
        const dx = point.x - interaction.dragStart.x;
        const dy = point.y - interaction.dragStart.y;

        const newNodes = nodes.map(node => {
            if (interaction.selection.has(node.name)) {
                const startPos = interaction.startPositions.get(node.name);
                return {
                    ...node,
                    left: Math.round((startPos.left + dx) / GRID_SIZE) * GRID_SIZE,
                    top: Math.round((startPos.top + dy) / GRID_SIZE) * GRID_SIZE,
                };
            }
            return node;
        });
        
        if (onSpecChange) {
            onSpecChange(JSON.stringify({ nodes: newNodes, arrows }, null, 2));
        }
    } else if (interaction.mode === 'connecting') {
        setInteraction(prev => ({ ...prev, phantomEnd: point }));
    }
  }, [interaction, getSVGPoint, nodes, arrows, onSpecChange]);

  const handlePointerUp = useCallback((e) => {
    if (interaction.mode === 'connecting') {
        const targetElement = e.target.closest('[data-node-name], [data-arrow-name]');
        if (targetElement) {
            const targetName = targetElement.getAttribute('data-node-name') || targetElement.getAttribute('data-arrow-name');
            if (targetName && targetName !== interaction.source) {
                const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.name).filter(Boolean)]);
                const newArrowName = generateUniqueName('arrow', allNames);
                const newArrow = {
                    name: newArrowName,
                    from: interaction.source,
                    to: targetName,
                    label: ''
                };
                const newArrows = [...arrows, newArrow];
                if (onSpecChange) {
                  onSpecChange(JSON.stringify({ nodes, arrows: newArrows }, null, 2));
                }
            }
        }
    }
    setInteraction({ mode: 'default' });
  }, [interaction, nodes, arrows, onSpecChange]);
  
  const nodeHandles = useMemo(() => nodes.map(node => (
    <g 
      key={`${node.name}-handle`}
      transform={`translate(${node.left}, ${node.top})`}
      onPointerDown={(e) => handleNodePointerDown(e, node.name)}
      data-node-name={node.name}
      style={{ cursor: 'pointer' }}
    >
      <circle 
        r={NODE_RADIUS + 5} 
        fill={selection.has(node.name) ? "rgba(0, 100, 255, 0.3)" : "transparent"}
        stroke={selection.has(node.name) ? "rgba(0, 100, 255, 0.8)" : "transparent"}
        strokeWidth="1.5"
      />
    </g>
  )), [nodes, selection, handleNodePointerDown]);

  const arrowHandles = useMemo(() => (
    diagram.arrows.map(arrow => {
        const arrowName = arrow.spec.name;
        if (!arrowName) return null;
        return (
            <g 
                key={`${arrowName}-handle`}
                onPointerDown={(e) => handleArrowPointerDown(e, arrowName)}
                data-arrow-name={arrowName}
                style={{ cursor: 'pointer' }}
            >
                {arrow.paths.map((path, i) => (
                    <path
                        key={i}
                        d={path.d}
                        fill="none"
                        stroke={selection.has(arrowName) ? "rgba(0, 100, 255, 0.3)" : "transparent"}
                        strokeWidth="20"
                        strokeLinecap="round"
                    />
                ))}
            </g>
        )
    })
  ), [diagram.arrows, selection, handleArrowPointerDown]);

  const sourcePos = useMemo(() => {
    if (interaction.mode !== 'connecting') return null;
    const sourceName = interaction.source;
    
    const node = nodes.find(n => n.name === sourceName);
    if (node) {
        return { left: node.left, top: node.top };
    }

    const arrow = diagram.arrows.find(a => a.spec.name === sourceName);
    if (arrow) {
        return { left: arrow.midpoint.x, top: arrow.midpoint.y };
    }
    
    return null;
  }, [interaction, nodes, diagram.arrows]);
  
  const [vb, setVb] = useState('0 0 1000 600');
  useEffect(() => {
    if (diagram.viewBox && diagram.viewBox !== vb) {
        setVb(diagram.viewBox);
    }
  }, [diagram.viewBox, vb]);

  const [vbParts, setVbParts] = useState([0, 0, 1000, 600]);
  useEffect(() => {
    const parts = vb.split(' ').map(Number);
    if (parts.length === 4) {
      setVbParts(parts);
    }
  }, [vb]);

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '600px' }}>
      <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px', position: 'relative' }}>
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox={vb}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ backgroundColor: '#f9f9f9', cursor: 'crosshair' }}
        >
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={vbParts[2]} height={vbParts[3]} fill="url(#grid)" x={vbParts[0]} y={vbParts[1]}/>
          
          <ArrowGramDiagram diagram={diagram} />

          {nodeHandles}
          {arrowHandles}

          {interaction.mode === 'connecting' && sourcePos && (
              <line
                  x1={sourcePos.left}
                  y1={sourcePos.top}
                  x2={interaction.phantomEnd.x}
                  y2={interaction.phantomEnd.y}
                  stroke="#007bff"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  pointerEvents="none"
              />
          )}
        </svg>
        <div style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.8)', padding: '5px', borderRadius: '3px', fontSize: '12px', pointerEvents: 'none' }}>
            Click to create a node. Ctrl/Cmd+Drag from a node to create an arrow.
        </div>
      </div>
       <div style={{ width: '280px' }}>
         <PropertyEditor 
            selection={selection}
            spec={specString}
            onSpecChange={onSpecChange}
          />
       </div>
    </div>
  );
}