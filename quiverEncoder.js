/**
 * Translates a user-friendly diagram spec into Quiver's internal array format,
 * precisely matching the official implementation.
 * @param {object} spec - The diagram spec with `nodes` and `arrows` properties.
 * @returns {Array} - The diagram in Quiver's compact array format.
 */
function translateSpecToQuiverArray(spec) {
  const vertices = []; // This will hold the node data arrays
  const edges = []; // This will hold the arrow data arrays
  const nodeIndexMap = new Map();

  // 1. Process Nodes (Vertices)
  spec.nodes.forEach((node, index) => {
    // Start with the required position: [x, y]
    const quiverVertex = [node.left || 0, node.top || 0];

    // Only add the label to the array if it's not empty.
    if (node.label && node.label !== "") {
      quiverVertex.push(node.label);
    }

    vertices.push(quiverVertex);
    nodeIndexMap.set(node.name, index);
  });

  // 2. Process Arrows (Edges)
  spec.arrows.forEach((arrow) => {
    const sourceIndex = nodeIndexMap.get(arrow.from);
    const targetIndex = nodeIndexMap.get(arrow.to);

    if (sourceIndex === undefined || targetIndex === undefined) {
      console.warn("Skipping arrow with missing nodes:", arrow);
      return;
    }

    // Start with the required indices: [source_index, target_index]
    const quiverEdge = [sourceIndex, targetIndex];

    // Only add the label if it's not empty.
    if (arrow.label && arrow.label !== "") {
      quiverEdge.push(arrow.label);
    }

    edges.push(quiverEdge);
  });

  // THE FINAL, CORRECT FIX: The array must start with the version (0) and the vertex count.
  const VERSION = 0;
  const output = [VERSION, vertices.length, ...vertices, ...edges];

  return output;
}

/**
 * Takes a user-friendly diagram spec, translates it, and encodes it
 * into the Base64 string that q.uiver.app expects.
 * @param {string} specString - The JSON string for the diagram.
 * @returns {string} - The correctly encoded Base64 string.
 */
export function generateQuiverDataString(specString) {
  try {
    const spec = JSON.parse(specString);
    const quiverArray = translateSpecToQuiverArray(spec);

    const jsonString = JSON.stringify(quiverArray);

    // This is the precise encoding method from the quiver.mjs source code.
    const uint8Array = new TextEncoder().encode(jsonString);
    const charString = String.fromCharCode.apply(null, uint8Array);
    const base64String = btoa(charString);

    return base64String;
  } catch (error) {
    console.error("Failed to encode Quiver spec:", error);
    return null;
  }
}
