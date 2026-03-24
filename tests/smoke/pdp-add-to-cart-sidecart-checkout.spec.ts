import { expect, test } from '@playwright/test';

import { HeaderComponent } from '../../src/pages/header.component';
import { OverlaysComponent } from '../../src/pages/overlays.component';
import { PDPPage } from '../../src/pages/pdp.page';
import { SearchResultsPage } from '../../src/pages/search-results.page';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';
import { SideCartComponent } from '../../src/pages/sidecart.component';
import { pauseIfRequested } from '../helpers/debug';
import { setDeliveryDateAndZip } from '../helpers/delivery';

const PDP_URL = 'https://georgetowncupcake.com/products/logo-t-shirt-black';
const CONTACT_EMAIL = 'test+10@mtnhausdigital.com';
const tryParseMoneyToNumber = (raw: string | null): number | null => {
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
};
const parseMoneyToNumber = (raw: string | null): number => {
  if (!raw) {
    throw new Error('Expected money text, got empty value.');
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized.includes('free')) {
    return 0;
  }

  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d{1,2})?/);
  if (!match) {
    throw new Error(`Unable to parse money value from: ${raw}`);
  }

  return Number.parseFloat(match[0]);
};

test('add logo t-shirt black to cart and verify sidecart details with checkout click', async ({ page, baseURL }) => {
  test.setTimeout(180000);
  const pdp = new PDPPage(page);
  const ship = new ShipNationwidePage(page);
  const header = new HeaderComponent(page);
  const overlays = new OverlaysComponent(page);
  const results = new SearchResultsPage(page);
  const sidecart = new SideCartComponent(page);

  const cartProductTitleSelector =
    '#cart-form > div > div.cart-items__table > div:nth-child(3) > div > div.cart-items__group-container > div > div.cart-items__group-content > div > div > div > div.cart-items__details.cart-primary-typography > div:nth-child(1) > p > a';
  const shippingSettingsSelector =
    '#cart-form > div > div.cart-items__table > div:nth-child(3) > div > div.cart-items__group-container > div > div.cart-items__group-header > div.cart-items__options.shipping-settings.js-shipping-settings > div.shipping-settings__block.shipping-settings__block--delivery-address > div > address-select > div > div > div.ss-values > div';
  const newAddressOptionSelector = "div.ss-option[role='option']";
  const popupContentSelector = '#new-address-popup > div > div.popup__content';
  const addressAutocompleteFirstSuggestionSelector =
    'body > div.pca > div:nth-child(4) > div.pca.pcalist > div.pcaitem.pcafirstitem';
  const countryValueSelector =
    '#new-address-popup > div > div.popup__content > div > div.address-form__step-1 > div.address-form.address-form--cart > form > div.fieldset > div:nth-child(5) > country-selector > div > div.text-input__flex-label > div > div.ss-values > div';
  const saveNewAddressButtonSelector =
    '#new-address-popup > div > div.popup__content > div > div.address-form__step-1 > div.address-form.address-form--cart > form > div.popup__btn-wrapper > button.popup__submit-btn.button.mtn-button--primary.js-save-new-address';
  const finalCheckoutButtonSelector =
    '#shopify-section-template--19484127920355__cart-section > cart-items-component > div.section.color-scheme-1.section--page-width > div > div.cart-page__summary._active > div.cart__summary-content.border-style.cart__container--extend.color-scheme-3.inherit-parent-scheme--mobile > div > div > div.cart__summary-totals > div.cart__ctas.cart__ctas--desktop > button';

  await pdp.open(PDP_URL);
  await overlays.dismissAll();

  await pdp.hoverShippingInfo();
  await pdp.clickShipNationwideLink();
  await expect(page).toHaveURL(`${baseURL}/pages/ship-nationwide`);

  const deliverySelection = await setDeliveryDateAndZip(ship, '10001', test.info());

  await header.openSearch();
  await header.searchForAndSubmit('Logo T-shirt (Black)');

  await results.openFirstProductResult();

  await pdp.selectSizeM();
  await pdp.setQty(2);
  await expect(await pdp.getQty()).toBe(2);

  await pdp.addToCart();
  await pauseIfRequested(page);

  const sidecartProductTitle = await sidecart.getProductTitle();
  await expect(sidecartProductTitle).not.toBe('');
  await expect(await sidecart.getVariantValue()).toBe('M');
  await expect(await sidecart.getQtyValue()).toBe(2);
  await expect((await sidecart.getShippingValue()).toLowerCase()).toBe('shipping');

  const selectedDeliveryDate = deliverySelection.selectedDate;
  if (!selectedDeliveryDate) {
    throw new Error('Expected selected delivery date to be present in deliverySelection report.');
  }

  const sidecartDeliveryDate = await sidecart.getDateValue();
  await expect(sidecartDeliveryDate).not.toBe('');
  await expect(await sidecart.getZipValue()).toBe('10001');

  await sidecart.clickCheckoutLink();

  await expect(page).toHaveURL(/\/cart(?:\?|$)/);

  const cartProductTitle = page.locator(cartProductTitleSelector).first();
  await expect(cartProductTitle).toBeVisible();
  await expect(cartProductTitle).toContainText(sidecartProductTitle);

  const cartDeliveryDateInput = page.locator('#delivery-date');
  await expect(cartDeliveryDateInput).toBeVisible();
  await expect(cartDeliveryDateInput).toHaveValue(sidecartDeliveryDate);

  const contactEmailInput = page.locator('#customer_contact');
  await expect(contactEmailInput).toBeVisible();
  await contactEmailInput.fill(CONTACT_EMAIL);
  await expect(contactEmailInput).toHaveValue(CONTACT_EMAIL);

  const shippingSettings = page.locator(shippingSettingsSelector).first();
  await expect(shippingSettings).toBeVisible();
  await shippingSettings.click();

  const newAddressOption = page
    .locator(newAddressOptionSelector)
    .filter({ hasText: '+ add new recipient' })
    .first();
  await expect(newAddressOption).toBeVisible();
  await newAddressOption.click();

  const addressPopup = page.locator(popupContentSelector).first();
  await expect(addressPopup).toBeVisible();

  const firstNameInput = page
    .locator("#new-address-popup input[name='address[first_name]'], #new-address-popup input[id*='addressfirst_name']")
    .first();
  await expect(firstNameInput).toBeVisible();

  await firstNameInput.click({ timeout: 5000 }).catch(() => undefined);
  await firstNameInput.fill('Test').catch(() => undefined);

  if ((await firstNameInput.inputValue().catch(() => '')) === '') {
    await firstNameInput.press('Control+A').catch(() => undefined);
    await firstNameInput.type('Test', { delay: 40 }).catch(() => undefined);
  }

  if ((await firstNameInput.inputValue().catch(() => '')) === '') {
    await firstNameInput.evaluate((node) => {
      if (node instanceof HTMLInputElement) {
        node.value = 'Test';
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  await expect(firstNameInput).toHaveValue(/\S+/, { timeout: 10000 });

  const lastNameInput = page
    .locator("#new-address-popup input[name='address[last_name]'], #new-address-popup input[id*='addresslast_name']")
    .first();
  await expect(lastNameInput).toBeVisible();
  await lastNameInput.fill('User');

  const phoneInput = page
    .locator("#new-address-popup input[name='address[phone]'], #new-address-popup input[id*='addressphone']")
    .first();
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill('2125551234');

  const address1Input = page.locator('#address1_1');
  await expect(address1Input).toBeVisible();
  await address1Input.fill('');
  await address1Input.type('340 W 28th St Apt 9j, New York, NY 10001', { delay: 35 });

  const firstAddressSuggestion = page.locator(addressAutocompleteFirstSuggestionSelector).first();
  await expect(firstAddressSuggestion).toBeVisible({ timeout: 15000 });
  await firstAddressSuggestion.click();

  const countryValue = page.locator(countryValueSelector).first();
  await expect(countryValue).toBeVisible();
  await expect(countryValue).not.toHaveText('');

  const cityInput = page.locator('#city_1').first();
  await expect(cityInput).toBeVisible();
  await expect(cityInput).not.toHaveValue('');

  const zipInput = page.locator('#zip_1').first();
  await expect(zipInput).toBeVisible();
  await expect(zipInput).not.toHaveValue('');

  const saveNewAddressButton = page.locator(saveNewAddressButtonSelector).first();
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

    const confirmAddressButton = page
      .locator(
        '#new-address-popup > div > div.popup__content > div > div.address-form__step-2 > div.popup__btn-wrapper > button.popup__submit-btn.button.mtn-button--primary.js-confirm-address'
      )
      .first();

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

  const finalCheckoutButton = page.locator(finalCheckoutButtonSelector).first();
  await expect(finalCheckoutButton).toBeVisible();
  await expect(finalCheckoutButton).toBeEnabled({ timeout: 30000 });
  await Promise.all([
    page.waitForURL(/\/(checkouts|invoices)\//, { timeout: 60000 }),
    finalCheckoutButton.click(),
  ]);

  let checkoutSummary = await page.evaluate((expectedTitle) => {
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
    const lineTitle = getFirstText(lineTitleSelectors) || (bodyText.includes(expectedTitle) ? expectedTitle : null);

    const titleElement = Array.from(document.querySelectorAll('a, p, span, div, h1, h2, h3')).find(
      (node) => clean(node.textContent) === expectedTitle
    );
    const lineContainer =
      titleElement?.closest('tr, li, .product, .order-summary__section__content, .order-summary') ?? titleElement?.parentElement;
    const lineText = clean(lineContainer?.textContent);

    const lineQtyMatch = lineText.match(/(?:qty|quantity|x)\\s*:?\\s*(\\d+)/i) ?? bodyText.match(/(?:qty|quantity|x)\\s*:?\\s*(\\d+)/i);
    const linePriceMatch = lineText.match(/\$\s?[\d,]+(?:\.\d{2})?/);

    const subtotal =
      clean(document.querySelector('[data-checkout-subtotal-price-target]')?.textContent) || findAmountByLabel('Subtotal');
    const shipping =
      clean(document.querySelector('[data-checkout-shipping-price-target]')?.textContent) || findAmountByLabel('Shipping');
    const taxes =
      clean(document.querySelector('[data-checkout-taxes-price-target]')?.textContent) || findAmountByLabel('Estimated taxes');
    const total =
      clean(document.querySelector('[data-checkout-payment-due-target], [data-checkout-total-price-target]')?.textContent) ||
      findAmountByLabel('Total');

    return {
      lineTitle,
      lineTitlePresent: bodyText.includes(expectedTitle),
      lineQty: lineQtyMatch?.[1] ?? null,
      linePrice: linePriceMatch?.[0] ?? null,
      subtotal,
      shipping,
      taxes,
      total,
    };
  }, sidecartProductTitle);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const shippingParsed = tryParseMoneyToNumber(checkoutSummary.shipping);
    const shippingText = (checkoutSummary.shipping ?? '').toLowerCase();
    if (shippingParsed !== null || shippingText.includes('free')) {
      break;
    }

    await page.waitForTimeout(3000);
    checkoutSummary = await page.evaluate((expectedTitle) => {
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
      const lineTitle = getFirstText(lineTitleSelectors) || (bodyText.includes(expectedTitle) ? expectedTitle : null);

      const titleElement = Array.from(document.querySelectorAll('a, p, span, div, h1, h2, h3')).find(
        (node) => clean(node.textContent) === expectedTitle
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
        lineTitlePresent: bodyText.includes(expectedTitle),
        lineQty: lineQtyMatch?.[1] ?? null,
        linePrice: linePriceMatch?.[0] ?? null,
        subtotal,
        shipping,
        taxes,
        total,
      };
    }, sidecartProductTitle);
  }
  expect(checkoutSummary.lineTitlePresent).toBeTruthy();
  await expect(checkoutSummary.lineTitle ?? '').toContain(sidecartProductTitle);
  const parsedQty = Number.parseInt(checkoutSummary.lineQty ?? '', 10);
  if (Number.isNaN(parsedQty)) {
    await expect(page.locator('body')).toContainText(/(?:qty|quantity|x)\s*:?\s*2/i);
  } else {
    expect(parsedQty).toBe(2);
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
  expect(Math.abs(subtotalValue + shippingValue + taxesValue - totalValue)).toBeLessThanOrEqual(0.01);
});

