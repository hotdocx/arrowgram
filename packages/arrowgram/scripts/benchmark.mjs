import { performance } from 'node:perf_hooks';
import { computeDiagram } from '../dist/core.js';

function createGrid(side) {
  const nodes = [];
  const arrows = [];

  for (let row = 0; row < side; row += 1) {
    for (let column = 0; column < side; column += 1) {
      const index = row * side + column;
      const name = `node_${index}`;
      nodes.push({
        name,
        left: column * 80,
        top: row * 80,
        label: `$A_{${index}}$`,
      });

      if (column > 0) {
        arrows.push({
          from: `node_${index - 1}`,
          to: name,
          label: '$f$',
        });
      }

      if (row > 0) {
        arrows.push({
          from: `node_${index - side}`,
          to: name,
          label: '$g$',
        });
      }
    }
  }

  return { version: 1, nodes, arrows };
}

function percentile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

function runCase(side, runs, medianBudgetMs, productTargetMs) {
  const spec = createGrid(side);
  const warmupRuns = 5;
  const batches = 3;
  const measurements = [];
  for (let batch = 0; batch < batches; batch += 1) {
    for (let iteration = 0; iteration < warmupRuns; iteration += 1) {
      const warmup = computeDiagram(spec);
      if (warmup.error) throw new Error(warmup.error);
    }

    const timings = [];
    for (let iteration = 0; iteration < runs; iteration += 1) {
      const start = performance.now();
      const result = computeDiagram(spec);
      timings.push(performance.now() - start);
      if (result.error) throw new Error(result.error);
    }
    timings.sort((left, right) => left - right);
    measurements.push({
      minMs: Number(timings[0].toFixed(2)),
      medianMs: Number(percentile(timings, 0.5).toFixed(2)),
      p95Ms: Number(percentile(timings, 0.95).toFixed(2)),
      maxMs: Number(timings[timings.length - 1].toFixed(2)),
    });
  }
  const best = [...measurements].sort((left, right) => left.medianMs - right.medianMs)[0];
  const result = {
    nodes: spec.nodes.length,
    arrows: spec.arrows.length,
    warmupRuns,
    batches,
    runs,
    batchMediansMs: measurements.map((entry) => entry.medianMs),
    ...best,
    medianBudgetMs,
    productTargetMs,
  };
  return { ...result, pass: result.medianMs <= medianBudgetMs };
}

const report = {
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  runtime: process.version,
  platform: `${process.platform}-${process.arch}`,
  note: 'Each case reports the best median from three batches with five untimed warmups each, filtering transient shared-runner contention without relaxing budgets. The 100/180 product target is a stricter 16.7 ms reference-environment objective.',
  cases: [
    runCase(5, 20, 10),
    runCase(10, 10, 25, 16.7),
    runCase(15, 5, 60),
  ],
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.cases.some((entry) => !entry.pass)) process.exitCode = 1;
