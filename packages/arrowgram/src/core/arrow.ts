import { ComputedArrowPart, ComputedArrowPath, ComputedArrow, ComputedMask } from "../types";
import { Point, Path, Enum, Dimensions } from "./ds";
import { Bezier, Arc, CurvePoint, RoundedRectangle, EPSILON } from "./curve";



export const CONSTANTS = {
    LINE_SPACING: 4.5,
    STROKE_WIDTH: 1.5,
    BACKGROUND_PADDING: 16,
    BACKGROUND_OPACITY: 0.2,
    MASK_PADDING: 4,
    HEAD_SPACING: 2,
    SQUIGGLY_PADDING: 4,
    SQUIGGLY_TRIANGLE_HEIGHT: 2,
    ADJUNCTION_LINE_LENGTH: 16,
    CORNER_LINE_LENGTH: 12,
    HANDLE_RADIUS: 14,
    ARC: {
        OUTER_DIS: 96,
        INNER_DIS: 64,
    },
    ARROW_SHAPE: new Enum(
        "ARROW_SHAPE",
        "BEZIER",
        "ARC",
    ),
    ARROW_BODY_STYLE: new Enum(
        "ARROW_BODY_STYLE",
        "NONE",
        "LINE",
        "SQUIGGLY",
        "ADJUNCTION",
        "PROARROW",
        "DOUBLE_PROARROW",
        "BULLET_SOLID",
        "BULLET_HOLLOW",
    ),
    ARROW_DASH_STYLE: new Enum(
        "ARROW_DASH_STYLE",
        "SOLID",
        "DASHED",
        "DOTTED",
    ),
    ARROW_HEAD_STYLE: {
        NONE: [],
        NORMAL: ["epi"],
        EPI: ["epi", "epi"],
        MONO: ["mono"],
        MAPS_TO: ["maps to"],
        HARPOON_TOP: ["harpoon-top"],
        HARPOON_BOTTOM: ["harpoon-bottom"],
        HOOK_TOP: ["hook-top"],
        HOOK_BOTTOM: ["hook-bottom"],
        CORNER: ["corner"],
        CORNER_INVERSE: ["corner-inverse"],
    } as Record<string, string[]>,
    LABEL_ALIGNMENT: new Enum(
        "LABEL_ALIGNMENT",
        "CENTRE",
        "OVER",
        "LEFT",
        "RIGHT",
    ),
};

export class ArrowStyle {
    level = 1;
    label_position = 0.5;
    curve = 0;
    angle = 0;
    shift = 0;
    shorten = { tail: 0, head: 0 };
    shape = CONSTANTS.ARROW_SHAPE.BEZIER;
    body_style = CONSTANTS.ARROW_BODY_STYLE.LINE;
    dash_style = CONSTANTS.ARROW_DASH_STYLE.SOLID;
    heads = CONSTANTS.ARROW_HEAD_STYLE.NORMAL;
    tails = CONSTANTS.ARROW_HEAD_STYLE.NONE;
    colour = "black";
}

export interface Shape {
    origin: Point;
    size: Dimensions;
    radius: number;
}

export class EndpointShape implements Shape {
    origin: Point;
    size: Dimensions;
    radius: number;

    constructor(origin: Point) {
        this.origin = origin;
        this.size = new Dimensions(0, 0);
        this.radius = 0;
    }
}

export class RoundedRectShape implements Shape {
    origin: Point;
    size: Dimensions;
    radius: number;

    constructor(origin: Point, size: Dimensions, radius: number) {
        this.origin = origin;
        this.size = size;
        this.radius = radius;
    }
}

export class Arrow {
    source: Shape;
    target: Shape;
    style: ArrowStyle;
    label: { text: string; color?: string; alignment: symbol; size: Dimensions } | null;
    id: string;

