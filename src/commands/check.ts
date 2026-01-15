import { resolve } from "node:path";
import { formatEnvForDisplay, printValidationIssues } from "../cli.js";
import { loadConfig } from "../loader.js";
import { resolveEnv } from "../resolver.js";

export interface CheckOptions {
	config: string;
	env?: string;
	mode?: string;
	validate: boolean;
}

/**
 * Check/validate environment without running a command
 *
 * Useful for CI/CD pipelines or debugging
 *
 * @returns Exit code (0 = valid, 1 = invalid)
 */
export async function check(options: CheckOptions): Promise<number> {
	const configPath = resolve(options.config);
	const envFiles =
		options.env
			?.split(",")
			.map((f) => f.trim())
			.filter(Boolean) ?? [];

	try {
		const config = await loadConfig(configPath);
		const result = await resolveEnv(config, envFiles, options.validate, options.mode);

		if (result.issues && result.issues.length > 0) {
			printValidationIssues(result.issues);
			return 1;
		}

		console.log("✓ Environment is valid\n");
		console.log("Resolved environment:");
		console.log(formatEnvForDisplay(result.env));

		return 0;
	} catch (error) {
		console.error("✗ Error:", error instanceof Error ? error.message : error);
		return 1;
	}
}
