/***
 * Console Errors
 * This file is to test for any console errors
 ***/
import { expect, test } from '@playwright/test';

import { ROUTES } from '@/e2e/helpers/routes';

test('No console errors on key pages', async ({ page }) => {
  const errors: string[] = [];
  const missing: string[] = [];

  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  page.on('response', (res) => {
    if (res.status() === 404) missing.push(`404: ${res.url()}`);
  });

  for (const path of [ROUTES.home, ROUTES.listing, ROUTES.page, ROUTES.post]) {
    await page.goto(path, { waitUntil: 'networkidle' });
  }

  expect(missing, missing.join('\n')).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});
