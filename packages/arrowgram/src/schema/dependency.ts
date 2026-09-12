import type { CanonicalDiagramSpec } from '../types';
import {
  makeDiagnostic,
  type ArrowgramDiagnostic,
  type ArrowgramResult,
} from './diagnostics';
import { ARROWGRAM_LIMITS } from './limits';

export interface ArrowDependencyPlan {
  order: number[];
  dependencies: number[][];
  depthBySourceIndex: number[];
}

const dependencyPlanCache = new WeakMap<CanonicalDiagramSpec, ArrowDependencyPlan>();

function findCycleParticipants(dependencies: number[][]): Set<number> {
  const visited = dependencies.map(() => false);
  const finishOrder: number[] = [];

  dependencies.forEach((_items, start) => {
    if (visited[start]) return;
    const stack: Array<{ sourceIndex: number; nextDependency: number }> = [
      { sourceIndex: start, nextDependency: 0 },
    ];
    visited[start] = true;

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const items = dependencies[frame.sourceIndex];
      if (frame.nextDependency < items.length) {
        const dependency = items[frame.nextDependency];
        frame.nextDependency += 1;
        if (!visited[dependency]) {
          visited[dependency] = true;
          stack.push({ sourceIndex: dependency, nextDependency: 0 });
        }
      } else {
        finishOrder.push(frame.sourceIndex);
        stack.pop();
      }
    }
  });

  const reverse = dependencies.map(() => [] as number[]);
  dependencies.forEach((items, sourceIndex) => {
    items.forEach((dependency) => reverse[dependency].push(sourceIndex));
  });
  const assigned = dependencies.map(() => false);
  const participants = new Set<number>();

  for (let orderIndex = finishOrder.length - 1; orderIndex >= 0; orderIndex -= 1) {
    const start = finishOrder[orderIndex];
    if (assigned[start]) continue;
    const component: number[] = [];
    const stack = [start];
    assigned[start] = true;

    while (stack.length > 0) {
      const sourceIndex = stack.pop()!;
      component.push(sourceIndex);
      for (const dependent of reverse[sourceIndex]) {
        if (!assigned[dependent]) {
          assigned[dependent] = true;
          stack.push(dependent);
        }
      }
    }

    if (
      component.length > 1
      || dependencies[component[0]].includes(component[0])
    ) {
      component.forEach((sourceIndex) => participants.add(sourceIndex));
    }
  }
  return participants;
}

function dependencyDiagnostic(
  code: string,
  message: string,
  sourceIndex: number,
  endpoint?: 'from' | 'to',
  entityId?: string,
): ArrowgramDiagnostic {
  return makeDiagnostic({
    code,
    severity: 'error',
    phase: 'semantic',
    message,
    path: endpoint
      ? ['arrows', sourceIndex, endpoint]
      : ['arrows', sourceIndex],
    sourceIndex,
    entityId,
  });
}

