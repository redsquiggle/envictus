import { Command } from "commander";
import type { ValidationIssue } from "./types.js";

// Read version from package.json at build time
const VERSION = "0.0.1";

export const program = new Command()
	.name("envictus")
	.description("Type-safe environment variable management")
	.version(VERSION)
	.option("-c, --config <path>", "path to config file", "envictus.ts")
	.option("-e, --env <files>", "comma-separated list of .env files")
	.option("-m, --mode <value>", "override discriminator value (e.g., production)")
	.option("--no-validate", "skip schema validation");

/**
 * Parse comma-separated env file list
 */
export function parseEnvFiles(envOption: string | undefined): string[] {
	if (!envOption) return [];
	return envOption
		.split(",")
		.map((f) => f.trim())
		.filter(Boolean);
}

/**
 * Format and print validation issues
 */
export function printValidationIssues(issues: readonly ValidationIssue[]): void {
	console.error("\n✗ Environment validation failed:\n");

	for (const issue of issues) {
		const path = issue.path?.map((p) => (typeof p === "object" ? p.key : p)).join(".") || "(root)";
		console.error(`  • ${path}: ${issue.message}`);
	}

	console.error("");
}

/**
 * Format environment variables for display
 */
export function formatEnvForDisplay(env: Record<string, string>, mask = true): string {
	const lines: string[] = [];
	const sortedKeys = Object.keys(env).sort();

	for (const key of sortedKeys) {
		const value = env[key] ?? "";
		const displayValue = mask && isSensitiveKey(key) ? maskValue(value) : value;
		lines.push(`  ${key}=${displayValue}`);
	}

	return lines.join("\n");
}

/**
 * Check if an env key likely contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
	const sensitivePatterns = [/password/i, /secret/i, /key/i, /token/i, /auth/i, /credential/i, /private/i];
	return sensitivePatterns.some((pattern) => pattern.test(key));
}

/**
 * Mask a sensitive value for display
 */
function maskValue(value: string): string {
	if (value.length <= 4) return "****";
	return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
