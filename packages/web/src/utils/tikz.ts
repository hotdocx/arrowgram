import { DiagramSpec, NodeSpec } from 'arrowgram';

const COORD_CLUSTER_THRESHOLD = 5;

function clusterCoords(coords: number[]) {
    if (coords.length === 0) return new Map<number, number>();
    const sorted = [...new Set(coords)].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];
    
    for (let i = 1; i < sorted.length; i++) {
        const currentCluster = clusters[clusters.length - 1];
        if (sorted[i] - currentCluster[currentCluster.length - 1] < COORD_CLUSTER_THRESHOLD) {
            currentCluster.push(sorted[i]);
        } else {
            clusters.push([sorted[i]]);
        }
    }
    
    const mapping = new Map<number, number>();
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
        
        const output: string[] = [];
        output.push('\\begin{tikzpicture}');
        spec.nodes.forEach((node: NodeSpec) => {
            const x = (xMap.get(node.left) || node.left) / 50;
            const y = -(yMap.get(node.top) || node.top) / 50;
            const label = (node.label || '').replace(/\\$/g, '');
            output.push(`  \\node (${node.name}) at (${x.toFixed(2)}, ${y.toFixed(2)}) {${label}$};
`);
        });

        (spec.arrows || []).forEach(arrow => {
            const from = arrow.from;
            const to = arrow.to;
            const label = (arrow.label || '').replace(/\\$/g, '');
            
            const options: string[] = [];
            if (arrow.style?.head?.name === 'epi') options.push('two heads');
            if (arrow.style?.head?.name === 'none') options.push('dash pattern=on 0pt off 1000pt'); 
            if (arrow.style?.tail?.name === 'mono') options.push('tail'); 
            if (arrow.style?.body?.name === 'dashed') options.push('dashed');
            if (arrow.style?.body?.name === 'dotted') options.push('dotted');
            if (arrow.curve) options.push(`bend left=${arrow.curve}`);
            if (arrow.shift) options.push(`shift left=${arrow.shift / 10}pt`); 

            const optStr = options.length > 0 ? `[${options.join(', ')}]` : '';
            output.push(`  \\draw[->]${optStr} (${from}) to node {${label}} (${to});`);
        });
        
        output.push('\\end{tikzpicture}');

        return output.join('\n');
    } catch (e: any) {
        return `% Failed to export to TikZ: ${e.message}`;
    }
}
