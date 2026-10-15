import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { config as loadDotEnv } from 'dotenv';

const AUTOMATION_KEY_ANNOTATION = 'bestest-automation-key';
const AUTOMATION_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;
const REQUEST_TIMEOUT_MS = 20_000;
const COMMENT_MAX_LENGTH = 2_000;

type JsonApiResource = {
  id: string;
  attributes?: Record<string, unknown>;
};

type JsonApiDocument = {
  data?: JsonApiResource | JsonApiResource[];
  errors?: Array<{ detail?: string; title?: string }>;
};

type BestestConfig = {
  baseUrl: URL;
  token: string;
  cycleKey: string;
};

type PublishableResult = {
  automationKey: string;
  browser: string;
  test: TestCase;
  result: TestResult;
};

export default class BestestReporter implements Reporter {
  private readonly results: PublishableResult[] = [];
  private config?: BestestConfig;
  private preflightErrors: string[] = [];

  onBegin(_config: FullConfig, suite: Suite): void {
    const envFile = loadDotEnv({ path: 'test.env', override: false });
    this.config = this.readConfig();
    if (envFile.error && (envFile.error as NodeJS.ErrnoException).code !== 'ENOENT') {
      this.preflightErrors.unshift(`Unable to load test.env: ${envFile.error.message}`);
    }
    this.preflightErrors.push(...this.validateTests(suite.allTests()));

    if (this.preflightErrors.length > 0) {
      console.error('[Bestest] Publishing preflight failed:');
      for (const error of this.preflightErrors) {
        console.error(`[Bestest] ${error}`);
      }
      return;
    }

    console.log(
      `[Bestest] Publishing browser-specific results for ${suite.allTests().length} test run(s).`,
    );
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const lastResult = test.results.at(-1);
    if (lastResult !== result) {
      return;
    }

    const automationKey = test.annotations.find(
      (annotation) => annotation.type === AUTOMATION_KEY_ANNOTATION,
    )?.description;

    if (!automationKey) {
      return;
    }

    this.results.push({
      automationKey,
      browser: test.parent.project()?.name ?? 'unknown',
      test,
      result,
    });
  }

  async onEnd(result: FullResult): Promise<{ status?: FullResult['status'] } | void> {
    if (this.preflightErrors.length > 0 || !this.config) {
      return { status: 'failed' };
    }

    if (this.results.length === 0) {
      console.log('[Bestest] No completed mapped test results to publish.');
      return;
    }

    const errors: string[] = [];
    try {
      const projectId = await this.getProjectId(this.config);
      const cycleId = await this.getCycleId(this.config, this.config.cycleKey);
      const caseIds = new Map<string, string>();

      for (const entry of this.results) {
        try {
          let caseId = caseIds.get(entry.automationKey);
          if (!caseId) {
            caseId = await this.getCaseId(this.config, entry.automationKey);
            caseIds.set(entry.automationKey, caseId);
          }

          const executionId = await this.publishExecution(this.config, {
            caseId,
            cycleId,
            projectId,
            ...entry,
          });
          console.log(
            `[Bestest] ${entry.automationKey} [${entry.browser}] -> ${this.toBestestStatus(entry.result.status)} (execution ${executionId})`,
          );
        } catch (error) {
          errors.push(
            `${entry.automationKey} [${entry.browser}]: ${this.errorMessage(error)}`,
          );
        }
      }
    } catch (error) {
      errors.push(this.errorMessage(error));
    }

    if (errors.length > 0) {
      console.error(`[Bestest] Failed to publish ${errors.length} result(s):`);
      for (const error of errors) {
        console.error(`[Bestest] ${error}`);
      }
      return { status: 'failed' };
    }

    console.log(`[Bestest] Successfully published ${this.results.length} execution(s).`);
    return result.status === 'passed' ? undefined : { status: result.status };
  }

