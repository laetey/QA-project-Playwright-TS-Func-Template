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
3. Organize the cases using the target Space's supported collection mechanism
   for the agreed suites, and create the requested campaign using the supported
   Bestest records and relationships.
4. Report what was created and any mappings or omissions before moving to code.

Use only a configured, user-authorized Bestest integration or an explicitly
approved browser/API workflow. Bestest documents two supported integration
paths:

- **MCP** is suitable for interactive, agent-driven discovery and changes when
  a Bestest MCP server is connected. It is scoped to the token's Space and
  permissions. Discover the available schema and filters before reading or
  writing; use `describe_schema` and `filter_help` before `graphql_query` or
  `graphql_mutation`. MCP is currently documented as open beta.
- **REST API** is suitable for deterministic integrations and CI result
  publishing. Use the region-specific `https://prod-{eu|us|in}.getbestest.com`
  host and `/api/v1` paths, with a token created for the matching Space and
  region. The API is JSON:API: use `Authorization` with the token and
  `Content-Type: application/vnd.api+json` for requests with a body; do not
  request `application/json`. Use the token-authorized OpenAPI document at
  `/api/v1/openapi.json` and the official recipes/reference for exact fields,
  relationships, and operations rather than guessing.

Use whichever authorized integration is actually connected; do not imply MCP
is available merely because its documentation exists. Never request, print,
commit, or place tokens in a workbook. Ask the user to configure secrets in
their approved secure mechanism. Do not invent endpoints, credentials, or
project IDs. If access or integration details are missing, ask for the required
non-secret configuration and explain how credentials can be supplied securely;
do not claim that records were created when they were not.

Bestest's documented REST resources include test cases, test collections,
campaigns, cycles, and executions. Use the product's supported collection/cycle
organization for the agreed suite and campaign; do not assume a generic
test-suite endpoint. Resolve the Space's `projectId` and record UUIDs through
authorized reads, and preserve workbook case IDs as a traceability key (for
example, a stable automation key where supported).

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
3. Map each result back to its Bestest case and campaign/cycle. For REST
   publishing, create or update the appropriate test case execution linked to
   the resolved test case and cycle, using the documented execution result
   values (`PASSED`, `FAILED`, `BLOCKED`, `SKIPPED`, etc.). Follow ETag/`If-Match`
   requirements when updating an existing resource. For MCP, discover the
   current schema and use the authorized mutation tool to record the equivalent
   execution data. Include useful failure details and artifact references when
   supported by the target resource.
   In this repository, use `npm run test:bestest` with `BESTEST_BASE`,
   `BESTEST_TOKEN`, and `BESTEST_CYCLE_KEY` supplied through a secure environment.
   Add each test's Bestest `automationKey` as a `bestest-automation-key`
   annotation. The reporter posts the final retry outcome as a separate
   execution per browser and fails the run if mappings or result publishing
   fail.
4. Summarize execution totals and provide the Playwright report location plus
   the Bestest campaign/result reference.

Never mark an unexecuted or blocked case as passed. If tests cannot run, or
Bestest result submission fails or is unavailable, report the exact blocker and
available local results; do not imply results were sent.

Official references:

- [Bestest REST API guide](https://getbestest.com/docs/automation-ai/rest-api/)
- [Bestest MCP guide](https://getbestest.com/docs/automation-ai/mcp/)
- [Bestest REST recipes](https://getbestest.com/docs/automation-ai/recipes/)
