import {
    ArrowSpec,
    ComputedArrow,
    ComputedDiagram,
    ComputedMask,
    DiagramSpec,
    DiagramSpecSchema,
    NodeSpec
} from '../types';
import { Point, Dimensions, mod } from './ds';
import { RoundedRectangle } from './curve';
import { Arrow, ArrowStyle, CONSTANTS, RoundedRectShape } from './arrow';

const NODE_RADIUS = 25;

export function normalizeAngle(angle: number): number {
    const a = mod(angle, 360);
    return a > 180 ? a - 360 : a;
}

interface EndpointInfo {
    pos: Point;
    shape: RoundedRectangle;
    isNode: boolean;
    level: number;
}

function mapSpecToStyle(spec: ArrowSpec, isLoop: boolean): ArrowStyle {
    const style = new ArrowStyle();

    // Set defaults based on spec or Quiver defaults
    style.level = spec.style?.level ?? 1;
    style.curve = spec.radius ?? spec.curve ?? 0;
    style.shift = spec.shift ?? 0;
    style.angle = (spec.angle ?? 0) * Math.PI / 180;
    style.label_position = 0.5; // Default (Quiver uses 0-100? No 0-1 in ArrowStyle, 0-100 in spec)
    // spec.label_position is likely missing in current ArrowSpec schema in types.ts?
    // Let's assume standard Quiver spec.

    if (spec.color) {
        style.colour = spec.color;
    }

    if (spec.shorten) {
        style.shorten.tail = spec.shorten.source ?? 0;
        style.shorten.head = spec.shorten.target ?? 0;
    }

    style.shape = isLoop ? CONSTANTS.ARROW_SHAPE.ARC : CONSTANTS.ARROW_SHAPE.BEZIER;

    // Map mode
    if (spec.style?.mode) {
        if (spec.style.mode === 'adjunction') {
            style.body_style = CONSTANTS.ARROW_BODY_STYLE.ADJUNCTION;
            style.heads = CONSTANTS.ARROW_HEAD_STYLE.NONE;
        } else if (spec.style.mode === 'corner') {
            style.body_style = CONSTANTS.ARROW_BODY_STYLE.NONE;
            style.heads = CONSTANTS.ARROW_HEAD_STYLE.NONE;
            style.tails = CONSTANTS.ARROW_HEAD_STYLE.CORNER;
        } else if (spec.style.mode === 'corner_inverse') {
            style.body_style = CONSTANTS.ARROW_BODY_STYLE.NONE;
            style.heads = CONSTANTS.ARROW_HEAD_STYLE.NONE;
            style.tails = CONSTANTS.ARROW_HEAD_STYLE.CORNER_INVERSE;
        }
    }

    if (spec.style?.body?.name) {
        const name = spec.style.body.name.toUpperCase();
        if (name === 'DASHED') style.dash_style = CONSTANTS.ARROW_DASH_STYLE.DASHED;
        if (name === 'DOTTED') style.dash_style = CONSTANTS.ARROW_DASH_STYLE.DOTTED;
        if (name === 'NONE') style.body_style = CONSTANTS.ARROW_BODY_STYLE.NONE;
        if (name === 'SQUIGGLY' || name === 'WAVY') style.body_style = CONSTANTS.ARROW_BODY_STYLE.SQUIGGLY;
        if (name === 'BARRED') style.body_style = CONSTANTS.ARROW_BODY_STYLE.PROARROW;
        if (name === 'DOUBLE_BARRED') style.body_style = CONSTANTS.ARROW_BODY_STYLE.DOUBLE_PROARROW;
        if (name === 'BULLET_SOLID') style.body_style = CONSTANTS.ARROW_BODY_STYLE.BULLET_SOLID;
        if (name === 'BULLET_HOLLOW') style.body_style = CONSTANTS.ARROW_BODY_STYLE.BULLET_HOLLOW;
    }

    if (spec.style?.head?.name) {
        let name = spec.style.head.name.toUpperCase();
        if (name === 'MAPS_TO') name = 'MAPS_TO'; // Enum match
        if (spec.style.head.side) {
            name += `_${spec.style.head.side.toUpperCase()}`;
        }
        // Quiver HEAD_STYLES has "HOOK_TOP", "HARPOON_BOTTOM" etc.
        // We need to map `name="hook", side="top"` -> "HOOK_TOP".

        let key = name;
        if (name === 'HOOK') key = `HOOK_${spec.style.head.side?.toUpperCase() || 'TOP'}`;
        if (name === 'HARPOON') key = `HARPOON_${spec.style.head.side?.toUpperCase() || 'TOP'}`;

        style.heads = CONSTANTS.ARROW_HEAD_STYLE[key] || CONSTANTS.ARROW_HEAD_STYLE.NORMAL;
    }

    if (spec.style?.tail?.name) {
        let name = spec.style.tail.name.toUpperCase();
        let key = name;
        if (name === 'HOOK') key = `HOOK_${spec.style.tail.side?.toUpperCase() || 'TOP'}`;

        style.tails = CONSTANTS.ARROW_HEAD_STYLE[key] || CONSTANTS.ARROW_HEAD_STYLE.NONE;
    }

    return style;
}

