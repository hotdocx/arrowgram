import { computeDiagram, ComputedArrow, DiagramSpec, ArrowSpec, NodeSpec } from '@hotdocx/arrowgram';

// --- Constants & Configuration ---

const GRID_SCALE = 40;
// Quiver uses a curve factor where +/- 5 is a "standard" curve height.
// In pixels, this is roughly 5 * 25 = 125px height.
// Core logic now negates curve, so we use negative factor to align with Quiver's positive-is-left convention (or whatever Quiver uses).
// Quiver: +Curve = Left (CCW).
// Arrowgram (New Core): -Curve passed to Bezier.
// Bezier logic: standard math.
// So if AG curve is +50. Core negates to -50.
// If Quiver curve is +2. We want +50 in AG.
// +2 * -25 = -50.
// Let's stick to the previous -25 if we inverted the core.
const CURVE_SCALE_FACTOR = -25;
const LOOP_RADIUS_SCALE = 10;
const LOOP_ANGLE_OFFSET = -90; // Quiver 0 -> AG -90

// Mapping for EXPORT: Arrowgram (Key) -> Quiver (Value)
// Quiver: 0=Left, 1=Centre, 2=Right, 3=Over
// We reverted core logic, so AG "left" is now visually Left.
// Quiver "Left" is 0.
const QUIVER_LABEL_ALIGNMENT: Record<string, number> = {
  left: 0,
  centre: 1,
  right: 2,
  over: 3,
};

// Mapping for IMPORT: Quiver (Key) -> Arrowgram (Value)
const ARROWGRAM_LABEL_ALIGNMENT_MAP: Record<number, "left" | "right" | "over"> = {
  0: "left",  // Quiver Left -> AG Left
  1: "over",  // Fallback for Centre
  2: "right", // Quiver Right -> AG Right
  3: "over",
};

// Quiver style definitions
type QuiverHeadStyle = "none" | "normal" | "epi" | "mono" | "maps to" | "harpoon" | "hook" | "corner" | "corner-inverse";
type QuiverBodyStyle = "none" | "cell" | "dashed" | "dotted" | "squiggly" | "barred" | "double barred" | "bullet solid" | "bullet hollow";

// Mapping Arrowgram Head/Tail names to Quiver style arrays
const AG_TO_QUIVER_HEAD: Record<string, string[]> = {
  "none": [],
  "normal": ["epi"],
  "epi": ["epi", "epi"],
  "mono": ["mono"],
  "maps_to": ["maps to"],
  "hook": ["hook"], // needs side handling
  "harpoon": ["harpoon"], // needs side handling
  "corner": ["corner"],
  "corner_inverse": ["corner-inverse"]
};

const AG_TO_QUIVER_TAIL: Record<string, string[]> = {
  "none": [],
  "normal": [], // Quiver arrows don't usually have a tail for "normal", just the line start.
  "mono": ["mono"],
  "maps_to": ["maps to"],
  "hook": ["hook"], // needs side handling
};

const AG_TO_QUIVER_BODY: Record<string, string> = {
  "solid": "cell", // default line
  "dashed": "dashed",
  "dotted": "dotted",
  "squiggly": "squiggly",
  "wavy": "squiggly", // alias
  "barred": "barred",
  "double_barred": "double barred",
  "bullet_solid": "bullet solid",
  "bullet_hollow": "bullet hollow",
  "none": "none",
};

// Reverse Mapping (Quiver -> AG)
// We stringify the array to use as a key
function mapQuiverHeadToAG(
  headStack: string[]
): { name: "none" | "normal" | "epi" | "hook" | "maps_to" | "harpoon"; side?: "top" | "bottom" } {
  if (typeof headStack === "undefined") return { name: "normal" }; // Default is Arrow
  if (headStack.length === 0) return { name: "none" }; // Explicitly None
  const json = JSON.stringify(headStack);
  if (json === '["epi"]') return { name: "normal" };
  if (json === '["epi","epi"]') return { name: "epi" };
  if (json === '["mono"]') return { name: "normal" };
  if (json === '["maps to"]') return { name: "maps_to" };
  if (json === '["corner"]') return { name: "normal" }; // Mode handles corners, not head style

  // Complex cases
  const first = headStack[0];
  if (first.startsWith("harpoon")) {
    return { name: "harpoon", side: first.endsWith("top") ? "top" : "bottom" };
  }
  if (first.startsWith("hook")) {
    return { name: "hook", side: first.endsWith("top") ? "top" : "bottom" };
  }
  return { name: "normal" }; // Fallback
}

