import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  ADD_TO_CART_BUTTON,
  PRODUCT_INFO_ROOT,
  QTY_INPUT,
  QTY_PLUS_BUTTON,
  SHIPPING_INFO_BUTTON,
  SHIP_NATIONWIDE_LINK,
  SIZE_M_LABEL,
  SIZE_M_RADIO,
} from '../locators/pdp.selectors';
import { BasePage } from './base.page';

export class PDPPage extends BasePage {
  private desiredQty: number | null = null;

  constructor(page: Page) {
    super(page);
  }

  async waitAddToCartEnabled(): Promise<void> {
    const button = this.page.locator(ADD_TO_CART_BUTTON).first();
    await expect(button).toBeVisible({ timeout: 8000 });
    await expect(button).toBeEnabled({ timeout: 8000 });
  }

  async selectSizeM(): Promise<void> {
    const label = this.page.locator(SIZE_M_LABEL);
    await label.scrollIntoViewIfNeeded();
    await label.click();

    await expect(this.page.locator(SIZE_M_RADIO)).toBeChecked();
    await this.waitVariantRerenderFinished();
    await this.waitAddToCartEnabled();
  }

  async hoverShippingInfo(): Promise<void> {
    const button = this.page.locator(SHIPPING_INFO_BUTTON).first();
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
  }

  async clickShipNationwideLink(): Promise<void> {
    const button = this.page.locator(SHIPPING_INFO_BUTTON).first();
    await button.scrollIntoViewIfNeeded();
    await button.click();

    const nationwideLink = this.page
      .locator(PRODUCT_INFO_ROOT)
      .locator(`${SHIP_NATIONWIDE_LINK}:visible`)
      .first();

    await expect(nationwideLink).toBeVisible();
    await nationwideLink.click();
  }

  async setQty(qty: number): Promise<void> {
    if (qty <= 0) {
      throw new Error(`Quantity must be positive, got: ${qty}`);
    }

    this.desiredQty = qty;

    await this.waitAddToCartEnabled();
    await this.waitQtyControlsReady();

    const qtyInput = this.page.locator(QTY_INPUT).first();
    const currentValue = await qtyInput.inputValue();
    const current = Number.parseInt(currentValue || '1', 10);

    if (current > qty) {
      throw new Error(`Cannot decrease qty via '+' button (current=${current}, target=${qty})`);
    }

    // Prefer direct input update when supported by current PDP widget.
    const directSetWorked = await qtyInput
      .fill(String(qty), { timeout: 2000 })
      .then(() => true)
      .catch(() => false);

    if (directSetWorked) {
      await expect(qtyInput).toHaveValue(String(qty), { timeout: 5000 });
      return;
    }

    for (let expected = current + 1; expected <= qty; expected += 1) {
      const plusButton = this.page.locator(QTY_PLUS_BUTTON).first();
      await expect(plusButton).toBeVisible({ timeout: 3000 });
      await plusButton.scrollIntoViewIfNeeded();
      await plusButton.click({ timeout: 3000, force: true });
      await expect(qtyInput).toHaveValue(String(expected), { timeout: 5000 });
    }
  }

  async getQty(): Promise<number> {
    const value = await this.page.locator(QTY_INPUT).first().inputValue();
    return Number.parseInt(value, 10);
  }

  async addToCart(): Promise<void> {
    if (this.desiredQty !== null) {
      await this.setQty(this.desiredQty);
    }

    await this.waitAddToCartEnabled();
    const button = this.page.locator(ADD_TO_CART_BUTTON).first();
    await button.scrollIntoViewIfNeeded();
    await button.click({ timeout: 3000 });
  }

  private async waitQtyControlsReady(): Promise<void> {
    const qtyInput = this.page.locator(QTY_INPUT).first();
    await expect(qtyInput).toBeVisible({ timeout: 8000 });
    await expect(qtyInput).toBeEditable({ timeout: 8000 });
  }

  private async waitVariantRerenderFinished(): Promise<void> {
    const qtyInput = this.page.locator(QTY_INPUT).first();
    await qtyInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
  }
}

