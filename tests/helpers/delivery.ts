import type { TestInfo } from '@playwright/test';

import type { DeliveryDateSelectionReport, ShipNationwidePage } from '../../src/pages/ship-nationwide.page';

export async function selectDeliveryDate(
  ship: ShipNationwidePage,
  testInfo?: TestInfo
): Promise<DeliveryDateSelectionReport> {
  await ship.focusDeliveryDate();
  const deliverySelection = await ship.selectFirstValidDateStartingFromMinDate();

  if (testInfo) {
    await testInfo.attach('delivery-date-selection', {
      body: JSON.stringify(deliverySelection, null, 2),
      contentType: 'application/json',
    });
  }

  console.log('[delivery-date-selection]', JSON.stringify(deliverySelection));
  return deliverySelection;
}

export async function enterDeliveryZip(ship: ShipNationwidePage, zipCode: string): Promise<void> {
  await ship.setZip(zipCode);
}

export async function setDeliveryDateAndZip(
  ship: ShipNationwidePage,
  zipCode: string,
  testInfo?: TestInfo
): Promise<DeliveryDateSelectionReport> {
  const deliverySelection = await selectDeliveryDate(ship, testInfo);
  await enterDeliveryZip(ship, zipCode);
  return deliverySelection;
}
