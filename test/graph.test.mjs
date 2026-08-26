import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readGraph, writeGraph, BUILTIN_OPS } from '../dist/index.js';

const config = (process) => ({ type: 'processing', version: '1', name: 'test', process });

const CHAIN = config({
  format: { op: 'format', options: { dateTag: 'uatu:date' } },
  clean: { op: 'clear', require: ['format'] },
  by_month: { op: 'aggregate', require: ['clean'], options: { groupby: ['uatu:date'] } },
  conf_table: { op: 'noop', options: { columnDefs: [] } },
});

const node = (g, id) => g.nodes.find((n) => n.id === id);

describe('reading a config as a graph', () => {
  test('every stage becomes a node, described in the reader’s terms', () => {
    const g = readGraph(CHAIN);
    assert.equal(g.nodes.length, 3, 'the settings carrier is not a stage');
    assert.equal(node(g, 'format').kind, 'prepare');
    assert.equal(node(g, 'by_month').kind, 'summarise');
    assert.match(node(g, 'by_month').summary, /Rolls the rows up/);
  });

  test('require becomes an edge, onto a numbered socket', () => {
    const g = readGraph(CHAIN);
    assert.deepEqual(
      g.edges.map((e) => `${e.from}->${e.to}#${e.socket}`),
      ['format->clean#0', 'clean->by_month#0'],
    );
  });

  test('a leaf is a stage nothing else reads', () => {
    const g = readGraph(CHAIN);
    assert.equal(node(g, 'by_month').leaf, true);
    assert.equal(node(g, 'clean').leaf, false);
  });

  test('settings carriers can be asked for, and know what they are', () => {
    const g = readGraph(CHAIN, { includeSettings: true });
    assert.equal(g.nodes.length, 4);
    const conf = node(g, 'conf_table');
    assert.equal(conf.settings, true);
    assert.equal(conf.kind, 'settings');
    assert.equal(conf.leaf, false, 'a carrier is not something a view subscribes to');
  });

  test('an op carries its arity, so a host knows how many sockets to draw', () => {
    const g = readGraph(config({ a: { op: 'clear' }, j: { op: 'join', require: ['a'] } }));
    assert.equal(node(g, 'a').inputs, 1);
    assert.equal(node(g, 'j').inputs, 2);
  });

  test('a host’s own ops can be declared', () => {
    const g = readGraph(config({ a: { op: 'clear' }, m: { op: 'mine', require: ['a'] } }), {
      arity: { mine: 1 },
    });
    assert.equal(node(g, 'm').inputs, 1);
    assert.deepEqual(g.problems, [], 'a declared op is not an unknown one');
  });

  test('an empty or absent config is an empty graph, not a crash', () => {
    for (const input of [null, undefined, {}, { process: {} }]) {
      const g = readGraph(input);
      assert.deepEqual(g.nodes, []);
      assert.equal(g.depth, 0);
    }
  });
});

describe('layout', () => {
  test('a node always sits to the right of everything it reads', () => {
    const g = readGraph(CHAIN);
    assert.equal(node(g, 'format').depth, 0);
    assert.equal(node(g, 'clean').depth, 1);
    assert.equal(node(g, 'by_month').depth, 2);
    assert.equal(g.depth, 3);
  });

  test('depth is the longest path, so a shortcut does not pull a node left', () => {
    // d reads both a (depth 0) and c (depth 2); it must sit after c.
    const g = readGraph(config({
      a: { op: 'clear' },
      b: { op: 'clear', require: ['a'] },
      c: { op: 'clear', require: ['b'] },
      d: { op: 'union', require: ['a', 'c'] },
    }));
    assert.equal(node(g, 'd').depth, 3);
  });

  test('branches get their own lanes', () => {
    const g = readGraph(config({
      a: { op: 'clear' },
      b: { op: 'aggregate', require: ['a'] },
      c: { op: 'aggregate', require: ['a'] },
    }));
    assert.equal(node(g, 'a').lane, 0);
    assert.deepEqual([node(g, 'b').lane, node(g, 'c').lane].sort(), [0, 1]);
    assert.equal(g.lanes, 2);
  });

  test('the same config always lays out the same way', () => {
    const once = readGraph(CHAIN).nodes.map((n) => `${n.id}@${n.depth},${n.lane}`);
    const twice = readGraph(CHAIN).nodes.map((n) => `${n.id}@${n.depth},${n.lane}`);
    assert.deepEqual(once, twice, 'positions are derived, so they never need storing');
  });
});