  private readConfig(): BestestConfig | undefined {
    const token = process.env.BESTEST_TOKEN;
    const cycleKey = process.env.BESTEST_CYCLE_KEY;
    const baseValue = process.env.BESTEST_BASE;
    const errors: string[] = [];

    if (!token || this.isPlaceholder(token)) {
      errors.push('BESTEST_TOKEN is missing or still a placeholder in test.env or the environment.');
    }
    if (!cycleKey || this.isPlaceholder(cycleKey) || !AUTOMATION_KEY_PATTERN.test(cycleKey)) {
      errors.push('BESTEST_CYCLE_KEY is missing, still a placeholder, or contains unsupported characters.');
    }

    let baseUrl: URL | undefined;
    if (!baseValue) {
      errors.push('BESTEST_BASE is not set.');
    } else {
      try {
        const candidate = new URL(baseValue);
        const validHost = /^prod-(eu|us|in)\.getbestest\.com$/i.test(candidate.hostname);
        if (
          candidate.protocol !== 'https:' ||
          !validHost ||
          (candidate.pathname !== '/' && candidate.pathname !== '')
        ) {
          errors.push(
            'BESTEST_BASE must be a regional HTTPS origin, such as https://prod-eu.getbestest.com.',
          );
        } else {
          candidate.pathname = '';
          candidate.search = '';
          candidate.hash = '';
          baseUrl = candidate;
        }
      } catch {
        errors.push('BESTEST_BASE is not a valid URL.');
      }
    }

    this.preflightErrors = errors;
    if (errors.length > 0 || !token || !cycleKey || !baseUrl) {
      return undefined;
    }

    return { baseUrl, token, cycleKey };
  }

  private isPlaceholder(value: string): boolean {
    return /^(replace-with-|your-)/i.test(value.trim());
  }

  private validateTests(tests: TestCase[]): string[] {
    const errors: string[] = [];
    const mappings = new Set<string>();

    for (const test of tests) {
      const keys = test.annotations.filter(
        (annotation) => annotation.type === AUTOMATION_KEY_ANNOTATION,
      );
      if (keys.length !== 1 || !keys[0].description) {
        errors.push(
          `${test.titlePath().join(' > ')} must have exactly one ${AUTOMATION_KEY_ANNOTATION} annotation with its Bestest automationKey as the description.`,
        );
        continue;
      }

      const key = keys[0].description;
      if (!AUTOMATION_KEY_PATTERN.test(key)) {
        errors.push(
          `${test.titlePath().join(' > ')} has an automationKey with unsupported characters.`,
        );
        continue;
      }

      const mapping = `${test.parent.project()?.name ?? 'unknown'}:${key}`;
      if (mappings.has(mapping)) {
        errors.push(
          `More than one test maps to automationKey "${key}" in project "${test.parent.project()?.name ?? 'unknown'}".`,
        );
      }
      mappings.add(mapping);
    }

    return errors;
  }

  private async getProjectId(config: BestestConfig): Promise<string> {
    const document = await this.request(config, 'GET', '/projects');
    const projects = Array.isArray(document.data) ? document.data : [];

    if (projects.length !== 1 || !projects[0].id) {
      throw new Error(`Expected one accessible Bestest Space, found ${projects.length}.`);
    }

    return projects[0].id;
  }

  private async getCycleId(config: BestestConfig, cycleKey: string): Promise<string> {
    const document = await this.request(
      config,
      'GET',
      `/test_cycles?${new URLSearchParams({
        filter: `testCycleKey = "${cycleKey}"`,
      })}`,
    );
    const cycles = Array.isArray(document.data) ? document.data : [];

    if (cycles.length !== 1 || !cycles[0].id) {
      throw new Error(
        `Expected one Bestest cycle for key "${cycleKey}", found ${cycles.length}.`,
      );
    }

    return cycles[0].id;
  }

  private async getCaseId(
    config: BestestConfig,
    automationKey: string,
  ): Promise<string> {
    const document = await this.request(
      config,
      'GET',
      `/test_cases?${new URLSearchParams({
        filter: `automationKey = "${automationKey}"`,
      })}`,
    );
    const cases = Array.isArray(document.data) ? document.data : [];

    if (cases.length !== 1 || !cases[0].id) {
      throw new Error(
        `Expected one Bestest test case for automationKey "${automationKey}", found ${cases.length}.`,
      );
    }

    return cases[0].id;
  }