function mapQuiverTailToAG(
  tailStack: string[]
): { name: "none" | "normal" | "hook" | "maps_to" | "mono"; side?: "top" | "bottom" } {
  if (!tailStack || tailStack.length === 0) return { name: "none" };
  const json = JSON.stringify(tailStack);
  if (json === '["mono"]') return { name: "mono" };
  if (json === '["maps to"]') return { name: "maps_to" };

  const first = tailStack[0];
  if (first.startsWith("hook")) {
    return { name: "hook", side: first.endsWith("top") ? "top" : "bottom" };
  }
  return { name: "none" };
}

const QUIVER_TO_AG_BODY: Record<string, string> = {
  "cell": "solid",
  "dashed": "dashed",
  "dotted": "dotted",
  "squiggly": "squiggly",
  "barred": "barred",
  "double barred": "double_barred",
  "bullet solid": "bullet_solid",
  "bullet hollow": "bullet_hollow",
  "none": "none"
};


// --- Color Utilities ---

type HSLA = [number, number, number, number];

function hslaToCss(hsla: HSLA): string {
  // Quiver allows 3-element arrays (implicitly alpha=1)
  const h = hsla[0];
  const s = hsla[1];
  const l = hsla[2];
  const a = hsla[3] !== undefined ? hsla[3] : 1;
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

// Basic parser for CSS strings to HSLA for export.
// This is rudimentary. A full solution would use a library or canvas.
function cssToHsla(color: string): HSLA {
  if (!color) return [0, 0, 0, 1]; // Default black

  const c = color.trim().toLowerCase();

  if (c === "black") return [0, 0, 0, 1];
  if (c === "white") return [0, 0, 100, 1];
  if (c === "red") return [0, 100, 50, 1];
  if (c === "blue") return [240, 100, 50, 1];
  if (c === "green") return [120, 100, 50, 1];
  if (c === "transparent") return [0, 0, 0, 0];

  // Hex #RRGGBB
  if (c.startsWith("#")) {
    let hex = c.substring(1);
    if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return rgbToHsl(r, g, b);
  }

  // RGB/RGBA
  if (c.startsWith("rgb")) {
    const match = c.match(/[\d.]+/g);
    if (match && match.length >= 3) {
      const r = parseFloat(match[0]) / 255;
      const g = parseFloat(match[1]) / 255;
      const b = parseFloat(match[2]) / 255;
      const a = match.length > 3 ? parseFloat(match[3]) : 1;
      const [h, s, l] = rgbToHsl(r, g, b);
      return [h, s, l, a];
    }
  }

  // HSL/HSLA
  if (c.startsWith("hsl")) {
    const match = c.match(/[\d.]+/g);
    if (match && match.length >= 3) {
      const h = parseFloat(match[0]);
      const s = parseFloat(match[1]);
      const l = parseFloat(match[2]);
      const a = match.length > 3 ? parseFloat(match[3]) : 1;
      return [h, s, l, a];
    }
  }

  return [0, 0, 0, 1]; // Fallback
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100), 1];
}


// --- Import Logic ---

