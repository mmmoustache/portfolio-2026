/***
 * Performance
 * Basic test to not exceed file size budget
 ***/
import { expect, test } from '@playwright/test';

import { ROUTES } from '@/e2e/helpers/routes';

test('Homepage responds with 200 and reasonable HTML size', async ({ page }) => {
  const res = await page.goto(ROUTES.home);
  expect(res?.status()).toBe(200);

  const html = await page.content();
  expect(html.length).toBeLessThan(400_000); // 400kb
});
