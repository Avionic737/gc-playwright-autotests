import { expect, test } from '@playwright/test';

import { HeaderComponent } from '../../src/pages/header.component';
import { OverlaysComponent } from '../../src/pages/overlays.component';
import { PDPPage } from '../../src/pages/pdp.page';
import { SearchResultsPage } from '../../src/pages/search-results.page';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';
import { SideCartComponent } from '../../src/pages/sidecart.component';
import { pauseIfRequested } from '../helpers/debug';

const PDP_URL = 'https://georgetowncupcake.com/products/logo-t-shirt-black';

test('add logo t-shirt black to cart and verify sidecart details', async ({ page, baseURL }) => {
  test.setTimeout(90000);
  const pdp = new PDPPage(page);
  const ship = new ShipNationwidePage(page);
  const header = new HeaderComponent(page);
  const overlays = new OverlaysComponent(page);
  const results = new SearchResultsPage(page);
  const sidecart = new SideCartComponent(page);

  await pdp.open(PDP_URL);
  await overlays.dismissAll();

  await pdp.hoverShippingInfo();
  await pdp.clickShipNationwideLink();
  await expect(page).toHaveURL(`${baseURL}/pages/ship-nationwide`);

  await ship.focusDeliveryDate();
  const deliverySelection = await ship.selectFirstValidDateStartingFromMinDate();
  await test.info().attach('delivery-date-selection', {
    body: JSON.stringify(deliverySelection, null, 2),
    contentType: 'application/json',
  });
  console.log('[delivery-date-selection]', JSON.stringify(deliverySelection));

  await ship.setZip('10001');

  await header.openSearch();
  await header.searchForAndSubmit('Logo T-shirt (Black)');

  await results.openFirstProductResult();

  await pdp.selectSizeM();
  await pdp.setQty(2);
  await expect(await pdp.getQty()).toBe(2);

  await pdp.addToCart();
  await pauseIfRequested(page);

  await expect(await sidecart.getProductTitle()).not.toBe('');
  await expect(await sidecart.getVariantValue()).toBe('M');
  await expect(await sidecart.getQtyValue()).toBe(2);
  await expect((await sidecart.getShippingValue()).toLowerCase()).toBe('shipping');
  await expect(await sidecart.getZipValue()).toBe('10001');
});
