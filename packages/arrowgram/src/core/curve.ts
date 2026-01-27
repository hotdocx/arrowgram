import { Point, mod, Path, Dimensions } from "./ds";

export const EPSILON = 10 ** -6;
const INV_EPSILON = 1 / EPSILON;

function round_to_epsilon(x: number) {
    return Math.round(x * INV_EPSILON) / INV_EPSILON;
}

export abstract class Curve {
    abstract origin: Point;
    abstract angle: number;

    static point_inside_polygon(point: Point, points: Point[]) {
        const displ = (edge: Point[], p: Point) => {
            const base = edge[0];
            const end = edge[1].sub(base);
            const pt = p.sub(base);
            return end.x * pt.y - end.y * pt.x;
        };

        const wn = points.map((_, i) => {
            if ((points[i].y <= point.y) !== (points[(i + 1) % 4].y <= point.y)) {
                const d = displ([points[i], points[(i + 1) % 4]], point);
                if (d > 0.0) return 1;
                if (d < 0.0) return -1;
            }
            return 0;
        }).reduce<number>((a, b) => a + b, 0);

        return wn !== 0;
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
}

export class Bezier extends Curve {
    origin: Point;
    w: number;
    h: number;
    angle: number;
    end: Point;
    control: Point;

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

        return { points, length };
    }

    arc_length(t: number) {
        const { length } = this.delineate(t);
        return length;
    }

    t_after_length(clamp = false) {
        const { points } = this.delineate(1);
        return (length: number) => {
            if (length === 0) return 0;
            if (length < 0) {
                if (clamp) return 0;
                throw new Error("Length was less than 0.");
            }
            let distance = 0;
            for (let i = 0; i < points.length - 1; ++i) {
                const segment_length = points[i + 1][1].sub(points[i][1]).length();
                if (distance + segment_length >= length) {
                    return points[i][0]
                        + (points[i + 1][0] - points[i][0]) * (length - distance) / segment_length;
                }
                distance += segment_length;
            }
            if (clamp) return 1;
            throw new Error("Length was greater than the arc length.");
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
            return new CurvePoint(p.scale(this.w, h), p.x, Math.atan2((2 - 4 * p.x) * h, this.w));
        });
    }

    render(path: Path) {
        return path.curve_by(
            new Point(this.w / 2, this.h).rotate(this.angle),
            new Point(this.w, 0).rotate(this.angle)
        );
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
        angle_offset = add_corner_points(1, -1, angle_offset);

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

export class CubicBezier {
    p0: Point;
    p1: Point;
    p2: Point;
    p3: Point;

    constructor(p0: Point, p1: Point, p2: Point, p3: Point) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
    }

    point(t: number) {
        const p = this.p0.mul((1 - t) ** 3)
            .add(this.p1.mul(3 * (1 - t) ** 2 * t))
            .add(this.p2.mul(3 * (1 - t) * t ** 2))
            .add(this.p3.mul(t ** 3));
        return new CurvePoint(p, t, 0); // Angle is not calculated
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
        if (!this.major && Math.abs(this.sagitta) <= 1.0) {
            return path.line_by(new Point(this.chord, 0).rotate(this.angle));
        }
        return path.arc_by(
            Point.diag(Math.abs(this.radius)),
            0,
            this.major,
            this.radius >= 0,
            new Point(this.chord, 0).rotate(this.angle),
        );
    }
}
