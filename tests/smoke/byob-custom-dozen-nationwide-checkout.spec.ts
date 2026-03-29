import { expect, test } from '@playwright/test';

import { OverlaysComponent } from '../../src/pages/overlays.component';
import { ByobCustomDozenPage } from '../../src/pages/byob-custom-dozen.page';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';
import { SideCartComponent } from '../../src/pages/sidecart.component';
import { pauseIfRequested } from '../helpers/debug';
import { setDeliveryDateAndZip } from '../helpers/delivery';
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

  const attachClientState = async (label: string): Promise<{ deliveryDate: string; deliveryZip: string }> => {
    const storage = await page.evaluate(() => {
      const readStorage = (target: Storage): Record<string, string> => {
        const result: Record<string, string> = {};
        for (let i = 0; i < target.length; i += 1) {
          const key = target.key(i);
          if (!key) {
            continue;
          }
          result[key] = target.getItem(key) ?? '';
        }
        return result;
      };

      const dateInput = document.querySelector<HTMLInputElement>('#delivery-date');
      const zipInput = document.querySelector<HTMLInputElement>('#delivery-zip');

      return {
        url: window.location.href,
        localStorage: readStorage(window.localStorage),
        sessionStorage: readStorage(window.sessionStorage),
        deliveryDateInput: dateInput?.value ?? null,
        deliveryZipInput: zipInput?.value ?? null,
      };
    });

    const cookies = await page.context().cookies();

    await test.info().attach(`client-state-${label}`, {
      body: JSON.stringify(
        {
          label,
          ...storage,
          cookies: cookies.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
          })),
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    return {
      deliveryDate: (storage.localStorage['delivery-date'] ?? '').trim(),
      deliveryZip: (storage.localStorage['delivery-zip'] ?? '').trim(),
    };
  };

  await page.goto(BYOB_CUSTOM_DOZEN_DATA.shipNationwideUrl, { waitUntil: 'domcontentloaded' });
  await overlays.dismissAll();

  const deliverySelection = await setDeliveryDateAndZip(ship, NATIONWIDE_ORDER_DATA.zipCode, test.info());
  const selectedDate = deliverySelection.selectedDate;
  if (!selectedDate) {
    throw new Error('Expected selected delivery date to be present in deliverySelection report.');
  }

  let storageMatched = false;
  let lastStorage = { deliveryDate: '', deliveryZip: '' };

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const snapshotLabel = attempt === 1 || attempt === 30 ? `ship-page-attempt-${attempt}` : `ship-page-attempt-${attempt}-compact`;

    if (attempt === 1 || attempt === 30) {
      lastStorage = await attachClientState(snapshotLabel);
    } else {
      lastStorage = await page.evaluate(() => {
        return {
          deliveryDate: (window.localStorage.getItem('delivery-date') ?? '').trim(),
          deliveryZip: (window.localStorage.getItem('delivery-zip') ?? '').trim(),
        };
      });
    }

    if (lastStorage.deliveryDate !== '' && lastStorage.deliveryZip === NATIONWIDE_ORDER_DATA.zipCode) {
      storageMatched = true;
      await test.info().attach('client-state-ship-page-storage-matched', {
        body: JSON.stringify({ attempt, ...lastStorage }, null, 2),
        contentType: 'application/json',
      });
      break;
    }

    await page.waitForTimeout(1000);
  }

  if (!storageMatched) {
    const debugStorage = await page.evaluate(() => {
      const keys = (target: Storage): string[] => {
        const result: string[] = [];
        for (let i = 0; i < target.length; i += 1) {
          const key = target.key(i);
          if (key) {
            result.push(key);
          }
        }
        return result;
      };

      return {
        localStorageKeys: keys(window.localStorage),
        sessionStorageKeys: keys(window.sessionStorage),
      };
    });

    const cookieNames = (await page.context().cookies()).map((cookie) => cookie.name);

    await test.info().attach('client-state-ship-page-storage-not-matched', {
      body: JSON.stringify(
        {
          expected: {
            deliveryDate: selectedDate,
            deliveryZip: NATIONWIDE_ORDER_DATA.zipCode,
          },
          lastObserved: lastStorage,
          debugStorage,
          cookieNames,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    throw new Error(
      `localStorage keys were not populated as expected before clicking get started. ` +
        `Expected date=${selectedDate}, zip=${NATIONWIDE_ORDER_DATA.zipCode}; ` +
        `observed date=${lastStorage.deliveryDate || '<empty>'}, zip=${lastStorage.deliveryZip || '<empty>'}. ` +
        `localStorageKeys=${debugStorage.localStorageKeys.join(',') || '<none>'}; ` +
        `sessionStorageKeys=${debugStorage.sessionStorageKeys.join(',') || '<none>'}; ` +
        `cookieNames=${cookieNames.join(',') || '<none>'}.`
    );
  }

  await byob.clickBuildYourOwnBoxGetStarted();
  await expect(page).toHaveURL(BYOB_CUSTOM_DOZEN_DATA.customDozenUrl);

  await attachClientState('after-open-custom-dozen');

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





