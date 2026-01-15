import { Command } from "commander";
import type { ValidationIssue } from "./types.js";

// Read version from package.json at build time
const VERSION = "0.0.1";

export const program = new Command()
	.name("envictus")
	.description("Type-safe environment variable management")
	.version(VERSION)
	.option("-c, --config <path>", "path to config file", "envictus.ts")
	.option("-m, --mode <value>", "override discriminator value (e.g., production)")
	.option("--no-validate", "skip schema validation");

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
