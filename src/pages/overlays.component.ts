import type { Page } from '@playwright/test';

import {
  COOKIE_ACCEPT_BUTTON,
  COOKIE_BANNER,
  KLAVIYO_CLOSE_BUTTON,
  KLAVIYO_FORM,
} from '../locators/overlay.selectors';

export class OverlaysComponent {
  constructor(private readonly page: Page) {}

  async dismissAll(): Promise<void> {
    await this.acceptCookiesIfPresent();
    await this.closeKlaviyoIfPresent();
  }

  private async acceptCookiesIfPresent(): Promise<void> {
    const banner = this.page.locator(COOKIE_BANNER);
    if (!(await banner.isVisible().catch(() => false))) {
      return;
    }

    const accept = this.page.locator(COOKIE_ACCEPT_BUTTON);
    if (await accept.isVisible().catch(() => false)) {
      await accept.click();
      await banner.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
    }
  }

  private async closeKlaviyoIfPresent(): Promise<void> {
    const form = this.page.locator(KLAVIYO_FORM).first();
    if (!(await form.isVisible().catch(() => false))) {
      return;
    }

    const closeButton = this.page.locator(KLAVIYO_CLOSE_BUTTON).first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click().catch(() => undefined);
      await form.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
      return;
    }

    await form.evaluate((node) => {
      (node as HTMLElement).style.display = 'none';
    }).catch(() => undefined);
  }
}
