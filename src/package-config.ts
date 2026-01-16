import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface PackageJsonConfig {
	configPath?: string;
}

/**
 * Load envictus configuration from the nearest package.json
 *
 * Looks for an "envictus" key in package.json:
 * ```json
 * {
 *   "envictus": {
 *     "configPath": "./config/env.config.ts"
 *   }
 * }
 * ```
 */
export async function loadPackageJsonConfig(cwd: string = process.cwd()): Promise<PackageJsonConfig | null> {
	const packageJsonPath = resolve(cwd, "package.json");

	try {
		const content = await readFile(packageJsonPath, "utf-8");
		const packageJson = JSON.parse(content) as { envictus?: PackageJsonConfig };

		if (packageJson.envictus && typeof packageJson.envictus === "object") {
			return packageJson.envictus;
		}

		return null;
	} catch {
		// package.json not found or invalid - that's fine
		return null;
	}
}
