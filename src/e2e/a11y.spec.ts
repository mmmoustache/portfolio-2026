import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { expectLayout } from '@/e2e/helpers/expectLayout';
import { ALL_ROUTES, ROUTES } from '@/e2e/helpers/routes';

test.describe('Accessibility test', () => {
  for (const route of ALL_ROUTES) {
    test(`${route} has a main landmark, a single H1, and no obvious axe violations`, async ({
      page,
    }) => {
      await page.goto(route);

      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('Skip link moves to #content', async ({ page }) => {
    await page.goto(ROUTES.home);
    await expectLayout(page, 'home');

    const skip = page.getByRole('link', { name: /Skip to content/i });

    await page.keyboard.press('Tab');
    await expect(skip.first()).toBeFocused();

    await skip.first().press('Enter');

    const content = page.locator('#content');
    await expect(content).toBeVisible();
    await expect(content).toBeFocused();
  });
});
