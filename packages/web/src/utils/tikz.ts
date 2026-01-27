import { DiagramSpec, NodeSpec } from '@hotdocx/arrowgram';

function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

const GRID_SIZE = 40;

function formatLabel(label: string) {
    // 1. Correctly strip leading/trailing literal dollar signs
    // ^\$ matches $ at start; \$+ matches one or more $ at end
    const clean = (label || '').replace(/^\$|\$$/g, '').trim();

    if (!clean) return '';

    // 2. Check for LaTeX newlines (\\)
    if (clean.includes('\\\\')) {
        // Note: use '\\\\' to detect the literal double backslash
        return `\\begin{array}{c} ${clean} \\end{array}`;
    }

    // 3. Wrap in braces for tikz-cd compatibility
    return `{${clean}}`;
}

function hexToPgfColor(hex: string): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `{rgb,255:red,${r};green,${g};blue,${b}}`;
}

export function exportToTikz(specString: string) {
    try {
        const spec: DiagramSpec = JSON.parse(specString);
        if (!spec.nodes || spec.nodes.length === 0) return '';

        // Constants
        const PT_PER_PX = 0.75;
        const LOOP_SHORTEN_FACTOR = 0.4;
        const CURVE_AMPLITUDE_SCALE = 1.3;

        // Calculate grid coordinates
        let minC = Infinity;
        let maxC = -Infinity;
        let minR = Infinity;
        let maxR = -Infinity;

        const nodeMap = new Map<string, { r: number, c: number, label: string, color?: string }>();
        const arrowMap = new Map<string, string>(); // id -> tikzName

        spec.nodes.forEach(node => {
            const c = Math.round(node.left / GRID_SIZE);
            const r = Math.round(node.top / GRID_SIZE);
            minC = Math.min(minC, c);
            maxC = Math.max(maxC, c);
            minR = Math.min(minR, r);
            maxR = Math.max(maxR, r);
            nodeMap.set(node.name, { r, c, label: node.label || '', color: node.color });
        });

        // Pre-process arrows to assign IDs for 2-cells
        if (spec.arrows) {
            spec.arrows.forEach((arrow, index) => {
                const safeName = `${index}`;
                if (arrow.name) arrowMap.set(arrow.name, safeName);
            });
        }

        const rows = maxR - minR + 1;
        const cols = maxC - minC + 1;

        // Build grid
        const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(''));

        nodeMap.forEach((pos, name) => {
            const relR = pos.r - minR;
            const relC = pos.c - minC;

            let labelStr = formatLabel(pos.label);
            if (pos.color && pos.color !== '#000000') {
                const pgfColor = hexToPgfColor(pos.color);
                labelStr = `\\textcolor${pgfColor}{${labelStr}}`;
            }
            grid[relR][relC] = labelStr;
            nodeMap.set(name, { r: relR + 1, c: relC + 1, label: pos.label });
        });

        const output: string[] = [];
        output.push('\\\[\\begin{tikzcd}');

        // Output matrix
        for (let r = 0; r < rows; r++) {
            const rowStr = grid[r].join(' & ');
            output.push(`\t${rowStr}${r < rows - 1 ? ' \\\\' : ''}`);
        }

        // Output arrows
        if (spec.arrows) {
            spec.arrows.forEach((arrow, index) => {
                const fromNode = nodeMap.get(arrow.from);
                const toNode = nodeMap.get(arrow.to);

                const fromArrowName = !fromNode ? arrowMap.get(arrow.from) : null;
                const toArrowName = !toNode ? arrowMap.get(arrow.to) : null;

                if (!fromNode && !fromArrowName) return;
                if (!toNode && !toArrowName) return;

                const options: string[] = [];
                const labels: string[] = [];

                const tikzName = `${index}`;
                labels.push(`""{name=${tikzName}, anchor=center, inner sep=0}`);

                // Visual Label
                if (arrow.label) {
                    const cleanLabel = (arrow.label || '').replace(/^$|"$/g, '');
                    let labelContent = `"${formatLabel(cleanLabel)}"`;
                    const labelOpts: string[] = [];

                    if (arrow.label_alignment === 'left') {
                        labelContent += "'";
                    }

                    if (arrow.label_color && arrow.label_color !== '#000000') {
                        labelOpts.push(`text=${hexToPgfColor(arrow.label_color)}`);
                    }

                    if (arrow.label_alignment === 'over') {
                        labelOpts.push("description");
                    }

                    if (labelOpts.length > 0) {
                        labelContent += `{${labelOpts.join(', ')}}`;
                    }
                    labels.push(labelContent);
                }

                // Draw Color
                if (arrow.color && arrow.color !== '#000000') {
                    options.push(`draw=${hexToPgfColor(arrow.color)}`);
                }

                // Styles
                const style = arrow.style || {};
                if (style.head?.name === 'epi') options.push('two heads');
                if (style.head?.name === 'none') options.push('no head');
                if (style.head?.name === 'maps_to') options.push('maps to');
                if (style.head?.name === 'harpoon') options.push(style.head.side === 'bottom' ? 'harpoon' : 'harpoon');
                if (style.head?.name === 'hook') options.push(style.head.side === 'bottom' ? 'hook' : 'hook');

                if (style.tail?.name === 'mono') options.push('tail');
                if (style.tail?.name === 'maps_to') options.push('maps to');
                if (style.tail?.name === 'hook') options.push(style.tail.side === 'bottom' ? 'hook' : 'hook');

                if (style.body?.name === 'dashed') options.push('dashed');
                if (style.body?.name === 'dotted') options.push('dotted');
                if (style.body?.name === 'squiggly') options.push('squiggly');
                if (style.body?.name === 'barred') options.push('slashed');

                if (style.level === 2) options.push('Rightarrow');
                else if (style.level === 3) options.push('Rrightarrow');

                // Coordinates
                if (fromNode) options.push(`from=${fromNode.r}-${fromNode.c}`);
                else options.push(`from=${fromArrowName}`);

                if (toNode) options.push(`to=${toNode.r}-${toNode.c}`);
                else options.push(`to=${toArrowName}`);

                // Loops & Curves
                let isLoop = false;
                if (fromNode && toNode && fromNode.r === toNode.r && fromNode.c === toNode.c) {
                    isLoop = true;
                    options.push('loop');
                    const radius = arrow.radius ?? 40;
                    const r = radius / 10;
                    const angle = arrow.angle ?? -90;

                    const clockwise = r >= 0 ? 1 : -1;
                    const loop_angle = (180 - 90 * clockwise - angle);
                    const angle_spread = 35;

                    const inAngle = mod(loop_angle - angle_spread * clockwise, 360);
                    const outAngle = mod(loop_angle + angle_spread * clockwise, 360);

                    options.push(`in=${Math.round(inAngle)}`);
                    options.push(`out=${Math.round(outAngle)}`);
                    options.push(`distance=${Math.abs(r) * 3}mm`);
                } else {
                    if (arrow.curve) {
                        const effectiveCurve = arrow.curve * CURVE_AMPLITUDE_SCALE;
                        let degree = effectiveCurve;
                        // Geometric conversion: curve (px) -> bend (deg)
                        if (fromNode && toNode) {
                            const dr = (toNode.r - fromNode.r) * GRID_SIZE;
                            const dc = (toNode.c - fromNode.c) * GRID_SIZE;
                            const dist = Math.sqrt(dr * dr + dc * dc);
                            if (dist > 0) {
                                // alpha = 2 * atan(2h / d)
                                const rad = 2 * Math.atan((2 * effectiveCurve) / dist);
                                degree = rad * (180 / Math.PI);
                            }
                        }
                        options.push(`bend left=${Math.round(degree)}`);
                    }
                    if (arrow.shift) {
                        options.push(`shift left=${arrow.shift / 20}em`);
                    }
                }

                if (arrow.shorten) {
                    let s = arrow.shorten.source || 0;
                    let t = arrow.shorten.target || 0;

                    // Convert px to pt
                    s *= PT_PER_PX;
                    t *= PT_PER_PX;

                    // Additional loop reduction
                    if (isLoop) {
                        s *= LOOP_SHORTEN_FACTOR;
                        t *= LOOP_SHORTEN_FACTOR;
                    }

                    const MAX_SHORTEN_PT = 20;
                    if (isLoop) {
                        s = Math.min(s, MAX_SHORTEN_PT);
                        t = Math.min(t, MAX_SHORTEN_PT);
                    }

                    if (s > 0) options.push(`shorten <=${Math.round(s)}pt`);
                    if (t > 0) options.push(`shorten >=${Math.round(t)}pt`);
                }

                const args = [...options, ...labels];
                output.push(`\t\\arrow[${args.join(', ')}]`);
            });
        }

        output.push('\\end{tikzcd}\\]');

        return output.join('\n');
    } catch (e: any) {
        return `% Failed to export to TikZ-CD: ${e.message}`;
    }
}
