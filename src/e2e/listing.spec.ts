import { expect, test } from '@playwright/test';

import { expectLayout } from './helpers/expectLayout';
import { ROUTES } from './helpers/routes';

test.describe('Blog journeys', () => {
  test('User can open the first blog post from the listing', async ({ page }) => {
    await page.goto(ROUTES.listing);
    await expectLayout(page, 'listing');

    const firstCard = page.getByTestId('blog-tile').first();
    await expect(firstCard).toBeVisible();

    await firstCard.getByRole('link').first().click();

    await expectLayout(page, 'post');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test("'Back to blog' link", async ({ page }) => {
    await page.goto(ROUTES.post);
    await expectLayout(page, 'post');

    const back = page.getByRole('link', { name: /Back to blog/i });
    await back.first().click();
    await expectLayout(page, 'listing');
  });
});