export function estimateLabelVisualLength(label: string): number {
    if (!label) return 0;
    
    // Heuristic for LaTeX labels: count "atoms" rather than characters
    if (label.startsWith('$') && label.endsWith('$')) {
        let content = label.slice(1, -1);
        
        // Replace commands (e.g. \alpha) with a single character placeholder
        content = content.replace(/\\[a-zA-Z]+/g, 'C'); 
        
        // Remove LaTeX syntax characters (_, ^, {, })
        content = content.replace(/[_^{}]/g, '');
        
        return content.length;
    }
    
    return label.length;
}

export function computeDiagram(specInput: string | DiagramSpec, idPrefix: string = ""): ComputedDiagram {
    try {
        const rawSpec: DiagramSpec = typeof specInput === 'string' ? JSON.parse(specInput) : specInput;
        const spec = DiagramSpecSchema.parse({ ...rawSpec, version: rawSpec.version || 1 });

        if (!spec.nodes || spec.nodes.length === 0) {
            return { nodes: [], arrows: [], masks: [], viewBox: "0 0 100 100", error: null };
        }

        const endpointInfo = new Map<string, EndpointInfo>(
            spec.nodes.map(node => [
                node.name,
                {
                    pos: new Point(node.left, node.top),
                    shape: new RoundedRectangle(new Point(node.left, node.top), new Dimensions(NODE_RADIUS * 2, NODE_RADIUS * 2), NODE_RADIUS),
                    isNode: true,
                    level: 0
                }
            ])
        );

        const arrowSpecs = (spec.arrows || []).map((a, i) => ({
            ...a,
            uniqueId: a.name || `_arrow_${i}`
        }));

        const arrows: ComputedArrow[] = [];
        const allMasks: ComputedMask[] = [];
        const unresolvedArrowSpecs = new Set(arrowSpecs);
        let changedInIteration = true;
        const maxIterations = arrowSpecs.length + 1;
        let currentIteration = 0;

        while (unresolvedArrowSpecs.size > 0 && changedInIteration) {
            if (currentIteration++ > maxIterations) throw new Error("Dependency cycle detected");

            changedInIteration = false;
            const currentUnresolved = [...unresolvedArrowSpecs];

            for (const arrowSpec of currentUnresolved) {
                const fromInfo = endpointInfo.get(arrowSpec.from);
                const toInfo = endpointInfo.get(arrowSpec.to);

                if (fromInfo && toInfo) {
                    const uniqueId = arrowSpec.uniqueId;

                    // Create Arrow Object
                    const sourceShape = new RoundedRectShape(fromInfo.pos, fromInfo.shape.size, fromInfo.shape.r);
                    const targetShape = new RoundedRectShape(toInfo.pos, toInfo.shape.size, toInfo.shape.r);

                    const style = mapSpecToStyle(arrowSpec, arrowSpec.from === arrowSpec.to);

                    const labelAlignment = arrowSpec.label_alignment ?
                        (CONSTANTS.LABEL_ALIGNMENT[arrowSpec.label_alignment.toUpperCase()] || CONSTANTS.LABEL_ALIGNMENT.CENTRE)
                        : CONSTANTS.LABEL_ALIGNMENT.CENTRE;

                    // Heuristic for label size: ~12px per char + extra padding
                    const labelLen = estimateLabelVisualLength(arrowSpec.label || "");
                    const boxWidth = labelLen > 0 ? Math.max(30, labelLen * 10 + 20) : 0;
                    const boxHeight = labelLen > 0 ? 24 : 0;

                    const domId = idPrefix ? `${idPrefix}-${uniqueId}` : uniqueId;
                    const arrowObj = new Arrow(sourceShape, targetShape, style, { text: arrowSpec.label || "", color: arrowSpec.label_color, alignment: labelAlignment, size: new Dimensions(boxWidth, boxHeight) } as any, domId);

                    const computed = arrowObj.compute();

                    if (computed) {
                        const { arrow, masks } = computed;
                        arrow.spec = arrowSpec;
                        arrows.push(arrow);
                        allMasks.push(...masks);

                        // Register this arrow as endpoint
                        endpointInfo.set(uniqueId, {
                            pos: new Point(arrow.midpoint.x, arrow.midpoint.y),
                            shape: new RoundedRectangle(new Point(arrow.midpoint.x, arrow.midpoint.y), new Dimensions(Math.max(30, boxWidth), Math.max(30, boxHeight)), 2),
                            isNode: false,
                            level: Math.max(fromInfo.level, toInfo.level) + 1
                        });
                    }

                    unresolvedArrowSpecs.delete(arrowSpec);
                    changedInIteration = true;
                }
            }
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const updateBounds = (x: number, y: number) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        };

        spec.nodes.forEach(n => {
            updateBounds(n.left - NODE_RADIUS, n.top - NODE_RADIUS);
            updateBounds(n.left + NODE_RADIUS, n.top + NODE_RADIUS);
        });

        arrows.forEach(a => {
            updateBounds(a.midpoint.x, a.midpoint.y);
        });

        const PADDING = 40;
        const viewBox = `${minX - PADDING} ${minY - PADDING} ${maxX - minX + 2 * PADDING} ${maxY - minY + 2 * PADDING}`;

        return { nodes: spec.nodes, arrows, masks: allMasks, viewBox, error: null };

    } catch (e: any) {
        console.error("Error computing diagram:", e);
        return { nodes: [], arrows: [], masks: [], viewBox: "0 0 100 100", error: e.message };
    }
}

