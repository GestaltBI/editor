export const CSS = String.raw`
/* GestaltBI design tokens — the same set as gestaltbi-core and the org site. */
:root {
  --bg: oklch(98.5% 0.005 240);
  --bg-tinted: oklch(97% 0.012 245);
  --surface: oklch(96% 0.008 240);
  --surface-2: oklch(93% 0.012 240);
  --rule: oklch(85% 0.014 240);
  --rule-strong: oklch(72% 0.020 240);

  --ink: oklch(18% 0.024 245);
  --ink-soft: oklch(34% 0.022 245);
  --ink-muted: oklch(52% 0.018 245);
  --ink-faint: oklch(68% 0.014 245);

  --brand-deep: oklch(38% 0.18 248);
  --brand-blue: oklch(55% 0.19 232);
  --brand-teal: oklch(64% 0.16 195);
  --brand-green: oklch(72% 0.20 148);
  --brand-yellow: oklch(83% 0.18 92);
  --brand-orange: oklch(66% 0.20 50);
  --brand-red: oklch(58% 0.22 28);

  --accent: oklch(60% 0.18 38);
  --accent-strong: oklch(50% 0.20 35);
  --accent-soft: oklch(94% 0.05 38);

  --focus: oklch(58% 0.20 248);
  --focus-glow: oklch(58% 0.20 248 / 0.25);

  --spectrum: linear-gradient(105deg,
    var(--brand-deep) 0%, var(--brand-blue) 16%, var(--brand-teal) 32%,
    var(--brand-green) 50%, var(--brand-yellow) 68%, var(--brand-orange) 84%,
    var(--brand-red) 100%);

  --font-display: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Funnel Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, 'SFMono-Regular', 'Cascadia Mono', Consolas, monospace;

  --leading-tight: 1.05;
  --leading-snug: 1.25;
  --leading-base: 1.6;
  --letter-tight: -0.022em;
  --letter-wide: 0.04em;

  --r-sm: 8px; --r-md: 12px; --r-lg: 18px; --r-pill: 9999px;
  --shadow-sm: 0 1px 2px oklch(20% 0.06 245 / 0.08);

  --side-w: 232px;
  --top-h: 60px;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: oklch(15% 0.014 245);
    --bg-tinted: oklch(18% 0.018 245);
    --surface: oklch(20% 0.016 245);
    --surface-2: oklch(24% 0.018 245);
    --rule: oklch(34% 0.020 245);
    --rule-strong: oklch(46% 0.024 245);

    --ink: oklch(96% 0.008 245);
    --ink-soft: oklch(82% 0.012 245);
    --ink-muted: oklch(64% 0.016 245);
    --ink-faint: oklch(48% 0.018 245);

    --brand-deep: oklch(50% 0.20 248);
    --brand-blue: oklch(64% 0.20 232);
    --brand-teal: oklch(70% 0.16 195);
    --brand-green: oklch(76% 0.20 148);
    --brand-yellow: oklch(86% 0.18 92);
    --brand-orange: oklch(72% 0.20 50);
    --brand-red: oklch(66% 0.22 28);

    --accent: oklch(68% 0.18 38);
    --accent-strong: oklch(76% 0.16 38);
    --accent-soft: oklch(28% 0.07 38);
    color-scheme: dark;
  }
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 16.5px;
  line-height: var(--leading-base);
  -webkit-font-smoothing: antialiased;
}

/* The full spectrum, once, at the top of the page. */
body::before {
  content: '';
  position: fixed;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--spectrum);
  z-index: 60;
}

a { color: var(--accent-strong); text-decoration-thickness: 1px; text-underline-offset: 2px; }
a:hover { color: var(--accent); }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 3px; }

.skip {
  position: absolute; left: -9999px; top: 0; z-index: 100;
  background: var(--accent); color: #fff; padding: 10px 16px; border-radius: 0 0 var(--r-sm) 0;
}
.skip:focus { left: 0; }

/* ------------------------------------------------------------------- top --- */
.top {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in oklch, var(--bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--rule);
}
.top__inner {
  max-width: 1320px; margin: 0 auto; padding: 0 24px;
  height: var(--top-h); display: flex; align-items: center; gap: 24px;
}
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
.brand__mark {
  width: 22px; height: 22px; border-radius: 6px; background: var(--spectrum); flex: none;
}
.brand__text { display: flex; flex-direction: column; line-height: 1.1; }
.brand__name { font-family: var(--font-display); font-weight: 700; letter-spacing: var(--letter-tight); }
.brand__tag { font-size: 10.5px; color: var(--ink-faint); font-style: italic; }

.top__nav { margin-left: auto; display: flex; gap: 20px; align-items: center; font-size: 14px; }
.top__nav a { color: var(--ink-muted); text-decoration: none; font-family: var(--font-mono); }
.top__nav a:hover { color: var(--ink); }
.top__nav a[aria-current='page'] { color: var(--ink); font-weight: 600; }
.top__ext { color: var(--ink-faint) !important; }

/* ----------------------------------------------------------------- shell --- */
.shell {
  max-width: 1320px; margin: 0 auto; padding: 0 24px;
  display: grid; grid-template-columns: var(--side-w) minmax(0, 1fr); gap: 56px;
  align-items: start;
}
.side { position: sticky; top: calc(var(--top-h) + 16px); max-height: calc(100vh - var(--top-h) - 32px); overflow-y: auto; padding: 32px 0; }

.toc { list-style: none; margin: 0; padding: 0; font-size: 14px; }
.toc li { margin: 0; }
.toc a {
  display: flex; justify-content: space-between; gap: 8px;
  padding: 5px 10px; border-radius: var(--r-sm);
  color: var(--ink-muted); text-decoration: none;
}
.toc a:hover { background: var(--surface); color: var(--ink); }
.toc a.is-active { background: var(--accent-soft); color: var(--accent-strong); font-weight: 600; }
.toc__group {
  margin: 18px 0 4px; padding: 0 10px;
  font-size: 11px; text-transform: uppercase; letter-spacing: var(--letter-wide);
  color: var(--ink-faint); font-weight: 600;
}
.toc__count { color: var(--ink-faint); font-family: var(--font-mono); font-size: 11.5px; }

main { padding: 40px 0 96px; min-width: 0; }

/* ------------------------------------------------------------------ hero --- */
.hero { margin-bottom: 64px; }
.hero__eyebrow {
  margin: 0 0 10px; font-family: var(--font-mono); font-size: 12px;
  text-transform: uppercase; letter-spacing: var(--letter-wide); color: var(--ink-faint);
}
.hero__title {
  margin: 0; font-family: var(--font-display);
  font-size: clamp(2.6rem, 6vw, 4.1rem); line-height: var(--leading-tight);
  letter-spacing: var(--letter-tight); font-weight: 800;
}
.hero__tagline {
  margin: 18px 0 22px; font-size: clamp(1.15rem, 2vw, 1.4rem);
  line-height: var(--leading-snug); color: var(--ink-soft); max-width: 34ch;
}
.hero p { max-width: 68ch; }

.install {
  margin-top: 28px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px;
  padding: 14px 18px; border: 1px solid var(--rule); border-radius: var(--r-md);
  background: var(--surface); width: fit-content;
}
.install code { font-family: var(--font-mono); font-size: 14.5px; color: var(--ink); }
.install__npm { font-size: 13.5px; text-decoration: none; white-space: nowrap; }

/* ----------------------------------------------------------------- prose --- */
.prose, .api { margin-bottom: 60px; }
.prose p, .entry__doc p, .api__note { max-width: 68ch; }
.prose p { margin: 0 0 1em; }

h2.rule {
  margin: 0 0 24px; padding-bottom: 12px; border-bottom: 1px solid var(--rule);
  font-family: var(--font-display); font-size: clamp(1.6rem, 3vw, 2.1rem);
  line-height: var(--leading-snug); letter-spacing: var(--letter-tight); font-weight: 700;
}
.prose h3, .api__kind {
  margin: 40px 0 14px; font-family: var(--font-display); font-size: 1.22rem;
  letter-spacing: var(--letter-tight); font-weight: 600;
}
.api__kind {
  text-transform: uppercase; font-size: 12px; letter-spacing: var(--letter-wide);
  color: var(--ink-faint); font-family: var(--font-mono); font-weight: 600;
  border-top: 1px solid var(--rule); padding-top: 22px;
}
.api__note { color: var(--ink-muted); font-size: 14.5px; margin: 0 0 8px; }

code { font-family: var(--font-mono); font-size: 0.895em; }
p code, li code, td code, dt code {
  background: var(--surface-2); padding: 1px 5px; border-radius: 5px; color: var(--ink-soft);
}

pre.block, pre.sig {
  margin: 0 0 18px; padding: 16px 18px; overflow-x: auto;
  border: 1px solid var(--rule); border-radius: var(--r-md);
  background: var(--surface); font-size: 14px; line-height: 1.65;
}
pre code { background: none; padding: 0; color: var(--ink); }
/* A signature is one declaration, not a program: wrapping it keeps the whole
   thing on screen, where scrolling it sideways hides the return type. */
pre.sig {
  background: var(--bg-tinted); margin-bottom: 12px;
  overflow-x: visible; white-space: pre-wrap; word-break: break-word;
}

.note {
  margin: 0 0 18px; padding: 14px 18px; max-width: 68ch;
  border: 1px solid var(--rule); border-left-width: 1px;
  border-radius: var(--r-md); background: var(--accent-soft);
  font-size: 15px; color: var(--ink-soft);
}
.bullets { max-width: 68ch; padding-left: 1.15em; }
.bullets li { margin: 0 0 0.45em; }

.tablewrap { overflow-x: auto; margin: 0 0 20px; }
table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
th, td { text-align: left; padding: 9px 14px; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font-size: 11.5px; text-transform: uppercase; letter-spacing: var(--letter-wide); color: var(--ink-faint); }

/* ------------------------------------------------------------------- api --- */
.api__list { display: flex; flex-direction: column; gap: 26px; }
.entry { scroll-margin-top: calc(var(--top-h) + 20px); }
.entry__head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.entry__name { margin: 0; font-family: var(--font-mono); font-size: 1.02rem; font-weight: 600; }
.entry__name a { color: var(--ink); text-decoration: none; }
.entry__name a:hover { color: var(--accent); }
.entry__doc p { margin: 0 0 0.7em; color: var(--ink-soft); font-size: 15.2px; }
strong { font-weight: 600; color: var(--ink); }
em { font-style: italic; }
.entry__undoc { margin: 0; color: var(--ink-faint); font-size: 14px; font-style: italic; }

.chip {
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: var(--letter-wide);
  padding: 2px 8px; border-radius: var(--r-pill);
  background: var(--surface-2); color: var(--ink-muted);
}
.chip--function { background: color-mix(in oklch, var(--brand-blue) 16%, transparent); color: var(--brand-deep); }
.chip--class { background: color-mix(in oklch, var(--brand-green) 18%, transparent); color: oklch(38% 0.14 148); }
.chip--interface, .chip--type { background: color-mix(in oklch, var(--brand-teal) 18%, transparent); color: oklch(38% 0.12 195); }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .chip--class { color: var(--brand-green); }
  :root:not([data-theme='light']) .chip--interface,
  :root:not([data-theme='light']) .chip--type { color: var(--brand-teal); }
  :root:not([data-theme='light']) .chip--function { color: var(--brand-blue); }
}

.members { margin: 12px 0 0; padding: 14px 18px; border-left: 2px solid var(--rule); }
.members dt { margin: 0 0 2px; font-family: var(--font-mono); font-size: 13.5px; }
.members dt code { background: none; padding: 0; color: var(--ink-soft); }
.members dd { margin: 0 0 12px; color: var(--ink-muted); font-size: 14px; }
.members dd p { margin: 0; max-width: 64ch; }

/* ------------------------------------------------------------------ foot --- */
.foot {
  margin-top: 72px; padding-top: 24px; border-top: 1px solid var(--rule);
  font-size: 14px; color: var(--ink-muted);
}
.foot p { margin: 0 0 6px; }
.foot__sibs { color: var(--ink-faint); }

@media (max-width: 900px) {
  .shell { grid-template-columns: 1fr; gap: 0; }
  .side { position: static; max-height: none; padding: 24px 0 0; }
  .toc { display: flex; flex-wrap: wrap; gap: 4px; }
  .toc__group { width: 100%; margin: 12px 0 2px; }
  main { padding-top: 24px; }
  .brand__tag { display: none; }
}
`;
