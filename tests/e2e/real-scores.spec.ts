import { expect, test } from '@playwright/test';
import path from 'node:path';

const fixtures = [
  {
    name: 'Guitar Pro 5',
    file: path.resolve(process.cwd(), 'tabs/Crush.gp5'),
    label: 'Crush.gp5',
  },
  {
    name: 'MusicXML',
    file: path.resolve(process.cwd(), 'tabs/tab1.xml'),
    label: 'tab1.xml',
  },
] as const;

test.describe('real score fixtures', () => {
  test.setTimeout(180000);

  for (const fixture of fixtures) {
    test(`loads ${fixture.name} and keeps annotations for ${fixture.label}`, async ({ page }) => {
      await page.goto('/');

      const scoreInput = page.locator('input[type="file"]').first();
      await scoreInput.setInputFiles(fixture.file);

      await expect(page.getByText(`Score ready: ${fixture.label}`)).toBeVisible({ timeout: 180000 });
      await expect(page.locator('.measure-hit').first()).toBeVisible({ timeout: 180000 });

      await page.getByRole('textbox').fill(`Practice ${fixture.label}`);
      await page.getByRole('button', { name: /Add note/i }).click();

      await expect(page.getByLabel('Annotation drawer').getByText(`Practice ${fixture.label}`)).toBeVisible();
      await expect(page.getByText('Measure 1')).toBeVisible();

      await page.reload();
      await page.goto('/');
      await page.locator('input[type="file"]').first().setInputFiles(fixture.file);

      await expect(page.getByLabel('Annotation drawer').getByText(`Practice ${fixture.label}`)).toBeVisible({
        timeout: 180000,
      });
    });
  }
});