// --- Helper Functions for Editor Operations ---

export function reverseArrow(spec: ArrowSpec): ArrowSpec {
    if (spec.from === spec.to) {
        return {
            ...spec,
            radius: -(spec.radius ?? 40),
            angle: normalizeAngle((spec.angle ?? 0) + 180),
            label_alignment: spec.label_alignment === 'left' ? 'right' :
                             spec.label_alignment === 'right' ? 'left' : spec.label_alignment
        };
    }
    return {
        ...spec,
        from: spec.to,
        to: spec.from,
    };
}

export function flipArrow(spec: ArrowSpec): ArrowSpec {
    if (spec.from === spec.to) {
        return {
            ...spec,
            angle: normalizeAngle((spec.angle ?? 0) + 180),
            label_alignment: spec.label_alignment === 'left' ? 'right' :
                             spec.label_alignment === 'right' ? 'left' : spec.label_alignment
        };
    }
    return {
        ...spec,
        curve: spec.curve ? -spec.curve : undefined,
        shift: spec.shift ? -spec.shift : undefined,
        angle: spec.angle ? normalizeAngle(-spec.angle) : undefined,
        label_alignment: spec.label_alignment === 'left' ? 'right' :
                         spec.label_alignment === 'right' ? 'left' : spec.label_alignment
    };
}

export function selectConnected(
    arrows: ArrowSpec[] = [],
    selectedIds: Set<string>
): Set<string> {
    const newSelection = new Set(selectedIds);
    const queue = [...selectedIds];
    const visited = new Set(selectedIds);

    while (queue.length > 0) {
        const currentId = queue.pop()!;

        arrows.forEach(a => {
            const arrowId = a.name || (a as any).uniqueId;
            if (!arrowId) return;

            const isConnected = (a.from === currentId || a.to === currentId);
            
            if (isConnected) {
                // Add the arrow itself
                if (!visited.has(arrowId)) {
                    visited.add(arrowId);
                    newSelection.add(arrowId);
                    queue.push(arrowId);
                }
                // Add the other endpoint
                const otherEnd = a.from === currentId ? a.to : a.from;
                if (!visited.has(otherEnd)) {
                    visited.add(otherEnd);
                    newSelection.add(otherEnd);
                    queue.push(otherEnd);
                }
            }
        });
    }

    return newSelection;
}

export function rotateNodes(
    nodes: NodeSpec[],
    selectedIds: Set<string>,
    angleDeg: number
): NodeSpec[] {
    const selectedNodes = nodes.filter(n => selectedIds.has(n.name));
    if (selectedNodes.length === 0) return nodes;

    const minX = Math.min(...selectedNodes.map(n => n.left));
    const maxX = Math.max(...selectedNodes.map(n => n.left));
    const minY = Math.min(...selectedNodes.map(n => n.top));
    const maxY = Math.max(...selectedNodes.map(n => n.top));
    const center = new Point((minX + maxX) / 2, (minY + maxY) / 2);
    const rad = angleDeg * Math.PI / 180;

    return nodes.map(n => {
        if (!selectedIds.has(n.name)) return n;
        const p = new Point(n.left, n.top);
        const newPos = p.sub(center).rotate(rad).add(center);
        return { ...n, left: Math.round(newPos.x), top: Math.round(newPos.y) };
    });
}

export function flipNodes(
    nodes: NodeSpec[],
    selectedIds: Set<string>,
    axis: 'horizontal' | 'vertical'
): NodeSpec[] {
    const selectedNodes = nodes.filter(n => selectedIds.has(n.name));
    if (selectedNodes.length === 0) return nodes;

    const minX = Math.min(...selectedNodes.map(n => n.left));
    const maxX = Math.max(...selectedNodes.map(n => n.left));
    const minY = Math.min(...selectedNodes.map(n => n.top));
    const maxY = Math.max(...selectedNodes.map(n => n.top));
    const center = new Point((minX + maxX) / 2, (minY + maxY) / 2);

    return nodes.map(n => {
        if (!selectedIds.has(n.name)) return n;
        let x = n.left;
        let y = n.top;

        if (axis === 'horizontal') {
            // Flip across vertical axis passing through center (affects X)
            x = center.x - (n.left - center.x);
        } else {
            // Flip across horizontal axis passing through center (affects Y)
            y = center.y - (n.top - center.y);
        }
        return { ...n, left: Math.round(x), top: Math.round(y) };
    });
}


