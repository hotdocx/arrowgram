/*
 * Curve and intersection algorithms adapted from varkor/quiver (MIT).
 * See packages/arrowgram/THIRD_PARTY_NOTICES.md.
 */

import type { ComputedBounds } from "../types";
import { Point, mod } from "./ds";
import type { Path, Dimensions } from "./ds";

export const EPSILON = 10 ** -6;
const INV_EPSILON = 1 / EPSILON;

function round_to_epsilon(x: number) {
    return Math.round(x * INV_EPSILON) / INV_EPSILON;
}

function boundsFromPoints(points: Point[]): ComputedBounds {
    return {
        minX: Math.min(...points.map((point) => point.x)),
        minY: Math.min(...points.map((point) => point.y)),
        maxX: Math.max(...points.map((point) => point.x)),
        maxY: Math.max(...points.map((point) => point.y)),
    };
}

export abstract class Curve {
    abstract origin: Point;
    abstract angle: number;

    static point_inside_polygon(point: Point, points: Point[]) {
        if (points.length < 3) return false;
        let inside = false;

        for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
            const start = points[previous];
            const end = points[current];
            const edge = end.sub(start);
            const relative = point.sub(start);
            const cross = edge.x * relative.y - edge.y * relative.x;
            const withinBounds = point.x >= Math.min(start.x, end.x) - EPSILON
                && point.x <= Math.max(start.x, end.x) + EPSILON
                && point.y >= Math.min(start.y, end.y) - EPSILON
                && point.y <= Math.max(start.y, end.y) + EPSILON;
            if (Math.abs(cross) <= EPSILON && withinBounds) return true;

            const crossesRay = (start.y > point.y) !== (end.y > point.y);
            if (crossesRay) {
                const intersectionX = start.x
                    + (point.y - start.y) * (end.x - start.x) / (end.y - start.y);
                if (point.x < intersectionX) inside = !inside;
            }
        }

        return inside;
    }

    static add_intersection(intersections: Set<Point>, p: Point) {
        for (const existing of intersections) {
             if (Math.abs(existing.x - p.x) < EPSILON && Math.abs(existing.y - p.y) < EPSILON) {
                 return;
             }
        }
        intersections.add(new Point(round_to_epsilon(p.x), round_to_epsilon(p.y)));
    };

    static check_for_containment(origin: Point, rect: RoundedRectangle, permit_containment: boolean): CurvePoint[] {
        const sharp_rect = new RoundedRectangle(rect.centre, rect.size, 0);
        if (Curve.point_inside_polygon(origin, sharp_rect.points())) {
            if (permit_containment) {
                return [new CurvePoint(rect.centre, 0, 0)];
            } else {
                throw new Error("Curve was entirely contained by rounded rectangle.");
            }
        }
        return [];
    }
    
    abstract point(t: number): Point;
    abstract tangent(t: number): number;
    abstract arc_length(t: number): number;
    abstract t_after_length(clamp?: boolean): (length: number) => number;
    abstract get height(): number;
    abstract get width(): number;
    abstract intersections_with_rounded_rectangle(rect: RoundedRectangle, permit_containment: boolean): CurvePoint[];
    abstract render(path: Path): Path;
    abstract render_partial(path: Path, start: number, end: number): Path;
    abstract bounds(start?: number, end?: number): ComputedBounds;
}

export class Bezier extends Curve {
    origin: Point;
    w: number;
    h: number;
    angle: number;
    end: Point;
    control: Point;
    private metricCache?: {
        points: [number, Point][];
        cumulative: number[];
        length: number;
    };

    constructor(origin: Point, w: number, h: number, angle: number) {
        super();
        this.origin = origin;
        this.w = w;
        this.h = h;
        this.angle = angle;
        this.end = this.origin.add(new Point(this.w, 0).rotate(this.angle));
        this.control = this.origin.add(new Point(this.w / 2, this.h).rotate(this.angle));
    }

    point(t: number) {
        return this.origin.lerp(this.control, t).lerp(this.control.lerp(this.end, t), t);
    }

    tangent(t: number) {
        return this.control.lerp(this.end, t).sub(this.origin.lerp(this.control, t)).angle();
    }

