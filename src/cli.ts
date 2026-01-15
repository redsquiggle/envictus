import { createRequire } from "node:module";
import { Command } from "commander";
import type { ValidationIssue } from "./types.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json") as { version: string };

export const program = new Command()
	.name("envictus")
	.description("Type-safe environment variable management")
	.version(VERSION)
	.option("-c, --config <path>", "path to config file", "envictus.ts")
	.option("-m, --mode <value>", "override discriminator value (e.g., production)")
	.option("--no-validate", "skip schema validation")
	.option("-v, --verbose", "enable verbose output for debugging");

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