export function decodeQuiverUrl(url: string): DiagramSpec {
  try {
    const fragment = url.includes("#") ? url.substring(url.indexOf("#") + 1) : url;
    const qParam = fragment.split("&").find((p) => p.startsWith("q="));

    if (!qParam) {
      throw new Error("No 'q' parameter found in URL fragment.");
    }
    const base64String = qParam.substring(2);

    const decodedString = atob(base64String);
    const bytes = new Uint8Array(decodedString.length);
    for (let i = 0; i < decodedString.length; i++) {
      bytes[i] = decodedString.charCodeAt(i);
    }
    const jsonString = new TextDecoder().decode(bytes);
    const quiverArray = JSON.parse(jsonString);

    // Quiver format: [version, vertexCount, ...vertices, ...edges]
    const [_version, vertexCount, ...cells] = quiverArray;

    const spec: DiagramSpec = {
      version: 1,
      nodes: [],
      arrows: [],
    };

    const cellMap: any[] = []; // Maps Quiver index to Arrowgram name/type

    // 1. Parse Vertices
    for (let i = 0; i < vertexCount; i++) {
      const cell = cells[i];
      // Format: [x, y, label, color]
      const [x, y, label = "", color] = cell;
      const nodeName = `v${i}`;

      const node: NodeSpec = {
        name: nodeName,
        left: x * GRID_SCALE,
        top: y * GRID_SCALE,
        label: label ? `$${label}$` : "",
      };

      if (color && Array.isArray(color) && color.length >= 3) {
        // Check if not black [0,0,0,1]
        if (!(color[0] === 0 && color[2] === 0)) {
          node.color = hslaToCss(color as HSLA);
        }
      }

      spec.nodes.push(node);
      cellMap[i] = { name: nodeName, type: "node" };
    }

    // 2. Parse Edges
    for (let i = vertexCount; i < cells.length; i++) {
      const cell = cells[i];
      // Format: [source, target, ...params]
      // Params are variable length: [source, target, label?, alignment?, options?, label_colour?]
      // We parse dynamically.
      const sourceIdx = cell[0];
      const targetIdx = cell[1];

      const sourceName = cellMap[sourceIdx]?.name;
      const targetName = cellMap[targetIdx]?.name;

      if (sourceName && targetName) {
        const arrowName = `e${i - vertexCount}`;
        const arrow: ArrowSpec = {
          name: arrowName,
          from: sourceName,
          to: targetName,
          // Defaults
          label: "",
          label_alignment: "over",
        };

        // Re-parsing edge params dynamically
        let pIndex = 2;

        // 1. Label
        if (pIndex < cell.length && typeof cell[pIndex] === "string") {
          const lbl = cell[pIndex];
          if (lbl) arrow.label = `$${lbl}$`;
          pIndex++;
        }

        // 2. Alignment
        let pAlignment = 0; // Default 'left' (0) in Quiver
        if (pIndex < cell.length && typeof cell[pIndex] === "number") {
          pAlignment = cell[pIndex];
          pIndex++;
        }
        arrow.label_alignment = ARROWGRAM_LABEL_ALIGNMENT_MAP[pAlignment] || "over";

        // 3. Options
        let pOptions: any = {};
        if (pIndex < cell.length && typeof cell[pIndex] === "object" && !Array.isArray(cell[pIndex])) {
          pOptions = cell[pIndex];
          pIndex++;
        }

        // Geometry
        if (typeof pOptions.curve === "number") {
          arrow.curve = pOptions.curve * CURVE_SCALE_FACTOR;
        }
        if (typeof pOptions.offset === "number") {
          arrow.shift = pOptions.offset;
        }

        // Shorten / Length
        if (pOptions.shorten) {
          arrow.shorten = {
            source: pOptions.shorten.source,
            target: pOptions.shorten.target
          };
        } else if (typeof pOptions.length === "number") {
          const s = (100 - pOptions.length) / 2;
          arrow.shorten = { source: s, target: s };
        }

        // Loops
        if (sourceIdx === targetIdx) {
          // Set defaults for loops if missing, then apply scaling/offset
          const qRadius = typeof pOptions.radius === "number" ? pOptions.radius : 3;
          const qAngle = typeof pOptions.angle === "number" ? pOptions.angle : 0;
          // Radius: Invert sign AND scale (User mandate: "minus exchanged with plus")
          arrow.radius = -1 * qRadius * LOOP_RADIUS_SCALE;
          arrow.angle = qAngle + LOOP_ANGLE_OFFSET;
        } else {
          if (typeof pOptions.radius === "number") arrow.radius = pOptions.radius * LOOP_RADIUS_SCALE;
          if (typeof pOptions.angle === "number") arrow.angle = pOptions.angle + LOOP_ANGLE_OFFSET;
        }

        // Style
        arrow.style = {
          level: pOptions.level || 1,
        };

        // Map styles
        const qStyle = pOptions.style || {};

        // Mode (Adjunction / Corner)
        if (qStyle.name === "adjunction") {
          arrow.style.mode = "adjunction";
        } else if (qStyle.name === "corner") {
          arrow.style.mode = "corner";
        } else if (qStyle.name === "corner-inverse") {
          arrow.style.mode = "corner_inverse";
        }

        // Head/Tail/Body
        const headData = mapQuiverHeadToAG(qStyle.heads);
        if (headData.name !== "normal") {
          arrow.style.head = headData;
        }

        const tailData = mapQuiverTailToAG(qStyle.tails);
        if (tailData.name !== "none") {
          arrow.style.tail = tailData;
        }

        const bodyName = qStyle.body?.name ? QUIVER_TO_AG_BODY[qStyle.body.name] : null;
        if (bodyName && bodyName !== "solid") {
          // @ts-ignore
          arrow.style.body = { name: bodyName };
        } else if (qStyle.dash_style) {
          // Fallback for older dash style format
          if (qStyle.dash_style === "dashed") arrow.style.body = { name: "dashed" };
          if (qStyle.dash_style === "dotted") arrow.style.body = { name: "dotted" };
        }

        // Arrow Colors
        if (typeof pOptions.colour !== "undefined") {
          const ac = pOptions.colour;
          if (Array.isArray(ac)) arrow.color = hslaToCss(ac as HSLA);
        }

        // 4. Label Color (Last element)
        if (pIndex < cell.length && Array.isArray(cell[pIndex])) {
          arrow.label_color = hslaToCss(cell[pIndex] as HSLA);
        }

        if (spec.arrows) spec.arrows.push(arrow);
        else spec.arrows = [arrow];
        cellMap[i] = { name: arrowName, type: "arrow" };
      }
    }

    return spec;
  } catch (error) {
    console.error("Failed to decode Quiver URL:", error);
    throw new Error("Failed to decode URL. Please check the format.");
  }
}


