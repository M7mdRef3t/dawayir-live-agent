import { expect, test } from '@playwright/test';

test('renders app shell and starts in disconnected state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('button').first()).toBeVisible();
});

test('focus moves to the new heading when changing views', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('dawayir-onboarding-seen', 'true');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'EN' }).click();
  await page.getByRole('button', { name: /Start My Session/i }).click();

  await page.waitForFunction(() => document.activeElement?.getAttribute('data-view-heading') === 'setup');

  await page.getByRole('button', { name: /Memory Bank/i }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-view-heading') === 'dashboard');
});

test('settings dialog restores focus to its trigger when dismissed', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('dawayir-onboarding-seen', 'true');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'EN' }).click();
  await page.getByRole('button', { name: /Start My Session/i }).click();

  const settingsButton = page.locator('button[title="Settings"]').first();
  await settingsButton.click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.waitForFunction(() => document.activeElement?.getAttribute('title') === 'Settings');
});
