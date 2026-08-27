import { Injectable, signal } from '@angular/core';
import { BUILTIN_OPS, readGraph, writeGraph, type Graph, type GraphNode, type ProcessLike } from '@gestaltbi/editor';

/** A column as `structure.json` describes it, for the little we need of it. */
export interface ColumnHint {
  column: string;
  tags: string[];
}

const EMPTY: ProcessLike = { type: 'processing', version: '1', process: {} };

/**
 * The config being edited, and everything derived from it.
 *
 * One source of truth: the `ProcessLike` document. The canvas, the problems
 * panel and the export all read the graph computed from it, so nothing can
 * drift — a node dragged on screen changes only where it is drawn, and a node
 * rewired changes the document, which recomputes everything else.
 */
@Injectable({ providedIn: 'root' })
export class GraphService {
  readonly config = signal<ProcessLike>(EMPTY);
  readonly graph = signal<Graph>(readGraph(EMPTY, { includeSettings: true }));
  readonly selected = signal<string | null>(null);

  /** Column codes from the config's `structure.json`, when one was loaded. */
  readonly columns = signal<ColumnHint[]>([]);

  /** Where the config came from, for the toolbar to show. */
  readonly origin = signal<string>('a blank pipeline');

  load(config: ProcessLike, origin: string, columns: ColumnHint[] = []): void {
    this.config.set(config?.process ? config : EMPTY);
    this.columns.set(columns);
    this.origin.set(origin);
    this.selected.set(null);
    this.recompute();
  }

  /** Every process name in use, so a new one can avoid colliding. */
  names(): string[] {
    return Object.keys(this.config().process);
  }

  add(op: string, after?: string | null): string {
    const id = this.freeName(op);
    const info = BUILTIN_OPS[op];
    const next = this.clone();
    next.process[id] = {
      op,
      ...(after ? { require: [after] } : {}),
      ...(info ? {} : {}),
    };
    this.config.set(next);
    this.recompute();
    this.selected.set(id);
    return id;
  }

  remove(id: string): void {
    const next = this.clone();
    delete next.process[id];
    // A process that required it would now name nothing, which is an error the
    // graph would report on every render. Drop the edge with the node.
    for (const spec of Object.values(next.process)) {
      if (spec.require?.includes(id)) spec.require = spec.require.filter((r) => r !== id);
      if (spec.require && !spec.require.length) delete spec.require;
    }
    this.config.set(next);
    if (this.selected() === id) this.selected.set(null);
    this.recompute();
  }

  rename(from: string, to: string): boolean {
    const clean = to.trim();
    if (!clean || clean === from || this.config().process[clean]) return false;
    const next = this.clone();
    // Rebuild in place so the key keeps its position in the file.
    const rebuilt: ProcessLike['process'] = {};
    for (const [id, spec] of Object.entries(next.process)) rebuilt[id === from ? clean : id] = spec;
    next.process = rebuilt;
    for (const spec of Object.values(next.process)) {
      if (spec.require) spec.require = spec.require.map((r) => (r === from ? clean : r));
    }
    this.config.set(next);
    this.selected.set(clean);
    this.recompute();
    return true;
  }

  connect(from: string, to: string, socket: number): void {
    const next = this.clone();
    const spec = next.process[to];
    if (!spec) return;
    const requires = [...(spec.require ?? [])];
    requires[socket] = from;
    spec.require = requires.filter(Boolean);
    this.config.set(next);
    this.recompute();
  }

  disconnect(from: string, to: string): void {
    const next = this.clone();
    const spec = next.process[to];
    if (!spec?.require) return;
    spec.require = spec.require.filter((r) => r !== from);
    if (!spec.require.length) delete spec.require;
    this.config.set(next);
    this.recompute();
  }

  setOptions(id: string, options: any): void {
    const next = this.clone();
    if (!next.process[id]) return;
    if (options === undefined) delete next.process[id].options;
    else next.process[id].options = options;
    this.config.set(next);
    this.recompute();
  }

  node(id: string | null): GraphNode | undefined {
    return id ? this.graph().nodes.find((n) => n.id === id) : undefined;
  }

  /** The document as it would be written, which is what export hands over. */
  export(): ProcessLike {
    return writeGraph(this.graph().nodes, this.config());
  }

  private recompute(): void {
    // Settings carriers are kept on the canvas here, unlike the read-only view
    // in the product: this is where somebody edits them, so hiding them would
    // make them uneditable.
    this.graph.set(readGraph(this.config(), { includeSettings: true }));
  }

  private clone(): ProcessLike {
    return JSON.parse(JSON.stringify(this.config()));
  }

  private freeName(op: string): string {
    const taken = new Set(this.names());
    if (!taken.has(op)) return op;
    for (let i = 2; ; i++) {
      const candidate = `${op}_${i}`;
      if (!taken.has(candidate)) return candidate;
    }
  }
}
