import { Vec2Math } from './geometry';
import { 
  ArrowSpec, 
  ComputedArrow, 
  ComputedArrowPart, 
  ComputedArrowPath, 
  ComputedDiagram, 
  NodeSpec, 
  Vec2,
  DiagramSpec,
  DiagramSpecSchema
} from '../types';

const NODE_RADIUS = 25;
const FONT_SIZE = 16;
const ARROW_COLOR = "#333333";
const STROKE_WIDTH = 1.5;
const LINE_SPACING = 5;
const ARROW_HEAD_SIZE = 10;
const PADDING = 60;
const LABEL_LINE_GAP = 15;
const EPI_AXIAL_SPACING = 6;

function renderArrowPart(
  type: string | undefined, 
  pos: Vec2, 
  tangentAngle: number, 
  placement: "head" | "tail", 
  customSize?: number
): ComputedArrowPart[] {
  if (!type || type.toLowerCase() === "none") return [];

  const size = customSize || ARROW_HEAD_SIZE;
  const angleDeg = (tangentAngle * 180) / Math.PI;
  const commonProps = {
    fill: "none",
    stroke: ARROW_COLOR,
    strokeWidth: STROKE_WIDTH,
    strokeLinecap: "round" as const,
  };
  const d_normal = `M 0 0 L -${size} ${-size / 2} M 0 0 L -${size} ${size / 2}`;

  switch (type.toLowerCase()) {
    case "epi": {
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
    }
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
    case "hook": {
      // A small semi-circle or hook shape
      // M 0 0 A 5 5 0 0 1 -5 -5 or similar
      const d_hook = `M ${size/2} -${size/2} A ${size/2} ${size/2} 0 0 0 ${size/2} ${size/2}`;
      // Adjust rotation: default hook is 'subset' style usually at tail
      // If at tail, the open part faces the path.
      return [{
        props: {
          ...commonProps,
          d: d_hook,
          transform: `translate(${pos.x} ${pos.y}) rotate(${angleDeg}) translate(-${size/2}, 0)`,
        }
      }];
    }
    case "maps_to": {
      // A vertical bar
      const d_bar = `M 0 -${size/2} L 0 ${size/2}`;
      return [{
        props: {
          ...commonProps,
          d: d_bar,
          transform: `translate(${pos.x} ${pos.y}) rotate(${angleDeg})`,
        }
      }];
    }
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

function createLoopArrowModel(spec: ArrowSpec, node: NodeSpec, key: string): ComputedArrow {
  const { radius = 40, angle = 45, label } = spec;
  const radAngle = (angle * Math.PI) / 180;

  const center = { x: node.left, y: node.top };
  const loopCenter = Vec2Math.add(center, {
    x: radius * Math.cos(radAngle),
    y: radius * Math.sin(radAngle),
  });

  const d = Vec2Math.dist(center, loopCenter);
  const a = (radius ** 2 - NODE_RADIUS ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, radius ** 2 - a ** 2));

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

  const pathData = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 1 0 ${endPoint.x} ${endPoint.y}`;

  const radiusVec = Vec2Math.sub(endPoint, loopCenter);
  const tangentAngle = Vec2Math.angle(radiusVec) - Math.PI / 2;

  const heads = renderArrowPart("normal", endPoint, tangentAngle, "head");

  const dir = Vec2Math.norm(Vec2Math.sub(loopCenter, center));
  const finalLabelPos = Vec2Math.add(loopCenter, Vec2Math.mul(dir, radius + LABEL_LINE_GAP));

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

function createStandardArrowModel(
  spec: ArrowSpec,
  fromNode: { left: number; top: number },
  toNode: { left: number; top: number },
  key: string,
  fromRadius: number = NODE_RADIUS,
  toRadius: number = NODE_RADIUS
): ComputedArrow {
  const defaultStyle = {
    head: { name: "normal" as const },
    tail: { name: "none" as const },
    body: { name: "solid" as const },
  };
  const mergedStyle = {
    ...defaultStyle,
    ...spec.style,
    head: { ...defaultStyle.head, ...spec.style?.head },
    tail: { ...defaultStyle.tail, ...spec.style?.tail },
    body: { ...defaultStyle.body, ...spec.style?.body },
  };

  if (mergedStyle.tail.name === "mono" && !spec.style?.head?.name) {
    mergedStyle.head.name = "normal";
  }

  const { shift = 0, curve = 0, label_alignment = "over", label } = spec;
  const { head: headStyle, tail: tailStyle, body: bodyStyle, level = 1 } = mergedStyle;

  const start = { x: fromNode.left, y: fromNode.top };
  const end = { x: toNode.left, y: toNode.top };

  const rawVec = Vec2Math.sub(end, start);
  const angle = Vec2Math.mag(rawVec) < 0.1 ? 0 : Vec2Math.angle(rawVec);
  const perp = { x: -Math.sin(angle), y: Math.cos(angle) };

  const shiftOffset = Vec2Math.mul(perp, shift);
  const lineStart = Vec2Math.add(start, shiftOffset);
  const lineEnd = Vec2Math.add(end, shiftOffset);

  const dir = Vec2Math.norm(rawVec);
  const finalTailPos = Vec2Math.add(lineStart, Vec2Math.mul(dir, fromRadius));
  const finalHeadPos = Vec2Math.sub(lineEnd, Vec2Math.mul(dir, toRadius));

  const midBase = Vec2Math.mul(Vec2Math.add(finalTailPos, finalHeadPos), 0.5);
  const finalVec = Vec2Math.sub(finalHeadPos, finalTailPos);
  const finalAngle = Vec2Math.angle(finalVec);
  const finalPerp = { x: -Math.sin(finalAngle), y: Math.cos(finalAngle) };

  const controlPoint = Vec2Math.add(midBase, Vec2Math.mul(finalPerp, curve));

  const tailTangentAngle = curve === 0 ? angle : Vec2Math.angle(Vec2Math.sub(controlPoint, finalTailPos));
  const headTangentAngle = curve === 0 ? angle : Vec2Math.angle(Vec2Math.sub(finalHeadPos, controlPoint));

  const chordPerpAngle = Vec2Math.angle(finalVec) - Math.PI / 2;
  const chordPerp = { x: Math.cos(chordPerpAngle), y: Math.sin(chordPerpAngle) };

  const paths: ComputedArrowPath[] = [];
  const pathEndpoints: { tail: Vec2; head: Vec2 }[] = [];

  for (let i = 0; i < level; i++) {
    const levelOffset = level > 1 ? (i - (level - 1) / 2) * LINE_SPACING : 0;
    const levelVec = Vec2Math.mul(chordPerp, levelOffset);

    const currentTail = Vec2Math.add(finalTailPos, levelVec);
    const currentHead = Vec2Math.add(finalHeadPos, levelVec);
    pathEndpoints.push({ tail: currentTail, head: currentHead });

    let d;
    if (Math.abs(curve) < 1) { 
      d = `M ${currentTail.x} ${currentTail.y} L ${currentHead.x} ${currentHead.y}`;
    } else {
      const currentControl = Vec2Math.add(controlPoint, levelVec);
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

  const markerHeadBase = level > 1
    ? Vec2Math.mul(Vec2Math.add(pathEndpoints[0].head, pathEndpoints[level - 1].head), 0.5)
    : finalHeadPos;

  const markerTailBase = level > 1
    ? Vec2Math.mul(Vec2Math.add(pathEndpoints[0].tail, pathEndpoints[level - 1].tail), 0.5)
    : finalTailPos;

  const markerSize = level > 1 ? ARROW_HEAD_SIZE * 1.5 : ARROW_HEAD_SIZE;
  const forwardOffset = level > 1 ? markerSize / 3 : 0;

  const markerHeadPos = Vec2Math.add(markerHeadBase, Vec2Math.mul({ x: Math.cos(headTangentAngle), y: Math.sin(headTangentAngle) }, forwardOffset));
  const markerTailPos = Vec2Math.add(markerTailBase, Vec2Math.mul({ x: Math.cos(tailTangentAngle), y: Math.sin(tailTangentAngle) }, forwardOffset));

  const heads = renderArrowPart(headStyle.name, markerHeadPos, headTangentAngle, "head", markerSize);
  const tail = renderArrowPart(tailStyle.name, markerTailPos, tailTangentAngle, "tail", markerSize);

  const midpoint = {
    x: 0.25 * finalTailPos.x + 0.5 * controlPoint.x + 0.25 * finalHeadPos.x,
    y: 0.25 * finalTailPos.y + 0.5 * controlPoint.y + 0.25 * finalHeadPos.y,
  };

  const midTangentAngle = Vec2Math.angle(Vec2Math.sub(finalHeadPos, finalTailPos));
  const midPerpAngle = midTangentAngle - Math.PI / 2;

  let labelPos = { ...midpoint };
  if (label_alignment === "left" || label_alignment === "right") {
    const side = label_alignment === "left" ? -1 : 1;
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

interface EndpointInfo {
  pos: Vec2;
  level: number;
  isNode: boolean;
  spec?: NodeSpec | ArrowSpec;
}

export function computeDiagram(specInput: string | DiagramSpec): ComputedDiagram {
  try {
    const rawSpec: DiagramSpec = typeof specInput === 'string' ? JSON.parse(specInput) : specInput;
    
    // Validate with Zod
    const spec = DiagramSpecSchema.parse({ ...rawSpec, version: rawSpec.version || 1 });

    if (!spec.nodes || spec.nodes.length === 0) {
      return { nodes: [], arrows: [], viewBox: "0 0 100 100", error: null };
    }

    const getEndpointRadius = (endpointInfo: EndpointInfo) => {
      if (endpointInfo.isNode) {
        return NODE_RADIUS;
      }
      if (!endpointInfo.spec || !('style' in endpointInfo.spec)) return 0;

      const level = endpointInfo.spec.style?.level || 1;
      const thickness = (level - 1) * LINE_SPACING + STROKE_WIDTH;
      const PADDING_FOR_ARROW_ENDPOINT = 8;
      return thickness / 2 + PADDING_FOR_ARROW_ENDPOINT;
    };

    const endpointInfo = new Map<string, EndpointInfo>(
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

    const arrows: ComputedArrow[] = [];
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
      // Copy to iterate while deleting
      const currentUnresolved = [...unresolvedArrowSpecs];
      for (const arrowSpec of currentUnresolved) {
        const fromInfo = endpointInfo.get(arrowSpec.from);
        const toInfo = endpointInfo.get(arrowSpec.to);

        if (fromInfo && toInfo) {
          const level = Math.max(fromInfo.level, toInfo.level) + 1;

          const fromNodeLike = { left: fromInfo.pos.x, top: fromInfo.pos.y };
          const toNodeLike = { left: toInfo.pos.x, top: toInfo.pos.y };
          const key = `${arrowSpec.from}-${arrowSpec.to}-${arrowSpec.uniqueId}`;

          let model: ComputedArrow;
          if (arrowSpec.from === arrowSpec.to) {
            model = createLoopArrowModel(arrowSpec, fromNodeLike as NodeSpec, key);
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
    
    // Add loop extents to bbox calc
    spec.arrows?.forEach((a) => {
      if (a.from === a.to && endpointInfo.has(a.from)) {
        const nodeInfo = endpointInfo.get(a.from)!;
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
  } catch (e: any) {
    console.error("Error parsing Arrowgram spec:", e);
    return {
      nodes: [],
      arrows: [],
      viewBox: "0 0 100 100",
      error: e.message,
    };
  }
}
