/**
 * What a node is for, in the reader's terms rather than the engine's.
 *
 * The op key says which class runs; this says what it does to the data, which
 * is what somebody looking at a pipeline for the first time needs. Nodes of a
 * kind can share a colour and an icon without a host knowing sixteen op names.
 */
export type NodeKind =
  | 'prepare'
  | 'narrow'
  | 'derive'
  | 'summarise'
  | 'combine'
  | 'relate'
  | 'place'
  | 'check'
  | 'settings'
  | 'unknown';

/** One process, placed and described. */
export interface GraphNode {
  /** The process name, which is its key in `processing.json`. */
  id: string;
  op?: string;
  kind: NodeKind;
  /** Plain-language summary. A host with translations should prefer its own. */
  summary: string;
  /** Processes this one reads, in the order it named them. */
  requires: string[];
  /** How many inputs the op reads. Sockets to draw. */
  inputs: number;
  options?: any;
  /**
   * True for an entry that carries settings rather than running.
   *
   * Around a third of every shipped config: `conf_*` entries declaring an op
   * that is not registered. They belong beside the view they configure, not on
   * the canvas, and a host is expected to filter them out.
   */
  settings: boolean;
  /** Nothing requires this, so it is something a view subscribes to. */
  leaf: boolean;
  /** Layout: how far downstream, counted in stages from the raw frame. */
  depth: number;
  /** Layout: position within the depth, chosen to keep edges short. */
  lane: number;
}

/**
 * One dataflow edge, and which of the target's sockets it feeds.
 */
export interface GraphEdge {
  from: string;
  to: string;
  /** Which input socket of `to` this feeds. */
  socket: number;
}

/** Something about the graph a person should be told. */
export interface Problem {
  /** `error` means it will not run. `warning` means it will, surprisingly. */
  severity: 'error' | 'warning';
  code: 'cycle' | 'missing-require' | 'unknown-op' | 'too-many-inputs' | 'orphan';
  /** The process it is about. */
  node: string;
  message: string;
}

/**
 * A whole config, ready to draw: the nodes placed, the edges between them,
 * and everything wrong with it.
 */
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  problems: Problem[];
  /** Number of stages, so a host can size a canvas without walking the nodes. */
  depth: number;
  lanes: number;
}

/**
 * What this host knows that the package cannot assume.
 */
export interface ReadOptions {
  /**
   * How many inputs each op reads, keyed by op name.
   *
   * Defaults to the built-in ops. Pass your own when the host registers extras,
   * so a custom two-input op is drawn with two sockets instead of being
   * reported as over-wired.
   */
  arity?: Record<string, number>;
  /** Ops that exist but carry settings rather than running. Default: `noop`. */
  settingsOps?: string[];
  /** Include settings carriers as nodes. Off by default: they are not stages. */
  includeSettings?: boolean;
}
