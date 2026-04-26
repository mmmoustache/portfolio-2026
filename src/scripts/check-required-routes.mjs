import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = process.env.ROUTE_CHECK_DIST_DIR ?? 'dist';
const REQUIRED_ROUTES = ['/', '/privacy/', '/blog/', '/blog/leadership-tips/'];

function routeToFile(route) {
  const normalized = route === '/' ? '/index.html' : `${route.replace(/\/$/, '')}/index.html`;
  return path.join(DIST_DIR, normalized.replace(/^\//, ''));
}

const missing = REQUIRED_ROUTES.filter((route) => !fs.existsSync(routeToFile(route)));

if (missing.length) {
  console.error('\nRequired route check failed.\n');
  for (const route of missing) {
    console.error(`- Missing built route: ${route}`);
  }
  process.exit(1);
}

console.log('\nRequired routes exist in dist\n');
