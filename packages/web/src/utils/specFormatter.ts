import { DiagramSpec, NodeSpec, ArrowSpec } from '@hotdocx/arrowgram';

function stringifyObjectInline(obj: Record<string, any>): string {
  const keyOrder = ['name', 'label', 'from', 'to', 'left', 'top', 'curve', 'shift', 'label_alignment', 'level', 'style', 'body', 'head', 'tail'];

  const definedEntries = Object.entries(obj).filter(([, value]) => value !== undefined);

  definedEntries.sort(([keyA], [keyB]) => {
    const indexA = keyOrder.indexOf(keyA);
    const indexB = keyOrder.indexOf(keyB);
    if (indexA === -1 && indexB === -1) return keyA.localeCompare(keyB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const pairs = definedEntries.map(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return `"${key}": ${stringifyObjectInline(value)}`;
    }
    return `"${key}": ${JSON.stringify(value)}`;
  });
  return `{ ${pairs.join(', ')} }`;
}

export function formatSpec(specObject: Partial<DiagramSpec>): string {
  if (!specObject) {
    return '{}';
  }

  // Ensure version is present, default to 1
  const version = specObject.version || 1;

  if ((!specObject.nodes || specObject.nodes.length === 0) &&
    (!specObject.arrows || specObject.arrows.length === 0)) {
    return JSON.stringify({ ...specObject, version }, null, 2);
  }

  const nodesString = (specObject.nodes || [])
    .map((n: NodeSpec) => `    ${stringifyObjectInline(n as any)}`)
    .join(',\n');

  const arrowsString = (specObject.arrows || [])
    .map((a: ArrowSpec) => `    ${stringifyObjectInline(a as any)}`)
    .join(',\n');

  const parts = [];
  parts.push(`  "version": ${version}`);
  if (specObject.nodes && specObject.nodes.length > 0) {
    parts.push(`  "nodes": [\n${nodesString}\n  ]`);
  }
  if (specObject.arrows && specObject.arrows.length > 0) {
    parts.push(`  "arrows": [\n${arrowsString}\n  ]`);
  }

  return `{\n${parts.join(',\n')}\n}`;
}
