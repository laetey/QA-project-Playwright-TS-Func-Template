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