import type { EnvictusConfig, InferOutput, ObjectSchema } from "./types.js";

/**
 * Load and execute a TypeScript/JavaScript config file
 *
 * Uses jiti for TypeScript support without requiring compilation
 */
export async function loadConfig<
	TSchema extends ObjectSchema,
	TDiscriminator extends keyof InferOutput<TSchema> = never,
>(_configPath: string): Promise<EnvictusConfig<TSchema, TDiscriminator>> {
	// TODO: Implement using jiti or similar
	throw new Error("Not implemented");
}
