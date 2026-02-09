import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ArrowGramDiagram,
  computeDiagram,
  NodeSpec,
  ArrowSpec,
  ComputedDiagram,
  ComputedArrow,
  reverseArrow,
  flipArrow,
  selectConnected,
  rotateNodes,
  flipNodes
} from '@hotdocx/arrowgram';
import { Grid } from 'lucide-react';
import { formatSpec } from './utils/specFormatter';
import { useDiagramStore } from './store/diagramStore';

const GRID_SIZE = 40;
const NODE_RADIUS = 25;
const HANDLE_RADIUS = 6;

interface EditorInteractionState {
  mode: 'idle' | 'panning' | 'moving' | 'connecting' | 'reattaching';
  startPoint?: { x: number; y: number };
  initialViewBox?: number[];
  source?: string; // Node ID for moving/connecting, Arrow ID for reattaching
  endType?: 'from' | 'to'; // For reattaching
  initialPos?: { left: number; top: number }; // For moving
  endPoint?: { x: number; y: number };
  hoveredTarget?: { type: 'node' | 'arrow'; id: string };
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
  const selectedIds = useDiagramStore(state => state.selectedIds);
  const setSelection = useDiagramStore(state => state.setSelection);
  const toggleSelection = useDiagramStore(state => state.toggleSelection);
  const deleteSelection = useDiagramStore(state => state.deleteSelection);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || activeElement?.isContentEditable;

