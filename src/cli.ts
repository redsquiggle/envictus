import { createRequire } from "node:module";
import { Command } from "commander";
import { loadPackageJsonConfig } from "./package-config.js";
import type { ValidationIssue } from "./types.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json") as { version: string };

const DEFAULT_CONFIG_PATH = "env.config.ts";

export const program = new Command()
	.name("envictus")
	.description("Type-safe environment variable management")
	.version(VERSION)
	.option("-c, --config <path>", "path to config file")
	.option("--no-validate", "skip schema validation")
	.option("-v, --verbose", "enable verbose output for debugging");

/**
 * Resolve the config path with the following priority:
 * 1. CLI --config flag (if provided)
 * 2. package.json "envictus.configPath" field
 * 3. Default: "env.config.ts"
 */
export async function resolveConfigPath(cliConfigPath: string | undefined): Promise<string> {
	// CLI flag takes precedence
	if (cliConfigPath) {
		return cliConfigPath;
	}

	// Try package.json
	const packageConfig = await loadPackageJsonConfig();
	if (packageConfig?.configPath) {
		return packageConfig.configPath;
	}

	// Fall back to default
	return DEFAULT_CONFIG_PATH;
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
