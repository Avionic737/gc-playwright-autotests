import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

type SidecartCheckoutReadyOptions = {
  activeCheckoutSelector: string;
  disabledCheckoutSelector: string;
  linePriceSelector: string;
  expectedPrice: string;
  stabilizationMs?: number;
  clickPriceAfterMatch?: boolean;
};

export async function waitForSidecartCheckoutReady(
  page: Page,
  options: SidecartCheckoutReadyOptions
): Promise<void> {
  const {
    activeCheckoutSelector,
    disabledCheckoutSelector,
    linePriceSelector,
    expectedPrice,
    stabilizationMs = 400,
    clickPriceAfterMatch = false,
  } = options;

  const activeCheckout = page.locator(activeCheckoutSelector).first();
  const disabledCheckout = page.locator(disabledCheckoutSelector).first();
  const linePrice = page.locator(linePriceSelector).first();

  await expect(linePrice).toBeVisible({ timeout: 15000 });
  await expect(linePrice).toHaveText(expectedPrice, { timeout: 30000 });

  if (clickPriceAfterMatch) {
    await linePrice.click();
  }

  await expect(disabledCheckout).toBeHidden({ timeout: 30000 });
  await expect(activeCheckout).toBeVisible({ timeout: 30000 });

  if (stabilizationMs > 0) {
    await page.waitForTimeout(stabilizationMs);
  }
}
