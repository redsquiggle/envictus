import { createJiti } from "jiti";
import type { EnvictusConfig, InferOutput, ObjectSchema } from "./types.js";

/**
 * Load and execute a TypeScript/JavaScript config file
 *
 * Uses jiti for TypeScript support without requiring compilation
 */
export async function loadConfig<
	TSchema extends ObjectSchema,
	TDiscriminator extends keyof InferOutput<TSchema> = never,
>(configPath: string): Promise<EnvictusConfig<TSchema, TDiscriminator>> {
	const jiti = createJiti(import.meta.url, {
		interopDefault: true,
	});

	const module = await jiti.import(configPath);

	// Handle both default exports and named exports
	const config = (module as { default?: unknown }).default ?? module;

	if (!config || typeof config !== "object" || !("schema" in config)) {
		throw new Error(`Invalid config file: ${configPath}. Expected an object with a 'schema' property.`);
	}

	return config as EnvictusConfig<TSchema, TDiscriminator>;
}
