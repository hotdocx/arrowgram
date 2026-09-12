import type {
    ArrowSpec,
    ComputedArrow,
    ComputedDiagram,
    ComputedLabelLayout,
    ComputedMask,
    ComputedNodeLabel,
    CanonicalDiagramSpec,
    DiagramSpec,
    NodeSpec
} from '../types';
import {
    buildArrowDependencyPlan,
    computedArrowKey,
    firstErrorMessage,
    makeDiagnostic,
    parseDiagramSpec,
    type ArrowgramDiagnostic,
    type ArrowgramResult,
    type ParseDiagramSpecOptions,
} from '../schema';
import { ARROWGRAM_LIMITS } from '../schema/limits';
import { Point, Dimensions, mod } from './ds';
import { RoundedRectangle } from './curve';
import { Arrow, ArrowStyle, CONSTANTS, RoundedRectShape } from './arrow';
import { createLabelLayout, estimateMathVisualUnits } from './label';

const NODE_RADIUS = ARROWGRAM_LIMITS.nodeRadius;

export function normalizeAngle(angle: number): number {
    const a = mod(angle, 360);
    return a > 180 ? a - 360 : a;
}

interface EndpointInfo {
    pos: Point;
    shape: RoundedRectangle;
}

function mapSpecToStyle(spec: ArrowSpec, isLoop: boolean): ArrowStyle {
    const style = new ArrowStyle();

    // Set defaults based on spec or Quiver defaults
    style.level = spec.style?.level ?? 1;
    style.curve = isLoop
        ? (spec.radius ?? ARROWGRAM_LIMITS.defaultLoopRadius)
        : (spec.curve ?? spec.radius ?? 0);
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
        const name = spec.style.tail.name.toUpperCase();
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
        return estimateMathVisualUnits(label.slice(1, -1));
    }
    
    return label.length;
}

export type ComputeDiagramOptions = ParseDiagramSpecOptions;

function failedDiagram(
    diagnostics: ArrowgramDiagnostic[],
): ComputedDiagram {
    return {
        nodes: [],
        arrows: [],
        masks: [],
        nodeLabels: [],
        bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        viewBox: "0 0 100 100",
        error: firstErrorMessage(diagnostics),
        diagnostics,
    };
}

