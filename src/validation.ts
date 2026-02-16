import type { ValidationIssue } from "./types.js";

/**
 * Format validation issues into a human-readable string.
 */
export function formatValidationIssues(issues: readonly ValidationIssue[]): string {
	return issues
		.map((issue) => {
			const path = issue.path?.map((p) => (typeof p === "object" ? p.key : p)).join(".") || "(root)";
			return `  - ${path}: ${issue.message}`;
		})
		.join("\n");
}

/**
 * Error thrown when environment validation fails.
 * Contains the structured `.issues` array and a formatted message.
 */
export class EnvValidationError extends Error {
	constructor(public readonly issues: readonly ValidationIssue[]) {
		super(`Environment validation failed:\n${formatValidationIssues(issues)}`);
		this.name = "EnvValidationError";
	}
}
