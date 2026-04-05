import { test, expect } from '@playwright/test';

test.describe('public pages', () => {
  test('landing page loads with hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Money/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Mirror/i);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
