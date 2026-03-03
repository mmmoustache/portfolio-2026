import { expect, test } from '@playwright/test';

import { expectLayout } from '@/e2e/helpers/expectLayout';
import { ROUTES } from '@/e2e/helpers/routes';

test.describe('Accessibility test', () => {
  test('Pages have a main landmark and a single H1', async ({ page }) => {
    await page.goto(ROUTES.home);
    await expectLayout(page, 'home');

    await expect(page.getByRole('main')).toBeVisible();

    const h1s = page.getByRole('heading', { level: 1 });
    await expect(h1s).toHaveCount(1);
  });

  test('Skip link moves to #content', async ({ page }) => {
    await page.goto(ROUTES.home);

    const skip = page.getByRole('link', { name: /Skip to content/i });

    await page.keyboard.press('Tab');
    await expect(skip.first()).toBeFocused();

    await skip.first().press('Enter');
    await expect(page).toHaveURL(/#content/);

    // Content anchor exists
    await expect(page.locator('#content')).toBeVisible();
  });
});
