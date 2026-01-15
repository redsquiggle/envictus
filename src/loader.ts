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
		throw new Error(
			`Invalid config file: ${configPath}\n\n` +
				`Expected an object with a 'schema' property. Example:\n\n` +
				`  import { defineConfig } from 'envictus'\n` +
				`  import { z } from 'zod'\n\n` +
				`  export default defineConfig({\n` +
				`    schema: z.object({\n` +
				`      NODE_ENV: z.enum(['development', 'production']).default('development'),\n` +
				`      DATABASE_URL: z.string().url(),\n` +
				`    }),\n` +
				`  })\n`,
		);
	}

	return config as EnvictusConfig<TSchema, TDiscriminator>;
}
