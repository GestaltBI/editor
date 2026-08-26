import type { NodeKind } from './types.js';

/**
 * What the built-in ops are, grouped by what they do to the data.
 *
 * Kept here rather than in `@gestaltbi/stream` because it is presentation: the
 * engine needs to know that `aggregate` is a class, not that it belongs beside
 * `pivot` under a heading a person would recognise. A host registering its own
 * ops passes its own entries alongside these.
 */
export interface OpInfo {
  kind: NodeKind;
  /** How many processes it reads. */
  inputs: number;
  /** One line, in the reader's terms. */
  summary: string;
}

/**
 * Every op `@gestaltbi/stream` registers, described for a reader.
 */
export const BUILTIN_OPS: Record<string, OpInfo> = {
  format: { kind: 'prepare', inputs: 1, summary: 'Reads the dates and numbers out of the text a CSV arrives as' },
  clear: { kind: 'prepare', inputs: 1, summary: 'Drops rows with no identity, so padding is not counted as data' },

  globalfilter: { kind: 'narrow', inputs: 1, summary: 'Applies the filter every view on the page shares' },
  localfilter: { kind: 'narrow', inputs: 1, summary: 'Applies the filter belonging to this view alone' },

  enhance: { kind: 'derive', inputs: 1, summary: 'Adds columns worked out from the ones already there' },
  diffcalc: { kind: 'derive', inputs: 1, summary: 'Turns levels into the change between one period and the next' },
  recognize: { kind: 'derive', inputs: 1, summary: 'Spreads an amount across the periods it actually pays for' },

  aggregate: { kind: 'summarise', inputs: 1, summary: 'Rolls the rows up, one per group' },
  pivot: { kind: 'summarise', inputs: 1, summary: 'Cross-tabulates: groups down the side, groups across the top' },
  cohort: { kind: 'summarise', inputs: 1, summary: 'Lines groups up by age rather than by date' },

  join: { kind: 'combine', inputs: 2, summary: 'Brings a second frame’s columns onto these rows, matched on a key' },
  union: { kind: 'combine', inputs: Number.MAX_SAFE_INTEGER, summary: 'Stacks several frames into one' },

  correlate: { kind: 'relate', inputs: 1, summary: 'Scores how strongly columns move together' },

  geocode: { kind: 'place', inputs: 1, summary: 'Attaches coordinates by looking rows up in a reference file' },
  geojsonify: { kind: 'place', inputs: 1, summary: 'Turns rows into map features' },
  heatmap: { kind: 'place', inputs: 1, summary: 'Reserved: passes the frame through untouched' },
  regionify: { kind: 'place', inputs: 1, summary: 'Reserved: passes the frame through untouched' },

  assert: { kind: 'check', inputs: 1, summary: 'Tests the claims this data is supposed to support' },
};

/** Ops that exist to carry settings rather than to run. */
export const SETTINGS_OPS = ['noop'];

/** Arity for every built-in op, in the shape {@link ReadOptions.arity} wants. */
export const BUILTIN_ARITY: Record<string, number> = Object.fromEntries(
  Object.entries(BUILTIN_OPS).map(([name, info]) => [name, info.inputs]),
);
