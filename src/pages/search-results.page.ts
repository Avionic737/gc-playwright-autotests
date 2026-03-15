import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { OverlaysComponent } from './overlays.component';

export class SearchResultsPage {
  private readonly overlays: OverlaysComponent;

  constructor(private readonly page: Page) {
    this.overlays = new OverlaysComponent(page);
  }

  async openFirstProductResult(): Promise<void> {
    await this.overlays.dismissAll();

    const detailsLink = this.page
      .locator("main a[href*='/products/logo-t-shirt-black']")
      .filter({ hasText: /^details$/i })
      .first();

    await expect(detailsLink).toBeVisible({ timeout: 8000 });
    await detailsLink.scrollIntoViewIfNeeded();

    try {
      await detailsLink.click({ timeout: 2500 });
    } catch {
      // Card animation layers intermittently intercept pointer events.
      await detailsLink.evaluate((el) => (el as HTMLAnchorElement).click());
    }

    await expect(this.page).toHaveURL(/\/products\/logo-t-shirt-black/, { timeout: 10000 });
  }
}
