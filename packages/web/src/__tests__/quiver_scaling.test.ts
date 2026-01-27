import { decodeQuiverUrl, encodeArrowgram } from '../utils/quiver';
import { DiagramSpec } from '@hotdocx/arrowgram';

describe('Quiver Scaling', () => {

  // Helper to decode base64 from Quiver URL
  function getQuiverData(url: string) {
    const fragment = url.includes("#") ? url.substring(url.indexOf("#") + 1) : url;
    const qParam = fragment.split("&").find((p) => p.startsWith("q="));
    if (!qParam) throw new Error("No q param");
    const base64 = qParam.substring(2);
    const json = atob(base64);
    return JSON.parse(json);
  }

  test('Scales Radius 40 -> -4 (Sign Inverted) and Angle -90 -> 0', () => {
    const spec: DiagramSpec = {
      version: 1,
      nodes: [{ name: "v0", left: 0, top: 0, label: "" }],
      arrows: [{
        name: "loop",
        from: "v0",
        to: "v0",
        label: "",
        radius: 40,
        angle: -90
      }]
    };

    const url = `https://q.uiver.app/#q=${encodeArrowgram(spec)}`;
    const data = getQuiverData(url);
    const edge = data[3];
    const options = edge.find((x: any) => typeof x === 'object' && !Array.isArray(x));
    expect(options).toBeDefined();

    // Check Scaling & Inversion
    // 40 / 10 = 4. Inverted = -4.
    expect(options.radius).toBe(-4);

    // Angle -90 -> 0. Default is 0 -> Omitted.
    expect(options.angle).toBeUndefined();

    // Decode back
    const decoded = decodeQuiverUrl(url);
    const loop = decoded.arrows![0];
    expect(loop.radius).toBe(40);
    expect(loop.angle).toBe(-90);
  });

  test('Handles Non-Default Angle (-45 -> 45)', () => {
    const spec: DiagramSpec = {
      version: 1,
      nodes: [{ name: "v0", left: 0, top: 0, label: "" }],
      arrows: [{
        name: "loop",
        from: "v0",
        to: "v0",
        label: "",
        radius: 40,
        angle: -45
      }]
    };

    const url = `https://q.uiver.app/#q=${encodeArrowgram(spec)}`;
    const data = getQuiverData(url);
    const edge = data[3];
    const options = edge.find((x: any) => typeof x === 'object' && !Array.isArray(x));

    // -45 - (-90) = 45
    expect(options.angle).toBe(45);

    const decoded = decodeQuiverUrl(url);
    expect(decoded.arrows![0].angle).toBe(-45);
  });

  test('Optimizes Defaults (Radius -30 -> Omitted, Angle -90 -> Omitted)', () => {
    // Arrowgram Radius -30 corresponds to Quiver 3 (Default).
    // -30 / 10 = -3. Inverted = 3.
    const spec: DiagramSpec = {
      version: 1,
      nodes: [{ name: "v0", left: 0, top: 0, label: "" }],
      arrows: [{
        name: "loop",
        from: "v0",
        to: "v0",
        label: "",
        radius: -30,
        angle: -90  // -90 - (-90) = 0 (Default)
      }]
    };

    const url = `https://q.uiver.app/#q=${encodeArrowgram(spec)}`;
    const data = getQuiverData(url);
    const edge = data[3];

    // Both radius and angle should be default, so options object might be missing or minimal.
    // If we only have those properties, options shouldn't be pushed if empty.
    // If it has style level 1 (default), that is also omitted.

    // Edge length should be 2 (Source, Target) if everything is default.
    expect(edge.length).toBe(2);

    const decoded = decodeQuiverUrl(url);
    // Defaults are applied on import:
    // Radius: 3 (Quiver default) -> Inverted (-3) -> Scaled (-30).
    expect(decoded.arrows![0].radius).toBe(-30);
    // Angle: 0 (Quiver default) -> Offset (-90).
    expect(decoded.arrows![0].angle).toBe(-90);
  });

  test('Explicitly Exports Non-Default Radius (Radius 30 -> -3)', () => {
    // Arrowgram Radius 30 corresponds to Quiver -3.
    // 30 / 10 = 3. Inverted = -3.
    const spec: DiagramSpec = {
      version: 1,
      nodes: [{ name: "v0", left: 0, top: 0, label: "" }],
      arrows: [{
        name: "loop",
        from: "v0",
        to: "v0",
        label: "",
        radius: 30,
        angle: -90
      }]
    };

    const url = `https://q.uiver.app/#q=${encodeArrowgram(spec)}`;
    const data = getQuiverData(url);
    const edge = data[3];

    const options = edge.find((x: any) => typeof x === 'object' && !Array.isArray(x));
    expect(options).toBeDefined();
    expect(options.radius).toBe(-3);

    const decoded = decodeQuiverUrl(url);
    expect(decoded.arrows![0].radius).toBe(30);
  });

});