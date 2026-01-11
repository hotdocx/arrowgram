import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowGramDiagram } from './ArrowGramDiagram.jsx';
import { computeDiagram } from './diagramModel.js';
import { PropertyEditor } from './PropertyEditor.jsx';
import { formatSpec } from './utils/specFormatter.js';

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

  const [selection, setSelection] = useState({ key: null, item: null });
  const [interaction, setInteraction] = useState({ mode: 'default' });
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState([0, 0, 1000, 600]);

  const fitView = useCallback(() => {
    if (diagram.viewBox) {
      const newVb = diagram.viewBox.split(' ').map(Number);
      if (newVb.length === 4 && newVb[2] > 0 && newVb[3] > 0) {
        setViewBox(newVb);
      }
    }
  }, [diagram.viewBox]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current && diagram.viewBox) {
        fitView();
        isInitialMount.current = false;
    }
  }, [diagram.viewBox, fitView]);
  
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

  const handleCanvasDoubleClick = useCallback((e) => {
    const targetIsHandle = e.target.closest('[data-node-name], [data-arrow-name]');
    if (targetIsHandle) return;

    const point = getSVGPoint(e);
    const snappedX = Math.round(point.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(point.y / GRID_SIZE) * GRID_SIZE;

    if (!e.shiftKey) {
      setSelection({ key: null, item: null });
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
      onSpecChange(formatSpec({ nodes: newNodes, arrows }));
    }
    
    setSelection({ key: newNodeName, item: newNode });

    // No need to enter 'moving' mode after creation
  }, [getSVGPoint, nodes, arrows, onSpecChange]);

  const handleCanvasPointerDown = useCallback((e) => {
    const targetIsHandle = e.target.closest('[data-node-name], [data-arrow-key]');
    if (targetIsHandle) return;

    // Clear selection if not shift-clicking
    if (!e.shiftKey) {
        setSelection({ key: null, item: null });
    }

    const point = getSVGPoint(e);
    setInteraction({
        mode: 'panning',
        dragStart: point,
        startViewBox: viewBox,
    });
  }, [getSVGPoint, viewBox]);

  const handleNodePointerDown = useCallback((e, node) => {
    e.stopPropagation();
    const point = getSVGPoint(e);
    
    // For now, we only support single selection editing
    setSelection({ key: node.name, item: node });

    if (e.ctrlKey || e.metaKey) {
        setInteraction({ mode: 'connecting', source: node.name, phantomEnd: point });
    } else {
        const startPositions = new Map();
        // This logic might need adjustment if multi-select move is re-enabled
        if (selection.key === node.name) {
            nodes.forEach(n => {
                if (selection.key === n.name) { // simplified for single selection
                    startPositions.set(n.name, { left: n.left, top: n.top });
                }
            });
        } else {
            startPositions.set(node.name, { left: node.left, top: node.top });
        }

        setInteraction({ 
            mode: 'moving', 
            selection: new Set([node.name]), // simplified for single selection
            dragStart: point,
            startPositions: startPositions
        });
    }
  }, [getSVGPoint, nodes, selection]);

  const handleArrowPointerDown = useCallback((e, arrowModel) => {
    e.stopPropagation();
    const point = getSVGPoint(e);
    
    setSelection({ key: arrowModel.key, item: arrowModel.spec });

    if (e.ctrlKey || e.metaKey) {
        const sourceName = arrowModel.spec.name;
        if (!sourceName) {
            alert("Source arrow must have a 'name' property to be connected from.");
            setInteraction({ mode: 'default' });
            return;
        }
        setInteraction({ mode: 'connecting', source: sourceName, phantomEnd: point });
    }
  }, [getSVGPoint]);

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
            onSpecChange(formatSpec({ nodes: newNodes, arrows }));
        }
    } else if (interaction.mode === 'connecting') {
        setInteraction(prev => ({ ...prev, phantomEnd: point }));
    } else if (interaction.mode === 'panning') {
        const dx = point.x - interaction.dragStart.x;
        const dy = point.y - interaction.dragStart.y;
        const [x, y, w, h] = interaction.startViewBox;
        setViewBox([x - dx, y - dy, w, h]);
    }
  }, [interaction, getSVGPoint, nodes, arrows, onSpecChange]);

  const handlePointerUp = useCallback((e) => {
    if (interaction.mode === 'connecting') {
        const targetElement = e.target.closest('[data-node-name], [data-arrow-key]');
        if (targetElement) {
            const nodeName = targetElement.getAttribute('data-node-name');
            const arrowKey = targetElement.getAttribute('data-arrow-key');
            let targetName;

            if (nodeName) {
                targetName = nodeName;
            } else if (arrowKey) {
                const targetArrow = diagram.arrows.find(a => a.key === arrowKey);
                targetName = targetArrow?.spec?.name;
                if (!targetName) {
                    alert("Target arrow must have a 'name' property to be connected to.");
                    setInteraction({ mode: 'default' });
                    return;
                }
            }

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
                  onSpecChange(formatSpec({ nodes, arrows: newArrows }));
                }
            }
        }
    }
    setInteraction({ mode: 'default' });
  }, [interaction, nodes, arrows, onSpecChange, diagram.arrows]);

  const handleZoom = useCallback((factor, center) => {
    const [x, y, width, height] = viewBox;
    const newWidth = width * factor;
    const newHeight = height * factor;

    // Add reasonable zoom limits
    if (newWidth < 10 || newWidth > 20000) return;

    const newX = center.x - (center.x - x) * factor;
    const newY = center.y - (center.y - y) * factor;

    setViewBox([newX, newY, newWidth, newHeight]);
  }, [viewBox]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const center = getSVGPoint(e);
    handleZoom(factor, center);
  }, [getSVGPoint, handleZoom]);

  const handleZoomButtons = useCallback((factor) => {
      const [x, y, w, h] = viewBox;
      const center = { x: x + w / 2, y: y + h / 2 };
      handleZoom(factor, center);
  }, [viewBox, handleZoom]);

  const nodeHandles = useMemo(() => nodes.map(node => (
    <g 
      key={`${node.name}-handle`}
      transform={`translate(${node.left}, ${node.top})`}
      onPointerDown={(e) => handleNodePointerDown(e, node)}
      data-node-name={node.name}
      style={{ cursor: 'pointer' }}
    >
      <circle 
        r={NODE_RADIUS + 5} 
        fill={selection.key === node.name ? "rgba(0, 100, 255, 0.3)" : "transparent"}
        stroke={selection.key === node.name ? "rgba(0, 100, 255, 0.8)" : "transparent"}
        strokeWidth="1.5"
      />
    </g>
  )), [nodes, selection, handleNodePointerDown]);

  const arrowHandles = useMemo(() => (
    diagram.arrows.map(arrow => {
        if (!arrow.key) return null;
        return (
            <g 
                key={`${arrow.key}-handle`}
                onPointerDown={(e) => handleArrowPointerDown(e, arrow)}
                data-arrow-key={arrow.key}
                style={{ cursor: 'pointer' }}
            >
                {arrow.paths.map((path, i) => (
                    <path
                        key={i}
                        d={path.d}
                        fill="none"
                        stroke={selection.key === arrow.key ? "rgba(0, 100, 255, 0.3)" : "transparent"}
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
  
  const cursor = useMemo(() => {
    switch (interaction.mode) {
        case 'panning':
            return 'grabbing';
        case 'moving':
            return 'grabbing';
        case 'connecting':
            return 'crosshair';
        default:
            return 'grab';
    }
  }, [interaction.mode]);

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '80vh' }}>
      <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox={viewBox.join(' ')}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleCanvasDoubleClick}
          onWheel={handleWheel}
          style={{ backgroundColor: '#f9f9f9', cursor: cursor, userSelect: 'none' }}
        >
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={viewBox[2]} height={viewBox[3]} fill="url(#grid)" x={viewBox[0]} y={viewBox[1]}/>
          
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
            Double-click to create a node. Drag canvas to pan. Use mouse wheel to zoom. Ctrl/Cmd+Drag from an element to create an arrow.
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '5px' }}>
            <button onClick={() => handleZoomButtons(0.9)} title="Zoom In" style={{width: '25px', height: '25px', padding: 0}}>+</button>
            <button onClick={() => handleZoomButtons(1.1)} title="Zoom Out" style={{width: '25px', height: '25px', padding: 0}}>-</button>
            <button onClick={fitView} title="Fit View" style={{height: '25px', padding: '0 5px'}}>Fit</button>
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