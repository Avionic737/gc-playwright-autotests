import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  CUSTOM_DOZEN_ADD_BUNDLE_BUTTON,
  CUSTOM_DOZEN_BUNDLE_QTY_INPUT,
  CUSTOM_DOZEN_FLAVOR_CARD,
  CUSTOM_DOZEN_FLAVOR_TITLE,
  CUSTOM_DOZEN_GET_STARTED_LINK,
} from '../locators/byob.selectors';
import { DELIVERY_DATE_INPUT, DELIVERY_ZIP_INPUT } from '../locators/shipping.selectors';

export class ByobCustomDozenPage {
  constructor(private readonly page: Page) {}

  async clickBuildYourOwnBoxGetStarted(): Promise<void> {
    // After delivery date/ZIP validation the CTA can appear with a delay.
    await this.page.locator(DELIVERY_ZIP_INPUT).press('Tab').catch(() => undefined);

    const scopedCustomDozenCta = this.page.locator(CUSTOM_DOZEN_GET_STARTED_LINK).first();
    const hrefBasedFallback = this.page
      .locator('a[href="/products/custom-dozen"]')
      .filter({ hasText: /get started/i })
      .first();

    await expect
      .poll(async () => {
        if (await scopedCustomDozenCta.isVisible().catch(() => false)) {
          return 'scoped-visible';
        }
        if (await hrefBasedFallback.isVisible().catch(() => false)) {
          return 'href-visible';
        }
        return 'hidden';
      }, { timeout: 30000 })
      .not.toBe('hidden');

    if (await scopedCustomDozenCta.isVisible().catch(() => false)) {
      await scopedCustomDozenCta.click();
      return;
    }

    await expect(hrefBasedFallback).toBeVisible();
    await hrefBasedFallback.click();
  }

  async expectDeliveryDateAndZip(dateValue: string, zipCode: string): Promise<void> {
    await expect(this.page.locator(DELIVERY_DATE_INPUT)).toHaveValue(dateValue);
    await expect(this.page.locator(DELIVERY_ZIP_INPUT)).toHaveValue(zipCode);
  }

  async increaseFlavorQuantityTo(flavorName: string, targetQty: number): Promise<void> {
    const plusButton = this.page.locator(`button.quantity-plus[data-flavor="${flavorName}"]:visible`).first();
    await expect(plusButton).toBeVisible({ timeout: 10000 });

    const quantityInput = plusButton
      .locator("xpath=ancestor::quantity-selector-component[1]//input[@name='quantity']")
      .first();

    const currentQty = Number.parseInt((await quantityInput.inputValue().catch(() => '0')) || '0', 10) || 0;
    if (targetQty < currentQty) {
      throw new Error(`Target flavor quantity ${targetQty} is lower than current value ${currentQty}.`);
    }

    for (let i = currentQty; i < targetQty; i += 1) {
      await plusButton.click();
    }

    await expect
      .poll(async () => {
        return (await quantityInput.inputValue().catch(() => '')) || '';
      }, { timeout: 10000 })
      .toBe(String(targetQty));
  }

  async setBundleQuantity(qty: number): Promise<void> {
    const bundleQtyInput = this.page.locator(CUSTOM_DOZEN_BUNDLE_QTY_INPUT).first();
    await expect(bundleQtyInput).toBeVisible();
    await bundleQtyInput.fill(String(qty));
    await expect(bundleQtyInput).toHaveValue(String(qty));
  }

  async addBundleToCart(): Promise<void> {
    const addBundleButton = this.page.locator(CUSTOM_DOZEN_ADD_BUNDLE_BUTTON).first();
    await expect(addBundleButton).toBeVisible();
    await expect(addBundleButton).toBeEnabled();
    await addBundleButton.click();
  }

  private getFlavorCard(flavorName: string): Locator {
    return this.page
      .locator(CUSTOM_DOZEN_FLAVOR_CARD)
      .filter({ has: this.page.locator(CUSTOM_DOZEN_FLAVOR_TITLE, { hasText: flavorName }) })
      .first();
  }
}