    constructor(source: Shape, target: Shape, style: ArrowStyle = new ArrowStyle(), label = null, id = "arrow") {
        this.source = source;
        this.target = target;
        this.style = style;
        this.label = label;
        this.id = id;
    }

    origin() {
        const vector = this.target.origin.sub(this.source.origin);
        if (this.style.shape === CONSTANTS.ARROW_SHAPE.BEZIER || vector.length() > 0) {
            return { source: this.source.origin, target: this.target.origin };
        } else {
            const min_chord = 0.01;
            // Loop correction: The chord should be perpendicular to the loop direction.
            // If we want loop at `style.angle`, we need chord at `style.angle + 90`.
            const angle = vector.angle() + this.style.angle + Math.PI / 2;
            const nudge = Point.lendir(min_chord / 2, angle);
            return { source: this.source.origin.sub(nudge), target: this.target.origin.add(nudge) };
        }
    }

    vector() {
        const origin = this.origin();
        return origin.target.sub(origin.source);
    }

    angle() {
        return this.vector().angle();
    }

    length() {
        return this.vector().length();
    }

    curve(origin = this.origin().source, angle = this.angle()) {
        const length = this.length();
        switch (this.style.shape) {
            case CONSTANTS.ARROW_SHAPE.BEZIER:
                return new Bezier(origin, length, -this.style.curve, angle);
            case CONSTANTS.ARROW_SHAPE.ARC:
                // Note: We don't check for source === target here as we rely on length being small for loop simulation
                // or just logic from Quiver's Arc creation.
                // Quiver's arrow.mjs: if (this.source === this.target) return new Arc(origin, length, true, ...)
                // But Shape equality check is tricky. We assume caller handled loop detection or distance check.
                if (length < 0.1) {
                    return new Arc(origin, length, true, -this.style.curve, angle);
                }
                return this.arc_for_chord(origin, length, -this.style.curve, angle);
            default:
                return new Bezier(origin, length, -this.style.curve, angle);
        }
    }

    arc_for_chord(origin: Point, chord: number, loop_radius: number, angle: number) {
        const outer_dis = CONSTANTS.ARC.OUTER_DIS;
        const inner_dis = CONSTANTS.ARC.INNER_DIS;
        const semicircle_radius = inner_dis / 2;
        const boundary_dis = outer_dis - inner_dis;

        const sagitta = chord >= outer_dis ? EPSILON
            : (semicircle_radius * ((outer_dis - chord) / boundary_dis));

        const r_for_sagitta = sagitta / 2 + (chord ** 2) / (8 * sagitta);

        const r = chord <= inner_dis ? (semicircle_radius +
            (inner_dis - chord) / inner_dis * (loop_radius - semicircle_radius))
            : r_for_sagitta;

        return new Arc(origin, chord, chord <= inner_dis, r, angle);
    }

    find_endpoints(): [CurvePoint, CurvePoint] {
        const origin = this.origin();

        const find_endpoint = (endpoint_shape: Shape, endpoint_origin: Point, prefer_min: boolean) => {
            const curve = this.curve();

            if (endpoint_shape instanceof EndpointShape || endpoint_shape.size.is_zero()) {
                const t = prefer_min ? 0 : 1;
                return new CurvePoint(
                    endpoint_origin.sub(origin.source).rotate(-curve.angle),
                    t,
                    curve.tangent(t),
                );
            }

            const intersections = curve.intersections_with_rounded_rectangle(
                new RoundedRectangle(
                    endpoint_origin,
                    endpoint_shape.size,
                    endpoint_shape.radius,
                ),
                false,
            );
            if (intersections.length === 0) {
                throw new Error("No intersections found.");
            }
            intersections.sort((a, b) => a.t - b.t);

            if (this.style.shape === CONSTANTS.ARROW_SHAPE.BEZIER) {
                // Check re-entry logic if needed
            }
            return intersections[prefer_min ? 0 : intersections.length - 1];
        }

        const start = find_endpoint(this.source, origin.source, true);
        const end = find_endpoint(this.target, origin.target, false);
        return [start, end];
    }

