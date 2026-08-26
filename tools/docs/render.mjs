import { CSS } from './css.mjs';

/**
 * The page itself.
 *
 * One self-contained file: a docs site that needs a build step to read is a
 * docs site that stops working. Tokens are lifted from gestaltbi-core so the
 * three libraries, the product and the org site are visibly the same thing.
 */

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** `code`, **bold**, *italic* and [text](href) — all the prose here needs. */
const inline = (s) =>
  esc(s)
    // Code first, so emphasis markers inside a span stay literal.
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');

const para = (doc) =>
  String(doc ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p).replace(/\n/g, ' ')}</p>`)
    .join('\n');

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const KIND_LABEL = {
  function: 'fn', class: 'class', interface: 'interface',
  type: 'type', const: 'const', namespace: 'namespace',
};

export function render({ pkg, tagline, blurb, sections, api, siblings, npm, repo }) {
  const apiByKind = new Map();
  for (const item of api) {
    if (!apiByKind.has(item.kind)) apiByKind.set(item.kind, []);
    apiByKind.get(item.kind).push(item);
  }

  const toc = [
    ...sections.map((s) => `<li><a href="#${slug(s.title)}">${esc(s.title)}</a></li>`),
    `<li class="toc__group">Reference</li>`,
    ...[...apiByKind].map(
      ([kind, items]) =>
        `<li><a href="#api-${kind}">${esc(kindHeading(kind))}<span class="toc__count">${items.length}</span></a></li>`,
    ),
  ].join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(pkg)} — GestaltBI</title>
<meta name="description" content="${esc(tagline)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Funnel+Sans:ital,wght@0,300..700;1,300..600&display=swap" rel="stylesheet" />
<style>
${CSS}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="top">
  <div class="top__inner">
    <a class="brand" href="https://github.com/GestaltBI">
      <span class="brand__mark" aria-hidden="true"></span>
      <span class="brand__text">
        <span class="brand__name">GestaltBI</span>
        <span class="brand__tag">la forma all’origine del significato</span>
      </span>
    </a>
    <nav class="top__nav">
      ${siblings.map((s) => `<a href="${s.href}"${s.current ? ' aria-current="page"' : ''}>${esc(s.name)}</a>`).join('\n      ')}
      <a class="top__ext" href="${repo}">GitHub</a>
    </nav>
  </div>
</header>

<div class="shell">
  <aside class="side">
    <nav aria-label="On this page">
      <ul class="toc">${toc}</ul>
    </nav>
  </aside>

  <main id="main">
    <section class="hero">
      <p class="hero__eyebrow">${esc(kindOfPackage(pkg))}</p>
      <h1 class="hero__title">${esc(pkg)}</h1>
      <p class="hero__tagline">${inline(tagline)}</p>
      ${para(blurb)}
      <div class="install">
        <code>npm install ${esc(pkg)}</code>
        <a class="install__npm" href="${npm}">on npm →</a>
      </div>
    </section>

    ${sections.map(renderSection).join('\n')}

    <section class="api">
      <h2 class="rule" id="reference">Reference</h2>
      <p class="api__note">
        Extracted from <code>src/index.ts</code> when this page was built, so it
        cannot drift from what the package actually exports.
      </p>
      ${[...apiByKind].map(([kind, items]) => renderKind(kind, items)).join('\n')}
    </section>

    <footer class="foot">
      <p>
        <a href="${repo}">${esc(repo.replace('https://github.com/', ''))}</a> ·
        <a href="${npm}">${esc(pkg)}</a> ·
        MIT
      </p>
      <p class="foot__sibs">
        Part of GestaltBI:
        ${siblings.map((s) => `<a href="${s.href}">${esc(s.name)}</a>`).join(' · ')}
      </p>
    </footer>
  </main>
</div>

<script>
// Mark the section currently in view, so the sidebar says where you are.
const links = new Map([...document.querySelectorAll('.toc a')].map((a) => [a.getAttribute('href').slice(1), a]));
const seen = new Set();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id);
  let active = null;
  for (const [id, a] of links) { a.classList.remove('is-active'); if (!active && seen.has(id)) active = a; }
  if (active) active.classList.add('is-active');
}, { rootMargin: '-72px 0px -70% 0px' });
for (const id of links.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }
</script>
</body>
</html>
`;
}

const kindOfPackage = (pkg) => pkg.split('/')[1] ?? pkg;

function kindHeading(kind) {
  return {
    function: 'Functions', class: 'Classes', interface: 'Interfaces',
    type: 'Types', const: 'Constants', namespace: 'Namespaces',
  }[kind] ?? kind;
}

function renderSection(s) {
  return `
    <section class="prose" id="${slug(s.title)}">
      <h2 class="rule">${esc(s.title)}</h2>
      ${s.body}
    </section>`;
}

function renderKind(kind, items) {
  return `
      <h3 class="api__kind" id="api-${kind}">${esc(kindHeading(kind))}</h3>
      <div class="api__list">
        ${items.map(renderItem).join('\n')}
      </div>`;
}

function renderItem(item) {
  const members = item.members?.length
    ? `<dl class="members">${item.members
        .map(
          (m) => `<dt><code>${esc(m.signature)}</code></dt>${m.doc ? `<dd>${para(m.doc)}</dd>` : ''}`,
        )
        .join('')}</dl>`
    : '';

  return `<article class="entry" id="${slug(item.name)}">
          <header class="entry__head">
            <h4 class="entry__name"><a href="#${slug(item.name)}">${esc(item.name)}</a></h4>
            <span class="chip chip--${item.kind}">${esc(KIND_LABEL[item.kind] ?? item.kind)}</span>
          </header>
          <pre class="sig"><code>${esc(item.signature)}</code></pre>
          ${item.doc ? `<div class="entry__doc">${para(item.doc)}</div>` : '<p class="entry__undoc">No description in the source.</p>'}
          ${members}
        </article>`;
}

/** Helpers a content file can use so its HTML stays readable. */
export const h = {
  p: (...ps) => ps.map((p) => `<p>${inline(p)}</p>`).join('\n'),
  code: (lang, body) => `<pre class="block"><code data-lang="${esc(lang)}">${esc(body.trim())}</code></pre>`,
  note: (body) => `<aside class="note">${inline(body)}</aside>`,
  list: (...items) => `<ul class="bullets">${items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`,
  table: (head, rows) =>
    `<div class="tablewrap"><table><thead><tr>${head.map((h2) => `<th>${inline(h2)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></div>`,
  h3: (t) => `<h3>${inline(t)}</h3>`,
};
