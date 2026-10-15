# Playwright TypeScript Template

End-to-end tests with Playwright and TypeScript.

## Setup

```bash
npm install
npx playwright install
```

## Run tests

```bash
npm test
npm run test:headed
npm run test:ui
```

The example test uses a self-contained page so the starter can run without an
application. Replace it with tests for your target app. Configure its address
with `PLAYWRIGHT_BASE_URL` when using `page.goto('/')`.

Browser console messages and uncaught page errors are attached as
`browser-console.log` to each test in the HTML report. Reports are written to
`playwright-report/` and can be opened with:

```bash
npm run test:report
```

## Test case workflow

For the review-gated process from Excel test cases through Bestest, POM
implementation, and execution, see the
[Bestest test workflow](.claude/skills/bestest-test-workflow/SKILL.md).

### Publish test results to Bestest

The optional `npm run test:bestest` command runs the browser projects and sends
one execution per completed test and browser to the configured Bestest cycle.
It creates a new execution for each result, so repeated runs add execution
history rather than overwriting earlier results. The publisher uses the final
Playwright retry result and adds the browser, test title, attempt count, and
failure details to the execution comments.

For each test included in a Bestest run, add its existing Bestest `automationKey`
as a test annotation:

```ts
test('case description', {
  annotation: {
    type: 'bestest-automation-key',
    description: 'the-existing-Bestest-automationKey',
  },
}, async ({ page }) => {
  // Test steps and assertions
});
```

The annotation must match exactly one Bestest test case. The publisher checks
that every selected test is mapped before sending results; it does not guess
case IDs. It resolves the configured cycle by its cycle key and records browser
results in that cycle.

The reporter loads `test.env` automatically from the repository root. Copy
`test.env.example` to `test.env`, then set these values there or provide them
through your environment/CI secrets (environment values take precedence):

- `BESTEST_BASE`: regional origin, for example `https://prod-eu.getbestest.com`.
- `BESTEST_TOKEN`: read/write API token scoped to the same Bestest Space and
  region. Supply it through a local secret manager or CI secret; do not commit
  it or paste it into source files.
- `BESTEST_CYCLE_KEY`: existing cycle key for the run.

For a local PowerShell session, set the token securely before running:

```powershell
$env:BESTEST_BASE = 'https://prod-eu.getbestest.com'
$env:BESTEST_CYCLE_KEY = 'KAN-CY-38'
npm run test:bestest
```

The reporter exits unsuccessfully if configuration, case mapping, API calls, or
result updates fail. Use a non-production cycle while validating this
integration. The normal `npm test` command does not publish anything.