      if (isInputActive) return;

      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        deleteSelection();
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          useDiagramStore.temporal.getState().redo();
        } else {
          useDiagramStore.temporal.getState().undo();
        }
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        useDiagramStore.temporal.getState().redo();
        e.preventDefault();
      }

      // Select All (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.key)]);
        setSelection(allIds);
      }

      // Save (Prevent browser save dialog)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('arrowgram:save'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection, nodes, arrows, setSelection]);

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
    e.preventDefault();
    const target = e.target as HTMLElement;
    const targetIsHandle = target.closest('[data-type]');
    const point = getSVGPoint(e);

    // Canvas Click
    if (!targetIsHandle) {
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        setSelection(new Set());
      }

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

    if (type === 'handle') {
      const arrowId = handle.getAttribute('data-arrow-id');
      const endType = handle.getAttribute('data-end-type') as 'from' | 'to';
      if (arrowId && endType) {
        setInteraction({
          mode: 'reattaching',
          source: arrowId,
          endType,
          endPoint: point
        });
      }
      return;
    }

    if (!id) return;

    // Selection Logic
    if (type === 'node' || type === 'arrow') {
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        toggleSelection(id);
      } else {
        if (!selectedIds.has(id)) {
          setSelection(new Set([id]));
        }
      }

      if (type === 'node') {
        const node = nodes.find(n => n.name === id);
        if (node) {
          if (e.shiftKey) {
            // Shift+Drag from node = Connect
            setInteraction({ mode: 'connecting', source: id, endPoint: point });
          } else {
            // Move Mode
            setInteraction({ mode: 'moving', source: id, startPoint: point, initialPos: { left: node.left, top: node.top } });
          }
        }
      } else if (type === 'arrow') {
        const arrow = diagram.arrows.find(a => a.key === id);
        if (arrow && e.shiftKey) {
          // Connect from arrow
          const sourceName = arrow.spec.name;
          if (sourceName) {
            setInteraction({ mode: 'connecting', source: sourceName, endPoint: point });
          }
        }
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
      // If we are moving, we move ALL selected nodes
      const dx = point.x - interaction.startPoint.x;
      const dy = point.y - interaction.startPoint.y;

      // Calculate new positions for all selected nodes
      // We rely on the initial positions being implicitly relative
      // Ideally we would capture initial positions of ALL selected nodes on drag start.
      // But for simplicity, we calculate delta and apply to all.
      // Wait, if we apply delta to spec every frame, it accumulates drift or need to be based on initial.
      // The current implementation for single node relies on `initialPos`.
      // For multi-move, we need initial pos for all.
      // Let's simplified approach: Calculate delta since *last* move? No, accumulation error.
      // We should probably just support single node move perfectly, and multi-node move roughly or refactor to store all initial positions.
      // Let's refactor `moving` to store a map of initial positions for all selected nodes.
      // But `interaction` state is simple.
      // Let's stick to single node move logic for the *dragged* node, and apply the same delta to others.

      const draggedNode = nodes.find(n => n.name === interaction.source);
      if (!draggedNode || !interaction.initialPos) return;

      const newLeft = snap(interaction.initialPos.left + dx);
      const newTop = snap(interaction.initialPos.top + dy);
      const deltaX = newLeft - draggedNode.left;
      const deltaY = newTop - draggedNode.top;

      if (deltaX === 0 && deltaY === 0) return; // No grid snap change

      const newNodes = nodes.map(n => {
        if (selectedIds.has(n.name)) {
          return { ...n, left: n.left + deltaX, top: n.top + deltaY };
        }
        return n;
      });

      // We map computed arrows back to specs for saving
      const arrowSpecs = arrows.map(a => a.spec);
      onSpecChange(formatSpec({ nodes: newNodes, arrows: arrowSpecs }));

      // Update interaction state is not needed for delta calc since we read from `nodes` state which updates.
      // Wait, if `nodes` updates, `draggedNode.left` updates. So deltaX is relative to *current* position? 
      // No, we want to drag relative to initial. 
      // The previous logic: `newLeft = snap(initial.left + dx)`. `deltaX = newLeft - current.left`.
      // This works.

    } else if (interaction.mode === 'connecting' || interaction.mode === 'reattaching') {
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const targetGroup = targetElement?.closest('[data-type]');
      let hoveredTarget: { type: 'node' | 'arrow'; id: string } | undefined;

      if (targetGroup) {
        const type = targetGroup.getAttribute('data-type');
        const id = targetGroup.getAttribute('data-id');
        if ((type === 'node' || type === 'arrow') && id) {
          hoveredTarget = { type: type as 'node' | 'arrow', id };
        }
      }
      setInteraction(prev => ({ ...prev, endPoint: point, hoveredTarget }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if ((interaction.mode === 'connecting' && interaction.source) || (interaction.mode === 'reattaching' && interaction.source)) {
      const target = (e.target as HTMLElement).closest('[data-type]');

      let targetName: string | undefined;

      if (target) {
        const targetType = target.getAttribute('data-type');
        const targetId = target.getAttribute('data-id');

        if (targetType === 'node') {
          targetName = targetId || undefined;
        } else if (targetType === 'arrow') {
          const targetArrow = diagram.arrows.find(a => a.key === targetId);
          targetName = targetArrow?.spec.name;
        }
      }

      if (interaction.mode === 'connecting') {
        const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.spec.name).filter(Boolean) as string[]]);

        if (targetName) {
          const isLoop = targetName === interaction.source;
          const newArrow: ArrowSpec = {
            name: generateName('arrow', allNames),
            from: interaction.source!,
            to: targetName,
            label: '',
            radius: isLoop ? 40 : undefined,
            angle: isLoop ? -90 : undefined
          };
          const arrowSpecs = arrows.map(a => a.spec);
          onSpecChange(formatSpec({ nodes, arrows: [...arrowSpecs, newArrow] }));
        } else if (!targetName) {
          // Dropped on canvas - create new node and connect
          const newNodeName = generateName('N', allNames);
          const point = interaction.endPoint || { x: 0, y: 0 };
          const newNode: NodeSpec = {
            name: newNodeName,
            label: newNodeName,
            left: snap(point.x),
            top: snap(point.y)
          };

          const newArrow: ArrowSpec = {
            name: generateName('arrow', allNames),
            from: interaction.source!,
            to: newNodeName,
            label: ''
          };

          const arrowSpecs = arrows.map(a => a.spec);
          onSpecChange(formatSpec({ nodes: [...nodes, newNode], arrows: [...arrowSpecs, newArrow] }));
          setSelection(new Set([newNodeName]));
        }
      } else if (interaction.mode === 'reattaching') {
        // Reattach existing arrow
        let finalTargetName = targetName;

        if (!finalTargetName) {
          // Dropped on canvas - create new node
          const allNames = new Set([...nodes.map(n => n.name), ...arrows.map(a => a.spec.name).filter(Boolean) as string[]]);
          const newNodeName = generateName('N', allNames);
          const point = interaction.endPoint || { x: 0, y: 0 };
          const newNode: NodeSpec = {
            name: newNodeName,
            label: newNodeName,
            left: snap(point.x),
            top: snap(point.y)
          };

          // We need to update nodes AND arrows
          finalTargetName = newNodeName;

          // We'll update spec with both new node and updated arrow below
          const arrowSpecs = arrows.map(a => {
            if ((a.spec.name || a.key) === interaction.source) {
              return { ...a.spec, [interaction.endType!]: finalTargetName };
            }
            return a.spec;
          });

          onSpecChange(formatSpec({ nodes: [...nodes, newNode], arrows: arrowSpecs }));
          setSelection(new Set([newNodeName])); // Select new node for immediate editing if desired? Or keep arrow selected? 
          // Quiver behavior: Selects the new node.
        } else {
          // Reattach to existing node
          const arrowSpecs = arrows.map(a => {
            if ((a.spec.name || a.key) === interaction.source) {
              return { ...a.spec, [interaction.endType!]: finalTargetName };
            }
            return a.spec;
          });
          onSpecChange(formatSpec({ nodes, arrows: arrowSpecs }));
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
    setSelection(new Set([name]));
  };

  return {
    interaction,
    selectedIds,
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
  const selectedIds = useDiagramStore(state => state.selectedIds);
  const setSelection = useDiagramStore(state => state.setSelection);

  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState([0, 0, 1000, 600]);
  const [showGrid, setShowGrid] = useState(true);

  const onSpecChange = useCallback((newSpec: string) => setSpec(newSpec), [setSpec]);

	  const { nodes, arrows, diagram } = useMemo(() => {
	    try {
	      const result = computeDiagram(specString);
	      return { nodes: result.nodes, arrows: result.arrows, diagram: result };
	    } catch {
	      return {
	        nodes: [],
	        arrows: [],
	        diagram: { arrows: [], nodes: [], masks: [], viewBox: "0 0 100 100", error: null },
	      };
	    }
	  }, [specString]);

  const { interaction, handlers } = useEditorInteraction(svgRef, viewBox, setViewBox, nodes, arrows, onSpecChange, diagram);

  const cursor = interaction.mode === 'panning' ? 'grabbing' : interaction.mode === 'connecting' || interaction.mode === 'reattaching' ? 'crosshair' : 'default';

  const getSourcePos = () => {
    if (!interaction.source) return null;

    if (interaction.mode === 'connecting') {
      const node = nodes.find(n => n.name === interaction.source);
      if (node) return { x: node.left, y: node.top };

      const arrow = diagram.arrows.find(a => a.spec.name === interaction.source);
      if (arrow) return arrow.midpoint;
    } else if (interaction.mode === 'reattaching') {
      // Find the STATIC end of the arrow being reattached
      const arrow = diagram.arrows.find(a => a.key === interaction.source); // source is arrow ID
      if (arrow) {
        return interaction.endType === 'from' ? arrow.targetPoint : arrow.sourcePoint;
      }
    }

    return null;
  };

  const sourcePos = getSourcePos();

  const handleZoom = useCallback((factor: number, center?: { x: number, y: number }) => {
    const [x, y, width, height] = viewBox;
    const newWidth = width * factor;
    const newHeight = height * factor;

    if (newWidth < 10 || newWidth > 20000) return;

    const c = center || { x: x + width / 2, y: y + height / 2 };

    const newX = c.x - (c.x - x) * factor;
    const newY = c.y - (c.y - y) * factor;

    setViewBox([newX, newY, newWidth, newHeight]);
  }, [viewBox]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;

      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const CTM = svg.getScreenCTM();
      if (CTM) {
        const svgPt = pt.matrixTransform(CTM.inverse());
        handleZoom(factor, svgPt);
      }
    }
  }, [handleZoom]);

  const fitView = useCallback(() => {
    if (diagram.viewBox) {
      const parts = diagram.viewBox.split(' ').map(Number);
      if (parts.length === 4) setViewBox(parts);
    }
  }, [diagram.viewBox]);

  const resetZoom = useCallback(() => {
    if (svgRef.current) {
      const { clientWidth, clientHeight } = svgRef.current;
      const [cx, cy] = [viewBox[0] + viewBox[2] / 2, viewBox[1] + viewBox[3] / 2];
      setViewBox([cx - clientWidth / 2, cy - clientHeight / 2, clientWidth, clientHeight]);
    }
  }, [viewBox]);

  // Operations
  const handleOp = useCallback((action: string) => {
    if (selectedIds.size === 0) return;

    if (action === 'selectConnected') {
      const connected = selectConnected(arrows.map(a => a.spec), selectedIds);
      setSelection(connected);
      return;
    }

    let newNodes = nodes;
    let newArrowSpecs = arrows.map(a => a.spec);
    let changed = false;

    if (action === 'reverse') {
      newArrowSpecs = newArrowSpecs.map(a => {
        if (selectedIds.has(a.name || '') || (a as any).uniqueId && selectedIds.has((a as any).uniqueId)) {
          changed = true;
          return reverseArrow(a);
        }
        return a;
      });
    } else if (action === 'flip') {
      newArrowSpecs = newArrowSpecs.map(a => {
        if (selectedIds.has(a.name || '') || (a as any).uniqueId && selectedIds.has((a as any).uniqueId)) {
          changed = true;
          return flipArrow(a);
        }
        return a;
      });
    } else if (['rotate', 'flipH', 'flipV'].includes(action)) {
      if (action === 'rotate') newNodes = rotateNodes(nodes, selectedIds, 90);
      else if (action === 'flipH') newNodes = flipNodes(nodes, selectedIds, 'horizontal');
      else if (action === 'flipV') newNodes = flipNodes(nodes, selectedIds, 'vertical');
      changed = true;
    }

    if (changed) {
      onSpecChange(formatSpec({ nodes: newNodes, arrows: newArrowSpecs }));
    }
  }, [selectedIds, nodes, arrows, onSpecChange, setSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement?.tagName.toLowerCase() === 'input') return;

      if (e.key === 'r') handleOp('reverse');
      if (e.key === 'e') handleOp('flip');
      if (e.key === 'g') fitView();
      if (e.key === '0') resetZoom();
      if (e.key === 'h') {
        if (e.shiftKey) handleOp('flipH');
        else setShowGrid(prev => !prev);
      }
      if (e.key === 'v') handleOp('flipV');
      if (e.key === 't') handleOp('rotate');
      if (e.shiftKey && e.key === 'A') handleOp('selectConnected');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOp, fitView, resetZoom]);

  return (
    <div className="flex bg-gray-50 h-full w-full relative group select-none" style={{ cursor: 'auto' }}>
      <div className="flex-1 relative overflow-hidden h-full">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2 bg-white/90 backdrop-blur rounded-lg border shadow-sm p-1 z-10">
          <button onClick={() => handleOp('reverse')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium" title="Reverse Arrow (R)">Rev</button>
          <button onClick={() => handleOp('flip')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium" title="Flip Arrow (E)">Flip</button>
          <div className="w-px bg-gray-200 mx-1"></div>
          <button onClick={() => handleOp('flipH')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium" title="Flip Horizontally (Shift+H)">↔</button>
          <button onClick={() => handleOp('flipV')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium" title="Flip Vertically (V)">↕</button>
          <button onClick={() => handleOp('rotate')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium" title="Rotate 90° (T)">↻</button>
          <div className="w-px bg-gray-200 mx-1"></div>
          <button onClick={() => handleOp('selectConnected')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium" title="Select Connected (Shift+A)">Conn</button>
        </div>

        <svg
          id="arrowgram-canvas"
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox.join(' ')}
          style={{ cursor, touchAction: 'none' }}
          onWheel={handleWheel}
          {...handlers}
        >
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          {showGrid && (
            <rect x={viewBox[0]} y={viewBox[1]} width={viewBox[2]} height={viewBox[3]} fill="url(#grid)" />
          )}

          <ArrowGramDiagram diagram={diagram} />

          {/* Highlight potential target (Quiver-style) */}
          {(interaction.mode === 'connecting' || interaction.mode === 'reattaching') && interaction.endPoint && (!interaction.hoveredTarget || interaction.hoveredTarget.type === 'node') && (() => {
            const x = Math.round(interaction.endPoint.x / GRID_SIZE) * GRID_SIZE;
            const y = Math.round(interaction.endPoint.y / GRID_SIZE) * GRID_SIZE;
            const existingNode = nodes.find(n => Math.abs(n.left - x) < 1 && Math.abs(n.top - y) < 1);

            return (
              <g style={{ pointerEvents: 'none' }}>
                {existingNode ? (
                  <rect
                    x={existingNode.left - NODE_RADIUS - 8}
                    y={existingNode.top - NODE_RADIUS - 8}
                    width={(NODE_RADIUS + 8) * 2}
                    height={(NODE_RADIUS + 8) * 2}
                    fill="rgba(0, 0, 0, 0.1)"
                    rx="12"
                  />
                ) : (
                  <g>
                    <rect
                      x={x - GRID_SIZE / 1.5}
                      y={y - GRID_SIZE / 1.5}
                      width={GRID_SIZE * 1.33}
                      height={GRID_SIZE * 1.33}
                      fill="rgba(0, 0, 0, 0.05)"
                      rx="8"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fontWeight="500"
                      fill="rgba(0,0,0,0.4)"
                      style={{ userSelect: 'none' }}
                    >
                      Add Node
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* Interaction Layer */}
          {nodes.map(node => (
            <rect
              key={node.name}
              x={node.left - NODE_RADIUS - 5}
              y={node.top - NODE_RADIUS - 5}
              width={(NODE_RADIUS + 5) * 2}
              height={(NODE_RADIUS + 5) * 2}
              fill="transparent"
              stroke={selectedIds.has(node.name) ? "#9333ea" : "transparent"}
              strokeWidth="2"
              data-type="node"
              data-id={node.name}
              style={{ cursor: 'move' }}
            />
          ))}

          {diagram.arrows.map(arrow => {
            const isSelected = selectedIds.has(arrow.key);
            const isHoveredTarget = interaction.hoveredTarget?.type === 'arrow' && interaction.hoveredTarget.id === arrow.key;
            const isSource = interaction.mode === 'connecting' && interaction.source === arrow.spec.name;

            return (
              <g key={arrow.key} data-type="arrow" data-id={arrow.key} style={{ cursor: 'pointer' }}>
                {/* Thick selection/source/target halo */}
                {(isSelected || isSource || isHoveredTarget) && (
                  arrow.interactionPath ? (
                    <path d={arrow.interactionPath} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="20" strokeLinecap="round" />
                  ) : (
                    arrow.paths.map((p, i) => (
                      <path key={`halo-${i}`} d={p.d} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="20" strokeLinecap="round" />
                    ))
                  )
                )}

                {arrow.interactionPath ? (
                  <path d={arrow.interactionPath} fill="none" stroke="transparent" strokeWidth="15" />
                ) : (
                  arrow.paths.map((p, i) => (
                    <path key={i} d={p.d} fill="none" stroke="transparent" strokeWidth="15" />
                  ))
                )}

                {/* Visual selection highlight - dashed line */}
                {isSelected && (
                  arrow.interactionPath ? (
                    <path d={arrow.interactionPath} fill="none" stroke="#9333ea" strokeWidth="1" strokeDasharray="4 2" />
                  ) : (
                    arrow.paths.map((p, i) => (
                      <path key={`select-${i}`} d={p.d} fill="none" stroke="#9333ea" strokeWidth="1" strokeDasharray="4 2" />
                    ))
                  )
                )}

                {/* Reattach Handles */}
                {isSelected && arrow.sourcePoint && (
                  <circle
                    cx={arrow.sourcePoint.x}
                    cy={arrow.sourcePoint.y}
                    r={HANDLE_RADIUS}
                    fill="white"
                    stroke="#9333ea"
                    strokeWidth="2"
                    data-type="handle"
                    data-arrow-id={arrow.key}
                    data-end-type="from"
                    style={{ cursor: 'crosshair' }}
                  />
                )}
                {isSelected && arrow.targetPoint && (
                  <circle
                    cx={arrow.targetPoint.x}
                    cy={arrow.targetPoint.y}
                    r={HANDLE_RADIUS}
                    fill="white"
                    stroke="#9333ea"
                    strokeWidth="2"
                    data-type="handle"
                    data-arrow-id={arrow.key}
                    data-end-type="to"
                    style={{ cursor: 'crosshair' }}
                  />
                )}
              </g>
            )
          })}

          {(interaction.mode === 'connecting' || interaction.mode === 'reattaching') && sourcePos && interaction.endPoint && (() => {
            let isLoop = false;
            let targetPos = { x: interaction.endPoint!.x, y: interaction.endPoint!.y };

            if (interaction.hoveredTarget?.type === 'node') {
              const targetNode = nodes.find(n => n.name === interaction.hoveredTarget!.id);
              if (targetNode) targetPos = { x: targetNode.left, y: targetNode.top };

              if (interaction.mode === 'connecting') {
                isLoop = interaction.source === interaction.hoveredTarget.id;
              } else if (interaction.mode === 'reattaching') {
                const arrow = diagram.arrows.find(a => a.key === interaction.source);
                if (arrow) {
                  const otherNodeId = interaction.endType === 'to' ? arrow.spec.from : arrow.spec.to;
                  isLoop = otherNodeId === interaction.hoveredTarget.id;
                }
              }
            } else if (!interaction.hoveredTarget) {
              // Snap to grid for cleaner preview if not hovering a node
              targetPos = {
                x: Math.round(targetPos.x / GRID_SIZE) * GRID_SIZE,
                y: Math.round(targetPos.y / GRID_SIZE) * GRID_SIZE
              };

              const dist = Math.sqrt(Math.pow(targetPos.x - sourcePos.x, 2) + Math.pow(targetPos.y - sourcePos.y, 2));
              if (dist < GRID_SIZE) {
                isLoop = true;
                targetPos = sourcePos;
              }
            }

            const tempNodes: NodeSpec[] = [
              { name: 'A', label: '', left: sourcePos.x, top: sourcePos.y },
              { name: 'B', label: '', left: targetPos.x, top: targetPos.y }
            ];

            const tempSpec: ArrowSpec = {
              from: 'A',
              to: isLoop ? 'A' : 'B',
              label: '',
              radius: isLoop ? 40 : undefined,
              angle: isLoop ? -90 : undefined
            };

            const result = computeDiagram({
              nodes: tempNodes,
              arrows: [tempSpec]
            });

            const arrow = result.arrows[0];
            if (!arrow) return null;

            return (
              <g style={{ pointerEvents: 'none', opacity: 0.6 }}>
                {arrow.paths.map((p, i) => (
                  <path key={i} d={p.d} fill="none" stroke="#9333ea" strokeWidth="2" strokeDasharray="5 5" />
                ))}
                {arrow.heads.map((h, i) => (
                  <path key={`h-${i}`} d={h.props.d} fill="none" stroke="#9333ea" strokeWidth="2" />
                ))}
              </g>
            );
          })()}

        </svg>

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border shadow-sm text-xs text-gray-500 pointer-events-none select-none">
          Double-click: Add Node • Drag: Move • Shift+Drag: Connect • Ctrl+Scroll: Zoom • H: Grid • R: Reverse • E: Flip
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white/90 backdrop-blur rounded-lg border shadow-sm p-1">
          <button onClick={() => handleZoom(0.9)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 font-bold w-8 h-8 flex items-center justify-center" title="Zoom In">+</button>
          <button onClick={() => handleZoom(1.1)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 font-bold w-8 h-8 flex items-center justify-center" title="Zoom Out">-</button>
          <div className="h-px bg-gray-200 mx-1"></div>
          <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 hover:bg-gray-100 rounded text-gray-600 w-8 h-8 flex items-center justify-center ${!showGrid ? 'bg-gray-100 text-gray-900' : ''}`} title="Toggle Grid (H)">
            <Grid size={16} />
          </button>
          <button onClick={fitView} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs font-medium w-8 h-8 flex items-center justify-center" title="Fit View (G)">Fit</button>
          <button onClick={resetZoom} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 text-xs font-medium w-8 h-8 flex items-center justify-center" title="Reset Zoom (0)">1:1</button>
        </div>
      </div>
    </div>
  );
}
