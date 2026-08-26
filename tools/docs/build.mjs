import { mkdirSync, writeFileSync } from 'node:fs';
import { readApi } from './api.mjs';
import { render } from './render.mjs';

/**
 * Build this package's documentation page.
 *
 *   node tools/docs/build.mjs
 *
 * Writes a single self-contained `docs/index.html`. The prose lives in
 * `content.mjs`; the reference is read out of `src/index.ts` so it cannot
 * describe an API the package no longer has.
 */

const { meta, sections } = await import('./content.mjs');

/** The three libraries know about each other, so a reader can move between them. */
const LIBRARIES = [
  { name: 'stream', href: 'https://gestaltbi.github.io/stream/' },
  { name: 'storybook', href: 'https://gestaltbi.github.io/storybook/' },
  { name: 'inference', href: 'https://gestaltbi.github.io/inference/' },
];

const api = readApi('src/index.ts');
const siblings = LIBRARIES.map((l) => ({ ...l, current: meta.pkg.endsWith(`/${l.name}`) }));

mkdirSync('docs', { recursive: true });
writeFileSync('docs/index.html', render({ ...meta, sections, api, siblings }));
// Pages would otherwise hand the directory to Jekyll, which drops what it does
// not recognise. Nothing here needs building twice.
writeFileSync('docs/.nojekyll', '');

console.log(`docs/index.html — ${sections.length} sections, ${api.length} exports`);
