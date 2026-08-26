import { BUILTIN_ARITY, BUILTIN_OPS, SETTINGS_OPS } from './ops.js';
import { layout } from './layout.js';
import type { Graph, GraphEdge, GraphNode, Problem, ReadOptions } from './types.js';

/** The `processing.json` shape, as far as this package needs to know. */
export interface ProcessLike {
  process: Record<string, { op?: string; require?: string[]; options?: any }>;
  [key: string]: any;
}

/**
 * Turn a process config into a graph that can be drawn.
 *
 * Nodes come back placed, so a host can render without solving layout, and
 * problems come back listed rather than thrown: a config with a cycle in it is
 * exactly the config somebody needs to look at, and refusing to draw it leaves
 * them with a stack trace instead of a picture of their mistake.
 */
export function readGraph(config: ProcessLike | null | undefined, o: ReadOptions = {}): Graph {
  const specs = config?.process ?? {};
  const arity = { ...BUILTIN_ARITY, ...(o.arity ?? {}) };
  const settingsOps = new Set(o.settingsOps ?? SETTINGS_OPS);

  const problems: Problem[] = [];
  const isSettings = (op?: string) => !op || settingsOps.has(op);

  // Which names are real stages, so an edge to a settings carrier is dropped
  // rather than drawn to a node the host was told to hide.
  const names = Object.keys(specs);
  const stages = new Set(names.filter((n) => o.includeSettings || !isSettings(specs[n].op)));

  const required = new Set<string>();
  for (const name of names) {
    for (const req of specs[name].require ?? []) required.add(req);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const name of names) {
    const spec = specs[name];
    const settings = isSettings(spec.op);
    if (settings && !o.includeSettings) continue;

    const info = spec.op ? BUILTIN_OPS[spec.op] : undefined;
    if (spec.op && !info && !settingsOps.has(spec.op) && arity[spec.op] === undefined) {
      problems.push({
        severity: 'warning',
        code: 'unknown-op',
        node: name,
        message: `"${name}" runs op "${spec.op}", which this host does not know about`,
      });
    }

    const requires = (spec.require ?? []).filter((req) => {
      if (!specs[req]) {
        problems.push({
          severity: 'error',
          code: 'missing-require',
          node: name,
          message: `"${name}" requires "${req}", which is not a process in this config`,
        });
        return false;
      }
      return stages.has(req);
    });

    const inputs = settings ? 0 : (arity[spec.op ?? ''] ?? 1);
    if (requires.length > inputs) {
      problems.push({
        severity: 'error',
        code: 'too-many-inputs',
        node: name,
        message: `"${name}" wires ${requires.length} inputs into op "${spec.op}", which reads ${inputs}`,
      });
    }

    nodes.push({
      id: name,
      op: spec.op,
      kind: settings ? 'settings' : (info?.kind ?? 'unknown'),
      summary: settings ? 'Settings for a view, not a stage in the pipeline' : (info?.summary ?? ''),
      requires,
      inputs: Number.isFinite(inputs) ? inputs : requires.length,
      options: spec.options,
      settings,
      leaf: !required.has(name) && !settings,
      depth: 0,
      lane: 0,
    });

    requires.forEach((req, socket) => edges.push({ from: req, to: name, socket }));
  }

  const placed = layout(nodes, edges, problems);
  return { ...placed, edges, problems };
}
