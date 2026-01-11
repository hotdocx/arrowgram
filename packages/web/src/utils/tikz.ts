import { DiagramSpec, NodeSpec } from 'arrowgram';

const COORD_CLUSTER_THRESHOLD = 5;

function clusterCoords(coords: number[]) {
    if (coords.length === 0) return [];
    // @ts-ignore
    const sorted = [...new Set(coords)].sort((a, b) => a - b);
    const clusters = [[sorted[0]]];
    
    for (let i = 1; i < sorted.length; i++) {
        const currentCluster = clusters[clusters.length - 1];
        if (sorted[i] - currentCluster[currentCluster.length - 1] < COORD_CLUSTER_THRESHOLD) {
            currentCluster.push(sorted[i]);
        } else {
            clusters.push([sorted[i]]);
        }
    }
    
    const mapping = new Map();
    clusters.forEach(cluster => {
        const center = cluster.reduce((sum, val) => sum + val, 0) / cluster.length;
        cluster.forEach(val => mapping.set(val, center));
    });
    
    return mapping;
}

export function exportToTikz(specString: string) {
    try {
        const spec: DiagramSpec = JSON.parse(specString);
        if (!spec.nodes) return '';

        const allX = spec.nodes.map((n: NodeSpec) => n.left);
        const allY = spec.nodes.map((n: NodeSpec) => n.top);
        
        const xMap = clusterCoords(allX);
        const yMap = clusterCoords(allY);
        
        // Find min/max to normalize
        const uniqueX = [...new Set(xMap.values())].sort((a, b) => a - b);
        const uniqueY = [...new Set(yMap.values())].sort((a, b) => a - b); // Use y as is, or invert? TikZ y is up.
        // SVG y is down. So larger y in SVG is "lower" in TikZ.
        // Let's invert Y for TikZ.
        
        // Simple matrix generation
        // For a more advanced "grid", we might map coords to integers 0..N
        
        const output = [];
        output.push('\\begin{tikzcd}');
        
        // Naive absolute positioning for now, as recreating the grid layout logic is complex
        // Or we can use relative positioning?
        // Let's stick to absolute coordinate scaling which tikz-cd supports via manual placement or standard tikz
        // BUT users expect tikz-cd grid. 
        // Let's try to infer a grid.
        
        spec.nodes.forEach((node: NodeSpec) => {
            const x = xMap.get(node.left);
            const y = yMap.get(node.top);
            // This part is a stub. A real converter is non-trivial.
            // For now, let's output a comment saying it's a stub or simple list.
        });
        
        // Fallback: Generate a tikzpicture, not tikzcd, if we want exact positions
        output.pop();
        output.push('\\begin{tikzpicture}');
        spec.nodes.forEach((node: NodeSpec) => {
            // SVG coords (y down) to TikZ (y up). simple scale.
            const x = node.left / 50;
            const y = -node.top / 50;
            const label = (node.label || '').replace(/\$/g, '');
            output.push(`  \\node (${node.name}) at (${x.toFixed(2)}, ${y.toFixed(2)}) {$${label}$};`);
        });

        const arrowNames = new Set((spec.arrows || []).map(a => a.name).filter(Boolean));
        const arrowStrings = (spec.arrows || []).map(arrow => {
            const from = arrow.from;
            const to = arrow.to;
            const label = (arrow.label || '').replace(/\$/g, '');
            
            let options = [];
            if (arrow.style?.head?.name === 'epi') options.push('two heads');
            if (arrow.style?.head?.name === 'none') options.push('dash pattern=on 0pt off 1000pt'); // HACK
            if (arrow.style?.tail?.name === 'mono') options.push('tail'); 
            if (arrow.style?.body?.name === 'dashed') options.push('dashed');
            if (arrow.style?.body?.name === 'dotted') options.push('dotted');
            if (arrow.curve) options.push(`bend left=${arrow.curve}`);
            if (arrow.shift) options.push(`shift left=${arrow.shift / 10}pt`); // simplified

            const optStr = options.length > 0 ? `[${options.join(', ')}]` : '';
            return `  \\draw[->]${optStr} (${from}) to node {${label}} (${to});`;
        });
        
        output.push(...arrowStrings);
        output.push('\\end{tikzpicture}');

        return output.join('\n');
    } catch (e: any) {
        return `% Failed to export to TikZ: ${e.message}`;
    }
}