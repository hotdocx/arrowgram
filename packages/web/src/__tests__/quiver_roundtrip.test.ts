import { decodeQuiverUrl, encodeArrowgram } from '../utils/quiver';
import { DiagramSpec } from '@hotdocx/arrowgram';

describe('Quiver Round-Trip Integration', () => {
  // Test case with grid-aligned coordinates (multiples of 150) and curve values (multiples of 25)
  // to avoid quantization errors during round trip.
  const roundTripSpec: DiagramSpec = {
    version: 1,
    nodes: [
      {
        name: "v0",
        label: "N1", // Text label
        left: 320,
        top: 0
      },
      {
        name: "v1",
        label: "$N2$", // Math label (already wrapped)
        left: 320,
        top: 320
      },
      {
        name: "v2",
        label: "$N3$",
        left: 640,
        top: 320
      },
      {
        name: "v3",
        label: "$\sigma_k$", // Math label
        left: 640,
        top: 0,
        color: "hsla(217, 100%, 50%, 1)"
      }
    ],
    arrows: [
      {
        name: "e0",
        label: "$g \to p$",
        from: "v0",
        to: "v1",
        curve: 100,
        label_alignment: "left",
        color: "hsla(187, 46%, 47%, 1)",
        label_color: "hsla(119, 100%, 50%, 1)",
        style: {}
      },
      {
        name: "e1",
        label: "",
        from: "e0",
        to: "v2",
        label_alignment: "over",
      },
      {
        name: "e2",
        label: "f", // Text label
        from: "v2",
        to: "v3",
        color: "hsla(0, 82%, 46%, 1)"
      },
      {
        name: "e3",
        label: "",
        from: "v2",
        to: "v2",
        angle: 0,
        radius: 40
      },
      {
        name: "e4",
        label: "",
        from: "e0",
        to: "e2",
        style: {
          level: 2
        }
      }
    ]
  };

  test('Export then Import produces equivalent JSON (modulo IDs and Text->Math promotion)', () => {
    // 1. Export
    const base64 = encodeArrowgram(roundTripSpec);
    const url = `https://q.uiver.app/#q=${base64}`;

    // 2. Import
    const decoded = decodeQuiverUrl(url);

    // 3. Verify Nodes
    expect(decoded.nodes).toHaveLength(4);

    // v0: "N1" (Text) -> "$N1$" (Math)
    // Rule: "Import ... should be translated to $X1$"
    const v0 = decoded.nodes[0];
    expect(v0.label).toBe("$N1$");
    expect(v0.left).toBe(320);
    expect(v0.top).toBe(0);

    // v1: "$N2$" (Math) -> "$N2$" (Math)
    // Rule: "Export ... strip enclosing" -> "N2". Import -> "$N2$". Identity.
    const v1 = decoded.nodes[1];
    expect(v1.label).toBe("$N2$");

    // v3: "$\sigma_k$"
    const v3 = decoded.nodes[3];
    expect(v3.label).toBe("$\sigma_k$");
    expect(v3.color).toBe("hsla(217, 100%, 50%, 1)");

    // 4. Verify Arrows
    expect(decoded.arrows).toHaveLength(5);

    // e0: "$g \to p$" -> "$g \to p$"
    const e0 = decoded.arrows!.find(a => a.label === "$g \to p$");
    expect(e0).toBeDefined();
    expect(e0!.from).toBe(v0.name);
    expect(e0!.curve).toBe(100);
    expect(e0!.label_alignment).toBe("left");
    expect(e0!.color).toBe("hsla(187, 46%, 47%, 1)");

    // e2: "f" (Text) -> "$f$" (Math)
    const e2 = decoded.arrows!.find(a => a.label === "$f$");
    expect(e2).toBeDefined();
    expect(e2!.color).toBe("hsla(0, 82%, 46%, 1)");

    // e3: Loop angle 0
    const e3 = decoded.arrows!.find(a => a.radius === 40);
    expect(e3).toBeDefined();
    expect(e3!.angle).toBe(0);

    // e4: 2-cell
    const e4 = decoded.arrows!.find(a => a.style?.level === 2);
    expect(e4).toBeDefined();
    expect(e4!.from).toBe("e0");
    expect(e4!.to).toBe("e2");
  });

  test('Importing implicit Quiver loop defaults', () => {
    // [0,1,[0,0,"N1"],[0,0,"loop"]]
    // Implicit defaults: alignment=0(left), radius=missing(default), angle=missing(default)
    const implicitLoopJson = JSON.stringify([0, 1, [0, 0, "N1"], [0, 0, "loop"]]);
    const base64 = btoa(implicitLoopJson);
    const url = `https://q.uiver.app/#q=${base64}`;

    const decoded = decodeQuiverUrl(url);
    const loop = decoded.arrows![0];

    // Should have defaults applied
    expect(loop.radius).toBe(-30);
    expect(loop.angle).toBe(-90);
    expect(loop.label).toBe("$loop$");
    expect(loop.label_alignment).toBe("left"); // Default alignment 0 -> left
  });
});
