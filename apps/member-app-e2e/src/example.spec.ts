import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Kairos/);
});

test('member can navigate to login page', async ({ page }) => {
  await page.goto('/');

  // Click the login link.
  await page.getByRole('link', { name: 'Login' }).click();

  // Expects the URL to contain login.
  await expect(page).toHaveURL(/.*login/);
});

test('member dashboard loads correctly', async ({ page }) => {
  await page.goto('/dashboard');

  // Check if dashboard elements are present
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
