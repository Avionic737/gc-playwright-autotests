import { expect, test } from '@playwright/test';

import { OverlaysComponent } from '../../src/pages/overlays.component';
import { ByobCustomDozenPage } from '../../src/pages/byob-custom-dozen.page';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';
import { SideCartComponent } from '../../src/pages/sidecart.component';
import { pauseIfRequested } from '../helpers/debug';
import { setDeliveryDateAndZip } from '../helpers/delivery';
import { waitForDeliveryStorageReady } from '../helpers/delivery-storage';
import {
  assertCheckoutLineAndTotals,
  proceedFromCartToCheckoutWithNationwideAddress,
} from '../helpers/nationwide-checkout';
import { BYOB_CUSTOM_DOZEN_DATA, NATIONWIDE_ORDER_DATA } from '../test-data/checkout.data';

test('byob custom dozen preserves nationwide date/zip and completes checkout', async ({ page }) => {
  test.setTimeout(240000);

  const overlays = new OverlaysComponent(page);
  const ship = new ShipNationwidePage(page);
  const byob = new ByobCustomDozenPage(page);
  const sidecart = new SideCartComponent(page);

  await page.goto(BYOB_CUSTOM_DOZEN_DATA.shipNationwideUrl, { waitUntil: 'domcontentloaded' });
  await overlays.dismissAll();

  const deliverySelection = await setDeliveryDateAndZip(ship, NATIONWIDE_ORDER_DATA.zipCode, test.info());
  const selectedDate = deliverySelection.selectedDate;
  if (!selectedDate) {
    throw new Error('Expected selected delivery date to be present in deliverySelection report.');
  }

  await waitForDeliveryStorageReady(page, {
    expectedZip: NATIONWIDE_ORDER_DATA.zipCode,
    labelPrefix: 'ship-page',
    testInfo: test.info(),
  });

  await byob.clickBuildYourOwnBoxGetStarted();
  await expect(page).toHaveURL(BYOB_CUSTOM_DOZEN_DATA.customDozenUrl);

  await waitForDeliveryStorageReady(page, {
    expectedZip: NATIONWIDE_ORDER_DATA.zipCode,
    labelPrefix: 'after-open-custom-dozen',
    maxAttempts: 1,
    testInfo: test.info(),
  });

  await byob.increaseFlavorQuantityTo(BYOB_CUSTOM_DOZEN_DATA.flavorName, BYOB_CUSTOM_DOZEN_DATA.flavorQty);
  await byob.setBundleQuantity(BYOB_CUSTOM_DOZEN_DATA.bundleQty);
  await byob.addBundleToCart();
  await pauseIfRequested(page);

  const sidecartProductTitle = await sidecart.getProductTitle();
  await expect(sidecartProductTitle.toLowerCase()).toContain(BYOB_CUSTOM_DOZEN_DATA.expectedSidecartTitle.toLowerCase());
  await expect(await sidecart.getQtyValue()).toBe(BYOB_CUSTOM_DOZEN_DATA.bundleQty);

  const sidecartDrawer = page.locator('cart-drawer-component dialog').first();
  await expect(sidecartDrawer).toContainText(BYOB_CUSTOM_DOZEN_DATA.expectedLinePrice);

  const sidecartDeliveryDate = await sidecart.getDateValue();
  await expect(sidecartDeliveryDate).not.toBe('');
  await expect(await sidecart.getZipValue()).toBe(NATIONWIDE_ORDER_DATA.zipCode);

  await sidecart.clickCheckoutLink();

  await proceedFromCartToCheckoutWithNationwideAddress(page, {
    sidecartProductTitle,
    sidecartDeliveryDate,
    orderData: NATIONWIDE_ORDER_DATA,
  });

  await assertCheckoutLineAndTotals(page, {
    expectedTitle: sidecartProductTitle,
    expectedQty: BYOB_CUSTOM_DOZEN_DATA.bundleQty,
  });
});





