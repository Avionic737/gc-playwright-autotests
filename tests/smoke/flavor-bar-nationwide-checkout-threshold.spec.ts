import { expect, test } from '@playwright/test';

import { FlavorBarPage } from '../../src/pages/flavor-bar.page';
import { OverlaysComponent } from '../../src/pages/overlays.component';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';
import { setDeliveryDateAndZip } from '../helpers/delivery';
import { waitForDeliveryStorageReady } from '../helpers/delivery-storage';
import { BYOB_CUSTOM_DOZEN_DATA, NATIONWIDE_ORDER_DATA } from '../test-data/checkout.data';

test('flavor bar requires 12 items before checkout becomes active', async ({ page }) => {
  test.setTimeout(180000);

  const overlays = new OverlaysComponent(page);
  const ship = new ShipNationwidePage(page);
  const flavorBar = new FlavorBarPage(page);

  await page.goto(BYOB_CUSTOM_DOZEN_DATA.shipNationwideUrl, { waitUntil: 'domcontentloaded' });
  await overlays.dismissAll();

  await setDeliveryDateAndZip(ship, NATIONWIDE_ORDER_DATA.zipCode, test.info());

  await waitForDeliveryStorageReady(page, {
    expectedZip: NATIONWIDE_ORDER_DATA.zipCode,
    labelPrefix: 'ship-page',
    testInfo: test.info(),
  });

  await ship.clickFlavorBarGetStarted();
  await expect(page).toHaveURL(/\/products\/flavor-bar(?:\?|$)/);

  await flavorBar.addSingleRedVelvetToCart();

  await flavorBar.expectFlavorBarProgress(1);
  await flavorBar.expectCheckoutDisabled();

  const urlBeforeInactiveCheckoutClick = page.url();
  await flavorBar.clickDisabledCheckout();
  await expect(page).toHaveURL(urlBeforeInactiveCheckoutClick);

  await flavorBar.setSidecartQuantity(12);

  await flavorBar.clickDisabledCheckout();
  await expect(page).toHaveURL(/\/products\/flavor-bar(?:\?|$)/);

  await flavorBar.expectCheckoutEnabled();

  await Promise.all([
    page.waitForURL(/\/cart(?:\?|$)/, { timeout: 30000 }),
    flavorBar.clickEnabledCheckout(),
  ]);

  const cartProductTitle = page
    .locator(
      '#cart-form > div > div.cart-items__table > div:nth-child(3) > div > div.cart-items__group-container > div > div.cart-items__group-content > div > div > div.cart-items__table-row.cart-items__nested-line--last.js-main-cart-item > div.cart-items__details.cart-primary-typography > div:nth-child(1) > p > a'
    )
    .first();
  await expect(cartProductTitle).toBeVisible({ timeout: 15000 });
  await expect(cartProductTitle).toContainText(/custom dozen/i);

  const cartBlockTotal = page
    .locator(
      '#cart-form > div > div.cart-items__table > div:nth-child(3) > div > div.cart-items__group-container > div > div.cart-items__block-header > div > span'
    )
    .first();
  await expect(cartBlockTotal).toBeVisible();
  await expect(cartBlockTotal).toHaveText('$42.00');
});