    compute(): { arrow: ComputedArrow, masks: ComputedMask[] } | null {
        const stroke_width = this.style.level * CONSTANTS.STROKE_WIDTH
            + (this.style.level - 1) * CONSTANTS.LINE_SPACING;
        const edge_width = this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.SQUIGGLY ?
            this.style.level * CONSTANTS.SQUIGGLY_TRIANGLE_HEIGHT * 2
            + CONSTANTS.STROKE_WIDTH
            + (this.style.level - 1) * CONSTANTS.LINE_SPACING
            : stroke_width;

        const head_width =
            (CONSTANTS.LINE_SPACING + CONSTANTS.STROKE_WIDTH) + (this.style.level - 1) * 2;
        const head_height = edge_width + (CONSTANTS.LINE_SPACING + CONSTANTS.STROKE_WIDTH) * 2;

        const length = this.length();
        
        const tempCurve = this.curve(Point.zero(), 0);
        const t_after_length = tempCurve.t_after_length(true);
        const height = 2 * Math.abs(tempCurve.height);

        const angle = this.angle();

        const shiftVector = new Point(0, this.style.shift).rotate(angle);

        const globalCurve = this.curve(this.origin().source.add(shiftVector), angle);
        const arcLength = globalCurve.arc_length(1);

        const interactionPathObj = new Path();
        interactionPathObj.move_to(globalCurve.origin);
        globalCurve.render(interactionPathObj);
        const interactionPath = interactionPathObj.toString();

        let start: CurvePoint, end: CurvePoint;
        try {
            [start, end] = this.find_endpoints();
        } catch (_) {
            return null; // Invalid arrow
        }

        const shorten = {
            start: this.style.tails.length > 0 && this.style.tails[0].startsWith("hook")
                ? head_width : 0,
            end: this.style.heads.length > 0 && this.style.heads[0].startsWith("hook")
                ? head_width : 0,
        };

        const adjust_dash_padding = (heads: string[], endpoint: CurvePoint, is_start: boolean) => {
            if (heads.length > 0 && heads[0] === "mono") {
                const head_angle = globalCurve.tangent(t_after_length(
                    globalCurve.arc_length(endpoint.t) + head_width * (is_start ? 1 : -1)
                ));
                const endpoint_angle = globalCurve.tangent(endpoint.t);
                const diff_angle = endpoint_angle - head_angle;
                return Math.abs(edge_width * Math.sin(diff_angle) / 2);
            }
            return 0;
        }

        const dash_padding = {
            start: adjust_dash_padding(this.style.tails, start, true),
            end: adjust_dash_padding(this.style.heads, end, false),
        };

        const constants = {
            curve: globalCurve, start, end, length, height, stroke_width, edge_width, head_width,
            head_height, shorten, t_after_length, dash_padding, offset: Point.zero(), 
            total_width_of_tails: 0, total_width_of_heads: 0
        };



        // Label Calculation (Moved Up)
        const labelPos = this.determine_label_position(constants);
        let rotation = 0;
        if (this.label?.alignment === CONSTANTS.LABEL_ALIGNMENT.OVER) {
             const t = start.t + (end.t - start.t) * this.style.label_position;
             const angle = globalCurve.tangent(t);
             rotation = angle * 180 / Math.PI;
        }
        const labelWidth = this.label?.size?.width || 0;
        const labelHeight = this.label?.size?.height || 0;
        const bbox = {
            x: labelPos.x - labelWidth / 2,
            y: labelPos.y - labelHeight / 2,
            width: labelWidth,
            height: labelHeight
        };

        // Draw Heads/Tails logic
        const headsParts: ComputedArrowPart[] = [];
        const tailsParts: ComputedArrowPart[] = [];
        const maskPaths: any[] = [];

        // Decorations (Proarrows, Bullets) - MOVED HERE
        if (this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.PROARROW ||
            this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.DOUBLE_PROARROW ||
            this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_SOLID ||
            this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_HOLLOW) {
            
            const arclen_to_start = globalCurve.arc_length(start.t) + (this.style.shorten.tail + shorten.start) - dash_padding.start;
            const arclen_to_end = globalCurve.arc_length(end.t) - (this.style.shorten.head + shorten.end) + dash_padding.end;
            
            const start_t = Math.max(start.t, t_after_length(arclen_to_start));
            const end_t = Math.min(end.t, t_after_length(arclen_to_end));
            const mid = (start_t + end_t) / 2;

            if (this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.PROARROW || 
                this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.DOUBLE_PROARROW) {
                
                const bar_offsets = this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.DOUBLE_PROARROW ? [-2.5, 2.5] : [0];
                const arclen_to_mid = globalCurve.arc_length(mid);
                const angle = globalCurve.tangent(mid);
                const normal = angle + Math.PI / 2;
                const adj_seg = new Point(head_height, 0);
                const adj_seg_2 = adj_seg.div(2);
                const decoPath = new Path();

                for (const bar_offset of bar_offsets) {
                    let target_arclen = arclen_to_mid + bar_offset;
                    if (target_arclen < arclen_to_start) target_arclen = arclen_to_start;
                    if (target_arclen > arclen_to_end) target_arclen = arclen_to_end;

                    const bar_t = t_after_length(target_arclen);
                    const centre = globalCurve.point(bar_t);

                    decoPath.move_to(centre.sub(adj_seg_2.rotate(normal)));
                    decoPath.line_by(adj_seg.rotate(normal));
                }
                
                headsParts.push({
                    props: {
                        d: decoPath.toString(),
                        fill: "none",
                        stroke: this.style.colour,
                        strokeWidth: CONSTANTS.STROKE_WIDTH,
                        strokeLinecap: "round"
                    }
                });
            } else if (this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_SOLID || 
                       this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_HOLLOW) {
                const centre = globalCurve.point(mid);
                const r = head_height / 2;
                // Move to right edge of circle (cx + r, cy) then draw arc
                // M cx cy m r 0 a r r 0 1 0 -2r 0 a r r 0 1 0 2r 0
                // Using cx+r avoids lineTo from origin if path was dirty
                const circlePath = `M ${centre.x} ${centre.y} m ${r}, 0 a ${r},${r} 0 1,0 -${r * 2},0 a ${r},${r} 0 1,0 ${r * 2},0`;
                
                headsParts.push({
                    props: {
                        d: circlePath,
                        fill: this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_SOLID ? this.style.colour : "none",
                        stroke: this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_HOLLOW ? this.style.colour : "none",
                        strokeWidth: CONSTANTS.STROKE_WIDTH,
                        strokeLinecap: "round"
                    }
                });
            }
        }

        const draw_heads = (heads: string[], endpoint: CurvePoint, is_start: boolean, is_mask: boolean) => {
            const { pathD, total_width } = this.redraw_heads(constants, heads, endpoint, is_start, is_mask);
            if (pathD !== null) {
                if (is_mask) {
                    maskPaths.push({
                        d: pathD,
                        fill: "black",
                        stroke: "none"
                    });
                } else {
                    const part: ComputedArrowPart = {
                        props: {
                            d: pathD,
                            fill: "none",
                            stroke: this.style.colour,
                            strokeWidth: CONSTANTS.STROKE_WIDTH,
                            strokeLinecap: "round",
                        }
                    };
                    if (is_start) tailsParts.push(part);
                    else headsParts.push(part);
                }
            }
            return total_width;
        };

        constants.total_width_of_tails = draw_heads(this.style.tails, start, true, false);
        constants.total_width_of_heads = draw_heads(this.style.heads, end, false, false);

        // Edge Path
        const { path, dash_array } = this.edge_path(constants);

        const paths: ComputedArrowPath[] = [];
        const computedMasks: ComputedMask[] = [];

        // Create mask if level > 1 OR we have a label to mask out
        if (this.style.level > 1 || (this.label?.text && this.label.text.trim() !== "")) {
            const maskId = `${this.id}-mask`;
            
            // Base rect (white = visible)
            maskPaths.push({
                d: "M -10000 -10000 h 20000 v 20000 h -20000 z",
                fill: "white",
                stroke: "none",
                strokeWidth: 0
            });

            // Add head/tail masks (black = hidden)
            draw_heads(this.style.tails, start, true, true);
            draw_heads(this.style.heads, end, false, true);

            // Cut lines for n-cells (black = hidden)
            if (this.style.level > 1) {
                for (let i = this.style.level - 1, cut = true; i > 0; --i, cut = !cut) {
                    const width = (i - (cut ? 1 : 0)) * CONSTANTS.STROKE_WIDTH
                        + (i - (cut ? 0 : 1)) * CONSTANTS.LINE_SPACING;

                    maskPaths.push({
                        d: path.toString(),
                        stroke: cut ? "black" : "white",
                        strokeWidth: width,
                        fill: "none"
                    });
                }
            }

            // Label Mask (black = hidden)
            if (this.label?.text && bbox.width > 0) {
                const center = { x: bbox.x + bbox.width/2, y: bbox.y + bbox.height/2 };
                // Using a rect path
                const rectPath = `M ${bbox.x} ${bbox.y} h ${bbox.width} v ${bbox.height} h -${bbox.width} z`;
                
                maskPaths.push({
                    d: rectPath,
                    fill: "black",
                    stroke: "none",
                    transform: rotation ? `rotate(${rotation}, ${center.x}, ${center.y})` : undefined
                });
            }

            computedMasks.push({
                id: maskId,
                paths: maskPaths
            });

            paths.push({
                d: path.toString(),
                fill: "none",
                stroke: this.style.colour,
                strokeWidth: stroke_width,
                strokeDasharray: dash_array || undefined,
                mask: `url(#${maskId})`
            });
        } else {
            paths.push({
                d: path.toString(),
                fill: "none",
                stroke: this.style.colour,
                strokeWidth: CONSTANTS.STROKE_WIDTH,
                strokeDasharray: dash_array || undefined,
            });
        }

        // Geometric midpoint for anchoring other arrows (on the curve, ignoring label offset)
        const t_mid = constants.start.t + (constants.end.t - constants.start.t) * this.style.label_position;
        const anchorPoint = constants.curve.point(t_mid);

        // Transform endpoints to absolute coordinates
        const absStart = start.rotate(angle).add(globalCurve.origin);
        const absEnd = end.rotate(angle).add(globalCurve.origin);



        return {
            arrow: {
                key: this.id,
                spec: {} as any, 
                paths,
                heads: headsParts,
                tail: tailsParts,
                label: {
                    text: this.label?.text,
                    color: this.label?.color,
                    props: {
                        x: labelPos.x,
                        y: labelPos.y,
                        textAnchor: "middle",
                        dominantBaseline: "middle",
                        fontSize: 16
                    },
                    bbox,
                    rotation
                },
                midpoint: { x: anchorPoint.x, y: anchorPoint.y },
                sourcePoint: { x: absStart.x, y: absStart.y },
                targetPoint: { x: absEnd.x, y: absEnd.y },
                arcLength,
                interactionPath
            },
            masks: computedMasks
        };
    }