  private async publishExecution(
    config: BestestConfig,
    entry: PublishableResult & { caseId: string; cycleId: string; projectId: string },
  ): Promise<string> {
    const created = await this.request(config, 'POST', '/test_case_executions', {
      data: {
        type: 'test_case_executions',
        attributes: {
          projectId: entry.projectId,
          testCycleId: entry.cycleId,
          testCaseId: entry.caseId,
        },
      },
    });

    if (!created.data || Array.isArray(created.data) || !created.data.id) {
      throw new Error('Bestest did not return an execution ID after creating the execution.');
    }

    const executionId = created.data.id;
    const executionPath = `/test_case_executions/${encodeURIComponent(executionId)}`;
    const etag = await this.getEtag(config, executionPath);
    const status = this.toBestestStatus(entry.result.status);
    const comments = this.buildComments(entry.test, entry.browser, entry.result);

    await this.request(config, 'PATCH', executionPath, {
      data: {
        type: 'test_case_executions',
        id: executionId,
        attributes: { result: status, comments },
      },
    }, etag);
    return executionId;
  }

  private async getEtag(config: BestestConfig, path: string): Promise<string> {
    const response = await fetch(new URL(`/api/v1${path}`, config.baseUrl), {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${config.token}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Bestest API GET ${path} failed (${response.status}).`);
    }

    const etag = response.headers.get('etag');
    if (!etag) {
      throw new Error(`Bestest API GET ${path} did not return an ETag.`);
    }
    return etag;
  }

  private async request(
    config: BestestConfig,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
    etag?: string,
  ): Promise<JsonApiDocument> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.api+json',
      Authorization: `Bearer ${config.token}`,
    };
    if (body) {
      headers['Content-Type'] = 'application/vnd.api+json';
    }
    if (etag) {
      headers['If-Match'] = etag;
    }

    const response = await fetch(new URL(`/api/v1${path}`, config.baseUrl), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const responseBody = await response.text();

    if (!response.ok) {
      let details = responseBody;
      try {
        const document = JSON.parse(responseBody) as JsonApiDocument;
        if (document.errors?.length) {
          details = document.errors
            .map((error) => error.detail ?? error.title ?? 'Unknown API error')
            .join('; ');
        }
      } catch {
        // Keep the response body for non-JSON API errors.
      }
      throw new Error(`Bestest API ${method} ${path} failed (${response.status}): ${details}`);
    }

    if (!responseBody) {
      return {};
    }
    try {
      return JSON.parse(responseBody) as JsonApiDocument;
    } catch {
      throw new Error(`Bestest API ${method} ${path} returned invalid JSON.`);
    }
  }

  private toBestestStatus(
    status: TestResult['status'],
  ): 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' {
    switch (status) {
      case 'passed':
        return 'PASSED';
      case 'skipped':
        return 'SKIPPED';
      case 'interrupted':
        return 'BLOCKED';
      case 'failed':
      case 'timedOut':
        return 'FAILED';
    }
  }

  private buildComments(test: TestCase, browser: string, result: TestResult): string {
    const attempts = test.results.length;
    const failureDetails = result.errors
      .map((error) => error.message)
      .filter(Boolean)
      .join('\n');
    const token = process.env.BESTEST_TOKEN;
    const failure = token ? failureDetails.replaceAll(token, '[redacted]') : failureDetails;
    const details = [
      `Playwright browser: ${browser}`,
      `Test: ${test.titlePath().join(' > ')}`,
      `Attempts: ${attempts}`,
      failure ? `Failure: ${failure}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return details.slice(0, COMMENT_MAX_LENGTH);
  }

  private errorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const token = process.env.BESTEST_TOKEN;
    return token ? message.replaceAll(token, '[redacted]') : message;
  }
}
