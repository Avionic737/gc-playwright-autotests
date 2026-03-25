import { expect, test } from '@playwright/test';

import { HeaderComponent } from '../../src/pages/header.component';
import { OverlaysComponent } from '../../src/pages/overlays.component';
import { PDPPage } from '../../src/pages/pdp.page';
import { SearchResultsPage } from '../../src/pages/search-results.page';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';
import { SideCartComponent } from '../../src/pages/sidecart.component';
import { pauseIfRequested } from '../helpers/debug';
import { setDeliveryDateAndZip } from '../helpers/delivery';
import {
  assertCheckoutLineAndTotals,
  proceedFromCartToCheckoutWithNationwideAddress,
} from '../helpers/nationwide-checkout';
import { NATIONWIDE_ORDER_DATA, TEST_PRODUCT } from '../test-data/checkout.data';

test('add logo t-shirt black to cart and verify sidecart details with checkout click', async ({ page, baseURL }) => {
  test.setTimeout(180000);

  const pdp = new PDPPage(page);
  const ship = new ShipNationwidePage(page);
  const header = new HeaderComponent(page);
  const overlays = new OverlaysComponent(page);
  const results = new SearchResultsPage(page);
  const sidecart = new SideCartComponent(page);

  await pdp.open(TEST_PRODUCT.pdpUrl);
  await overlays.dismissAll();

  await pdp.hoverShippingInfo();
  await pdp.clickShipNationwideLink();
  await expect(page).toHaveURL(`${baseURL}/pages/ship-nationwide`);

  const deliverySelection = await setDeliveryDateAndZip(ship, NATIONWIDE_ORDER_DATA.zipCode, test.info());

  await header.openSearch();
  await header.searchForAndSubmit(TEST_PRODUCT.searchQuery);

  await results.openFirstProductResult();

  await pdp.selectSizeM();
  await pdp.setQty(TEST_PRODUCT.quantity);
  await expect(await pdp.getQty()).toBe(TEST_PRODUCT.quantity);

  await pdp.addToCart();
  await pauseIfRequested(page);

  const sidecartProductTitle = await sidecart.getProductTitle();
  await expect(sidecartProductTitle).not.toBe('');
  await expect(await sidecart.getVariantValue()).toBe(TEST_PRODUCT.size);
  await expect(await sidecart.getQtyValue()).toBe(TEST_PRODUCT.quantity);
  await expect((await sidecart.getShippingValue()).toLowerCase()).toBe('shipping');

  const selectedDeliveryDate = deliverySelection.selectedDate;
  if (!selectedDeliveryDate) {
    throw new Error('Expected selected delivery date to be present in deliverySelection report.');
  }

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
    expectedQty: TEST_PRODUCT.quantity,
  });
});
