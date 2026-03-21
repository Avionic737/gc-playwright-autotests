import { expect, test } from '@playwright/test';

import { HeaderComponent } from '../../src/pages/header.component';
import { OverlaysComponent } from '../../src/pages/overlays.component';
import { PDPPage } from '../../src/pages/pdp.page';
import { SearchResultsPage } from '../../src/pages/search-results.page';
import { ShipNationwidePage } from '../../src/pages/ship-nationwide.page';
import { SideCartComponent } from '../../src/pages/sidecart.component';
import { pauseIfRequested } from '../helpers/debug';

const PDP_URL = 'https://georgetowncupcake.com/products/logo-t-shirt-black';
const CONTACT_EMAIL = 'test+10@mtnhausdigital.com';

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

  await page.getByRole('textbox', { name: /first name/i }).first().fill('Test');
  await page.getByRole('textbox', { name: /last name/i }).first().fill('User');
  await page.getByRole('textbox', { name: /phone number/i }).first().fill('2125551234');

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
  await finalCheckoutButton.click();
});









