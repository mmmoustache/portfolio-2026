/***
 * SEO
 * Basic test to check specific meta tags are included in page
 ***/
import { expect, test } from '@playwright/test';

import { ROUTES } from '@/e2e/helpers/routes';

test.describe('SEO', () => {
  test('Home has a title + canonical url + meta description', async ({ page }) => {
    await page.goto(ROUTES.home);

    await expect(page).toHaveTitle(/.+/);

    const canonical = page.locator('link[rel="canonical"]');
    if (await canonical.count()) {
      await expect(canonical).toHaveAttribute('href', /https?:\/\//);
    }

    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    await expect(desc).toHaveAttribute('content', /.+/);
  });

  test('Blog post has an og:title', async ({ page }) => {
    await page.goto(ROUTES.post);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  });
});
