import { readFileSync } from "node:fs";
import { parse } from "dotenv";

export type ParseEnvOptions = {
	/**
	 * How to handle missing env files:
	 * - "error": Throw an error (default)
	 * - "warn": Log a warning and return empty object
	 * - "ignore": Silently return empty object
	 */
	onMissing?: "error" | "warn" | "ignore";
};

/**
 * Parse an env file and return its contents as an object.
 *
 * Useful for loading environment-specific defaults from .env files:
 *
 * @example
 * ```ts
 * import { defineConfig, parseEnv } from "envictus";
 *
 * export default defineConfig({
 *   schema: z.object({ ... }),
 *   discriminator: "APP_ENV",
 *   defaults: {
 *     local: parseEnv(".env.local"),
 *     staging: parseEnv(".env.staging"),
 *     prod: parseEnv(".env.prod"),
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Ignore missing files (useful for optional local overrides)
 * defaults: {
 *   local: parseEnv(".env.local", { onMissing: "ignore" }),
 * }
 * ```
 *
 * @param filePath - Path to the env file to parse
 * @param options - Configuration options for handling missing files
 * @returns Parsed key-value pairs from the env file, or empty object if file is missing and onMissing is not "error"
 */
export function parseEnv(filePath: string, options: ParseEnvOptions = {}): Record<string, string> {
	const { onMissing = "error" } = options;

	try {
		const content = readFileSync(filePath, "utf-8");
		return parse(content);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") {
			switch (onMissing) {
				case "error":
					throw new Error(`Env file not found: ${filePath}`);
				case "warn":
					console.warn(`[envictus] Env file not found: ${filePath}`);
					return {};
				case "ignore":
					if (process.env.DEBUG || process.env.ENVICTUS_DEBUG) {
						console.debug(`[envictus] Env file not found (ignored): ${filePath}`);
					}
					return {};
			}
		}
		throw new Error(`Failed to read env file: ${filePath}`, { cause: err });
	}
}