function computeCanonicalDiagram(
    spec: CanonicalDiagramSpec,
    inheritedDiagnostics: ArrowgramDiagnostic[],
): ArrowgramResult<ComputedDiagram> {
    const diagnostics = [...inheritedDiagnostics];
    try {
        const nodeLabels: ComputedNodeLabel[] = [];
        for (let sourceIndex = 0; sourceIndex < spec.nodes.length; sourceIndex += 1) {
            const node = spec.nodes[sourceIndex];
            const label = createLabelLayout(node.label ?? '', {
                path: ['nodes', sourceIndex, 'label'],
                entityId: node.name,
                sourceIndex,
                isNode: true,
            });
            if (!label.ok) {
                return { ok: false, diagnostics: [...diagnostics, ...label.diagnostics] };
            }
            nodeLabels.push({
                nodeId: node.name,
                sourceIndex,
                color: node.color,
                layout: label.value,
            });
        }

        const arrowLabelLayouts: ComputedLabelLayout[] = [];
        for (let sourceIndex = 0; sourceIndex < spec.arrows.length; sourceIndex += 1) {
            const arrow = spec.arrows[sourceIndex];
            const label = createLabelLayout(arrow.label ?? '', {
                path: ['arrows', sourceIndex, 'label'],
                entityId: arrow.name,
                sourceIndex,
            });
            if (!label.ok) {
                return { ok: false, diagnostics: [...diagnostics, ...label.diagnostics] };
            }
            arrowLabelLayouts.push(label.value);
        }

        const dependencyPlan = buildArrowDependencyPlan(spec);
        if (!dependencyPlan.ok) {
            return {
                ok: false,
                diagnostics: [...diagnostics, ...dependencyPlan.diagnostics],
            };
        }

        if (spec.nodes.length === 0) {
            return {
                ok: true,
                value: {
                    nodes: [],
                    arrows: [],
                    masks: [],
                    nodeLabels,
                    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
                    viewBox: "0 0 100 100",
                    error: null,
                    diagnostics,
                },
                diagnostics,
            };
        }

        const endpointInfo = new Map<string, EndpointInfo>(
            spec.nodes.map(node => [
                node.name,
                {
                    pos: new Point(node.left, node.top),
                    shape: new RoundedRectangle(new Point(node.left, node.top), new Dimensions(NODE_RADIUS * 2, NODE_RADIUS * 2), NODE_RADIUS),
                }
            ])
        );

        const arrows: ComputedArrow[] = [];
        const allMasks: ComputedMask[] = [];
        for (const sourceIndex of dependencyPlan.value.order) {
            const arrowSpec = spec.arrows[sourceIndex];
            const fromInfo = endpointInfo.get(arrowSpec.from)!;
            const toInfo = endpointInfo.get(arrowSpec.to)!;
            const computedKey = computedArrowKey(sourceIndex);

            if (
                arrowSpec.from !== arrowSpec.to
                && fromInfo.pos.eq(toInfo.pos)
            ) {
                const diagnostic = makeDiagnostic({
                    code: 'geometry.coincident_endpoints',
                    severity: 'error',
                    phase: 'geometry',
                    message: 'Distinct arrow endpoints occupy the same coordinates.',
                    path: ['arrows', sourceIndex],
                    entityId: arrowSpec.name,
                    sourceIndex,
                });
                return { ok: false, diagnostics: [...diagnostics, diagnostic] };
            }

            const sourceShape = new RoundedRectShape(fromInfo.pos, fromInfo.shape.size, fromInfo.shape.r);
            const targetShape = new RoundedRectShape(toInfo.pos, toInfo.shape.size, toInfo.shape.r);
            const style = mapSpecToStyle(arrowSpec, arrowSpec.from === arrowSpec.to);
            const labelAlignment = arrowSpec.label_alignment
                ? (CONSTANTS.LABEL_ALIGNMENT[arrowSpec.label_alignment.toUpperCase()] || CONSTANTS.LABEL_ALIGNMENT.CENTRE)
                : CONSTANTS.LABEL_ALIGNMENT.CENTRE;

            const labelLayout = arrowLabelLayouts[sourceIndex];
            const boxWidth = labelLayout.width;
            const boxHeight = labelLayout.height;
            const arrowObj = new Arrow(
                sourceShape,
                targetShape,
                style,
                {
                    text: arrowSpec.label || "",
                    color: arrowSpec.label_color,
                    alignment: labelAlignment,
                    size: new Dimensions(boxWidth, boxHeight),
                    layout: labelLayout,
                },
                arrowSpec,
                computedKey,
                sourceIndex,
                arrowSpec.name,
            );
            const computed = arrowObj.compute();

            if (!computed.ok) {
                const diagnostic = makeDiagnostic({
                    code: computed.error.code,
                    severity: 'error',
                    phase: 'geometry',
                    message: computed.error.message,
                    path: ['arrows', sourceIndex],
                    entityId: arrowSpec.name,
                    sourceIndex,
                });
                return {
                    ok: false,
                    diagnostics: [...diagnostics, diagnostic],
                };
            }

            const { arrow, masks, warnings } = computed;
            warnings.forEach((warning) => {
                diagnostics.push(makeDiagnostic({
                    code: warning.code,
                    severity: 'warning',
                    phase: 'geometry',
                    message: warning.message,
                    path: ['arrows', sourceIndex, 'shorten'],
                    entityId: arrowSpec.name,
                    sourceIndex,
                    details: warning.details,
                }));
            });
            arrow.spec = arrowSpec;
            arrows.push(arrow);
            allMasks.push(...masks);

            if (arrowSpec.name) {
                endpointInfo.set(arrowSpec.name, {
                    pos: new Point(arrow.midpoint.x, arrow.midpoint.y),
                    shape: new RoundedRectangle(
                        new Point(arrow.midpoint.x, arrow.midpoint.y),
                        new Dimensions(Math.max(30, boxWidth), Math.max(30, boxHeight)),
                        2,
                    ),
                });
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

        nodeLabels.forEach((nodeLabel, sourceIndex) => {
            const node = spec.nodes[sourceIndex];
            updateBounds(node.left - nodeLabel.layout.width / 2, node.top - nodeLabel.layout.height / 2);
            updateBounds(node.left + nodeLabel.layout.width / 2, node.top + nodeLabel.layout.height / 2);
        });

        arrows.forEach(a => {
            updateBounds(a.bounds.minX, a.bounds.minY);
            updateBounds(a.bounds.maxX, a.bounds.maxY);
        });

        const bounds = { minX, minY, maxX, maxY };
        const PADDING = 40;
        const viewBox = `${minX - PADDING} ${minY - PADDING} ${maxX - minX + 2 * PADDING} ${maxY - minY + 2 * PADDING}`;

        const value: ComputedDiagram = {
            nodes: spec.nodes,
            arrows,
            masks: allMasks,
            nodeLabels,
            bounds,
            viewBox,
            error: null,
            diagnostics,
        };
        return { ok: true, value, diagnostics };

    } catch (error: unknown) {
        const diagnostic = makeDiagnostic({
            code: 'geometry.internal',
            severity: 'error',
            phase: 'geometry',
            message: error instanceof Error ? error.message : 'Unexpected geometry failure.',
            path: [],
        });
        return {
            ok: false,
            diagnostics: [...diagnostics, diagnostic],
        };
    }
}

export function computeDiagramResult(
    specInput: string | DiagramSpec,
    idPrefix: string = "",
    options: ComputeDiagramOptions = {},
): ArrowgramResult<ComputedDiagram> {
    const parsed = parseDiagramSpec(specInput, options);
    if (!parsed.ok) return parsed;
    void idPrefix;
    return computeCanonicalDiagram(parsed.value, parsed.diagnostics);
}

/**
 * Compatibility facade for v1 consumers.
 *
 * @deprecated Prefer `computeDiagramResult`, which forces callers to handle diagnostics.
 */
export function computeDiagram(
    specInput: string | DiagramSpec,
    idPrefix: string = "",
    options: ComputeDiagramOptions = {},
): ComputedDiagram {
    const result = computeDiagramResult(specInput, idPrefix, options);
    return result.ok ? result.value : failedDiagram(result.diagnostics);
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
    const adjacency = new Map<string, Set<string>>();
    const connect = (left: string, right: string) => {
        const leftEdges = adjacency.get(left) ?? new Set<string>();
        const rightEdges = adjacency.get(right) ?? new Set<string>();
        leftEdges.add(right);
        rightEdges.add(left);
        adjacency.set(left, leftEdges);
        adjacency.set(right, rightEdges);
    };

    arrows.forEach((arrow, sourceIndex) => {
        const arrowId = computedArrowKey(sourceIndex);
        connect(arrowId, arrow.from);
        connect(arrowId, arrow.to);
    });

    const newSelection = new Set(selectedIds);
    const queue = [...selectedIds];
    const visited = new Set(selectedIds);

    while (queue.length > 0) {
        const currentId = queue.pop()!;

        for (const connected of adjacency.get(currentId) ?? []) {
            if (!visited.has(connected)) {
                visited.add(connected);
                newSelection.add(connected);
                queue.push(connected);
            }
        }
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
