/*
 * Geometry/path helpers adapted from varkor/quiver (MIT).
 * See packages/arrowgram/THIRD_PARTY_NOTICES.md.
 */

export class Enum {
  [key: string]: symbol;

  constructor(name: string, ...variants: string[]) {
    for (const variant of variants) {
      this[variant] = Symbol(`${name}::${variant}`);
    }
  }
}

export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static zero() {
    return new Point(0, 0);
  }

  static lendir(length: number, direction: number) {
    return new Point(Math.cos(direction) * length, Math.sin(direction) * length);
  }

  static diag(x: number) {
    return new Point(x, x);
  }

  toString() {
    return `${this.x} ${this.y}`;
  }

  toArray() {
    return [this.x, this.y];
  }

  px(comma = true) {
    return `${this.x}px${comma ? "," : ""} ${this.y}px`;
  }

  eq(other: Point) {
    return this.x === other.x && this.y === other.y;
  }

  add(other: Point) {
    return new Point(this.x + other.x, this.y + other.y);
  }

  sub(other: Point) {
    return new Point(this.x - other.x, this.y - other.y);
  }

  neg() {
    return new Point(-this.x, -this.y);
  }

  scale(w: number, h: number) {
    return new Point(this.x * w, this.y * h);
  }

  inv_scale(w: number, h: number) {
    return new Point(this.x / w, this.y / h);
  }

  mul(multiplier: number) {
    return this.scale(multiplier, multiplier);
  }

  div(divisor: number) {
    return this.inv_scale(divisor, divisor);
  }

  max(other: Point) {
    return new Point(Math.max(this.x, other.x), Math.max(this.y, other.y));
  }

  min(other: Point) {
    return new Point(Math.min(this.x, other.x), Math.min(this.y, other.y));
  }

  rotate(theta: number) {
    return new Point(
      this.x * Math.cos(theta) - this.y * Math.sin(theta),
      this.y * Math.cos(theta) + this.x * Math.sin(theta)
    );
  }

  length() {
    return Math.hypot(this.y, this.x);
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  lerp(other: Point, t: number) {
    return this.add(other.sub(this).mul(t));
  }

  is_zero() {
    return this.x === 0 && this.y === 0;
  }

  map(f: (x: number) => number) {
    return new Point(f(this.x), f(this.y));
  }
}

export class Dimensions extends Point {
  get width() {
    return this.x;
  }
  get height() {
    return this.y;
  }
}

export function rad_to_deg(rad: number) {
  return (rad * 180) / Math.PI;
}

export class Path {
  commands: string[];

  constructor() {
    this.commands = [];
  }

  toString() {
    return this.commands.join("\n");
  }

  move_to(p: Point) {
    this.commands.push(`M ${p.x} ${p.y}`);
    return this;
  }

  move_by(p: Point) {
    this.commands.push(`m ${p.x} ${p.y}`);
    return this;
  }

  line_to(p: Point) {
    this.commands.push(`L ${p.x} ${p.y}`);
    return this;
  }

  line_by(p: Point) {
    if (p.x === 0) {
      this.commands.push(`v ${p.y}`);
    } else if (p.y === 0) {
      this.commands.push(`h ${p.x}`);
    } else {
      this.commands.push(`l ${p.x} ${p.y}`);
    }
    return this;
  }

  curve_by(c: Point, d: Point) {
    this.commands.push(`q ${c.x} ${c.y} ${d.x} ${d.y}`);
    return this;
  }

  arc_by(r: Point, angle: number, large_arc: boolean, clockwise: boolean, next: Point) {
    this.commands.push(
      `a ${Math.abs(r.x)} ${Math.abs(r.y)}
      ${rad_to_deg(angle)} ${large_arc ? 1 : 0} ${clockwise ? 1 : 0}
      ${next.x} ${next.y}`
    );
    return this;
  }
}

export function mod(x: number, y: number) {
  return ((x % y) + y) % y;
}
