// Türkçe metinleri L(...) çeviri çağrısına saran dönüştürücü (TypeScript AST).
// Kullanım: node scripts/i18n-codemod.cjs            -> kuru çalıştırma, katalog + rapor
//           node scripts/i18n-codemod.cjs --apply    -> dosyaları yeniden yazar
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const files = [
  ...fs.readdirSync(path.join(ROOT, 'src/engine')).filter((f) => f.endsWith('.ts')).map((f) => 'src/engine/' + f),
  ...fs.readdirSync(path.join(ROOT, 'src/ui')).filter((f) => /\.tsx?$/.test(f)).map((f) => 'src/ui/' + f),
  'App.tsx',
].filter((f) => !/theme\.ts$|rigMath\.ts$/.test(f));

const TRCH = /[çğıöşüÇĞİÖŞÜ]/;
const LETTER = /[A-Za-zçğıöşüÇĞİÖŞÜ]/;
const ATTR_OK = new Set(['label', 'desc', 'title', 'sub', 'kicker', 'placeholder', 'text', 'baslik', 'aciklama', 'metin', 'hint', 'name', 'right']);

function isText(s) {
  if (!LETTER.test(s)) return false;
  if (TRCH.test(s)) return true;
  const t = s.trim();
  if (!t) return false;
  if (/^[a-z][a-zA-Z0-9_\-]*$/.test(t)) return false; // tanımlayıcı, ikon adı, anahtar
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return false;
  if (/^[A-Z0-9_]{1,4}$/.test(t)) return false; // KO, UFC, PFL…
  if (!/\s/.test(t) && /[()\[\]{}=_\/@:%.]|^-|\d(deg|px|%)/.test(t)) return false; // stil/yol/kod
  if (/^[A-Z][a-z]+$/.test(t)) return true; // tek kelimelik etiket
  if (/^[A-ZÇĞİÖŞÜ ]{5,}$/.test(t)) return true; // BÜYÜK HARF başlık
  if (/\s/.test(t)) return true; // cümle
  return false;
}

function inSkippedContext(node) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  if (ts.isLiteralTypeNode(p)) return true;
  if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p)) && p.name === node) return true;
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
  if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && (p.expression.text === 'require' || p.expression.text === 'L')) return true;
  if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && /^(toLocale(Upper|Lower)Case|toLocaleString|getItem|setItem|removeItem|localeCompare|padStart|padEnd|split|join|replace)$/.test(p.expression.name.text)) return true;
  if (ts.isJsxAttribute(p)) return !ATTR_OK.has(p.name.getText());
  if (ts.isCaseClause(p)) return true;
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.InKeyword) return true;
  return false;
}

const catalog = new Map(); // key -> [dosya]
let total = 0;

function processFile(rel) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let changed = 0;

  const note = (key) => {
    total++;
    changed++;
    if (!catalog.has(key)) catalog.set(key, new Set());
    catalog.get(key).add(rel);
  };
  const q = (s) => JSON.stringify(s);

  function translatable(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return isText(node.text) && !inSkippedContext(node);
    if (ts.isTemplateExpression(node)) {
      const raw = node.head.text + node.templateSpans.map((s) => s.literal.text).join(' ');
      return isText(raw) && !inSkippedContext(node);
    }
    if (ts.isJsxText(node)) return isText(node.text) && node.text.trim().length > 0;
    return false;
  }

  // Düğümü (içindeki çevrilecek metinlerle birlikte) yeniden üret
  function emit(node) {
    if (translatable(node)) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        note(node.text);
        return `L(${q(node.text)})`;
      }
      if (ts.isTemplateExpression(node)) {
        let key = node.head.text;
        const args = [];
        node.templateSpans.forEach((sp, i) => {
          key += `{${i}}` + sp.literal.text;
          args.push(emit(sp.expression));
        });
        note(key);
        return `L(${q(key)}, [${args.join(', ')}])`;
      }
      if (ts.isJsxText(node)) {
        const m = node.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
        const inner = m[2].replace(/\s+/g, ' ');
        note(inner);
        const lead = m[1].includes('\n') ? m[1] : m[1] ? ' ' : '';
        const trail = m[3].includes('\n') ? m[3] : m[3] ? ' ' : '';
        return `${lead ? `{${q(lead.includes('\n') ? '' : ' ')}}`.replace('{""}', '') + (lead.includes('\n') ? lead : '') : ''}{L(${q(inner)})}${trail ? (trail.includes('\n') ? trail : `{' '}`) : ''}`;
      }
    }
    // Çocuklarda çevrilecek metin yoksa kaynağı olduğu gibi döndür
    const kids = [];
    node.forEachChild((c) => {
      kids.push(c);
    });
    if (!kids.length) return src.slice(node.getStart(sf), node.getEnd());
    let out = '';
    let pos = node.getStart(sf);
    for (const c of kids) {
      const cs = c.getStart(sf);
      out += src.slice(pos, cs) + emit(c);
      pos = c.getEnd();
    }
    out += src.slice(pos, node.getEnd());
    return out;
  }

  let result = '';
  let pos = 0;
  sf.forEachChild((c) => {
    const cs = c.getFullStart();
    result += src.slice(pos, cs);
    // Yorumları ve baştaki boşluğu koru
    const lead = src.slice(cs, c.getStart(sf));
    result += lead + emit(c);
    pos = c.getEnd();
  });
  result += src.slice(pos);

  if (changed && APPLY) {
    const depth = rel.split('/').length - 1;
    const imp = rel === 'App.tsx' ? './src/i18n' : '../'.repeat(depth - 1) + 'i18n';
    if (!/from '(\.\.\/|\.\/src\/)i18n'/.test(result)) {
      // İlk import'tan önce ekle (yorum başlığını koru)
      const firstImport = result.search(/^import /m);
      result = result.slice(0, firstImport) + `import { L } from '${imp}';\n` + result.slice(firstImport);
    }
    fs.writeFileSync(abs, result);
  }
  return changed;
}

const report = [];
for (const f of files) report.push([f, processFile(f)]);
fs.writeFileSync(path.join(ROOT, 'scripts/i18n-catalog.json'), JSON.stringify([...catalog.keys()], null, 1));
console.log(`Sarılan metin: ${total}, benzersiz anahtar: ${catalog.size}`);
console.log(report.filter(([, n]) => n).map(([f, n]) => `${f}: ${n}`).join('\n'));
