/**
 * Decodes a Quiver share URL into a JSON spec compatible with ArrowGram.
 * @param {string} url - The full URL from q.uiver.app, e.g., "https://q.uiver.app/#q=..."
 * @returns {string} - A stringified JSON object of the diagram spec.
 */
export function decodeQuiverUrl(url) {
  try {
    const fragment = new URL(url).hash;
    const base64String = new URLSearchParams(fragment.substring(1)).get("q");

    if (!base64String) {
      throw new Error("No 'q' parameter found in URL fragment.");
    }

    // Decode Base64 -> Byte Array -> UTF-8 String
    const decodedString = atob(base64String);
    const bytes = new Uint8Array(decodedString.length);
    for (let i = 0; i < decodedString.length; i++) {
      bytes[i] = decodedString.charCodeAt(i);
    }
    const jsonString = new TextDecoder().decode(bytes);

    // Parse the Quiver array format
    const quiverArray = JSON.parse(jsonString);
    const [version, vertexCount, ...cells] = quiverArray;

    const spec = {
      nodes: [],
      arrows: [],
    };

    const importedCells = [];

    // First pass: create nodes
    for (let i = 0; i < vertexCount; i++) {
      const cell = cells[i];
      const [x, y, label = ""] = cell;
      const nodeName = `Node${i}`; // Generate a unique name

      spec.nodes.push({
        name: nodeName,
        left: x * 150, // Scale grid coordinates to pixel coordinates
        top: y * 150,
        label: label,
      });
      importedCells.push({ type: "node", name: nodeName });
    }

    // Second pass: create arrows
    for (let i = vertexCount; i < cells.length; i++) {
      const cell = cells[i];
      const [sourceIdx, targetIdx, label = "", alignment, options = {}] = cell;

      const sourceNode = spec.nodes[sourceIdx];
      const targetNode = spec.nodes[targetIdx];

      if (sourceNode && targetNode) {
        spec.arrows.push({
          from: sourceNode.name,
          to: targetNode.name,
          label: label,
          curve: options.curve || 0,
          shift: options.offset || 0,
          // You can add more option translations here as you implement them
        });
      }
    }

    // Pretty-print the JSON output
    return JSON.stringify(spec, null, 4);
  } catch (error) {
    console.error("Failed to decode Quiver URL:", error);
    return `{"error": "Failed to decode URL. Please check the format."}`;
  }
}