export function buildArrowDependencyPlan(
  spec: CanonicalDiagramSpec,
): ArrowgramResult<ArrowDependencyPlan> {
  const cached = dependencyPlanCache.get(spec);
  if (cached) return { ok: true, value: cached, diagnostics: [] };

  const diagnostics: ArrowgramDiagnostic[] = [];
  const nodeIds = new Set(spec.nodes.map((node) => node.name));
  const arrowIndexById = new Map<string, number>();

  spec.arrows.forEach((arrow, sourceIndex) => {
    if (arrow.name && !arrowIndexById.has(arrow.name)) {
      arrowIndexById.set(arrow.name, sourceIndex);
    }
  });

  const dependencies = spec.arrows.map((arrow, sourceIndex) => {
    const result = new Set<number>();

    for (const endpoint of ['from', 'to'] as const) {
      const endpointId = arrow[endpoint];
      const dependency = arrowIndexById.get(endpointId);
      if (dependency !== undefined) {
        result.add(dependency);
        continue;
      }
      if (nodeIds.has(endpointId)) continue;

      const synthetic = /^_arrow_\d+$/.test(endpointId);
      diagnostics.push(dependencyDiagnostic(
        synthetic
          ? 'semantic.synthetic_endpoint_reference'
          : 'semantic.dangling_endpoint',
        synthetic
          ? `Endpoint ${endpointId} is a renderer-only synthetic ID; name the referenced arrow explicitly.`
          : `Endpoint ${endpointId} does not resolve to a node or named arrow.`,
        sourceIndex,
        endpoint,
        arrow.name,
      ));
    }

    return [...result].sort((left, right) => left - right);
  });

  if (diagnostics.length > 0) return { ok: false, diagnostics };

  if (dependencies.every((items) => items.length === 0)) {
    const value = {
      order: spec.arrows.map((_arrow, sourceIndex) => sourceIndex),
      dependencies,
      depthBySourceIndex: spec.arrows.map(() => 0),
    };
    dependencyPlanCache.set(spec, value);
    return { ok: true, value, diagnostics: [] };
  }

  const dependents = spec.arrows.map(() => [] as number[]);
  const indegree = dependencies.map((items) => items.length);
  dependencies.forEach((items, sourceIndex) => {
    items.forEach((dependency) => dependents[dependency].push(sourceIndex));
  });
  dependents.forEach((items) => items.sort((left, right) => left - right));

  const queue = indegree
    .map((degree, sourceIndex) => ({ degree, sourceIndex }))
    .filter(({ degree }) => degree === 0)
    .map(({ sourceIndex }) => sourceIndex)
    .sort((left, right) => left - right);
  const order: number[] = [];
  const depthBySourceIndex = spec.arrows.map(() => 0);

  while (queue.length > 0) {
    const sourceIndex = queue.shift()!;
    order.push(sourceIndex);

    for (const dependent of dependents[sourceIndex]) {
      depthBySourceIndex[dependent] = Math.max(
        depthBySourceIndex[dependent],
        depthBySourceIndex[sourceIndex] + 1,
      );
      indegree[dependent] -= 1;
      if (indegree[dependent] === 0) {
        const position = queue.findIndex((candidate) => candidate > dependent);
        if (position === -1) queue.push(dependent);
        else queue.splice(position, 0, dependent);
      }
    }
  }

  if (order.length !== spec.arrows.length) {
    const cycleParticipants = findCycleParticipants(dependencies);
    indegree.forEach((degree, sourceIndex) => {
      if (degree > 0) {
        const arrow = spec.arrows[sourceIndex];
        diagnostics.push(dependencyDiagnostic(
          cycleParticipants.has(sourceIndex)
            ? 'semantic.dependency_cycle'
            : 'semantic.dependency_blocked_by_cycle',
          cycleParticipants.has(sourceIndex)
            ? `Arrow ${arrow.name ?? `at index ${sourceIndex}`} participates in a dependency cycle.`
            : `Arrow ${arrow.name ?? `at index ${sourceIndex}`} depends on a cyclic arrow.`,
          sourceIndex,
          undefined,
          arrow.name,
        ));
      }
    });
    return { ok: false, diagnostics };
  }

  depthBySourceIndex.forEach((depth, sourceIndex) => {
    if (depth > ARROWGRAM_LIMITS.dependencyDepth) {
      const arrow = spec.arrows[sourceIndex];
      diagnostics.push(dependencyDiagnostic(
        'semantic.dependency_depth_exceeded',
        `Arrow dependency depth ${depth} exceeds the limit of ${ARROWGRAM_LIMITS.dependencyDepth}.`,
        sourceIndex,
        undefined,
        arrow.name,
      ));
    }
  });

  if (diagnostics.length > 0) return { ok: false, diagnostics };
  const value = { order, dependencies, depthBySourceIndex };
  dependencyPlanCache.set(spec, value);
  return { ok: true, value, diagnostics: [] };
}
