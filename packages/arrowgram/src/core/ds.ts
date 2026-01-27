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

export class Position extends Point {}
export class Offset extends Point {}

export class Dimensions extends Position {
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

export function deg_to_rad(deg: number) {
  return (deg * Math.PI) / 180;
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
    if (p.x === 0) {
      this.commands.push(`V ${p.y}`);
    } else if (p.y === 0) {
      this.commands.push(`H ${p.x}`);
    } else {
      this.commands.push(`L ${p.x} ${p.y}`);
    }
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

export function clamp(min: number, x: number, max: number) {
  return Math.max(min, Math.min(x, max));
}

export function arrays_equal(array1: any[], array2: any[]) {
  if (array1.length !== array2.length) {
    return false;
  }
  for (let i = 0; i < array1.length; ++i) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}

export function mod(x: number, y: number) {
  return ((x % y) + y) % y;
}

export class Encodable {
    eq(_other: any): boolean {
        console.error("`eq` must be implemented for each subclass.");
        return false;
    }
}

export class Colour extends Encodable {
    h: number;
    s: number;
    l: number;
    a: number;
    name: string | null;

    constructor(h: number, s: number, l: number, a = 1, name = Colour.colour_name([h, s, l, a])) {
        super();
        this.h = h;
        this.s = s;
        this.l = l;
        this.a = a;
        this.name = name;
    }

    static black() {
        return new Colour(0, 0, 0);
    }

    static colour_name(hsla: [number, number, number, number]): string | null {
        const [h, s, l, a] = hsla;
        if (a === 0) {
            return "transparent";
        }
        if (a === 1 && l === 0) {
            return "black";
        }
        if (a === 1 && l === 100) {
            return "white";
        }

        const key = `${h}, ${s}, ${l}, ${a}`;
        switch (key) {
            case "0, 100, 50, 1": return "red";
            case "30, 100, 50, 1": return "orange";
            case "60, 100, 50, 1": return "yellow";
            case "120, 100, 50, 1": return "green";
            case "180, 100, 50, 1": return "aqua";
            case "240, 100, 50, 1": return "blue";
            case "270, 100, 50, 1": return "purple";
            case "300, 100, 50, 1": return "magenta";
            case "0, 60, 60, 1": return "red chalk";
            case "30, 60, 60, 1": return "orange chalk";
            case "60, 60, 60, 1": return "yellow chalk";
            case "120, 60, 60, 1": return "green chalk";
            case "180, 60, 60, 1": return "aqua chalk";
            case "240, 60, 60, 1": return "blue chalk";
            case "270, 60, 60, 1": return "purple chalk";
            case "300, 60, 60, 1": return "magenta chalk";
        }
        return null;
    }

    hsla(): [number, number, number, number] {
        return [this.h, this.s, this.l, this.a];
    }

    rgba(): [number, number, number, number] {
        const [h, s, l] = [this.h, this.s / 100, this.l / 100];
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        }
        return [f(0) * 255, f(8) * 255, f(4) * 255, this.a].map((x) => Math.round(x)) as [number, number, number, number];
    }

    static from_rgba(r: number, g: number, b: number, a = 1) {
        // Algorithm source: https://en.wikipedia.org/wiki/HSL_and_HSV#Formal_derivation
        const [r_, g_, b_] = [r, g, b].map((x) => x / 255);
        const max = Math.max(r_, g_, b_);
        const min = Math.min(r_, g_, b_);
        const range = max - min;
        let h = 0; 
        if (range !== 0) {
            switch (max) {
                case r_:
                    h = ((g_ - b_) / range) % 6;
                    break;
                case g_:
                    h = ((b_ - r_) / range) + 2;
                    break;
                case b_:
                    h = ((r_ - g_) / range) + 4;
                    break;
            }
        }
        const l = (max + min) / 2;
        const s = l === 0 || l === 1 ? 0 : range / (1 - Math.abs(2 * l - 1));

        return new Colour(...([h * 60, s * 100, l * 100].map((x) => Math.round(x)) as [number, number, number]), a);
    }

    toJSON() {
        if (this.a === 1) {
            return [this.h, this.s, this.l];
        } else {
            return this.hsla();
        }
    }

    toString() {
        return `${this.h},${this.s},${this.l},${this.a}`;
    }

    css() {
        return `hsla(${this.h}, ${this.s}%, ${this.l}%, ${this.a})`;
    }

    latex(latex_colours: Map<string, Colour>, parenthesise = false) {
        let latex_name = null;
        const name = Colour.colour_name(this.hsla());
        if (name && ["black", "red", "green", "blue", "white"].includes(name)) {
            latex_name = name;
        } else {
            for (const [name, colour] of latex_colours) {
                if (colour.eq(this)) {
                    latex_name = name;
                    break;
                }
            }
        }
        if (latex_name !== null) {
            return parenthesise ? `{${latex_name}}` : latex_name;
        }

        const [r, g, b] = this.rgba();
        return `{rgb,255:red,${r};green,${g};blue,${b}}`;
    }

    eq(other: Colour) {
        return this.h === other.h && this.s === other.s && this.l === other.l && this.a === other.a
            || this.l === 0 && other.l === 0 || this.l === 100 && other.l === 100;
    }

    is_not_black() {
        return this.l > 0;
    }
}