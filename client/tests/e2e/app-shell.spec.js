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

  await page.getByTestId('lang-en-btn').click();
  await page.getByTestId('start-session-btn').first().click();

  await page.waitForFunction(() => document.activeElement?.getAttribute('data-view-heading') === 'setup');

  await page.getByTestId('memory-bank-btn').click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-view-heading') === 'dashboard');
});

test('settings dialog restores focus to its trigger when dismissed', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('dawayir-onboarding-seen', 'true');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('lang-en-btn').click();
  await page.getByTestId('start-session-btn').first().click();

  const settingsButton = page.getByTestId('settings-btn').first();
  await settingsButton.click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(settingsButton).toBeFocused();
});
