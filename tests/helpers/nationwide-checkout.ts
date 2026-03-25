import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

type RecipientData = {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
};

type NationwideCartData = {
  contactEmail: string;
  recipient: RecipientData;
};

type CheckoutAssertionsInput = {
  expectedTitle: string;
  expectedQty: number;
};

type CheckoutSummary = {
  lineTitle: string | null;
  lineTitlePresent: boolean;
  lineQty: string | null;
  linePrice: string | null;
  subtotal: string | null;
  shipping: string | null;
  taxes: string | null;
  total: string | null;
};

const CART_PRODUCT_TITLE_SELECTOR =
  '#cart-form > div > div.cart-items__table > div:nth-child(3) > div > div.cart-items__group-container > div > div.cart-items__group-content > div > div > div > div.cart-items__details.cart-primary-typography > div:nth-child(1) > p > a';
const SHIPPING_SETTINGS_SELECTOR =
  '#cart-form > div > div.cart-items__table > div:nth-child(3) > div > div.cart-items__group-container > div > div.cart-items__group-header > div.cart-items__options.shipping-settings.js-shipping-settings > div.shipping-settings__block.shipping-settings__block--delivery-address > div > address-select > div > div > div.ss-values > div';
const NEW_ADDRESS_OPTION_SELECTOR = "div.ss-option[role='option']";
const POPUP_CONTENT_SELECTOR = '#new-address-popup > div > div.popup__content';
const ADDRESS_AUTOCOMPLETE_FIRST_SUGGESTION_SELECTOR =
  'body > div.pca > div:nth-child(4) > div.pca.pcalist > div.pcaitem.pcafirstitem';
const COUNTRY_VALUE_SELECTOR =
  '#new-address-popup > div > div.popup__content > div > div.address-form__step-1 > div.address-form.address-form--cart > form > div.fieldset > div:nth-child(5) > country-selector > div > div.text-input__flex-label > div > div.ss-values > div';
const SAVE_NEW_ADDRESS_BUTTON_SELECTOR =
  '#new-address-popup > div > div.popup__content > div > div.address-form__step-1 > div.address-form.address-form--cart > form > div.popup__btn-wrapper > button.popup__submit-btn.button.mtn-button--primary.js-save-new-address';
const CONFIRM_ADDRESS_BUTTON_SELECTOR =
  '#new-address-popup > div > div.popup__content > div > div.address-form__step-2 > div.popup__btn-wrapper > button.popup__submit-btn.button.mtn-button--primary.js-confirm-address';

