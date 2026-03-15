import type { Page } from '@playwright/test';

import { SEARCH_BUTTON, SEARCH_INLINE_INPUT } from '../locators/header.selectors';

export class HeaderComponent {
  constructor(private readonly page: Page) {}

  async openSearch(): Promise<void> {
    await this.page.locator(SEARCH_BUTTON).click();
  }

  async searchForAndSubmit(text: string): Promise<void> {
    const input = this.page.locator(SEARCH_INLINE_INPUT);
    await input.fill(text);
    await input.press('Enter');
  }
}
