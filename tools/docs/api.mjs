import ts from 'typescript';
import { readFileSync } from 'node:fs';

/**
 * The public API, read from the source rather than described beside it.
 *
 * Documentation that is maintained by hand drifts from the code the first time
 * somebody is in a hurry, and the drift is invisible — a wrong signature reads
 * exactly like a right one. So the reference below is extracted from
 * `src/index.ts` through the TypeScript compiler at build time: if an export is
 * renamed, the page changes with it, and if one is added and left undocumented
 * it still appears.
 */

const KIND_ORDER = ['function', 'class', 'interface', 'type', 'const', 'namespace'];

/** Everything `src/index.ts` re-exports, in a shape a template can render. */
export function readApi(entry, tsconfig = 'tsconfig.build.json') {
  const config = ts.parseJsonConfigFileContent(
    ts.parseConfigFileTextToJson(tsconfig, readFileSync(tsconfig, 'utf8')).config,
    ts.sys,
    process.cwd(),
  );
  const program = ts.createProgram([entry], { ...config.options, noEmit: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  if (!source) throw new Error(`entry not found: ${entry}`);

  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`${entry} is not a module`);

  const items = [];
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declaration = resolved.declarations?.[0];
    if (!declaration) continue;

    const item = describe(symbol.getName(), declaration, checker);
    if (item) items.push(item);
  }

  items.sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name),
  );
  return items;
}

function describe(name, declaration, checker) {
  const file = declaration.getSourceFile();
  // A namespace re-export (`export * as tags`) resolves to the whole file.
  if (ts.isSourceFile(declaration)) {
    return { name, kind: 'namespace', signature: `namespace ${name}`, doc: fileDoc(declaration), members: [] };
  }

  const kind = kindOf(declaration);
  if (!kind) return null;

  return {
    name,
    kind,
    signature: signatureOf(declaration),
    doc: docOf(declaration),
    members: kind === 'class' || kind === 'interface' ? membersOf(declaration) : [],
    file: file.fileName.split('/').slice(-1)[0],
  };
}

function kindOf(d) {
  if (ts.isFunctionDeclaration(d)) return 'function';
  if (ts.isClassDeclaration(d)) return 'class';
  if (ts.isInterfaceDeclaration(d)) return 'interface';
  if (ts.isTypeAliasDeclaration(d)) return 'type';
  if (ts.isVariableDeclaration(d)) return 'const';
  if (ts.isEnumDeclaration(d)) return 'type';
  return null;
}

/** The declaration without its implementation: what a caller needs to know. */
function signatureOf(d) {
  if (ts.isFunctionDeclaration(d)) {
    const text = d.getText();
    const body = d.body ? text.indexOf('{', text.indexOf(')')) : -1;
    return clean((body > 0 ? text.slice(0, body) : text).replace(/^export\s+/, ''));
  }
  if (ts.isVariableDeclaration(d)) {
    const type = d.type ? `: ${d.type.getText()}` : '';
    return clean(`const ${d.name.getText()}${type}`);
  }
  if (ts.isClassDeclaration(d)) {
    const heritage = d.heritageClauses?.map((h) => h.getText()).join(' ') ?? '';
    return clean(`class ${d.name?.getText() ?? ''} ${heritage}`);
  }
  if (ts.isInterfaceDeclaration(d)) {
    const heritage = d.heritageClauses?.map((h) => h.getText()).join(' ') ?? '';
    return clean(`interface ${d.name.getText()}${typeParams(d)} ${heritage}`);
  }
  if (ts.isTypeAliasDeclaration(d)) {
    return clean(`type ${d.name.getText()}${typeParams(d)} = ${d.type.getText()}`);
  }
  return clean(d.getText().replace(/^export\s+/, ''));
}

const typeParams = (d) =>
  d.typeParameters?.length ? `<${d.typeParameters.map((p) => p.getText()).join(', ')}>` : '';

/** Members worth listing: the ones a caller can actually reach. */
function membersOf(d) {
  const out = [];
  for (const m of d.members ?? []) {
    const isPrivate = m.modifiers?.some(
      (x) => x.kind === ts.SyntaxKind.PrivateKeyword || x.kind === ts.SyntaxKind.ProtectedKeyword,
    );
    if (isPrivate || !m.name) continue;

    if (ts.isPropertySignature(m) || ts.isPropertyDeclaration(m)) {
      const optional = m.questionToken ? '?' : '';
      out.push({ name: m.name.getText(), signature: clean(`${m.name.getText()}${optional}: ${m.type?.getText() ?? 'any'}`), doc: docOf(m) });
    } else if (ts.isMethodSignature(m) || ts.isMethodDeclaration(m)) {
      const text = m.getText();
      const body = m.body ? text.indexOf('{', text.indexOf(')')) : -1;
      out.push({ name: m.name.getText(), signature: clean(body > 0 ? text.slice(0, body) : text), doc: docOf(m) });
    }
  }
  return out;
}

/** The JSDoc, minus the tags — prose only, which is what a page wants. */
function docOf(node) {
  const parts = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  const comment = parts.map((p) => (typeof p.comment === 'string' ? p.comment : ts.getTextOfJSDocComment(p.comment) ?? '')).join('\n\n');
  return comment.trim();
}

/** A namespace export documents itself with the file's leading comment. */
function fileDoc(source) {
  const text = source.getFullText();
  const match = text.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (!match) return '';
  return match[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*ic?/, '').replace(/^\s*\*/, '').trim())
    .join('\n')
    .trim();
}

const clean = (s) => s.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
