import { expect, test } from '@playwright/test';

import { ROUTES } from '@/e2e/helpers/routes';

test.describe('Reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('disables smooth scrolling and motion-heavy image effects on the homepage', async ({
    page,
  }) => {
    await page.goto(ROUTES.home);

    const hasLenis = await page.evaluate(() => Boolean(window.__lenis));
    expect(hasLenis).toBe(false);

    const bannerClipStyle = await page
      .locator('.banner-clip__inner')
      .first()
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          clipPath: style.clipPath,
          transform: style.transform,
        };
      });

    expect(bannerClipStyle.clipPath).toBe('none');
    expect(bannerClipStyle.transform).toBe('none');

    const swipeStyle = await page
      .locator('.swipe-image__content')
      .first()
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          filter: style.filter,
          transform: style.transform,
          transitionDuration: style.transitionDuration,
        };
      });

    expect(swipeStyle.filter).toBe('none');
    expect(swipeStyle.transform).toBe('none');
    expect(swipeStyle.transitionDuration).toBe('0s');
  });

  test('disables mobile menu transitions when reduced motion is requested', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only');

    await page.goto(ROUTES.home);
    await page.evaluate(() => window.scrollTo(0, 100));

    const menuButton = page.getByRole('button', { name: /Open menu/i });
    await expect(menuButton).toBeVisible();

    const mobileMenu = page.locator('#mobileMenu');
    const transitionDuration = await mobileMenu.evaluate(
      (el) => getComputedStyle(el).transitionDuration
    );

    expect(transitionDuration.split(',').map((value) => value.trim())).toEqual(
      expect.arrayContaining(['0s'])
    );
    expect(
      transitionDuration
        .split(',')
        .map((value) => value.trim())
        .every((value) => value === '0s')
    ).toBe(true);
  });
});