    delineate(t: number) {
        if (t === 1 && this.metricCache) {
            return { points: this.metricCache.points, length: this.metricCache.length };
        }
        const EPSILON = 0.25;
        const points: [number, Point][] = [[0, this.point(0)], [t, this.point(t)]];
        let previous_length;
        let length = 0;

        do {
            previous_length = length;
            length = 0;
            for (let i = 0; i < points.length - 1; ++i) {
                length += points[i + 1][1].sub(points[i][1]).length();
            }
        } while (length - previous_length > EPSILON && (() => {
            for (let i = 0; i < points.length - 1; ++i) {
                const t = (points[i][0] + points[i + 1][0]) / 2;
                points.splice(++i, 0, [t, this.point(t)]);
            }
            return true;
        })());

        if (t === 1) {
            const cumulative = [0];
            for (let index = 0; index < points.length - 1; index += 1) {
                cumulative.push(
                    cumulative[index] + points[index + 1][1].sub(points[index][1]).length(),
                );
            }
            this.metricCache = { points, cumulative, length };
        }
        return { points, length };
    }

    private metrics() {
        if (!this.metricCache) this.delineate(1);
        return this.metricCache!;
    }

    arc_length(t: number) {
        const { points, cumulative, length } = this.metrics();
        if (t <= 0) return 0;
        if (t >= 1) return length;

        for (let index = 0; index < points.length - 1; index += 1) {
            if (points[index + 1][0] >= t) {
                const span = points[index + 1][0] - points[index][0];
                const fraction = span > 0 ? (t - points[index][0]) / span : 0;
                return cumulative[index]
                    + (cumulative[index + 1] - cumulative[index]) * fraction;
            }
        }
        return length;
    }

    t_after_length(clamp = false) {
        const { points, cumulative, length: totalLength } = this.metrics();
        return (length: number) => {
            if (length === 0) return 0;
            if (length < 0) {
                if (clamp) return 0;
                throw new Error("Length was less than 0.");
            }
            for (let i = 0; i < points.length - 1; ++i) {
                const segment_length = cumulative[i + 1] - cumulative[i];
                if (cumulative[i + 1] >= length) {
                    if (segment_length <= EPSILON) return points[i + 1][0];
                    return points[i][0]
                        + (points[i + 1][0] - points[i][0]) * (length - cumulative[i]) / segment_length;
                }
            }
            if (clamp) return 1;
            throw new Error(`Length ${length} was greater than arc length ${totalLength}.`);
        };
    }

    get height() {
        return this.h / 2;
    }

    get width() {
        return this.w;
    }

