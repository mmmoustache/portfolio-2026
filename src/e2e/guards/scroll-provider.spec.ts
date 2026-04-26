import { expect, test } from '@playwright/test';

import { ROUTES } from '@/e2e/helpers/routes';

test.describe('Scroll provider loading', () => {
  test('initializes Lenis on the homepage', async ({ page }) => {
    await page.goto(ROUTES.home);

    const hasLenis = await page.evaluate(() => Boolean(window.__lenis));
    expect(hasLenis).toBe(true);
  });

  test('does not initialize Lenis on blog posts', async ({ page }) => {
    await page.goto(ROUTES.post);

    const hasLenis = await page.evaluate(() => Boolean(window.__lenis));
    expect(hasLenis).toBe(false);
  });
});
