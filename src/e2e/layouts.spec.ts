import { expect, test } from '@playwright/test';

import { expectLayout } from '@/e2e/helpers/expectLayout';
import { ROUTES } from '@/e2e/helpers/routes';

test.describe('Smoke test: Layout renders', () => {
  test('Homepage renders and has primary nav', async ({ page }) => {
    await page.goto(ROUTES.home);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectLayout(page, 'home');
    await expect(page.getByTestId('main-nav')).toBeVisible();
  });

  test('Text page renders', async ({ page }) => {
    await page.goto(ROUTES.page);
    await expectLayout(page, 'page');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Blog listing renders and shows post listing', async ({ page }) => {
    await page.goto(ROUTES.listing);
    await expectLayout(page, 'listing');

    const cards = page.getByTestId('blog-tile');
    await expect(cards.first()).toBeVisible();
  });

  test('Blog post renders', async ({ page }) => {
    await page.goto(ROUTES.post);
    await expectLayout(page, 'post');
    await expect(page.getByTestId('blog-hero')).toBeVisible();
  });
});
