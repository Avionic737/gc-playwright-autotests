import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  SIDECART_PRODUCT_TITLE_LINK,
  SIDECART_QTY_INPUT,
  SIDECART_SHIPPING_VALUE,
  SIDECART_VARIANT_VALUE,
  SIDECART_ZIP_VALUE,
} from '../locators/cart.selectors';

export class SideCartComponent {
  constructor(private readonly page: Page) {}

  async getProductTitle(): Promise<string> {
    const element = this.page.locator(SIDECART_PRODUCT_TITLE_LINK);
    await expect(element).toBeVisible();
    return (await element.textContent())?.trim() ?? '';
  }

  async getVariantValue(): Promise<string> {
    const element = this.page.locator(SIDECART_VARIANT_VALUE);
    await expect(element).toBeVisible();
    return (await element.textContent())?.trim() ?? '';
  }

  async getQtyValue(): Promise<number> {
    const element = this.page.locator(SIDECART_QTY_INPUT);
    await expect(element).toBeVisible();
    return Number.parseInt(await element.inputValue(), 10);
  }

  async getShippingValue(): Promise<string> {
    const element = this.page.locator(SIDECART_SHIPPING_VALUE);
    await expect(element).toBeVisible();
    return (await element.textContent())?.trim() ?? '';
  }

  async getZipValue(): Promise<string> {
    const element = this.page.locator(SIDECART_ZIP_VALUE);
    await expect(element).toBeVisible();
    return (await element.textContent())?.trim() ?? '';
  }
}
