import { expect, test } from '@playwright/test';

test('renders the app shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('GuitarTabs')).toBeVisible();
  await expect(page.locator('.topbar .file-button')).toBeVisible();
  await expect(page.getByRole('button', { name: /Export Notes/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Import Notes/i })).toBeDisabled();
});
