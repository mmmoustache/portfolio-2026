import { expect, test } from '@playwright/test';

import { expectLayout } from '@/e2e/helpers/expectLayout';
import { ROUTES } from '@/e2e/helpers/routes';

test.describe('Navigation', () => {
  test('Nav can reach Blog listing', async ({ page }, testInfo) => {
    await page.goto(ROUTES.home);

    if (testInfo.project.name === 'mobile') {
      const menuButton = page.getByRole('button', { name: /Open menu/i });

      await page.evaluate(() => window.scrollTo(0, 100));
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      await page
        .getByRole('dialog', { name: /Menu/i })
        .getByRole('link', { name: /blog/i })
        .click();
    } else {
      const mastheadNav = page.getByRole('navigation', {
        name: /Masthead navigation/i,
      });

      await mastheadNav.getByRole('link', { name: /blog/i }).click();
    }

    await expect(page).toHaveURL(/\/blog\/?$/);
    await expectLayout(page, 'listing');
  });

  test('Nav can reach a text page', async ({ page }) => {
    await page.goto(ROUTES.home);
    const footerNav = page.getByRole('navigation', {
      name: /Footer/i,
    });

    await footerNav.getByRole('link', { name: /privacy/i }).click();
    await expectLayout(page, 'page');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('mobile-only menu test', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only'); // Only run this test on the mobile project
    await page.goto(ROUTES.home);

    const menuButton = page.getByRole('button', { name: /Open menu/i });

    await expect(menuButton).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(50);

    await expect(menuButton).toBeVisible();
    await menuButton.focus();
    await expect(menuButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});
