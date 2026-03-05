import { expect, test } from '@playwright/test';

test('renders app shell and starts in disconnected state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('button').first()).toBeVisible();
});

test('opens and closes settings while disconnected', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'EN' }).click();
  await page.getByRole('button', { name: /Enter Mental Space|يلا نبدأ/i }).click();
  await page.keyboard.press('Escape');

  const settingsButton = page.locator('button[title="Settings"]').first();
  await settingsButton.click();
  await expect(page.locator('.settings-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.settings-card')).toHaveCount(0);
});
