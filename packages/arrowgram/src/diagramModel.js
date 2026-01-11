const NODE_RADIUS = 25;
const FONT_SIZE = 16;
const ARROW_COLOR = "#333333";
const STROKE_WIDTH = 1.5;
const LINE_SPACING = 5;
const ARROW_HEAD_SIZE = 10;
const PADDING = 60;
const LABEL_LINE_GAP = 15;
const EPI_AXIAL_SPACING = 6;

function renderArrowPart(type, pos, tangentAngle, placement, customSize) {
  if (!type || type.toLowerCase() === "none") return [];

  const size = customSize || ARROW_HEAD_SIZE;
  const angleDeg = (tangentAngle * 180) / Math.PI;
  const commonProps = {
    fill: "none",
    stroke: ARROW_COLOR,
    strokeWidth: STROKE_WIDTH,
    strokeLinecap: "round",
  };
  const d_normal = `M 0 0 L -${size} ${-size / 2} M 0 0 L -${size} ${size / 2}`;

  switch (type.toLowerCase()) {
    case "epi":
      const head1_pos = pos;
      const head2_pos = {
        x: pos.x - EPI_AXIAL_SPACING * Math.cos(tangentAngle),
        y: pos.y - EPI_AXIAL_SPACING * Math.sin(tangentAngle),
      };
      return [
        {
          props: {
            ...commonProps,
            d: d_normal,
            transform: `translate(${head1_pos.x} ${head1_pos.y}) rotate(${angleDeg})`,
          },
        },
        {
          props: {
            ...commonProps,
            d: d_normal,
            transform: `translate(${head2_pos.x} ${head2_pos.y}) rotate(${angleDeg})`,
          },
        },
      ];
    case "mono":
      if (placement === "tail") {
        return [
          {
            props: {
              ...commonProps,
              d: d_normal,
              transform: `translate(${pos.x} ${pos.y}) rotate(${angleDeg})`,
            },
          },
        ];
      }
      return [];
    default: // normal
      return [
        {
          props: {
            ...commonProps,
            d: d_normal,
            transform: `translate(${pos.x} ${pos.y}) rotate(${angleDeg})`,
          },
        },
      ];
  }
}


function createLoopArrowModel(spec, node, key) {
  const { radius = 40, angle = 45, label } = spec;
  const radAngle = (angle * Math.PI) / 180;

  const center = { x: node.left, y: node.top };
  // The loop center is offset from the node center
  const loopCenter = Vec2.add(center, {
    x: radius * Math.cos(radAngle),
    y: radius * Math.sin(radAngle),
  });

  // Calculate intersection points with the node circle (NODE_RADIUS)
  // Distance from loop center to node center
  const d = Vec2.dist(center, loopCenter);

  // Intersection of two circles: Loop circle (radius) and Node circle (NODE_RADIUS)
  // We want the intersection points p3 (start) and p3' (end)
  // The radical axis is perpendicular to the line connecting centers.

  // 'a' is distance from loopCenter to the radical axis intersection
  const a = (radius ** 2 - NODE_RADIUS ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, radius ** 2 - a ** 2));

  // Point P2 on the line connecting centers
  const p2 = {
    x: loopCenter.x + a * (center.x - loopCenter.x) / d,
    y: loopCenter.y + a * (center.y - loopCenter.y) / d
  };

  const startPoint = {
    x: p2.x + h * (center.y - loopCenter.y) / d,
    y: p2.y - h * (center.x - loopCenter.x) / d
  };
  const endPoint = {
    x: p2.x - h * (center.y - loopCenter.y) / d,
    y: p2.y + h * (center.x - loopCenter.x) / d
  };

  // Improved Large Arc Flag logic
  // For standard loops attached to a node, we usually want the "outer" arc (large arc)
  // The SVG arc command: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const pathData = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 1 0 ${endPoint.x} ${endPoint.y}`;

  // Tangent at endPoint for the arrowhead
  // The tangent to a circle at a point is perpendicular to the radius at that point.
  // Radius vector: endPoint - loopCenter
  const radiusVec = Vec2.sub(endPoint, loopCenter);
  const tangentAngle = Vec2.angle(radiusVec) - Math.PI / 2;

  const heads = renderArrowPart("normal", endPoint, tangentAngle, "head");

  // Label Position: On the far side of the loop
  // Vector from node center to loop center, extended
  const labelDist = radius + LABEL_LINE_GAP;
  const labelPos = Vec2.add(center, {
    x: (radius + labelDist) * Math.cos(radAngle), // Approx, actually dist is node_rad + ...
    y: (radius + labelDist) * Math.sin(radAngle)
  });
  // More accurate label pos: loopCenter + (radius + gap) * direction(loopCenter - nodeCenter)
  const dir = Vec2.norm(Vec2.sub(loopCenter, center));
  const finalLabelPos = Vec2.add(loopCenter, Vec2.mul(dir, radius + LABEL_LINE_GAP));


  return {
    key,
    spec,
    paths: [
      {
        d: pathData,
        fill: "none",
        stroke: ARROW_COLOR,
        strokeWidth: STROKE_WIDTH,
      },
    ],
    label: {
      text: label,
      props: {
        x: finalLabelPos.x,
        y: finalLabelPos.y,
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: FONT_SIZE,
      },
    },
    heads,
    tail: [],
    midpoint: loopCenter,
  };
}