describe('problems are reported, not thrown', () => {
  test('a cycle is named and the rest still lays out', () => {
    const g = readGraph(config({
      a: { op: 'clear', require: ['b'] },
      b: { op: 'clear', require: ['a'] },
      c: { op: 'clear' },
    }));
    const cycle = g.problems.find((p) => p.code === 'cycle');
    assert.ok(cycle, 'the cycle must be reported');
    assert.match(cycle.message, /a -> b -> a|b -> a -> b/);
    assert.equal(g.nodes.length, 3, 'a broken graph is exactly the one you need to see');
  });

  test('a require naming nothing is an error, and the edge is dropped', () => {
    const g = readGraph(config({ a: { op: 'clear', require: ['ghost'] } }));
    assert.equal(g.problems[0].code, 'missing-require');
    assert.deepEqual(g.edges, []);
  });

  test('too many inputs is an error rather than a dropped branch', () => {
    const g = readGraph(config({
      a: { op: 'clear' },
      b: { op: 'clear' },
      c: { op: 'aggregate', require: ['a', 'b'] },
    }));
    const p = g.problems.find((x) => x.code === 'too-many-inputs');
    assert.match(p.message, /wires 2 inputs into op "aggregate", which reads 1/);
  });

  test('an op nobody has heard of is a warning, not a refusal to draw', () => {
    const g = readGraph(config({ a: { op: 'wat' } }));
    assert.equal(g.problems[0].severity, 'warning');
    assert.equal(node(g, 'a').kind, 'unknown');
  });

  test('a config that is fine reports nothing', () => {
    assert.deepEqual(readGraph(CHAIN).problems, []);
  });
});

describe('writing back', () => {
  test('a round trip changes nothing', () => {
    const g = readGraph(CHAIN, { includeSettings: true });
    assert.deepEqual(writeGraph(g.nodes, CHAIN), CHAIN);
  });

  test('what the canvas never held is put back', () => {
    const g = readGraph(CHAIN);   // conf_table filtered out
    const out = writeGraph(g.nodes, CHAIN);
    assert.deepEqual(out.process.conf_table, CHAIN.process.conf_table);
    assert.equal(out.version, '1', 'top-level keys survive too');
  });

  test('key order follows the original, so a diff stays readable', () => {
    const g = readGraph(CHAIN);
    assert.deepEqual(Object.keys(writeGraph(g.nodes, CHAIN)), Object.keys(CHAIN));
    assert.deepEqual(Object.keys(writeGraph(g.nodes, CHAIN).process), Object.keys(CHAIN.process));
  });

  test('a new node is appended', () => {
    const g = readGraph(CHAIN);
    g.nodes.push({
      id: 'extra', op: 'correlate', kind: 'relate', summary: '', requires: ['clean'],
      inputs: 1, settings: false, leaf: true, depth: 2, lane: 1,
    });
    const out = writeGraph(g.nodes, CHAIN);
    assert.deepEqual(out.process.extra, { op: 'correlate', require: ['clean'] });
  });

  test('writing without the original still produces a usable config', () => {
    const out = writeGraph(readGraph(CHAIN).nodes);
    assert.deepEqual(Object.keys(out.process), ['format', 'clean', 'by_month']);
  });
});

describe('the op catalogue', () => {
  test('every built-in op says what it does', () => {
    for (const [name, info] of Object.entries(BUILTIN_OPS)) {
      assert.ok(info.summary.length > 10, `${name} needs a summary`);
      assert.ok(info.kind, `${name} needs a kind`);
      assert.ok(info.inputs >= 1, `${name} needs an arity`);
    }
  });
});
