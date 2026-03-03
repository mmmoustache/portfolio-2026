import process from 'node:process';
import { spawn } from 'node:child_process';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${url}\n${body}`);
  }
  return res.json();
}

async function findSuccessTargetUrl(owner, repo, sha) {
  const deployments = await fetchJSON(
    `https://api.github.com/repos/${owner}/${repo}/deployments?sha=${sha}&per_page=100`
  );

  if (!deployments.length) return null;

  for (const dep of deployments) {
    const statuses = await fetchJSON(
      `https://api.github.com/repos/${owner}/${repo}/deployments/${dep.id}/statuses?per_page=100`
    );

    const success = statuses.find((s) => s.state === 'success' && s.target_url);
    if (success?.target_url) return success.target_url.replace(/\/$/, '');
  }

  return null;
}

async function getVercelPreviewUrlFromGitHub() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_SHA) {
    throw new Error('Missing GITHUB_TOKEN/GITHUB_REPOSITORY/GITHUB_SHA for preview URL lookup.');
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/');

  const maxWaitMs = Number(process.env.LH_PREVIEW_MAX_WAIT_MS ?? 300_000); // 5 min
  const intervalMs = Number(process.env.LH_PREVIEW_POLL_MS ?? 10_000); // 10 sec

  const started = Date.now();
  let attempt = 0;

  while (Date.now() - started < maxWaitMs) {
    attempt += 1;
    const url = await findSuccessTargetUrl(owner, repo, GITHUB_SHA);

    if (url) {
      console.log(`[lh] Found Vercel preview URL on attempt ${attempt}: ${url}`);
      return url;
    }

    console.log(
      `[lh] No successful Vercel deployment status yet for this SHA (attempt ${attempt}). Retrying in ${Math.round(
        intervalMs / 1000
      )}s...`
    );
    await sleep(intervalMs);
  }

  throw new Error(
    `No successful Vercel deployment status found for this SHA after ${Math.round(maxWaitMs / 1000)}s.`
  );
}

function urlsFor(base) {
  const b = base.replace(/\/$/, '');
  return [`${b}/`, `${b}/blog/`, `${b}/privacy/`, `${b}/blog/resetting-a-team-culture`];
}

async function main() {
  let baseUrl = process.env.LH_BASE_URL;

  if (!baseUrl && process.env.GITHUB_ACTIONS === 'true') {
    baseUrl = await getVercelPreviewUrlFromGitHub();
  }

  if (!baseUrl) {
    throw new Error(
      'No base URL for Lighthouse. Set LH_BASE_URL (local) or run in GitHub Actions PR.'
    );
  }

  const urls = urlsFor(baseUrl);

  await run('npx', [
    'lhci',
    'autorun',
    '--config=./lighthouserc.json',
    ...urls.flatMap((u) => [`--collect.url=${u}`]),
  ]);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