import { Vec2 } from './geometry.js';

function createStandardArrowModel(
  spec,
  fromNode,
  toNode,
  key,
  fromRadius = NODE_RADIUS,
  toRadius = NODE_RADIUS
) {
  const defaultStyle = {
    head: { name: "normal" },
    tail: { name: "none" },
    body: { name: "solid" },
  };
  const mergedStyle = {
    ...defaultStyle,
    ...spec.style,
    head: { ...defaultStyle.head, ...spec.style?.head },
    tail: { ...defaultStyle.tail, ...spec.style?.tail },
    body: { ...defaultStyle.body, ...spec.style?.body },
  };

  // Fix inconsistent mono tail rule
  if (mergedStyle.tail.name.toLowerCase() === "mono" && !spec.style?.head?.name) {
    mergedStyle.head.name = "normal";
  }

  const { shift = 0, curve = 0, label_alignment = "over", label } = spec;
  const { head: headStyle, tail: tailStyle, body: bodyStyle, level = 1 } = mergedStyle;

  const start = { x: fromNode.left, y: fromNode.top };
  const end = { x: toNode.left, y: toNode.top };

  const rawVec = Vec2.sub(end, start);
  // Default to right if nodes are on top of each other
  const angle = Vec2.mag(rawVec) < 0.1 ? 0 : Vec2.angle(rawVec);
  const perp = { x: -Math.sin(angle), y: Math.cos(angle) };

  // Calculate base line endpoints with shift
  const shiftOffset = Vec2.mul(perp, shift);
  const lineStart = Vec2.add(start, shiftOffset);
  const lineEnd = Vec2.add(end, shiftOffset);

  // Initial geometric endpoints (at node boundaries)
  const dir = Vec2.norm(rawVec);
  const finalTailPos = Vec2.add(lineStart, Vec2.mul(dir, fromRadius));
  const finalHeadPos = Vec2.sub(lineEnd, Vec2.mul(dir, toRadius));

  // Determine Control Point for Quadratic Bezier
  const midBase = Vec2.mul(Vec2.add(finalTailPos, finalHeadPos), 0.5);
  // Curve is offset perpendicular to the line between the *visual* endpoints
  const finalVec = Vec2.sub(finalHeadPos, finalTailPos);
  const finalLen = Vec2.mag(finalVec);
  const finalAngle = Vec2.angle(finalVec);
  const finalPerp = { x: -Math.sin(finalAngle), y: Math.cos(finalAngle) };

  const controlPoint = Vec2.add(midBase, Vec2.mul(finalPerp, curve));

  // Tangents happen at the visual endpoints
  const tailTangentAngle = curve === 0 ? angle : Vec2.angle(Vec2.sub(controlPoint, finalTailPos));
  const headTangentAngle = curve === 0 ? angle : Vec2.angle(Vec2.sub(finalHeadPos, controlPoint));

  // Perpendicular to the *chord* for parallel lines (higher order arrows)
  // For straight lines, independent of curve, parallel copies are orthogonal to the straight chord.
  // For curved lines, this is an approximation. A true offset curve is complex.
  // We will offset along the perpendicular of the chord connecting tail and head.
  // This usually looks correct for commutative diagrams.
  const chordPerpAngle = Vec2.angle(finalVec) - Math.PI / 2;
  const chordPerp = { x: Math.cos(chordPerpAngle), y: Math.sin(chordPerpAngle) };

  const paths = [];

  const pathEndpoints = [];
  for (let i = 0; i < level; i++) {
    const levelOffset = level > 1 ? (i - (level - 1) / 2) * LINE_SPACING : 0;
    const levelVec = Vec2.mul(chordPerp, levelOffset);

    const currentTail = Vec2.add(finalTailPos, levelVec);
    const currentHead = Vec2.add(finalHeadPos, levelVec);
    pathEndpoints.push({ tail: currentTail, head: currentHead });

    let d;
    if (Math.abs(curve) < 1) { // Treat as straight line
      d = `M ${currentTail.x} ${currentTail.y} L ${currentHead.x} ${currentHead.y}`;
    } else {
      const currentControl = Vec2.add(controlPoint, levelVec);
      d = `M ${currentTail.x} ${currentTail.y} Q ${currentControl.x} ${currentControl.y} ${currentHead.x} ${currentHead.y}`;
    }

    paths.push({
      d,
      fill: "none",
      stroke: ARROW_COLOR,
      strokeWidth: STROKE_WIDTH,
      strokeDasharray: bodyStyle.name === "dashed" ? "8 6" : bodyStyle.name === "dotted" ? "2 5" : "none",
    });
  }

  // Calculate positions for heads/tails markers
  // If multiple lines (level > 1), marker goes on the "middle" conceptual line
  // We use the first and last paths to find the center
  const markerHeadBase = level > 1
    ? Vec2.mul(Vec2.add(pathEndpoints[0].head, pathEndpoints[level - 1].head), 0.5)
    : finalHeadPos;

  const markerTailBase = level > 1
    ? Vec2.mul(Vec2.add(pathEndpoints[0].tail, pathEndpoints[level - 1].tail), 0.5)
    : finalTailPos;

  // Render Markers
  const markerSize = level > 1 ? ARROW_HEAD_SIZE * 1.5 : ARROW_HEAD_SIZE;
  // Offset markers slightly inwardly if multiple lines, to avoid visual gap
  const forwardOffset = level > 1 ? markerSize / 3 : 0;

  const markerHeadPos = Vec2.add(markerHeadBase, Vec2.mul({ x: Math.cos(headTangentAngle), y: Math.sin(headTangentAngle) }, forwardOffset));
  const markerTailPos = Vec2.add(markerTailBase, Vec2.mul({ x: Math.cos(tailTangentAngle), y: Math.sin(tailTangentAngle) }, forwardOffset));

  const heads = renderArrowPart(headStyle.name, markerHeadPos, headTangentAngle, "head", markerSize);
  const tail = renderArrowPart(tailStyle.name, markerTailPos, tailTangentAngle, "tail", markerSize);

  // Label Positioning
  // For quadratic bezier, midpoint is at t=0.5: (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  // t=0.5 -> 0.25 P0 + 0.5 P1 + 0.25 P2
  const midpoint = {
    x: 0.25 * finalTailPos.x + 0.5 * controlPoint.x + 0.25 * finalHeadPos.x,
    y: 0.25 * finalTailPos.y + 0.5 * controlPoint.y + 0.25 * finalHeadPos.y,
  };

  // Calculate normal at midpoint for label offset
  // P'(t) = 2(1-t)(P1-P0) + 2t(P2-P1). At t=0.5: (P1-P0) + (P2-P1) = P2-P0
  // So tangent is parallel to the chord!
  const midTangentAngle = Vec2.angle(Vec2.sub(finalHeadPos, finalTailPos));
  const midPerpAngle = midTangentAngle - Math.PI / 2;

  let labelPos = { ...midpoint };
  if (label_alignment === "left" || label_alignment === "right") {
    const side = label_alignment === "left" ? -1 : 1;
    // If curve is large, we might want to push the label further out? 
    // For now, static gap is consistent with quiver.
    labelPos.x += side * LABEL_LINE_GAP * Math.cos(midPerpAngle);
    labelPos.y += side * LABEL_LINE_GAP * Math.sin(midPerpAngle);
  }

  return {
    key,
    spec,
    paths,
    label: {
      text: label,
      props: {
        x: labelPos.x,
        y: labelPos.y,
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: FONT_SIZE,
      },
    },
    heads,
    tail,
    midpoint,
  };
}

