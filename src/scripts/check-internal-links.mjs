import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = process.env.LINK_CHECK_DIST_DIR ?? 'dist';
const HTML_FILE_RE = /\.html?$/i;
const ATTR_RE = /\b(?:href|src)=["']([^"'#]+(?:#[^"']*)?)["']/gi;
const SRCSET_RE = /\bsrcset=["']([^"']+)["']/gi;

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(fullPath));
    else out.push(fullPath);
  }
  return out;
}

function resolveBuiltPath(rawTarget) {
  const [target] = rawTarget.split('#');
  const cleaned = target.trim();
  if (!cleaned || cleaned.startsWith('http://') || cleaned.startsWith('https://')) return null;
  if (cleaned.startsWith('mailto:') || cleaned.startsWith('tel:') || cleaned.startsWith('data:')) {
    return null;
  }

  const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  const relative = normalized.replace(/^\//, '');
  const directPath = path.join(DIST_DIR, relative);

  if (path.extname(relative)) return directPath;

  return path.join(DIST_DIR, relative, 'index.html');
}

const htmlFiles = listFiles(DIST_DIR).filter((file) => HTML_FILE_RE.test(file));
const missing = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(ATTR_RE)) {
    const rawTarget = match[1];
    const builtPath = resolveBuiltPath(rawTarget);
    if (!builtPath) continue;
    if (!fs.existsSync(builtPath)) {
      missing.push({
        file: path.relative(process.cwd(), file),
        target: rawTarget,
      });
    }
  }

  for (const match of html.matchAll(SRCSET_RE)) {
    const entries = match[1].split(',').map((value) => value.trim().split(/\s+/)[0]);
    for (const rawTarget of entries) {
      const builtPath = resolveBuiltPath(rawTarget);
      if (!builtPath) continue;
      if (!fs.existsSync(builtPath)) {
        missing.push({
          file: path.relative(process.cwd(), file),
          target: rawTarget,
        });
      }
    }
  }
}

if (missing.length) {
  console.error('\nInternal link check failed.\n');
  for (const item of missing) {
    console.error(`- ${item.file} references missing asset or route: ${item.target}`);
  }
  process.exit(1);
}

console.log('\nInternal links and assets resolve from built HTML\n');
