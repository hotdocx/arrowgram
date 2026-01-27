import { decodeQuiverUrl, encodeArrowgram } from '../utils/quiver';
import { DiagramSpec } from '@hotdocx/arrowgram';

describe('Quiver Integration', () => {
  const kitchenSinkSpec: DiagramSpec = {
    version: 1,
    nodes: [
      {
        name: "v0",
        label: "$A$",
        left: 160, // 4 * 40
        top: 320,  // 8 * 40
        color: "red" // maps to [0, 100, 50, 1]
      },
      {
        name: "v1",
        label: "$B$",
        left: 480, // 12 * 40
        top: 320,
        color: "blue" // maps to [240, 100, 50, 1]
      }
    ],
    arrows: [
      {
        name: "e0",
        from: "v0",
        to: "v1",
        label: "$f$",
        label_alignment: "left", // AG Left -> Quiver Right (2)
        color: "green", // [120, 100, 50, 1]
        style: {
          level: 2,
          head: { name: "hook", side: "top" },
          tail: { name: "maps_to" },
          body: { name: "dashed" }
        }
      },
      {
        name: "e1",
        from: "v1",
        to: "v0",
        label: "$g$",
        curve: 50, // 2 * 25 (Positive factor)
        shift: 10,
        style: {
          mode: "adjunction"
        }
      },
      {
        name: "loop",
        from: "v0",
        to: "v0",
        label: "$id$",
        radius: 40,
        angle: 45
      }
    ]
  };

  test('Round trip encoding/decoding preserves semantics', () => {
    // 1. Encode
    const base64 = encodeArrowgram(kitchenSinkSpec);
    const url = `https://q.uiver.app/#q=${base64}`;

    // 2. Decode
    const decoded = decodeQuiverUrl(url);

    // 3. Verify
    expect(decoded.nodes).toHaveLength(2);
    expect(decoded.arrows).toHaveLength(3);

    // Verify Nodes
    const v0 = decoded.nodes[0];
    expect(v0.left).toBeCloseTo(160);
    expect(v0.top).toBeCloseTo(320);
    // Note: Colors are converted to HSL strings like "hsla(0, 100%, 50%, 1)"
    expect(v0.color).toBe("hsla(0, 100%, 50%, 1)"); // red

    // Verify Edge e0 (Styles)
    const e0 = decoded.arrows!.find(a => a.label === "$f$");
    expect(e0).toBeDefined();
    // AG Left -> Quiver Right -> AG Left (Round Trip)
    expect(e0!.label_alignment).toBe("left");
    expect(e0!.color).toBe("hsla(120, 100%, 50%, 1)"); // green
    expect(e0!.style?.level).toBe(2);
    expect(e0!.style?.head).toEqual({ name: "hook", side: "top" });
    expect(e0!.style?.tail).toEqual({ name: "maps_to" });
    expect(e0!.style?.body).toEqual({ name: "dashed" });

    // Verify Edge e1 (Geometry & Mode)
    const e1 = decoded.arrows!.find(a => a.label === "$g$");
    expect(e1).toBeDefined();
    expect(e1!.curve).toBe(50); // Preserved positive
    expect(e1!.shift).toBe(10);
    expect(e1!.style?.mode).toBe("adjunction");

    // Verify Loop
    const loop = decoded.arrows!.find(a => a.label === "$id$");
    expect(loop).toBeDefined();
    expect(loop!.radius).toBe(40);
    expect(loop!.angle).toBe(45);
  });
});