import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const FLAVOR_BAR_PLUS_BUTTON = 'button.quantity-plus.button-unstyled[data-flavor="Red Velvet"]';
const FLAVOR_BAR_ADD_TO_CART_BUTTON =
  'button.product-card__add-to-cart.js-add-to-cart[data-flavor="Red Velvet"]';

const CART_DRAWER =
  '#header-component > div > div > div.header__column.header__column--right > header-actions > cart-drawer-component > dialog';
const DISABLED_CHECKOUT_SPAN =
  '#header-component > div > div > div.header__column.header__column--right > header-actions > cart-drawer-component > dialog > div > cart-items-component > div.cart-drawer__content.motion-reduce > div > div > div.cart__ctas > span';
const ACTIVE_CHECKOUT_LINK =
  '#header-component > div > div > div.header__column.header__column--right > header-actions > cart-drawer-component > dialog > div > cart-items-component > div.cart-drawer__content.motion-reduce > div > div > div.cart__ctas > a';

export class FlavorBarPage {
  constructor(private readonly page: Page) {}

  async addSingleRedVelvetToCart(): Promise<void> {
    const redVelvetCard = this.page.getByRole('listitem').filter({ hasText: /Red Velvet/i }).first();

    const plusButton = redVelvetCard.getByRole('button', { name: /increase quantity/i }).first();
    await expect(plusButton).toBeVisible({ timeout: 15000 });
    await plusButton.click();

    const addToCartButton = redVelvetCard.getByRole('button', { name: /^add to cart$/i }).first();
    await expect(addToCartButton).toBeVisible({ timeout: 15000 });
    await expect(addToCartButton).toBeEnabled();
    await addToCartButton.click();

    await expect(this.drawer()).toBeVisible({ timeout: 15000 });
  }

  async expectFlavorBarProgress(count: number): Promise<void> {
    const drawer = this.drawer();
    await expect(drawer).toContainText(`FLAVOR BAR SELECTION [${count}]`);
    await expect(drawer).toContainText(`${count} of 12`);
  }

  async expectCheckoutDisabled(): Promise<void> {
    await expect(this.page.locator(DISABLED_CHECKOUT_SPAN).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(ACTIVE_CHECKOUT_LINK).first()).toBeHidden();
  }

  async clickDisabledCheckout(): Promise<void> {
    const disabledCheckout = this.page.locator(DISABLED_CHECKOUT_SPAN).first();
    await expect(disabledCheckout).toBeVisible({ timeout: 10000 });
    await disabledCheckout.click();
  }

  async setSidecartQuantity(value: number): Promise<void> {
    const qtyInput = this.drawer().getByRole('spinbutton', { name: /quantity/i }).first();
    await expect(qtyInput).toBeVisible({ timeout: 15000 });
    await qtyInput.click();
    await qtyInput.fill(String(value));
    await qtyInput.press('Tab').catch(() => undefined);

    await expect
      .poll(async () => {
        const raw = (await qtyInput.inputValue().catch(() => '')) || '';
        return Number.parseInt(raw, 10);
      }, { timeout: 15000 })
      .toBe(value);
  }

  async expectCheckoutEnabled(): Promise<void> {
    await expect(this.page.locator(ACTIVE_CHECKOUT_LINK).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(DISABLED_CHECKOUT_SPAN).first()).toBeHidden();
  }

  async clickEnabledCheckout(): Promise<void> {
    const activeCheckout = this.page.locator(ACTIVE_CHECKOUT_LINK).first();
    await expect(activeCheckout).toBeVisible({ timeout: 10000 });
    await activeCheckout.click();
  }

  private drawer(): Locator {
    return this.page.locator(CART_DRAWER).first();
  }
}
