---
name: bestest-test-workflow
description: Follow the reviewed test-case, Bestest, POM implementation, and execution workflow when the user requests test cases or Bestest test automation.
---

# Test Case to Bestest Workflow

Use this workflow when the user asks to generate test cases, import or manage tests
in Bestest, implement tests from a reviewed workbook, or execute a Bestest campaign.
Keep the four phases in order and stop at each review gate until the user responds.

## 1. Generate test cases and request review

When the user asks for test cases:

1. Clarify only the missing product behavior or scope needed to write unambiguous
   cases. Do not invent requirements or expected results.
2. Create an Excel workbook (`.xlsx`) containing the proposed cases. Include, at
   minimum, a stable case ID, title, objective, preconditions, test data, ordered
   steps, expected result, priority, and proposed suite. Use one row per case and
   keep steps and expected results readable.
3. Check that IDs are unique, steps are actionable, and each expected result is
   observable and testable.
4. Deliver the workbook and a concise summary, then explicitly ask the user to
   review it. Do not create Bestest records or implement tests until the user
   returns the reviewed workbook or explicitly approves the cases.

Treat the user's returned workbook as the reviewed source of truth. Preserve its
case IDs and incorporate its edits; ask about material ambiguities rather than
silently choosing an interpretation.

## 2. Create Bestest cases, suites, and campaign

After receiving the reviewed workbook:

1. Confirm the target Bestest project, suite organization, and campaign name if
   they are not already known.
2. Create or update the test cases from the reviewed workbook, retaining a clear
   mapping between workbook IDs and Bestest IDs.
3. Organize the cases into the agreed test suites and create the requested test
   campaign using those suites/cases.
4. Report what was created and any mappings or omissions before moving to code.

Use only a configured, user-authorized Bestest integration or an explicitly
approved browser/API workflow. Do not invent endpoints, credentials, or project
IDs. If access or integration details are missing, ask for the required
non-secret configuration and explain how credentials can be supplied securely;
do not claim that records were created when they were not.

## 3. Implement reviewed cases as Playwright tests using POM

Implement the reviewed cases in this repository using TypeScript and Playwright.

- Every page object class must extend `BasePage` from `pages/BasePage.ts`.
- Put page objects under `pages/` and specs under `tests/`; keep assertions and
  scenario flow in specs and page interactions/locators in page objects.
- Use semantic Playwright locators where possible and preserve the reviewed case
  IDs in test titles, annotations, or another consistent traceable location.
- Import `test` and `expect` from the project's shared `fixtures/test.ts` entry
  point, and use the existing `logStep()` and `logVerification()` helpers for
  meaningful steps and verifications.
- Follow existing TypeScript, config, and test conventions. Do not add secrets
  or real credentials to source files or test data.

Run the smallest relevant checks, including TypeScript validation and targeted
tests when feasible. Summarize the implemented cases, files, and validation
results, then stop and explicitly ask the user to review the code. Do not launch
the full campaign or upload results until the user approves the implementation.

## 4. Execute approved tests and send results to Bestest

After the user approves the implementation:

1. Confirm the requested campaign, browser/project scope, and target environment.
   Do not run against production or another sensitive environment unless the
   user explicitly authorizes it.
2. Execute the agreed Playwright tests and retain the report and relevant
   artifacts.
3. Map each result back to its Bestest case and campaign. Send the actual
   pass/fail/skipped status and useful failure details/artifact links using the
   authorized integration.
4. Summarize execution totals and provide the Playwright report location plus
   the Bestest campaign/result reference.

Never mark an unexecuted or blocked case as passed. If tests cannot run, or
Bestest result submission fails or is unavailable, report the exact blocker and
available local results; do not imply results were sent.
