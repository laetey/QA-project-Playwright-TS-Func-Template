import { test as base } from '@playwright/test';
import { logTestEnd, logTestStart } from '../utils/testLifecycleLogger.js';

type TestFixtures = {
  captureBrowserConsole: void;
};

export const test = base.extend<TestFixtures>({
  captureBrowserConsole: [
    async ({ page }, use, testInfo) => {
      const messages: string[] = [];
      logTestStart(testInfo);

      page.on('console', (message) => {
        messages.push(`[${message.type()}] ${message.text()}`);
      });
      page.on('pageerror', (error) => {
        messages.push(`[pageerror] ${error.message}`);
      });

      try {
        await use();
      } finally {
        logTestEnd(testInfo);
        await testInfo.attach('browser-console.log', {
          body: messages.length > 0 ? messages.join('\n') : 'No browser console messages.',
          contentType: 'text/plain',
        });
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';