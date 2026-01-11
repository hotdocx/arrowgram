import { Vec2 } from './types.js';

export const Vec2Math = {
    add: (v1: Vec2, v2: Vec2): Vec2 => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1: Vec2, v2: Vec2): Vec2 => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    mul: (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),
    mag: (v: Vec2): number => Math.hypot(v.x, v.y),
    norm: (v: Vec2): Vec2 => {
        const m = Math.hypot(v.x, v.y);
        return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
    },
    dot: (v1: Vec2, v2: Vec2): number => v1.x * v2.x + v1.y * v2.y,
    dist: (v1: Vec2, v2: Vec2): number => Math.hypot(v1.x - v2.x, v1.y - v2.y),
    rot: (v: Vec2, angle: number): Vec2 => ({
        x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
        y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
    }),
    angle: (v: Vec2): number => Math.atan2(v.y, v.x),
};
