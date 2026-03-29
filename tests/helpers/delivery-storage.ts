import type { Page, TestInfo } from '@playwright/test';

type DeliveryStorageState = {
  deliveryDate: string;
  deliveryZip: string;
};

type DeliveryStorageOptions = {
  expectedZip: string;
  expectedDate?: string;
  labelPrefix?: string;
  maxAttempts?: number;
  testInfo?: TestInfo;
};

export async function waitForDeliveryStorageReady(
  page: Page,
  options: DeliveryStorageOptions
): Promise<DeliveryStorageState> {
  const {
    expectedZip,
    expectedDate,
    testInfo,
    labelPrefix = 'ship-page',
    maxAttempts = 30,
  } = options;

  const attachClientState = async (label: string): Promise<DeliveryStorageState> => {
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

    if (testInfo) {
      const cookies = await page.context().cookies();
      await testInfo.attach(`client-state-${label}`, {
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
    }

    return {
      deliveryDate: (storage.localStorage['delivery-date'] ?? '').trim(),
      deliveryZip: (storage.localStorage['delivery-zip'] ?? '').trim(),
    };
  };

  let matched = false;
  let lastStorage: DeliveryStorageState = { deliveryDate: '', deliveryZip: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt === 1 || attempt === maxAttempts) {
      lastStorage = await attachClientState(`${labelPrefix}-attempt-${attempt}`);
    } else {
      lastStorage = await page.evaluate(() => {
        return {
          deliveryDate: (window.localStorage.getItem('delivery-date') ?? '').trim(),
          deliveryZip: (window.localStorage.getItem('delivery-zip') ?? '').trim(),
        };
      });
    }

    const dateMatched = expectedDate ? lastStorage.deliveryDate === expectedDate : lastStorage.deliveryDate !== '';
    const zipMatched = lastStorage.deliveryZip === expectedZip;

    if (dateMatched && zipMatched) {
      matched = true;
      if (testInfo) {
        await testInfo.attach(`client-state-${labelPrefix}-storage-matched`, {
          body: JSON.stringify({ attempt, ...lastStorage }, null, 2),
          contentType: 'application/json',
        });
      }
      break;
    }

    await page.waitForTimeout(1000);
  }

  if (!matched) {
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

    if (testInfo) {
      await testInfo.attach(`client-state-${labelPrefix}-storage-not-matched`, {
        body: JSON.stringify(
          {
            expected: {
              deliveryDate: expectedDate ?? '<non-empty>',
              deliveryZip: expectedZip,
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
    }

    throw new Error(
      `localStorage keys were not populated as expected before clicking get started. ` +
        `Expected date=${expectedDate ?? '<non-empty>'}, zip=${expectedZip}; ` +
        `observed date=${lastStorage.deliveryDate || '<empty>'}, zip=${lastStorage.deliveryZip || '<empty>'}. ` +
        `localStorageKeys=${debugStorage.localStorageKeys.join(',') || '<none>'}; ` +
        `sessionStorageKeys=${debugStorage.sessionStorageKeys.join(',') || '<none>'}; ` +
        `cookieNames=${cookieNames.join(',') || '<none>'}.`
    );
  }

  return lastStorage;
}
