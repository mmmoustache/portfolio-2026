import { test, expect, type Page } from '@playwright/test';

export async function expectLayout(page: Page, layout: string) {
  await expect(page.getByTestId('main')).toHaveAttribute('data-layout', layout);
}

test.describe('Layouts', () => {
  test('Homepage renders and has primary nav', async ({ page }) => {
    await page.goto('/');

    const main = page.getByTestId('main');
    await expect(main).toBeVisible();
    await expectLayout(page, 'home');
    await expect(page.getByTestId('main-nav')).toBeVisible();
  });

  test('Text page renders', async ({ page }) => {
    await page.goto('/privacy/');

    const main = page.getByTestId('main');
    await expect(main).toBeVisible();
    await expectLayout(page, 'page');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Blog listing renders and shows posts', async ({ page }) => {
    await page.goto('/blog/');

    const main = page.getByTestId('main');
    await expect(main).toBeVisible();
    await expectLayout(page, 'listing');

    const cards = page.getByTestId('blog-tile');
    await expect(cards.first()).toBeVisible();
  });

  test('Blog post renders', async ({ page }) => {
    await page.goto('/blog/leadership-tips/');

    const main = page.getByTestId('main');
    await expect(main).toBeVisible();
    await expectLayout(page, 'post');
    await expect(page.getByTestId('blog-hero')).toBeVisible();
  });
});
