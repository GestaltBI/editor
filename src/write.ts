import type { ProcessLike } from './read.js';
import type { GraphNode } from './types.js';

/**
 * Write a graph back into a process config.
 *
 * Everything the editor did not model is carried through untouched: the
 * top-level `type`, `version` and `name` keys, any settings carriers that were
 * filtered out of the canvas, and every option on every node exactly as it was
 * read. An editor that silently drops the parts it did not understand is an
 * editor nobody can safely open an existing config with.
 *
 * Pass the config it was read from as `original`. Without it the settings
 * carriers cannot be restored, because they were never on the canvas.
 */
export function writeGraph(nodes: GraphNode[], original?: ProcessLike | null): ProcessLike {
  const out: ProcessLike = { ...(original ?? {}), process: {} };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const previous = original?.process ?? {};

  const spec = (id: string): ProcessLike['process'][string] => {
    const node = byId.get(id)!;
    const written: ProcessLike['process'][string] = {};
    if (node.op) written.op = node.op;
    if (node.requires.length) written.require = [...node.requires];
    if (node.options !== undefined) written.options = node.options;
    return written;
  };

  // One pass over the original key order, taking each entry from the canvas if
  // it was on it and from the file if it was not. Two passes would hoist every
  // drawn node above every carrier, which reorders a file nobody edited.
  for (const id of Object.keys(previous)) {
    out.process[id] = byId.has(id) ? spec(id) : previous[id];
  }

  // Then whatever the canvas has that the file did not.
  for (const node of nodes) {
    if (!out.process[node.id]) out.process[node.id] = spec(node.id);
  }

  return out;
}
