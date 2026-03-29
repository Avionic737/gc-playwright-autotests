import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  ALL_DAY_CELLS,
  DELIVERY_CUSTOM_DOZEN_GET_STARTED_CTA,
  DELIVERY_FLAVOR_BAR_GET_STARTED_CTA,
  DELIVERY_DATE_INPUT,
  DELIVERY_ERROR,
  DELIVERY_ZIP_BLUR_CLICK_TARGET,
  DELIVERY_ZIP_INPUT,
  MIN_DATE_DAY_CELL,
} from '../locators/shipping.selectors';

type CalendarCellKey = {
  year: string;
  month: string;
  date: string;
};

type DeliveryErrorSnapshot = {
  exists: boolean;
  visible: boolean;
  text: string | null;
  errorType: string | null;
  className: string | null;
};

type DeliveryDateAttempt = {
  date: string;
  error: string | null;
  errorType: string | null;
  errorVisible: boolean;
  errorClass: string | null;
};

export type DeliveryDateSelectionReport = {
  attempts: DeliveryDateAttempt[];
  selectedDate: string | null;
};

export class ShipNationwidePage {
  constructor(private readonly page: Page) {}

  async focusDeliveryDate(): Promise<void> {
    await this.dismissBlockingUi();

    const dateInput = this.page.locator(DELIVERY_DATE_INPUT);
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await dateInput.scrollIntoViewIfNeeded();

    await dateInput.click({ timeout: 2000 });
    // Fallback for readonly date inputs that sometimes ignore pointer click in test mode.
    await dateInput.dispatchEvent('click');

    await this.page.waitForTimeout(4000);
  }

  async setZip(zipCode: string): Promise<void> {
    await this.dismissBlockingUi();

    const zipInput = this.page.locator(DELIVERY_ZIP_INPUT);
    await expect(zipInput).toBeVisible({ timeout: 5000 });
    await zipInput.fill(zipCode, { timeout: 2000 });

    await zipInput.evaluate((node) => {
      if (node instanceof HTMLInputElement) {
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
        node.blur();
      }
    });

    const blurTarget = this.page.locator(DELIVERY_ZIP_BLUR_CLICK_TARGET).first();
    await expect(blurTarget).toBeVisible({ timeout: 10000 });
    await blurTarget.scrollIntoViewIfNeeded().catch(() => undefined);

    await blurTarget.click({ force: true, timeout: 5000 }).catch(async () => {
      await blurTarget.evaluate((node) => {
        if (node instanceof HTMLElement) {
          node.click();
        }
      });
    });

    await this.page
      .waitForFunction(
        () => {
          const active = document.activeElement as HTMLElement | null;
          return active?.id !== 'delivery-zip';
        },
        null,
        { timeout: 10000 }
      )
      .catch(() => undefined);

    const customDozenCta = this.page.locator(DELIVERY_CUSTOM_DOZEN_GET_STARTED_CTA).first();
    await expect(customDozenCta).toBeVisible({ timeout: 20000 });
  }

  async clickFlavorBarGetStarted(): Promise<void> {
    await this.dismissBlockingUi();
    await this.page.locator(DELIVERY_ZIP_INPUT).press('Tab').catch(() => undefined);

    const scopedFlavorBarCta = this.page.locator(DELIVERY_FLAVOR_BAR_GET_STARTED_CTA).first();
    const hrefBasedFallback = this.page
      .locator('a[href="/products/flavor-bar"]')
      .filter({ hasText: /get started/i })
      .first();

    await expect
      .poll(async () => {
        if (await scopedFlavorBarCta.isVisible().catch(() => false)) {
          return 'scoped-visible';
        }
        if (await hrefBasedFallback.isVisible().catch(() => false)) {
          return 'href-visible';
        }
        return 'hidden';
      }, { timeout: 30000 })
      .not.toBe('hidden');

    if (await scopedFlavorBarCta.isVisible().catch(() => false)) {
      await scopedFlavorBarCta.click();
      return;
    }

    await expect(hrefBasedFallback).toBeVisible();
    await hrefBasedFallback.click();
  }
  async selectFirstValidDateStartingFromMinDate(): Promise<DeliveryDateSelectionReport> {
    await this.dismissBlockingUi();

    const attempts: DeliveryDateAttempt[] = [];

    await this.openCalendarIfClosed();
    const minDateCell = this.page.locator(MIN_DATE_DAY_CELL).first();
    await expect(minDateCell).toBeVisible({ timeout: 5000 });

    const minDateResult = await this.tryPickDateCell(minDateCell, attempts);
    if (minDateResult.selectedDate) {
      return { attempts, selectedDate: minDateResult.selectedDate };
    }

    await this.openCalendarIfClosed();
    const candidateCells = await this.collectCandidateCells();
    if (candidateCells.length === 0) {
      throw new Error('No day cells found in the calendar starting from min-date.');
    }

    for (const cell of candidateCells) {
      const selector = `${ALL_DAY_CELLS}[data-year="${cell.year}"][data-month="${cell.month}"][data-date="${cell.date}"]`;
      const nextCell = this.page.locator(selector).first();
      const result = await this.tryPickDateCell(nextCell, attempts);
      if (result.selectedDate) {
        return { attempts, selectedDate: result.selectedDate };
      }
    }

    throw new Error('Could not select a valid delivery date: error kept appearing for all tested dates.');
  }