export function computeDiagram(specString) {
  try {
    const spec = JSON.parse(specString);
    if (!spec.nodes || spec.nodes.length === 0) {
      return { nodes: [], arrows: [], viewBox: "0 0 100 100" };
    }

    const getEndpointRadius = (endpointInfo) => {
      if (endpointInfo.isNode) {
        return NODE_RADIUS;
      }
      if (!endpointInfo.spec) return 0;

      const level = endpointInfo.spec.style?.level || 1;
      const thickness = (level - 1) * LINE_SPACING + STROKE_WIDTH;
      const PADDING_FOR_ARROW_ENDPOINT = 8;
      return thickness / 2 + PADDING_FOR_ARROW_ENDPOINT;
    };

    const endpointInfo = new Map(
      spec.nodes.map((node) => [
        node.name,
        {
          pos: { x: node.left, y: node.top },
          level: 0,
          isNode: true,
          spec: node,
        },
      ])
    );

    const arrowSpecs = (spec.arrows || []).map((a, i) => ({
      ...a,
      uniqueId: a.name || `_arrow_${i}`,
    }));

    const arrows = [];
    const unresolvedArrowSpecs = new Set(arrowSpecs);
    let changedInIteration = true;
    const maxIterations = arrowSpecs.length + 1;
    let currentIteration = 0;

    while (unresolvedArrowSpecs.size > 0 && changedInIteration) {
      if (currentIteration++ > maxIterations) {
        const unresolvedNames = [...unresolvedArrowSpecs]
          .map((spec) => spec.name || spec.uniqueId)
          .join(", ");
        throw new Error(
          `Could not resolve dependencies for arrows: ${unresolvedNames}. Check for cycles or missing names.`
        );
      }

      changedInIteration = false;
      for (const arrowSpec of unresolvedArrowSpecs) {
        const fromInfo = endpointInfo.get(arrowSpec.from);
        const toInfo = endpointInfo.get(arrowSpec.to);

        if (fromInfo && toInfo) {
          const level = Math.max(fromInfo.level, toInfo.level) + 1;

          const fromNodeLike = { left: fromInfo.pos.x, top: fromInfo.pos.y };
          const toNodeLike = { left: toInfo.pos.x, top: toInfo.pos.y };
          const key = `${arrowSpec.from}-${arrowSpec.to}-${arrowSpec.uniqueId}`;

          let model;
          if (arrowSpec.from === arrowSpec.to) {
            model = createLoopArrowModel(arrowSpec, fromNodeLike, key);
          } else {
            const fromRadius = getEndpointRadius(fromInfo);
            const toRadius = getEndpointRadius(toInfo);
            model = createStandardArrowModel(
              arrowSpec,
              fromNodeLike,
              toNodeLike,
              key,
              fromRadius,
              toRadius
            );
          }
          arrows.push(model);

          if (arrowSpec.name) {
            endpointInfo.set(arrowSpec.name, {
              pos: model.midpoint,
              level: level,
              isNode: false,
              spec: arrowSpec,
            });
          }

          unresolvedArrowSpecs.delete(arrowSpec);
          changedInIteration = true;
        }
      }
    }

    const allCoords = [...endpointInfo.values()].map((info) => ({
      x: info.pos.x,
      y: info.pos.y,
    }));
    spec.arrows?.forEach((a) => {
      if (a.from === a.to && endpointInfo.has(a.from)) {
        const nodeInfo = endpointInfo.get(a.from);
        const radAngle = (a.angle || 45) * (Math.PI / 180);
        const radius = a.radius || 40;
        allCoords.push({
          x: nodeInfo.pos.x + radius * Math.cos(radAngle),
          y: nodeInfo.pos.y + radius * Math.sin(radAngle),
        });
        allCoords.push({
          x: nodeInfo.pos.x - radius * Math.cos(radAngle),
          y: nodeInfo.pos.y - radius * Math.sin(radAngle),
        });
      }
    });

    const xs = allCoords.map((p) => p.x);
    const ys = allCoords.map((p) => p.y);
    const viewBox = [
      Math.min(...xs) - PADDING,
      Math.min(...ys) - PADDING,
      Math.max(...xs) - Math.min(...xs) + 2 * PADDING,
      Math.max(...ys) - Math.min(...ys) + 2 * PADDING,
    ].join(" ");

    return { nodes: spec.nodes, arrows, viewBox, error: null };
  } catch (e) {
    console.error("Error parsing Arrowgram spec:", e);
    return {
      nodes: [],
      arrows: [],
      viewBox: "0 0 100 100",
      error: e.message,
    };
  }
}