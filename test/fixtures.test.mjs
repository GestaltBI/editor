import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { readGraph, writeGraph } from '../dist/index.js';

/**
 * The configs this actually has to open.
 *
 * A graph editor is only useful if it can be pointed at what already exists, so
 * these are the three shipped bundles verbatim. The round-trip assertion is the
 * one that matters: an editor that quietly drops what it did not understand is
 * one nobody can safely open a real config with.
 */

const FIXTURES = readdirSync(new URL('../fixtures/', import.meta.url))
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(new URL(`../fixtures/${f}`, import.meta.url), 'utf8'))]);

describe('the shipped configs', () => {
  test('there are three of them', () => {
    assert.deepEqual(FIXTURES.map(([n]) => n).sort(), ['bundled', 'everpix', 'kickstarter']);
  });

  for (const [name, config] of FIXTURES) {
    test(`${name}: opens without a problem`, () => {
      const g = readGraph(config);
      assert.deepEqual(g.problems, [], `${name} should be a clean graph`);
      assert.ok(g.nodes.length > 0);
    });

    test(`${name}: round-trips byte-identical`, () => {
      const g = readGraph(config, { includeSettings: true });
      assert.equal(JSON.stringify(writeGraph(g.nodes, config)), JSON.stringify(config));
    });

    test(`${name}: round-trips with settings carriers off the canvas too`, () => {
      const g = readGraph(config);
      assert.equal(JSON.stringify(writeGraph(g.nodes, config)), JSON.stringify(config));
    });

    test(`${name}: every stage sits right of what it reads`, () => {
      const g = readGraph(config);
      const depth = new Map(g.nodes.map((n) => [n.id, n.depth]));
      for (const e of g.edges) {
        assert.ok(depth.get(e.to) > depth.get(e.from), `${e.to} must sit right of ${e.from}`);
      }
    });

    test(`${name}: separates stages from settings`, () => {
      const all = readGraph(config, { includeSettings: true }).nodes;
      const stages = readGraph(config).nodes;
      const carriers = all.filter((n) => n.settings).length;
      assert.ok(carriers > 0, 'every shipped config carries settings this way');
      assert.equal(stages.length + carriers, all.length);
      assert.ok(stages.every((n) => !n.settings));
    });
  }
});
