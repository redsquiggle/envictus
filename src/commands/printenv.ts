import { resolve } from "node:path";
import { printValidationIssues } from "../cli.js";
import { loadConfig } from "../loader.js";
import { resolveEnv } from "../resolver.js";

export interface PrintEnvOptions {
	config: string;
	validate: boolean;
	verbose?: boolean;
	format: "dotenv" | "json";
}

/**
 * Print resolved environment variables to stdout
 *
 * Useful for validating or piping to other commands
 *
 * @returns Exit code (0 = success, 1 = error)
 */
export async function printenv(options: PrintEnvOptions): Promise<number> {
	const configPath = resolve(options.config);

	try {
		const config = await loadConfig(configPath);
		const result = await resolveEnv(config, {
			validate: options.validate,
			...(options.verbose && { verbose: options.verbose }),
		});

		if (result.issues && result.issues.length > 0) {
			printValidationIssues(result.issues);
			return 1;
		}

		if (options.format === "json") {
			console.log(JSON.stringify(result.env, null, 2));
		} else {
			// dotenv format
			for (const [key, value] of Object.entries(result.env)) {
				// Escape special characters and wrap in quotes if needed
				const needsQuotes = value.includes(" ") || value.includes('"') || value.includes("'") || value.includes("\n");
				const escapedValue = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
				console.log(needsQuotes ? `${key}="${escapedValue}"` : `${key}=${value}`);
			}
		}

		return 0;
	} catch (error) {
		console.error("✗ Error:", error instanceof Error ? error.message : error);
		return 1;
	}
}