    edge_path(constants: any) {
        const {
            curve, start, end, shorten, dash_padding, t_after_length,
            total_width_of_tails, total_width_of_heads
        } = constants;
        let arclen_to_start = curve.arc_length(start.t) + (this.style.shorten.tail + shorten.start)
            - dash_padding.start;
        let arclen_to_end = curve.arc_length(end.t) - (this.style.shorten.head + shorten.end)
            + dash_padding.end;
        let arclen = curve.arc_length(1);

        const path = new Path();

        if (this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.LINE ||
            this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.PROARROW ||
            this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.DOUBLE_PROARROW ||
            this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_SOLID ||
            this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.BULLET_HOLLOW) {

            path.move_to(curve.origin);
            curve.render(path);
        } else if (this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.ADJUNCTION) {
            // Adjunction symbol: -| (rotated)
            const centre = curve.point(0.5);
            const angle = curve.tangent(0.5);
            const normal = angle + Math.PI / 2;
            const adj_seg = new Point(CONSTANTS.ADJUNCTION_LINE_LENGTH, 0);
            const adj_seg_2 = adj_seg.div(2);

            // Left end of horizontal bar
            path.move_to(centre.sub(adj_seg_2.rotate(angle)));
            // Horizontal bar to right
            path.line_by(adj_seg.rotate(angle));
            // Move to top of vertical bar (which is at the right end of horizontal bar)
            // Quiver: centre.add(adj_seg_2.rotate(angle)).sub(adj_seg_2.rotate(normal))
            // The vertical bar is centred on the right endpoint of the horizontal bar?
            // Quiver code:
            // Top: path.move_to(centre.add(adj_seg_2.rotate(angle)).sub(adj_seg_2.rotate(normal)));
            // Bottom: path.line_by(adj_seg.rotate(normal));
            // Yes.
            
            const rightEnd = centre.add(adj_seg_2.rotate(angle));
            const top = rightEnd.sub(adj_seg_2.rotate(normal));
            
            path.move_to(top);
            path.line_by(adj_seg.rotate(normal));

        } else if (this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.SQUIGGLY) {
            const HALF_WAVELENGTH = CONSTANTS.SQUIGGLY_TRIANGLE_HEIGHT * 2;
            const arclen_to_squiggle_start = arclen_to_start + total_width_of_tails + CONSTANTS.SQUIGGLY_PADDING;
            const arclen_to_squiggle_end = arclen_to_end - (total_width_of_heads + CONSTANTS.SQUIGGLY_PADDING);

            const squiggle_start_point = curve.point(t_after_length(arclen_to_squiggle_start));
            const start_point = curve.point(t_after_length(arclen_to_start));
            const end_point = curve.point(t_after_length(arclen_to_end));

            path.move_to(start_point);
            path.line_to(squiggle_start_point);

            for (
                let l = arclen_to_squiggle_start,
                sign = -1,
                m = 1;
                l + m * HALF_WAVELENGTH / 2 < arclen_to_squiggle_end;
                // @ts-ignore
                sign = [sign, -sign][m], m = 1 - m
            ) {
                l += HALF_WAVELENGTH / 2;
                const t = t_after_length(l);
                const angle = curve.tangent(t) + Math.PI / 2 * sign;
                const next_point = curve.point(t).add(
                    Point.lendir(CONSTANTS.SQUIGGLY_TRIANGLE_HEIGHT * m, angle)
                );
                path.line_to(next_point);
            }

            path.line_to(end_point);

            // Adjust arclen for dashes if needed (squiggly lines are drawn manually so dashes are tricky)
            // But usually squiggly lines aren't dashed in standard usage, though Quiver supports it.
            // For now, we update arclen vars to skip standard dash logic or adjust it.
            // Quiver re-calculates arclen_to_start = 0 etc because the path is now absolute segments.
            arclen_to_start = 0;
            // The path is drawn from start to end, so length is the full path length.
            // Simplified: we won't support dashing squiggly lines perfectly yet.
        }

        // Dashes
        let dash_array = null;
        if (this.style.body_style === CONSTANTS.ARROW_BODY_STYLE.ADJUNCTION) {
             // No dashes for adjunction
        } else if (this.style.dash_style !== CONSTANTS.ARROW_DASH_STYLE.SOLID) {
            let arclen_line = arclen_to_end - arclen_to_start;
            let dashes: number[] = [];

            if (this.style.dash_style === CONSTANTS.ARROW_DASH_STYLE.DASHED) dashes = [6, 6];
            else if (this.style.dash_style === CONSTANTS.ARROW_DASH_STYLE.DOTTED) dashes = [2, 4];

            // Construct dash array to hide start/end
            // `0 ${arclen_to_start} ${dashes...} ${arclen - arclen_to_end}`
            // We need to repeat dashes to fill arclen_line
            const dash_gap_len = dashes.reduce((a, b) => a + b, 0);
            const count = Math.floor(arclen_line / dash_gap_len);
            const repeatDashes = Array(count).fill(dashes).flat();
            // Remainder
            const remainder = arclen_line - count * dash_gap_len;
            if (remainder > 0) repeatDashes.push(remainder);

            dash_array = `0 ${arclen_to_start} ${repeatDashes.join(" ")} ${arclen - arclen_to_end}`;
        } else {
            // Solid line but trimmed
            dash_array = `0 ${arclen_to_start} ${arclen_to_end - arclen_to_start} ${arclen - arclen_to_end}`;
        }

        return { path, dash_array };
    }

