import { expect, test } from '@playwright/test';

import { ROUTES } from '@/e2e/helpers/routes';

test.describe('Rendered structure guards', () => {
  test('homepage sections appear in the expected order', async ({ page }) => {
    await page.goto(ROUTES.home);

    const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings).toEqual(['About.', 'Work.', 'Blog.']);
  });

  test('blog table of contents links target rendered headings', async ({ page }) => {
    await page.goto(ROUTES.post);

    const toc = page.getByRole('navigation', { name: /Contents/i });
    const firstLink = toc.getByRole('link').first();
    const href = await firstLink.getAttribute('href');

    expect(href).toMatch(/^#/);

    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));

    const target = page.locator(href ?? '');
    await expect(target).toBeVisible();
  });

  test('blog table of contents works by keyboard', async ({ page }) => {
    await page.goto(ROUTES.post);

    const toc = page.getByRole('navigation', { name: /Contents/i });
    const firstLink = toc.getByRole('link').first();
    const href = await firstLink.getAttribute('href');

    expect(href).toMatch(/^#/);

    await firstLink.focus();
    await expect(firstLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator(href ?? '')).toBeVisible();
  });

  test('external links that open a new tab include rel protections', async ({ page }) => {
    await page.goto(ROUTES.home);

    const externalLinks = page.locator('a[target="_blank"]');
    await expect(externalLinks.first()).toBeVisible();

    const count = await externalLinks.count();

    for (let index = 0; index < count; index++) {
      const rel = await externalLinks.nth(index).getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });
});
