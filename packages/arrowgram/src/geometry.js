export const Vec2 = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    mul: (v, s) => ({ x: v.x * s, y: v.y * s }),
    mag: (v) => Math.hypot(v.x, v.y),
    norm: (v) => {
        const m = Math.hypot(v.x, v.y);
        return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
    },
    dot: (v1, v2) => v1.x * v2.x + v1.y * v2.y,
    dist: (v1, v2) => Math.hypot(v1.x - v2.x, v1.y - v2.y),
    rot: (v, angle) => ({
        x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
        y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
    }),
    angle: (v) => Math.atan2(v.y, v.x),
};