    redraw_heads(constants: any, heads: string[], endpoint: CurvePoint, is_start: boolean, is_mask: boolean = false) {
        const {
            curve, head_width, head_height, t_after_length, shorten, dash_padding, stroke_width
        } = constants;

        if (heads.length === 0) return { pathD: null, total_width: 0 };

        const start_sign = is_start ? 1 : -1;
        const end_ind = is_start ? 0 : 1;
        let total_width = 0;

        const arclen_to_endpoint = curve.arc_length(endpoint.t)
            + (is_start ?
                shorten.start + this.style.shorten.tail :
                shorten.end + this.style.shorten.head
            ) * start_sign;

        const path = new Path();

        // Quiver spacing logic
        const arclens_to_head: number[] = [];
        let prev_margin = 0;
        for (let i = 0, heads_arclen = 0; i < heads.length; ++i) {
            let margin_left = 0, margin_right = head_width, margin_begin = 0;
            if (heads[i] === "mono") { margin_right = head_width; margin_begin = head_width; }
            if (heads[i] === "maps to") { margin_left = head_width / 2; margin_right = head_width / 2; }

            if (i === 0) heads_arclen += margin_begin;
            else {
                const collapse = heads[i] === heads[i - 1] ? 2 : 1;
                heads_arclen += ((prev_margin + margin_right) / collapse + CONSTANTS.HEAD_SPACING);
            }
            prev_margin = margin_left;
            arclens_to_head.push(heads_arclen);
            total_width = heads_arclen + margin_left;
        }

        for (let i = heads.length - 1; i >= 0; --i) {
            if (is_mask && i !== 0) continue;

            const head_style = heads[i];
            const arclen_to_head = arclen_to_endpoint + arclens_to_head[i] * start_sign;
            const t = t_after_length(arclen_to_head);
            const point = curve.point(t);
            let angle = curve.tangent(t);

            if (head_style === "mono") angle += Math.PI;

            // Simplified drawing: standard arrowhead
            if (head_style === "epi" || head_style === "mono" || head_style === "arrowhead") {
                // Draw two halves.
                const halves: [number, number][] = [[-1, end_ind], [1, 1 - end_ind]];
                
                for (const [side_sign, side_ind] of halves) {
                    path.move_to(point);
                    path.arc_by(
                        new Point(start_sign * head_width, head_height / 2),
                        angle,
                        false,
                        side_ind === 1,
                        new Point(start_sign * head_width, side_sign * head_height / 2).rotate(angle)
                    );

                    if (is_mask) {
                        let distance = 0;
                        if (head_style === "epi" || head_style === "arrowhead") {
                            distance = -start_sign * (head_width + CONSTANTS.MASK_PADDING);
                        } else if (head_style === "mono") {
                            const padding = (is_start ? dash_padding.start : dash_padding.end) * 2;
                            distance = start_sign * (CONSTANTS.MASK_PADDING + padding);
                        }
                        path.line_by(Point.lendir(distance, angle));
                        path.line_by(new Point(0, -side_sign * head_height / 2).rotate(angle));
                    }
                }
            } else if (head_style === "maps to") {
                const up = Point.lendir(head_height / 2, angle + Math.PI / 2);
                const down = Point.lendir(head_height / 2, angle - Math.PI / 2);
                path.move_to(point.add(up));
                path.line_to(point.add(down));
            } else if (head_style.startsWith("harpoon")) {
                const side = head_style.endsWith("top") ? 1 : -1;
                const p = point;
                const back = p.add(Point.lendir(head_width * start_sign, angle));
                // Only draw one side
                const up = Point.lendir(head_height / 2 * side, angle + Math.PI / 2);
                path.move_to(p); path.line_to(back.add(up));
            } else if (head_style.startsWith("hook")) {
                const side = head_style.endsWith("top") ? -1 : 1;
                const MASK_ADJUSTMENT = 0.5;

                for (let i = 0; i < this.style.level; ++i) {
                    const hookStart = point.add(new Point(
                        MASK_ADJUSTMENT,
                        side * stroke_width / 2
                            - side * CONSTANTS.STROKE_WIDTH / 2
                            - side * (CONSTANTS.LINE_SPACING + CONSTANTS.STROKE_WIDTH) * i,
                    ).rotate(angle));

                    path.move_to(hookStart);
                    path.arc_by(
                        new Point(start_sign * head_width, head_width),
                        angle,
                        false,
                        side === 1 ? (end_ind === 1) : (end_ind !== 1),
                        new Point(0, side * head_width * 2).rotate(angle)
                    );
                }
            } else if (head_style === "corner" || head_style === "corner-inverse") {
                const is_inverse = head_style.endsWith("-inverse");
                const LENGTH = CONSTANTS.CORNER_LINE_LENGTH;
                const base_2 = LENGTH / (2 ** 0.5);
                const base_point = curve.point(t_after_length(
                    arclen_to_head + (is_inverse ? 0 : base_2 * start_sign)
                ));

                for (const side_sign of [-1, 1]) {
                    path.move_to(base_point);

                    const PI_4 = Math.PI / 4;
                    const direction = this.angle();
                    const corner_angle = (is_inverse ? 0 : Math.PI)
                        + PI_4 * Math.round(4 * direction / Math.PI) - direction;

                    path.line_by(Point.lendir(
                        LENGTH,
                        corner_angle + Math.PI * end_ind + side_sign * Math.PI / 4,
                    ));
                }
            }
        }

        return { pathD: path.toString(), total_width };
    }

    determine_label_position(constants: any) {
        const { start, end } = constants;

        // But we need to use global curve if we want global point
        const globalCurve = constants.curve;

        const t = start.t + (end.t - start.t) * this.style.label_position;
        let centre = globalCurve.point(t);

        // Check if label alignment is requested (LEFT or RIGHT)
        // We use safe navigation and check against the Enum symbols
        const alignment = this.label?.alignment;
        if (alignment === CONSTANTS.LABEL_ALIGNMENT.LEFT ||
            alignment === CONSTANTS.LABEL_ALIGNMENT.RIGHT) {

            const tangent = globalCurve.tangent(t);
            const perp = tangent - Math.PI / 2;
            const side = alignment === CONSTANTS.LABEL_ALIGNMENT.LEFT ? 1 : -1;
            const offset = 15;

            // Point.lendir returns a Point. centre.add returns a Point.
            const shift = Point.lendir(offset * side, perp);
            centre = centre.add(shift);
        }

        return centre;
    }
}