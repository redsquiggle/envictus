import { buildMergedEnv } from "./resolver.js";
import type { EnvictusConfig, InferOutput, ObjectSchema, ValidationIssue } from "./types.js";
import { EnvValidationError } from "./validation.js";

/**
 * Resolve and validate environment variables programmatically.
 *
 * Resolution order (later sources override earlier):
 * 1. Environment-specific defaults (from config.defaults[mode])
 * 2. process.env values
 * 3. If mode is explicitly provided, set the discriminator key
 * 4. Validate against schema
 *
 * @param config - The envictus config (from defineConfig)
 * @param mode - Optional explicit discriminator value (e.g., "production")
 * @returns Validated, typed output from the schema
 * @throws {EnvValidationError} on validation failure, with `.issues` and a formatted message
 */
export async function getEnv<TSchema extends ObjectSchema, TDiscriminator extends keyof InferOutput<TSchema>>(
	config: EnvictusConfig<TSchema, TDiscriminator>,
	mode?: string,
): Promise<InferOutput<TSchema>> {
	const { merged, explicitlyUnset } = await buildMergedEnv(config, { mode });

	const result = await config.schema["~standard"].validate(merged);

	if (result.issues) {
		throw new EnvValidationError(result.issues as readonly ValidationIssue[]);
	}

	const value = result.value as InferOutput<TSchema>;

	// Strip keys that were explicitly unset in defaults
	if (explicitlyUnset.size > 0) {
		for (const key of explicitlyUnset) {
			delete (value as Record<string, unknown>)[key];
		}
	}

	return value;
}