  private async collectCandidateCells(): Promise<CalendarCellKey[]> {
    return this.page.locator(ALL_DAY_CELLS).evaluateAll((elements) => {
      const result: CalendarCellKey[] = [];

      for (const el of elements) {
        const className = (el.getAttribute('class') ?? '').trim();

        // Skip min-date (already tried) and all disabled cells.
        if (className.includes('-min-date-') || className.includes('-disabled-')) {
          continue;
        }

        const year = el.getAttribute('data-year') ?? '';
        const month = el.getAttribute('data-month') ?? '';
        const date = el.getAttribute('data-date') ?? '';

        if (year && month && date) {
          result.push({ year, month, date });
        }
      }

      return result;
    });
  }

  private async tryPickDateCell(cell: Locator, attempts: DeliveryDateAttempt[]): Promise<{ selectedDate: string | null }> {
    await this.dismissBlockingUi();
    await this.clickCalendarCellWithRetry(cell);

    const selectedDate = (await this.page.locator(DELIVERY_DATE_INPUT).inputValue().catch(() => '')) || null;
    const error = await this.waitForDeliveryErrorSnapshot(4000);

    attempts.push({
      date: selectedDate ?? 'unknown',
      error: error.visible ? error.text : null,
      errorType: error.errorType,
      errorVisible: error.visible,
      errorClass: error.className,
    });

    if (!error.visible) {
      return { selectedDate };
    }

    if (error.errorType === 'cut-off') {
      return { selectedDate: null };
    }

    throw new Error(
      `Delivery selector returned non-cut-off error for date ${selectedDate ?? 'unknown'}: ` +
        `${error.errorType ?? 'unknown-type'} | ${error.text ?? 'no-text'}`
    );
  }

  private async waitForDeliveryErrorSnapshot(timeoutMs: number): Promise<DeliveryErrorSnapshot> {
    const deadline = Date.now() + timeoutMs;
    let last = await this.readDeliveryErrorSnapshot();

    while (Date.now() < deadline) {
      if (last.visible) {
        return last;
      }

      await this.page.waitForTimeout(250);
      last = await this.readDeliveryErrorSnapshot();
    }

    return last;
  }

  private async readDeliveryErrorSnapshot(): Promise<DeliveryErrorSnapshot> {
    return this.page.locator(DELIVERY_ERROR).evaluateAll((nodes) => {
      if (!nodes.length) {
        return {
          exists: false,
          visible: false,
          text: null,
          errorType: null,
          className: null,
        };
      }

      const isVisibleError = (node: HTMLElement): boolean => {
        const style = window.getComputedStyle(node);
        return (
          node.getClientRects().length > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          !node.classList.contains('_hidden')
        );
      };

      const typedNodes = nodes as HTMLElement[];
      const visibleNode = typedNodes.find((node) => isVisibleError(node));
      const candidate = visibleNode ?? typedNodes[0];

      return {
        exists: true,
        visible: !!visibleNode,
        text: (candidate.textContent || '').trim() || null,
        errorType: candidate.getAttribute('data-error-type'),
        className: candidate.className,
      };
    });
  }

  private async openCalendarIfClosed(): Promise<void> {
    const minDateCell = this.page.locator(MIN_DATE_DAY_CELL).first();
    const isCalendarOpen = await minDateCell.isVisible().catch(() => false);
    if (isCalendarOpen) {
      return;
    }

    const dateInput = this.page.locator(DELIVERY_DATE_INPUT);
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await dateInput.click({ timeout: 2000 }).catch(() => undefined);
    await dateInput.dispatchEvent('click').catch(() => undefined);
  }

  private async clickCalendarCellWithRetry(cell: Locator): Promise<void> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.openCalendarIfClosed();
        await expect(cell).toBeVisible({ timeout: 5000 });
        await cell.click({ force: true, timeout: 3000 });
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        await this.page.waitForTimeout(250);
      }
    }
  }

  private async dismissBlockingUi(): Promise<void> {
    await this.acceptCookiesIfPresent();
    await this.clickIfVisible(this.page.locator("button.klaviyo-close-form[aria-label='Close dialog']").first());
    await this.clickIfVisible(this.page.locator('button.js-close-popup').first());
    await this.clickIfVisible(this.page.locator("button:has-text('Close teaser')").first());

    const klaviyoForm = this.page.locator("form[data-testid^='klaviyo-form-']").first();
    if (await klaviyoForm.isVisible().catch(() => false)) {
      await klaviyoForm
        .evaluate((node) => {
          if (node instanceof HTMLElement) {
            node.style.display = 'none';
            node.style.pointerEvents = 'none';
          }
        })
        .catch(() => undefined);
    }
  }

  private async clickIfVisible(locator: Locator): Promise<void> {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click({ timeout: 1500 }).catch(() => undefined);
    }
  }
  private async acceptCookiesIfPresent(): Promise<void> {
    const banner = this.page.locator('#shopify-pc__banner');
    if (!(await banner.isVisible().catch(() => false))) {
      return;
    }

    const accept = this.page.locator('#shopify-pc__banner__btn-accept').first();
    await accept.click({ timeout: 2000, force: true }).catch(() => undefined);
    await banner.waitFor({ state: 'hidden', timeout: 3000 }).catch(async () => {
      await banner
        .evaluate((node) => {
          if (node instanceof HTMLElement) {
            node.style.display = 'none';
            node.style.pointerEvents = 'none';
          }
        })
        .catch(() => undefined);
    });
  }
}










