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
  const radAngle = angle * (Math.PI / 180);

  const loopCenter = {
    x: node.left + radius * Math.cos(radAngle),
    y: node.top + radius * Math.sin(radAngle),
  };

  const d = Math.sqrt(
    (node.left - loopCenter.x) ** 2 + (node.top - loopCenter.y) ** 2
  );
  const a = (radius ** 2 - NODE_RADIUS ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, radius ** 2 - a ** 2));
  const p2 = {
    x: loopCenter.x + (a * (node.left - loopCenter.x)) / d,
    y: loopCenter.y + (a * (node.top - loopCenter.y)) / d,
  };

  const startPoint = {
    x: p2.x + (h * (node.top - loopCenter.y)) / d,
    y: p2.y - (h * (node.left - loopCenter.x)) / d,
  };
  const endPoint = {
    x: p2.x - (h * (node.top - loopCenter.y)) / d,
    y: p2.y + (h * (node.left - loopCenter.x)) / d,
  };

  const pathData = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 1 0 ${endPoint.x} ${endPoint.y}`;
  const headTangentAngle =
    Math.atan2(endPoint.y - loopCenter.y, endPoint.x - loopCenter.x) -
    Math.PI / 2;
  const heads = renderArrowPart("normal", endPoint, headTangentAngle, "head");

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
        x: node.left + (radius + LABEL_LINE_GAP) * Math.cos(radAngle),
        y: node.top + (radius + LABEL_LINE_GAP) * Math.sin(radAngle),
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
  if (
    mergedStyle.tail.name.toLowerCase() === "mono" &&
    !spec.style?.head?.name
  ) {
    mergedStyle.head.name = "normal";
  }

  const { shift = 0, curve = 0, label_alignment = "over", label } = spec;
  const {
    head: headStyle,
    tail: tailStyle,
    body: bodyStyle,
    level = 1,
  } = mergedStyle;

  const start = { x: fromNode.left, y: fromNode.top };
  const end = { x: toNode.left, y: toNode.top };
  const vec = { x: end.x - start.x, y: end.y - start.y };
  const angle = Math.atan2(vec.y, vec.x);
  const perpAngle = angle - Math.PI / 2;

  const paths = [];
  let headTangentAngle = angle,
    tailTangentAngle = angle;

  const shiftVec = {
    x: shift * Math.cos(perpAngle),
    y: shift * Math.sin(perpAngle),
  };
  const lineStart = { x: start.x + shiftVec.x, y: start.y + shiftVec.y };
  const lineEnd = { x: end.x + shiftVec.x, y: end.y + shiftVec.y };

  const finalTailPos = {
    x: lineStart.x + fromRadius * Math.cos(angle),
    y: lineStart.y + fromRadius * Math.sin(angle),
  };
  const finalHeadPos = {
    x: lineEnd.x - toRadius * Math.cos(angle),
    y: lineEnd.y - toRadius * Math.sin(angle),
  };

  let controlPoint = {
    x: (finalTailPos.x + finalHeadPos.x) / 2,
    y: (finalTailPos.y + finalHeadPos.y) / 2,
  };

  if (curve !== 0) {
    controlPoint.x += curve * Math.cos(perpAngle);
    controlPoint.y += curve * Math.sin(perpAngle);
    tailTangentAngle = Math.atan2(
      controlPoint.y - finalTailPos.y,
      controlPoint.x - finalTailPos.x
    );
    headTangentAngle = Math.atan2(
      finalHeadPos.y - controlPoint.y,
      finalHeadPos.x - controlPoint.x
    );
  }

  const pathEndpoints = [];
  for (let i = 0; i < level; i++) {
    const levelOffset = level > 1 ? (i - (level - 1) / 2) * LINE_SPACING : 0;
    const levelVec = {
      x: levelOffset * Math.cos(perpAngle),
      y: levelOffset * Math.sin(perpAngle),
    };

    const currentTail = {
      x: finalTailPos.x + levelVec.x,
      y: finalTailPos.y + levelVec.y,
    };
    const currentHead = {
      x: finalHeadPos.x + levelVec.x,
      y: finalHeadPos.y + levelVec.y,
    };
    pathEndpoints.push({ tail: currentTail, head: currentHead });

    let d;
    if (curve === 0) {
      d = `M ${currentTail.x} ${currentTail.y} L ${currentHead.x} ${currentHead.y}`;
    } else {
      const currentControl = {
        x: controlPoint.x + levelVec.x,
        y: controlPoint.y + levelVec.y,
      };
      d = `M ${currentTail.x} ${currentTail.y} Q ${currentControl.x} ${currentControl.y} ${currentHead.x} ${currentHead.y}`;
    }
    paths.push({
      d,
      fill: "none",
      stroke: ARROW_COLOR,
      strokeWidth: STROKE_WIDTH,
      strokeDasharray:
        bodyStyle.name === "dashed"
          ? "8 6"
          : bodyStyle.name === "dotted"
          ? "2 5"
          : "none",
    });
  }

  const headPosForMarker =
    level > 1
      ? {
          x: (pathEndpoints[0].head.x + pathEndpoints[level - 1].head.x) / 2,
          y: (pathEndpoints[0].head.y + pathEndpoints[level - 1].head.y) / 2,
        }
      : finalHeadPos;
  const tailPosForMarker =
    level > 1
      ? {
          x: (pathEndpoints[0].tail.x + pathEndpoints[level - 1].tail.x) / 2,
          y: (pathEndpoints[0].tail.y + pathEndpoints[level - 1].tail.y) / 2,
        }
      : finalTailPos;

  const markerSize = level > 1 ? ARROW_HEAD_SIZE * 1.5 : ARROW_HEAD_SIZE;
  const forwardOffset = level > 1 ? markerSize / 2.5 : 0;

  const finalHeadPosWithOffset = {
    x: headPosForMarker.x + forwardOffset * Math.cos(headTangentAngle),
    y: headPosForMarker.y + forwardOffset * Math.sin(headTangentAngle),
  };
  const finalTailPosWithOffset = {
    x: tailPosForMarker.x + forwardOffset * Math.cos(tailTangentAngle),
    y: tailPosForMarker.y + forwardOffset * Math.sin(tailTangentAngle),
  };

  const heads = renderArrowPart(
    headStyle.name,
    finalHeadPosWithOffset,
    headTangentAngle,
    "head",
    markerSize
  );
  const tail = renderArrowPart(
    tailStyle.name,
    finalTailPosWithOffset,
    tailTangentAngle,
    "tail",
    markerSize
  );

  const midpoint = {
    x: 0.25 * finalTailPos.x + 0.5 * controlPoint.x + 0.25 * finalHeadPos.x,
    y: 0.25 * finalTailPos.y + 0.5 * controlPoint.y + 0.25 * finalHeadPos.y,
  };

  let labelPos = { ...midpoint };
  if (label_alignment === "left" || label_alignment === "right") {
    const side = label_alignment === "left" ? -1 : 1;
    labelPos.x += side * LABEL_LINE_GAP * Math.cos(perpAngle);
    labelPos.y += side * LABEL_LINE_GAP * Math.sin(perpAngle);
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