const COORD_CLUSTER_THRESHOLD = 20;

function clusterCoords(coords) {
    if (coords.length === 0) return [];
    const sorted = [...new Set(coords)].sort((a, b) => a - b);
    const clusters = [];
    if (sorted.length === 0) return [];

    let currentCluster = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - currentCluster[currentCluster.length - 1] < COORD_CLUSTER_THRESHOLD) {
            currentCluster.push(sorted[i]);
        } else {
            clusters.push(currentCluster);
            currentCluster = [sorted[i]];
        }
    }
    clusters.push(currentCluster);
    
    return clusters.map(cluster => {
        const center = cluster.reduce((sum, val) => sum + val, 0) / cluster.length;
        return { center, members: new Set(cluster) };
    });
}

export function exportToTikz(specString) {
    try {
        const spec = JSON.parse(specString);
        if (!spec.nodes || spec.nodes.length === 0) {
            return `\\begin{tikzcd}\n\\end{tikzcd}`;
        }

        const allX = spec.nodes.map(n => n.left);
        const allY = spec.nodes.map(n => n.top);

        const xClusters = clusterCoords(allX);
        const yClusters = clusterCoords(allY);

        const xPositions = xClusters.map(c => c.center);
        const yPositions = yClusters.map(c => c.center);

        const colMap = new Map(xPositions.map((x, i) => [x, i + 1]));
        const rowMap = new Map(yPositions.map((y, i) => [y, i + 1]));

        const nodePositions = new Map();
        spec.nodes.forEach(node => {
            const xCl = xClusters.find(c => c.members.has(node.left));
            const yCl = yClusters.find(c => c.members.has(node.top));
            if (xCl && yCl) {
                const row = rowMap.get(yCl.center);
                const col = colMap.get(xCl.center);
                nodePositions.set(node.name, { row, col });
            }
        });

        const matrix = Array(yClusters.length).fill(0).map(() => Array(xClusters.length).fill(''));
        spec.nodes.forEach(node => {
            const pos = nodePositions.get(node.name);
            if (pos && matrix[pos.row - 1]) {
                let label = (node.label || '').replace(/\$/g, '');
                matrix[pos.row - 1][pos.col - 1] = label;
            }
        });

        const matrixString = matrix.map(row => row.join(' & ')).join(' \\\\\n\t');

        const arrowNames = new Set((spec.arrows || []).map(a => a.name).filter(Boolean));
        const arrowStrings = (spec.arrows || []).map(arrow => {
            let fromPos, toPos;
            if (arrowNames.has(arrow.from)) {
                fromPos = arrow.from;
            } else {
                const pos = nodePositions.get(arrow.from);
                if (!pos) return null;
                fromPos = `${pos.row}-${pos.col}`;
            }

            if (arrowNames.has(arrow.to)) {
                toPos = arrow.to;
            } else {
                const pos = nodePositions.get(arrow.to);
                if (!pos) return null;
                toPos = `${pos.row}-${pos.col}`;
            }

            const options = [];

            const tailSymbol = arrow.style?.tail?.name === 'mono' ? '>' : '';
            let headSymbol = '>'; // default
            if (arrow.style?.head?.name === 'epi') headSymbol = '>>';
            if (arrow.style?.head?.name === 'none') headSymbol = '';
            
            const bodySymbol = (tailSymbol || headSymbol || (arrow.style?.body?.name && arrow.style.body.name !== 'none')) ? '-' : '';
            if (tailSymbol || headSymbol || bodySymbol) {
                options.push(`${tailSymbol}${bodySymbol}${headSymbol}`);
            }

            if (arrow.label) {
                const label = arrow.label.replace(/\$/g, '');
                const pos = arrow.label_alignment === 'right' ? "'" : "";
                const desc = arrow.label_alignment === 'over' ? '{description}' : "";
                options.push(`"${label}"${pos}${desc}`);
            }
            
            if (arrow.style?.body?.name === 'dashed') options.push('dashed');
            if (arrow.style?.body?.name === 'dotted') options.push('dotted');
            if (arrow.style?.level === 2) options.push('double');
            if (arrow.style?.level > 2) options.push('triple');

            if (arrow.curve) {
                const bendDir = arrow.curve > 0 ? 'left' : 'right';
                const bendAngle = Math.min(90, Math.round(Math.abs(arrow.curve) / 3));
                if (bendAngle > 5) {
                    options.push(`bend ${bendDir}=${bendAngle}`);
                }
            }
            
            if (arrow.shift) {
                const shiftDir = arrow.shift > 0 ? 'left' : 'right';
                const shiftAmount = Math.round(Math.abs(arrow.shift) / 20);
                if (shiftAmount > 0) {
                    options.push(`shift ${shiftDir}=${shiftAmount}ex`);
                }
            }

            if (arrow.name) {
                options.push(`name=${arrow.name}`);
            }

            return `\\arrow[from=${fromPos}, to=${toPos}${options.length > 0 ? ', ' : ''}${options.join(', ')}]`;
        }).filter(Boolean);

        const arrowBlock = arrowStrings.length > 0 ? '\n\t' + arrowStrings.join('\n\t') : '';
        
        return `\\begin{tikzcd}\n\t${matrixString}${arrowBlock}\n\\end{tikzcd}`;
    } catch (e) {
        console.error('Failed to export to TikZ:', e);
        return `% Failed to export to TikZ: ${e.message}`;
    }
} 