// --- Export Logic ---

export function encodeArrowgram(spec: DiagramSpec) {
  try {
    const vertices: any[] = [];
    const edges: any[] = [];
    const nameMap = new Map();

    // 1. Encode Vertices
    spec.nodes.forEach((node: NodeSpec, index: number) => {
      const quiverVertex: any[] = [
        Math.round(node.left / GRID_SCALE),
        Math.round(node.top / GRID_SCALE),
      ];
      // Label
      if (node.label) {
        let lbl = node.label;
        if (lbl.startsWith('$') && lbl.endsWith('$')) {
          lbl = lbl.slice(1, -1);
        }
        quiverVertex.push(lbl);
      }
      // Color
      if (node.color) {
        if (node.label) {
          quiverVertex.push(cssToHsla(node.color));
        }
      }
      vertices.push(quiverVertex);
      nameMap.set(node.name, index);
    });

    // 2. Compute Diagram to get valid edges and lengths
    // This resolves dependencies and gives us arc lengths for shortening
    const computed = computeDiagram(spec);

    // Register edge IDs based on computed arrows order
    let edgeIndexBase = vertices.length;
    // We map using ID (spec.name)
    computed.arrows.forEach((cArrow: ComputedArrow, index: number) => {
      // Use the ID from the computed arrow (which matches spec name if present)
      // computedArrow.arrow.key is the ID
      nameMap.set(cArrow.spec.name || cArrow.key, edgeIndexBase + index);
    });

    // 3. Encode Edges (using Computed Arrows)
    // We iterate spec.arrows to preserve user intent, but look up computed data
    // Or we iterate computed.arrows to ensure validity. 
    // Computed arrows are better because they are guaranteed to be valid and sorted by dependency.
    computed.arrows.forEach((cArrow: ComputedArrow) => {
      const arrow = cArrow.spec; // The ArrowSpec
      const sourceIndex = nameMap.get(arrow.from);
      const targetIndex = nameMap.get(arrow.to);

      if (sourceIndex === undefined || targetIndex === undefined) return;

      const quiverEdge: any[] = [sourceIndex, targetIndex];

      // Calculate Options Delta
      const options: any = {};
      const style: any = {};

      // Geometry
      if (arrow.curve) options.curve = Math.round(arrow.curve / CURVE_SCALE_FACTOR);
      if (arrow.shift) options.offset = arrow.shift;
      if (arrow.style?.level && arrow.style.level > 1) options.level = arrow.style.level;

      // Shorten: Convert Pixels to Percentage
      if (arrow.shorten && cArrow.arcLength > 0) {
        const sourcePct = (arrow.shorten.source || 0) / cArrow.arcLength * 100;
        const targetPct = (arrow.shorten.target || 0) / cArrow.arcLength * 100;

        if (sourcePct > 0 || targetPct > 0) {
          options.shorten = {
            source: Math.round(sourcePct),
            target: Math.round(targetPct)
          };
        }
      }

      const isLoop = sourceIndex === targetIndex;
      if (arrow.radius) {
        const scaledRadius = arrow.radius / LOOP_RADIUS_SCALE;
        // Invert sign for loops (User mandate)
        const qRadius = isLoop ? -1 * scaledRadius : scaledRadius;
        if (!isLoop || qRadius !== 3) options.radius = qRadius;
      }
      if (typeof arrow.angle === "number") {
        const qAngle = arrow.angle - LOOP_ANGLE_OFFSET;
        if (!isLoop || qAngle !== 0) options.angle = qAngle;
      }

      // Color (Arrow color)
      if (arrow.color) {
        options.colour = cssToHsla(arrow.color);
      }

      // Styles
      const agStyle = arrow.style || {};

      // Mode overrides style names
      if (agStyle.mode === "adjunction") style.name = "adjunction";
      else if (agStyle.mode === "corner") style.name = "corner";
      else if (agStyle.mode === "corner_inverse") style.name = "corner-inverse";
      else style.name = "arrow";

      if (agStyle.head?.name && agStyle.head.name !== "normal") {
        const list = AG_TO_QUIVER_HEAD[agStyle.head.name];
        if (list) {
          style.heads = [...list];
          // Handle side
          if (agStyle.head.side && (agStyle.head.name === "harpoon" || agStyle.head.name === "hook")) {
            style.heads[0] += agStyle.head.side === "top" ? "-top" : "-bottom";
          }
        }
      }

      if (agStyle.tail?.name && agStyle.tail.name !== "none") {
        const list = AG_TO_QUIVER_TAIL[agStyle.tail.name];
        if (list) {
          style.tails = [...list];
          if (agStyle.tail.side && agStyle.tail.name === "hook") {
            style.tails[0] += agStyle.tail.side === "top" ? "-top" : "-bottom";
          }
        }
      }

      if (agStyle.body?.name && agStyle.body.name !== "solid") {
        style.body = { name: AG_TO_QUIVER_BODY[agStyle.body.name] || "cell" };
      }

      if (Object.keys(style).length > 0) {
        // If style name is arrow (default), delete it to save space if no other props
        if (style.name === "arrow" && Object.keys(style).length === 1) {
          // empty
        } else {
          options.style = style;
        }
      }

      // Construct Edge Array
      let label = "";
      if (arrow.label) {
        label = arrow.label;
        if (label.startsWith('$') && label.endsWith('$')) {
          label = label.slice(1, -1);
        }
      }
      const alignment = QUIVER_LABEL_ALIGNMENT[arrow.label_alignment || 'over'];
      const hasOptions = Object.keys(options).length > 0;
      const hasAlignment = alignment !== QUIVER_LABEL_ALIGNMENT.over; // 3 is default

      // Push logic: We must push if a later element is present
      const labelColor = arrow.label_color ? cssToHsla(arrow.label_color) : null;

      const pushLabel = label !== "" || hasAlignment || hasOptions || labelColor;
      const pushAlign = hasAlignment || hasOptions || labelColor;
      const pushOpts = hasOptions || labelColor;
      const pushColor = !!labelColor;

      if (pushLabel) quiverEdge.push(label);
      if (pushAlign) quiverEdge.push(alignment);
      if (pushOpts) quiverEdge.push(options);
      if (pushColor) quiverEdge.push(labelColor);

      edges.push(quiverEdge);
    });

    const quiverArray = [0, vertices.length, ...vertices, ...edges];
    const jsonString = JSON.stringify(quiverArray);
    const uint8Array = new TextEncoder().encode(jsonString);
    const charString = String.fromCharCode.apply(null, Array.from(uint8Array));
    return btoa(charString);

  } catch (error) {
    console.error("Failed to encode Arrowgram spec:", error);
    throw new Error("Failed to encode spec.");
  }
}
