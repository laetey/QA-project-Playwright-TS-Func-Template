import { expect, test } from '../fixtures/test.js';
import { BasePage } from '../pages/BasePage.js';
import { logStep, logVerification } from '../utils/testLifecycleLogger.js';

test('renders a page heading', async ({ page }) => {
  const basePage = new BasePage(page);
  logStep('Open the example page');
  await basePage.open();

  await logVerification('The page heading is visible', () =>
    expect(basePage.heading).toBeVisible(),
  );
});