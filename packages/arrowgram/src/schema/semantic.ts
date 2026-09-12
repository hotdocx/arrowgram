import type { RefinementCtx } from 'zod';
import type { CanonicalDiagramSpec } from '../types';
import { buildArrowDependencyPlan } from './dependency';

interface SemanticIssueOptions {
  code: string;
  message: string;
  path: Array<string | number>;
  entityId?: string;
  sourceIndex?: number;
}

function addSemanticIssue(
  context: RefinementCtx,
  options: SemanticIssueOptions,
): void {
  context.addIssue({
    code: 'custom',
    message: options.message,
    path: options.path,
    params: {
      arrowgramCode: options.code,
      arrowgramPhase: 'semantic',
      entityId: options.entityId,
      sourceIndex: options.sourceIndex,
    },
  });
}

export function addDiagramSemanticIssues(
  spec: CanonicalDiagramSpec,
  context: RefinementCtx,
): void {
  const firstSourceById = new Map<string, { kind: 'node' | 'arrow'; index: number }>();
  let identityIsAmbiguous = false;

  spec.nodes.forEach((node, index) => {
    const previous = firstSourceById.get(node.name);
    if (previous) {
      identityIsAmbiguous = true;
      addSemanticIssue(context, {
        code: 'semantic.duplicate_node_id',
        message: `Node ID ${node.name} is duplicated.`,
        path: ['nodes', index, 'name'],
        entityId: node.name,
        sourceIndex: index,
      });
      return;
    }
    firstSourceById.set(node.name, { kind: 'node', index });
  });

  spec.arrows.forEach((arrow, index) => {
    if (arrow.from === arrow.to && arrow.radius === 0) {
      addSemanticIssue(context, {
        code: 'semantic.zero_loop_radius',
        message: 'A self-loop radius must be non-zero when provided.',
        path: ['arrows', index, 'radius'],
        entityId: arrow.name,
        sourceIndex: index,
      });
    }

    if (!arrow.name) return;
    const previous = firstSourceById.get(arrow.name);
    if (previous) {
      identityIsAmbiguous = true;
      addSemanticIssue(context, {
        code: previous.kind === 'node'
          ? 'semantic.endpoint_namespace_collision'
          : 'semantic.duplicate_arrow_id',
        message: previous.kind === 'node'
          ? `Named arrow ID ${arrow.name} collides with a node ID.`
          : `Named arrow ID ${arrow.name} is duplicated.`,
        path: ['arrows', index, 'name'],
        entityId: arrow.name,
        sourceIndex: index,
      });
      return;
    }
    firstSourceById.set(arrow.name, { kind: 'arrow', index });
  });

  if (identityIsAmbiguous) return;

  const plan = buildArrowDependencyPlan(spec);
  if (!plan.ok) {
    plan.diagnostics.forEach((diagnostic) => {
      addSemanticIssue(context, {
        code: diagnostic.code,
        message: diagnostic.message,
        path: diagnostic.path,
        entityId: diagnostic.entityId,
        sourceIndex: diagnostic.sourceIndex,
      });
    });
  }
}
