import { buildMergedEnv } from "./resolver.js";
import type { EnvictusConfig, InferOutput, ObjectSchema, ValidationIssue } from "./types.js";

/**
 * Resolve and validate environment variables programmatically.
 *
 * Resolution order (later sources override earlier):
 * 1. Schema defaults (from the validation library)
 * 2. Environment-specific defaults (from config.defaults[mode])
 * 3. process.env values
 * 4. If mode is provided, set the discriminator key to that value
 * 5. Validate against schema
 *
 * @param config - The envictus config (from defineConfig)
 * @param mode - Optional explicit discriminator value (e.g., "production")
 * @returns Validated, typed output from the schema
 * @throws Error with `.issues` property containing ValidationIssue[] on validation failure
 */
export async function getEnv<TSchema extends ObjectSchema, TDiscriminator extends keyof InferOutput<TSchema>>(
	config: EnvictusConfig<TSchema, TDiscriminator>,
	mode?: string,
): Promise<InferOutput<TSchema>> {
	const { merged } = await buildMergedEnv(config, { mode });

	const result = await config.schema["~standard"].validate(merged);

	if (result.issues) {
		const error = new Error("Environment validation failed");
		(error as Error & { issues: readonly ValidationIssue[] }).issues = result.issues as readonly ValidationIssue[];
		throw error;
	}

	return result.value as InferOutput<TSchema>;
}
