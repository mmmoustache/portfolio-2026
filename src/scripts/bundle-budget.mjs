import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = process.env.BUDGET_DIST_DIR ?? 'dist';
const ASTRO_ASSETS_DIR = path.join(DIST_DIR, '_astro');

const BUDGETS = {
  totalJsKb: Number(process.env.BUDGET_TOTAL_JS_KB ?? 50),
  maxChunkJsKb: Number(process.env.BUDGET_MAX_CHUNK_JS_KB ?? 25),
  totalCssKb: Number(process.env.BUDGET_TOTAL_CSS_KB ?? 25),
};

function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((ext) => e.name.endsWith(ext))) out.push(p);
  }
  return out;
}

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10; // 0.1kb precision
}

function sumSizes(files) {
  let total = 0;
  let max = 0;
  let maxFile = null;

  for (const f of files) {
    const size = fs.statSync(f).size;
    total += size;
    if (size > max) {
      max = size;
      maxFile = f;
    }
  }

  return { totalBytes: total, maxBytes: max, maxFile };
}

function fail(msg) {
  console.error(`\n❌ Bundle budget failed: ${msg}\n`);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(ASTRO_ASSETS_DIR)) {
    fail(`Could not find ${ASTRO_ASSETS_DIR}. Did you run "astro build" first?`);
  }

  const jsFiles = listFiles(ASTRO_ASSETS_DIR, ['.js']);
  const cssFiles = listFiles(ASTRO_ASSETS_DIR, ['.css']);

  const js = sumSizes(jsFiles);
  const css = sumSizes(cssFiles);

  const totalJsKb = kb(js.totalBytes);
  const maxChunkJsKb = kb(js.maxBytes);
  const totalCssKb = kb(css.totalBytes);

  console.log('\n📦 Bundle budget report');
  console.log(`- Total JS:   ${totalJsKb} KB (budget ${BUDGETS.totalJsKb} KB)`);
  console.log(
    `- Max JS chunk: ${maxChunkJsKb} KB (budget ${BUDGETS.maxChunkJsKb} KB) ${
      js.maxFile ? `→ ${path.relative(process.cwd(), js.maxFile)}` : ''
    }`
  );
  console.log(`- Total CSS:  ${totalCssKb} KB (budget ${BUDGETS.totalCssKb} KB)`);

  if (totalJsKb > BUDGETS.totalJsKb) fail(`Total JS ${totalJsKb} KB > ${BUDGETS.totalJsKb} KB`);
  if (maxChunkJsKb > BUDGETS.maxChunkJsKb)
    fail(`Max JS chunk ${maxChunkJsKb} KB > ${BUDGETS.maxChunkJsKb} KB`);
  if (totalCssKb > BUDGETS.totalCssKb)
    fail(`Total CSS ${totalCssKb} KB > ${BUDGETS.totalCssKb} KB`);

  console.log('\n✅ Bundle budgets OK\n');
}

main();
