import type { Page } from '@playwright/test';

export type CheckoutTotalsMetrics = {
  subtotalRaw: string | null;
  shippingRaw: string | null;
  taxesRaw: string | null;
  totalRaw: string | null;
  subtotal: number | null;
  shipping: number | null;
  taxes: number | null;
  total: number | null;
  sum: number | null;
  delta: number | null;
  summaryText: string;
};

export async function extractCheckoutTotalsMetrics(page: Page): Promise<CheckoutTotalsMetrics> {
  return page.evaluate(() => {
    const clean = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

    const summaryRoot =
      document.querySelector('aside, .order-summary, .sidebar, [data-order-summary], [role="complementary"]') ??
      document.body;
    const summaryText = clean(summaryRoot?.textContent);

    const amountByLabel = (labelPattern: string): string | null => {
      const re = new RegExp(`(?:${labelPattern})[^$]*?(\\$\\s?[\\d,]+(?:\\.\\d{2})?|free)`, 'gi');
      const matches = Array.from(summaryText.matchAll(re));
      if (!matches.length) {
        return null;
      }

      const last = matches[matches.length - 1];
      return last[1] ?? null;
    };

    const parseMoney = (raw: string | null): number | null => {
      if (!raw) {
        return null;
      }

      const normalized = raw.trim().toLowerCase();
      if (normalized.includes('free')) {
        return 0;
      }

      const m = raw.replace(/,/g, '').match(/-?\d+(?:\.\d{1,2})?/);
      return m ? Number.parseFloat(m[0]) : null;
    };

    const subtotalRaw = amountByLabel('Subtotal');
    const shippingRaw = amountByLabel('Shipping');
    const taxesRaw = amountByLabel('Estimated taxes|Taxes');
    const totalRaw = amountByLabel('Total(?:\\s*USD)?');

    const subtotal = parseMoney(subtotalRaw);
    const shipping = parseMoney(shippingRaw);
    const taxes = parseMoney(taxesRaw);
    const total = parseMoney(totalRaw);

    const sum = subtotal === null || shipping === null || taxes === null ? null : subtotal + shipping + taxes;
    const delta = sum === null || total === null ? null : Math.abs(sum - total);

    return {
      subtotalRaw,
      shippingRaw,
      taxesRaw,
      totalRaw,
      subtotal,
      shipping,
      taxes,
      total,
      sum,
      delta,
      summaryText,
    };
  });
}
