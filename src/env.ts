import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

export type ParseEnvOptions = {
	/**
	 * How to handle missing env files:
	 * - "error": Throw an error (default)
	 * - "warn": Log a warning and return empty object
	 * - "ignore": Silently return empty object
	 */
	onMissing?: "error" | "warn" | "ignore";

	/**
	 * Decrypt the file before parsing.
	 * - "sops": Use Mozilla SOPS (https://github.com/getsops/sops) to decrypt
	 *
	 * Requires the `sops` binary to be installed and available in PATH.
	 */
	decrypt?: "sops";
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
 * @example
 * ```ts
 * // Decrypt SOPS-encrypted env files
 * defaults: {
 *   prod: parseEnv(".env.prod.enc", { decrypt: "sops" }),
 * }
 * ```
 *
 * @param filePath - Path to the env file to parse
 * @param options - Configuration options for handling missing files and decryption
 * @returns Parsed key-value pairs from the env file, or empty object if file is missing and onMissing is not "error"
 */
export function parseEnv(filePath: string, options: ParseEnvOptions = {}): Record<string, string> {
	const { onMissing = "error", decrypt } = options;

	// Check file existence first so onMissing behavior is consistent regardless of decrypt option
	if (!existsSync(filePath)) {
		switch (onMissing) {
			case "error":
				throw new Error(`Env file not found: ${filePath}`);
			case "warn":
				console.warn(`[envictus] Env file not found: ${filePath}`);
				return {};
			case "ignore":
				return {};
		}
	}

	try {
		let content: string;

		if (decrypt === "sops") {
			content = decryptWithSops(filePath);
		} else {
			content = readFileSync(filePath, "utf-8");
		}

		return parse(content);
	} catch (err) {
		throw new Error(`Failed to read env file: ${filePath}`, { cause: err });
	}
}

function decryptWithSops(filePath: string): string {
	try {
		return execSync(`sops -d "${filePath}"`, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch (err) {
		const execError = err as { stderr?: string; message?: string };
		const stderr = execError.stderr ?? execError.message ?? "Unknown error";

		// Check for common SOPS error patterns
		if (stderr.includes("executable file not found") || stderr.includes("command not found")) {
			throw new Error(
				"SOPS binary not found. Install it from https://github.com/getsops/sops or ensure it's in your PATH.",
			);
		}

		if (stderr.includes("could not decrypt") || stderr.includes("decryption failed")) {
			throw new Error(`SOPS decryption failed for ${filePath}. Check that you have the correct decryption key.`);
		}

		throw new Error(`SOPS decryption failed: ${stderr}`);
	}
}