    intersections_with_rounded_rectangle(rect: RoundedRectangle, permit_containment: boolean): CurvePoint[] {
        const h = this.h || 1;
        const points = rect.points().map((p) => {
            p = p.sub(this.origin);
            p = p.rotate(-this.angle);
            p = p.inv_scale(this.w, h);
            return p;
        });

        const intersections = new Set<Point>();

        const m_c = (endpoints: Point[]) => {
            const m = (endpoints[1].y - endpoints[0].y) / (endpoints[1].x - endpoints[0].x);
            return { m, c: endpoints[0].y - m * endpoints[0].x };
        };

        if (this.h === 0) {
            for (let i = 0; i < points.length; ++i) {
                const endpoints = [points[i], points[(i + 1) % points.length]];
                if (Math.abs(endpoints[0].x - endpoints[1].x) <= EPSILON) {
                    if (
                        endpoints[0].x >= 0 && endpoints[0].x <= 1
                        && Math.min(endpoints[0].y, endpoints[1].y) <= 0
                        && Math.max(endpoints[0].y, endpoints[1].y) >= 0
                    ) {
                        Curve.add_intersection(intersections, new Point(endpoints[0].x, 0));
                    }
                } else {
                    const { m, c } = m_c(endpoints);
                    if (Math.abs(m) > EPSILON) {
                        const x = -c / m;
                        if (
                            x >= 0 && x <= 1
                            && x >= Math.min(endpoints[0].x, endpoints[1].x) - EPSILON
                            && x <= Math.max(endpoints[0].x, endpoints[1].x) + EPSILON
                        ) {
                            Curve.add_intersection(intersections, new Point(x, 0));
                        }
                    } else if (Math.abs(endpoints[0].y) <= EPSILON) {
                        const min = Math.min(endpoints[0].x, endpoints[1].x);
                        const max = Math.max(endpoints[0].x, endpoints[1].x);
                        if (min <= 1 && max >= 0) {
                            Curve.add_intersection(intersections, new Point(Math.max(min, 0), 0));
                            Curve.add_intersection(intersections, new Point(Math.min(max, 1), 0));
                        }
                    }
                }
            }
        } else {
            for (let i = 0; i < points.length; ++i) {
                const endpoints = [points[i], points[(i + 1) % points.length]];
                if (Math.abs(endpoints[0].x - endpoints[1].x) <= EPSILON) {
                    const y = NormalisedBezier.y_intersection_with_vertical_line(endpoints[0].x);
                    if (
                        y >= 0
                        && y >= Math.min(endpoints[0].y, endpoints[1].y)
                        && y <= Math.max(endpoints[0].y, endpoints[1].y)
                    ) {
                        Curve.add_intersection(intersections, new Point(endpoints[0].x, y));
                    }
                } else {
                    const { m, c } = m_c(endpoints);
                    NormalisedBezier.x_intersections_with_nonvertical_line(m, c)
                        .filter((x) => {
                            return x >= 0 && x <= 1
                                && x >= Math.min(endpoints[0].x, endpoints[1].x)
                                && x <= Math.max(endpoints[0].x, endpoints[1].x);
                        })
                        .map((x) => new Point(x, m * x + c))
                        .forEach((int) => Curve.add_intersection(intersections, int));
                }
            }
        }

        if (intersections.size === 0) {
            return Curve.check_for_containment(this.origin, rect, permit_containment);
        }

        return Array.from(intersections).map((p) => {
            return new CurvePoint(
                p.scale(this.w, h),
                p.x,
                Math.atan2((2 - 4 * p.x) * this.h, this.w),
            );
        });
    }

    render(path: Path) {
        return this.render_partial(path, 0, 1);
    }

    render_partial(path: Path, start: number, end: number) {
        const startPoint = this.point(start);
        const endPoint = this.point(end);
        const derivativeHalf = this.control.sub(this.origin).mul(1 - start)
            .add(this.end.sub(this.control).mul(start));
        const control = startPoint.add(derivativeHalf.mul(end - start));
        return path.curve_by(control.sub(startPoint), endPoint.sub(startPoint));
    }

    bounds(start = 0, end = 1) {
        const lower = Math.min(start, end);
        const upper = Math.max(start, end);
        const candidates = new Set([lower, upper]);
        const addExtremum = (startValue: number, controlValue: number, endValue: number) => {
            const denominator = startValue - 2 * controlValue + endValue;
            if (Math.abs(denominator) <= EPSILON) return;
            const t = (startValue - controlValue) / denominator;
            if (t > lower && t < upper) candidates.add(t);
        };
        addExtremum(this.origin.x, this.control.x, this.end.x);
        addExtremum(this.origin.y, this.control.y, this.end.y);
        return boundsFromPoints([...candidates].map((t) => this.point(t)));
    }
}

export class CurvePoint extends Point {
    t: number;
    tangentAngle: number;

    constructor(point: Point, t: number, angle: number) {
        super(point.x, point.y);
        this.t = t;
        this.tangentAngle = angle;
    }
}

class NormalisedBezier {
    static x_intersections_with_nonvertical_line(m: number, c: number) {
        const determinant = m ** 2 - 4 * m + 4 - 8 * c;
        if (determinant > 0) {
            return [(2 - m + determinant ** 0.5) / 4, (2 - m - determinant ** 0.5) / 4];
        } else if (determinant === 0) {
            return [(2 - m + determinant ** 0.5) / 4];
        } else {
            return [];
        }
    }

    static y_intersection_with_vertical_line(a: number) {
        return 2 * a * (1 - a);
    }
}

export class RoundedRectangle {
    centre: Point;
    size: Dimensions;
    r: number;

    constructor(centre: Point, size: Dimensions, radius: number) {
        this.centre = centre;
        this.size = size;
        this.r = radius;
    }