export async function proceedFromCartToCheckoutWithNationwideAddress(
  page: Page,
  params: {
    sidecartProductTitle: string;
    sidecartDeliveryDate: string;
    orderData: NationwideCartData;
  }
): Promise<void> {
  const { sidecartProductTitle, sidecartDeliveryDate, orderData } = params;

  await expect(page).toHaveURL(/\/cart(?:\?|$)/);

  const cartProductTitle = page.locator(CART_PRODUCT_TITLE_SELECTOR).first();
  await expect(cartProductTitle).toBeVisible();
  await expect(cartProductTitle).toContainText(sidecartProductTitle);

  const cartDeliveryDateInput = page.locator('#delivery-date');
  await expect(cartDeliveryDateInput).toBeVisible();
  await expect(cartDeliveryDateInput).toHaveValue(sidecartDeliveryDate);

  const contactEmailInput = page.locator('#customer_contact');
  await expect(contactEmailInput).toBeVisible();
  await contactEmailInput.fill(orderData.contactEmail);
  await expect(contactEmailInput).toHaveValue(orderData.contactEmail);

  const shippingSettings = page.locator(SHIPPING_SETTINGS_SELECTOR).first();
  await expect(shippingSettings).toBeVisible();
  await shippingSettings.click();

  const newAddressOption = page
    .locator(NEW_ADDRESS_OPTION_SELECTOR)
    .filter({ hasText: '+ add new recipient' })
    .first();
  await expect(newAddressOption).toBeVisible();
  await newAddressOption.click();

  const addressPopup = page.locator(POPUP_CONTENT_SELECTOR).first();
  await expect(addressPopup).toBeVisible();

  const firstNameInput = page
    .locator("#new-address-popup input[name='address[first_name]'], #new-address-popup input[id*='addressfirst_name']")
    .first();
  await expect(firstNameInput).toBeVisible();

  await firstNameInput.click({ timeout: 5000 }).catch(() => undefined);
  await firstNameInput.fill(orderData.recipient.firstName).catch(() => undefined);

  if ((await firstNameInput.inputValue().catch(() => '')) === '') {
    await firstNameInput.press('Control+A').catch(() => undefined);
    await firstNameInput.type(orderData.recipient.firstName, { delay: 40 }).catch(() => undefined);
  }

  if ((await firstNameInput.inputValue().catch(() => '')) === '') {
    await firstNameInput.evaluate(
      (node, firstName) => {
        if (node instanceof HTMLInputElement) {
          node.value = firstName;
          node.dispatchEvent(new Event('input', { bubbles: true }));
          node.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      orderData.recipient.firstName
    );
  }

  await expect(firstNameInput).toHaveValue(/\S+/, { timeout: 10000 });

  const lastNameInput = page
    .locator("#new-address-popup input[name='address[last_name]'], #new-address-popup input[id*='addresslast_name']")
    .first();
  await expect(lastNameInput).toBeVisible();
  await lastNameInput.fill(orderData.recipient.lastName);

  const phoneInput = page
    .locator("#new-address-popup input[name='address[phone]'], #new-address-popup input[id*='addressphone']")
    .first();
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill(orderData.recipient.phone);

  const address1Input = page.locator('#address1_1');
  await expect(address1Input).toBeVisible();
  await address1Input.fill('');
  await address1Input.type(orderData.recipient.addressLine1, { delay: 35 });

  const firstAddressSuggestion = page.locator(ADDRESS_AUTOCOMPLETE_FIRST_SUGGESTION_SELECTOR).first();
  await expect(firstAddressSuggestion).toBeVisible({ timeout: 15000 });
  await firstAddressSuggestion.click();

  const countryValue = page.locator(COUNTRY_VALUE_SELECTOR).first();
  await expect(countryValue).toBeVisible();
  await expect(countryValue).not.toHaveText('');

  const cityInput = page.locator('#city_1').first();
  await expect(cityInput).toBeVisible();
  await expect(cityInput).not.toHaveValue('');

  const zipInput = page.locator('#zip_1').first();
  await expect(zipInput).toBeVisible();
  await expect(zipInput).not.toHaveValue('');

  const saveNewAddressButton = page.locator(SAVE_NEW_ADDRESS_BUTTON_SELECTOR).first();
  await expect(saveNewAddressButton).toBeVisible();
  await saveNewAddressButton.click();

  const popupContent = page.locator('#new-address-popup div.popup__content').first();

  const continueButton = page.locator('#new-address-popup button').filter({ hasText: /^continue$/i }).first();
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }

  const uspsModal = page.locator('#new-address-popup div.popup__content').filter({ hasText: /USPS/i }).first();
  if (await uspsModal.isVisible({ timeout: 15000 }).catch(() => false)) {
    const standardizedRadio = page.getByRole('radio', { name: /USPS-standardized/i }).first();
    if (await standardizedRadio.isVisible().catch(() => false)) {
      await standardizedRadio.check({ force: true }).catch(async () => {
        await standardizedRadio.click({ force: true });
      });
    }

    const confirmAddressButton = page.locator(CONFIRM_ADDRESS_BUTTON_SELECTOR).first();

    await expect(confirmAddressButton).toBeVisible({ timeout: 15000 });
    await confirmAddressButton.scrollIntoViewIfNeeded().catch(() => undefined);

    await confirmAddressButton.click({ timeout: 5000 }).catch(async () => {
      await confirmAddressButton.click({ force: true, timeout: 5000 }).catch(async () => {
        await confirmAddressButton.evaluate((node) => {
          if (node instanceof HTMLElement) {
            node.click();
          }
        });
      });
    });
  }

  await expect(popupContent).toBeHidden({ timeout: 30000 });

  const finalCheckoutButton = page.getByRole('button', { name: /^check out$/i }).last();
  await expect(finalCheckoutButton).toBeVisible();
  await expect(finalCheckoutButton).toBeEnabled({ timeout: 30000 });

  await Promise.all([
    page.waitForURL(/\/(checkouts|invoices)\//, { timeout: 60000 }),
    finalCheckoutButton.click(),
  ]);
}

export async function assertCheckoutLineAndTotals(
  page: Page,
  params: CheckoutAssertionsInput
): Promise<void> {
  const { expectedTitle, expectedQty } = params;

  let checkoutSummary = await readCheckoutSummary(page, expectedTitle);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const shippingParsed = tryParseMoneyToNumber(checkoutSummary.shipping);
    const shippingText = (checkoutSummary.shipping ?? '').toLowerCase();
    if (shippingParsed !== null || shippingText.includes('free')) {
      break;
    }

    await page.waitForTimeout(3000);
    checkoutSummary = await readCheckoutSummary(page, expectedTitle);
  }

  expect(checkoutSummary.lineTitlePresent).toBeTruthy();
  await expect(checkoutSummary.lineTitle ?? '').toContain(expectedTitle);

  const parsedQty = Number.parseInt(checkoutSummary.lineQty ?? '', 10);
  if (Number.isNaN(parsedQty)) {
    await expect(page.locator('body')).toContainText(new RegExp(`(?:qty|quantity|x)\\s*:?\\s*${expectedQty}`, 'i'));
  } else {
    expect(parsedQty).toBe(expectedQty);
  }

  const linePriceParsed = tryParseMoneyToNumber(checkoutSummary.linePrice ?? checkoutSummary.subtotal);
  expect(linePriceParsed).not.toBeNull();
  const linePriceValue = linePriceParsed ?? 0;
  expect(linePriceValue).toBeGreaterThan(0);

  const subtotalParsed = tryParseMoneyToNumber(checkoutSummary.subtotal);
  const totalParsed = tryParseMoneyToNumber(checkoutSummary.total);
  expect(subtotalParsed).not.toBeNull();
  expect(totalParsed).not.toBeNull();

  const subtotalValue = subtotalParsed ?? 0;
  const totalValue = totalParsed ?? 0;

  const shippingParsed = tryParseMoneyToNumber(checkoutSummary.shipping);
  const taxesParsed = tryParseMoneyToNumber(checkoutSummary.taxes);

  let shippingValue = shippingParsed ?? 0;
  let taxesValue = taxesParsed ?? 0;

  if (shippingParsed === null && taxesParsed !== null) {
    shippingValue = totalValue - subtotalValue - taxesValue;
  } else if (taxesParsed === null && shippingParsed !== null) {
    taxesValue = totalValue - subtotalValue - shippingValue;
  } else if (shippingParsed === null && taxesParsed === null) {
    shippingValue = totalValue - subtotalValue;
    taxesValue = 0;
  }

  expect(Math.abs(subtotalValue + shippingValue + taxesValue - totalValue)).toBeLessThanOrEqual(0.01);
}

async function readCheckoutSummary(page: Page, expectedTitle: string): Promise<CheckoutSummary> {
  return page.evaluate((title) => {
    const clean = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

    const lineTitleSelectors = [
      '[data-product-title]',
      '.product__description__name',
      '[data-testid="line-item-title"]',
      '.order-summary__emphasis',
    ];

    const getFirstText = (selectors: string[]): string | null => {
      for (const selector of selectors) {
        const value = clean(document.querySelector(selector)?.textContent);
        if (value) {
          return value;
        }
      }
      return null;
    };

    const findAmountByLabel = (label: string): string | null => {
      const candidates = Array.from(document.querySelectorAll('tr, .total-line, dt, div, span'));
      for (const node of candidates) {
        const labelText = clean(node.textContent).toLowerCase();
        if (!labelText || !labelText.includes(label.toLowerCase())) {
          continue;
        }

        const row =
          node.closest('tr, .total-line, .order-summary__section__content, .order-summary__section') ?? node.parentElement;
        const rowText = clean(row?.textContent);
        const matches = rowText.match(/(?:\$\s?[\d,]+(?:\.\d{2})?)|free/gi);
        if (matches && matches.length > 0) {
          return matches[matches.length - 1];
        }
      }

      return null;
    };

    const bodyText = clean(document.body?.innerText);
    const lineTitle = getFirstText(lineTitleSelectors) || (bodyText.includes(title) ? title : null);

    const titleElement = Array.from(document.querySelectorAll('a, p, span, div, h1, h2, h3')).find(
      (node) => clean(node.textContent) === title
    );
    const lineContainer =
      titleElement?.closest('tr, li, .product, .order-summary__section__content, .order-summary') ?? titleElement?.parentElement;
    const lineText = clean(lineContainer?.textContent);

    const lineQtyMatch = lineText.match(/(?:qty|quantity|x)\s*:?\s*(\d+)/i) ?? bodyText.match(/(?:qty|quantity|x)\s*:?\s*(\d+)/i);
    const linePriceMatch = lineText.match(/\$\s?[\d,]+(?:\.\d{2})?/);

    const subtotal =
      clean(document.querySelector('[data-checkout-subtotal-price-target]')?.textContent) || findAmountByLabel('Subtotal');
    const shipping =
      clean(document.querySelector('[data-checkout-shipping-price-target]')?.textContent) || findAmountByLabel('Shipping');
    const taxes =
      clean(document.querySelector('[data-checkout-taxes-price-target]')?.textContent) ||
      findAmountByLabel('Estimated taxes') ||
      findAmountByLabel('Taxes');
    const total =
      clean(document.querySelector('[data-checkout-payment-due-target], [data-checkout-total-price-target]')?.textContent) ||
      findAmountByLabel('Total');

    return {
      lineTitle,
      lineTitlePresent: bodyText.includes(title),
      lineQty: lineQtyMatch?.[1] ?? null,
      linePrice: linePriceMatch?.[0] ?? null,
      subtotal,
      shipping,
      taxes,
      total,
    };
  }, expectedTitle);
}

function tryParseMoneyToNumber(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized.includes('free')) {
    return 0;
  }

  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d{1,2})?/);
  if (!match) {
    return null;
  }

  return Number.parseFloat(match[0]);
}
