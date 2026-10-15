import { defineConfig, devices } from '@playwright/test';

// ========================== VARS ===================
const timestamp = buildTimestamp();

// ========================== FUNCTIONS ==============
function buildTimestamp() {
const d = new Date();
const yyyy = d.getFullYear();
const mm = String(d.getMonth() + 1).padStart(2, '0');
const dd = String(d.getDate()).padStart(2, '0');
const hh = String(d.getHours()).padStart(2, '0');
const min = String(d.getMinutes()).padStart(2, '0');
return `${yyyy}${mm}${dd}-${hh}${min}`;
}

export default defineConfig({
  testDir: './tests',
  outputDir: `test-results/${timestamp}`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    trace: 'retain-on-failure',
    video :  'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});