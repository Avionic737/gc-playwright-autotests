import type { Page } from '@playwright/test';

export async function pauseIfRequested(page: Page): Promise<void> {
  if (process.env.PW_MANUAL_PAUSE === '1') {
    await page.pause();
  }
}
