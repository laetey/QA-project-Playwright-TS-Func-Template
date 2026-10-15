import type { TestInfo } from '@playwright/test';

export function logTestStart(testInfo: TestInfo): void {
	console.log(`[START] ${testInfo.project.name} - ${testInfo.title}`);
}

export function logTestEnd(testInfo: TestInfo): void {
	const result = testInfo.status === testInfo.expectedStatus ? 'Success' : 'Fail';
	console.log(`[${result}] ${testInfo.project.name} - ${testInfo.title}`);
}

export function logStep(description: string): void {
	console.log(`[STEP] ${description}`);
}

export async function logVerification<T>(
	description: string,
	verification: () => Promise<T>,
): Promise<T> {
	try {
		const result = await verification();
		console.log(`[VERIFY:SUCCESS] ${description}`);
		return result;
	} catch (error) {
		const details = error instanceof Error ? ` - ${error.message}` : '';
		console.error(`[VERIFY:FAIL] ${description}${details}`);
		throw error;
	}
}