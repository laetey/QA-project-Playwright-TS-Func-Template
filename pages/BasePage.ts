import type { Locator, Page } from '@playwright/test';

export class BasePage {
  constructor(private readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Playwright is ready' });
  }

  async open(): Promise<void> {
    await this.page.setContent('<main><h1>Playwright is ready</h1></main>');
  }
}