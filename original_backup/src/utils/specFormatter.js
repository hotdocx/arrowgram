// src/utils/specFormatter.js

function stringifyObjectInline(obj) {
    // A preferred key order for consistent output
    const keyOrder = ['name', 'label', 'from', 'to', 'left', 'top', 'curve', 'shift', 'label_alignment', 'level', 'style', 'body', 'head', 'tail'];
    
    // Filter out undefined values, which JSON.stringify would omit anyway
    const definedEntries = Object.entries(obj).filter(([, value]) => value !== undefined);

    // Sort keys for consistent output
    definedEntries.sort(([keyA], [keyB]) => {
        const indexA = keyOrder.indexOf(keyA);
        const indexB = keyOrder.indexOf(keyB);
        if (indexA === -1 && indexB === -1) return keyA.localeCompare(keyB); // alphabetical for unknown keys
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const pairs = definedEntries.map(([key, value]) => {
        // Recurse for nested objects (like the 'style' object)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return `"${key}": ${stringifyObjectInline(value)}`;
        }
        // Use JSON.stringify for primitives, arrays, and null
        return `"${key}": ${JSON.stringify(value)}`;
    });
    return `{ ${pairs.join(', ')} }`;
}

export function formatSpec(specObject) {
  if (!specObject) {
    return '{}';
  }

  // For empty specs, a simple format is fine.
  if ((!specObject.nodes || specObject.nodes.length === 0) &&
      (!specObject.arrows || specObject.arrows.length === 0)) {
    return JSON.stringify(specObject, null, 2);
  }

  const nodesString = (specObject.nodes || [])
    .map(n => `    ${stringifyObjectInline(n)}`)
    .join(',\n');
  
  const arrowsString = (specObject.arrows || [])
    .map(a => `    ${stringifyObjectInline(a)}`)
    .join(',\n');

  const parts = [];
  if (specObject.nodes && specObject.nodes.length > 0) {
    parts.push(`  "nodes": [\n${nodesString}\n  ]`);
  }
  if (specObject.arrows && specObject.arrows.length > 0) {
    parts.push(`  "arrows": [\n${arrowsString}\n  ]`);
  }
  
  return `{\n${parts.join(',\n')}\n}`;
} 