    contains(point: Point, epsilon = EPSILON) {
        const halfWidth = this.size.width / 2;
        const halfHeight = this.size.height / 2;
        const radius = Math.max(0, Math.min(this.r, halfWidth, halfHeight));
        const x = Math.abs(point.x - this.centre.x);
        const y = Math.abs(point.y - this.centre.y);

        if (x > halfWidth + epsilon || y > halfHeight + epsilon) return false;
        if (x <= halfWidth - radius + epsilon || y <= halfHeight - radius + epsilon) return true;

        return Math.hypot(
            x - (halfWidth - radius),
            y - (halfHeight - radius),
        ) <= radius + epsilon;
    }

    points(max_segment_length = 5) {
        const points: Point[] = [];
        const n = this.r !== 0 ? Math.PI / Math.atan(max_segment_length / (2 * this.r)) : 0;
        const sides = Math.ceil(n);
        const R = this.r / Math.cos(Math.PI / sides);

        const add_corner_points = (sx: number, sy: number, angle_offset: number) => {
            points.push(this.centre
                .add(this.size.div(2).sub(Point.diag(this.r)).scale(sx, sy))
                .add(Point.lendir(this.r, angle_offset))
            );
            for (let i = 0; i < sides / 4; ++i) {
                const angle = (i + 0.5) / sides * 2 * Math.PI + angle_offset;
                points.push(this.centre
                    .add(this.size.div(2).sub(Point.diag(this.r)).scale(sx, sy))
                    .add(Point.lendir(R, angle))
                );
            }
            angle_offset += Math.PI / 2;
            points.push(this.centre
                .add(this.size.div(2).sub(Point.diag(this.r)).scale(sx, sy))
                .add(Point.lendir(this.r, angle_offset))
            );
            return angle_offset;
        }

        let angle_offset = 0;
        angle_offset = add_corner_points(1, 1, angle_offset);
        angle_offset = add_corner_points(-1, 1, angle_offset);
        angle_offset = add_corner_points(-1, -1, angle_offset);
        add_corner_points(1, -1, angle_offset);

        for (let i = points.length - 2; i >= 0; --i) {
            if (Math.abs(points[i].x - points[i + 1].x) <= EPSILON
                && Math.abs(points[i].y - points[i + 1].y) <= EPSILON
            ) {
                points.splice(i + 1, 1);
            }
        }

        return points;
    }
}

export class Arc extends Curve {
    origin: Point;
    chord: number;
    major: boolean;
    radius: number;
    angle: number;
    sagitta: number;
    centre_normalised: Point;
    sweep_angle: number;
    centre: Point;
    start_angle: number;

    constructor(origin: Point, chord: number, major: boolean, radius: number, angle: number) {
        super();
        this.origin = origin;
        this.chord = chord;
        this.major = major;
        this.radius = radius;
        this.angle = angle;

        this.sagitta = this.radius
            - Math.sign(this.radius) * (this.radius ** 2 - this.chord ** 2 / 4) ** 0.5;
        this.centre_normalised = new Point(
            this.chord / 2,
            (this.radius - this.sagitta) * (this.major ? -1 : 1),
        );
        const start_angle = mod(this.centre_normalised.neg().angle(), 2 * Math.PI);
        this.sweep_angle = Math.PI + (2 * Math.PI - 2 * start_angle) * this.clockwise;
        this.centre = this.origin.add(this.centre_normalised.rotate(this.angle));
        this.start_angle = mod(start_angle + this.angle, 2 * Math.PI);
    }

    get clockwise() {
        return this.radius >= 0 ? 1 : -1;
    }

    point(t: number) {
        return this.centre
            .add(new Point(Math.abs(this.radius), 0)
                .rotate(this.start_angle + t * this.sweep_angle * this.clockwise));
    }

    tangent(t: number) {
        return this.start_angle
            + (t * this.sweep_angle + Math.PI / 2) * this.clockwise;
    }

    arc_length(t: number) {
        return t * this.sweep_angle * Math.abs(this.radius);
    }

    t_after_length(clamp = false) {
        return (length: number) => {
            if (length < 0) {
                if (clamp) return 0;
                throw new Error("Length was less than 0.");
            }
            if (length > this.arc_length(1)) {
                if (clamp) return 1;
                throw new Error("Length was greater than the arc length.");
            }
            return length / (this.sweep_angle * Math.abs(this.radius));
        };
    }

    get height() {
        return Math.abs(this.major ? this.radius * 2 - this.sagitta : this.sagitta);
    }

