import { expect, test } from '@playwright/test';

import { MIN_DATE_DAY_CELL } from '../../src/locators/shipping.selectors';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';

test('debug ship nationwide date picker after delayed popup', async ({ page, baseURL }) => {
  test.setTimeout(180000);

  const ship = new ShipNationwidePage(page);

  await page.goto(`${baseURL}/pages/ship-nationwide`, { waitUntil: 'domcontentloaded' });
  // Let delayed marketing popups appear, then verify our dismissal + date click flow.
  await page.waitForTimeout(12000);

  await ship.focusDeliveryDate();
  await expect(page.locator(MIN_DATE_DAY_CELL)).toBeVisible();

  await page.waitForTimeout(4000);
});
