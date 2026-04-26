/***
 * SEO
 * Basic test to check specific meta tags are included in page
 ***/
import { expect, test } from '@playwright/test';

import { ROUTES } from '@/e2e/helpers/routes';

test.describe('SEO', () => {
  test('Home has a title, canonical url, meta description, and structured data', async ({
    page,
  }) => {
    await page.goto(ROUTES.home);

    await expect(page).toHaveTitle(/.+/);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', /^https:\/\/jrc\.codes\/?$/);

    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    await expect(desc).toHaveAttribute('content', /.+/);

    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);
  });

  test('Blog post has article metadata', async ({ page }) => {
    await page.goto(ROUTES.post);

    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(1);
    await expect(page.locator('meta[property="article:modified_time"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });
});