    get width() {
        return this.major ? Math.abs(this.radius) * 2 : this.chord;
    }

    angle_in_arc(angle: number) {
        const normalise = (angle: number) => {
            while (angle < -Math.PI) angle += 2 * Math.PI;
            while (angle > Math.PI) angle -= 2 * Math.PI;
            return angle;
        };

        const angle1 = normalise(this.start_angle - angle);
        const angle2 = normalise(this.start_angle + this.sweep_angle * this.clockwise - angle);
        return (angle1 * angle2 < 0 && Math.abs(angle1 - angle2) < Math.PI) !== this.major;
    }

    intersections_with_rounded_rectangle(rect: RoundedRectangle, permit_containment: boolean): CurvePoint[] {
        if (!this.major && Math.abs(this.sagitta) <= 1.0) {
            return new Bezier(this.origin, this.chord, 0, this.angle)
                .intersections_with_rounded_rectangle(rect, permit_containment);
        }

        const points = rect.points().map((p) => {
            p = p.sub(this.centre).map(round_to_epsilon);
            return p;
        });
        if (this.radius < 0) {
            points.reverse();
        }
        const intersections = new Set<Point>();

        for (let i = 0; i < points.length; ++i) {
            const endpoints = [points[i], points[(i + 1) % points.length]];
            const d = endpoints[1].sub(endpoints[0]);
            const det = endpoints[0].x * endpoints[1].y - endpoints[1].x * endpoints[0].y;
            const ls = d.length() ** 2;
            const disc = (this.radius ** 2) * ls - (det ** 2);
            if (Math.sign(disc) < 0) {
                continue;
            }
            for (const s of Math.abs(disc) <= EPSILON ? [0] : [1, -1]) {
                const [x, y] = [
                    (det * d.y + s * d.x * (disc ** 0.5) * (d.y < 0 ? -1 : 1)) / ls,
                    (-det * d.x + s * (disc ** 0.5) * Math.abs(d.y)) / ls,
                ].map(round_to_epsilon);

                if (x >= Math.min(endpoints[0].x, endpoints[1].x)
                    && x <= Math.max(endpoints[0].x, endpoints[1].x)
                    && y >= Math.min(endpoints[0].y, endpoints[1].y)
                    && y <= Math.max(endpoints[0].y, endpoints[1].y)
                ) {
                    if (this.angle_in_arc(Math.atan2(y, x))) {
                        Curve.add_intersection(intersections, new Point(x, y));
                    }
                }
            }
        }

        if (intersections.size === 0) {
            return Curve.check_for_containment(this.origin, rect, permit_containment);
        }

        return Array.from(intersections).map((p) => {
            const t = mod((Math.atan2(p.y, p.x) - this.start_angle) * this.clockwise, 2 * Math.PI)
                / this.sweep_angle;
            return new CurvePoint(
                p.add(this.centre).sub(this.origin).rotate(-this.angle),
                t,
                this.tangent(t),
            );
        });
    }

    render(path: Path) {
        return this.render_partial(path, 0, 1);
    }

    render_partial(path: Path, start: number, end: number) {
        if (!this.major && Math.abs(this.sagitta) <= 1.0) {
            return path.line_by(this.point(end).sub(this.point(start)));
        }
        const sweep = Math.abs(end - start) * this.sweep_angle;
        return path.arc_by(
            Point.diag(Math.abs(this.radius)),
            0,
            sweep > Math.PI,
            this.radius >= 0,
            this.point(end).sub(this.point(start)),
        );
    }

    bounds(start = 0, end = 1) {
        const lower = Math.min(start, end);
        const upper = Math.max(start, end);
        if (!this.major && Math.abs(this.sagitta) <= 1.0) {
            return boundsFromPoints([this.point(lower), this.point(upper)]);
        }

        const candidates = new Set([lower, upper]);
        const signedSweep = this.sweep_angle * this.clockwise;
        for (const criticalAngle of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
            for (let turn = -2; turn <= 2; turn += 1) {
                const t = (criticalAngle + turn * 2 * Math.PI - this.start_angle) / signedSweep;
                if (t > lower && t < upper) candidates.add(t);
            }
        }
        return boundsFromPoints([...candidates].map((t) => this.point(t)));
    }
}
