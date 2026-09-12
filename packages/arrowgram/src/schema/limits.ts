export const ARROWGRAM_LIMITS = Object.freeze({
  nodes: 1_000,
  arrows: 4_000,
  logicalIdCodePoints: 256,
  labelCodePoints: 16_384,
  colorCodePoints: 256,
  absoluteCoordinate: 1_000_000,
  absoluteGeometry: 1_000_000,
  absoluteAngle: 1_000_000,
  dependencyDepth: 128,
  styleLevelMin: 1,
  styleLevelMax: 3,
  defaultLoopRadius: 40,
  nodeRadius: 25,
});

export type ArrowgramLimits = typeof ARROWGRAM_LIMITS;
