import type { EnvictusConfig, InferOutput, ObjectSchema, ResolvedEnv, ValidationIssue } from "./types.js";

/**
 * Convert a value to a string for environment variables
 */
function toEnvString(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "boolean" || typeof value === "number") {
		return String(value);
	}
	return JSON.stringify(value);
}

/**
 * Full resolution pipeline: merge all sources and validate
 *
 * Resolution order (later sources override earlier):
 * 1. Schema defaults (from the validation library)
 * 2. Environment-specific defaults (from config.defaults[mode])
 * 3. process.env values
 */
export async function resolveEnv<TSchema extends ObjectSchema, TDiscriminator extends keyof InferOutput<TSchema>>(
	config: EnvictusConfig<TSchema, TDiscriminator>,
	shouldValidate: boolean,
	modeOverride?: string,
): Promise<ResolvedEnv> {
	const { schema, discriminator, defaults } = config;

	// Determine the current mode from modeOverride, process.env, or undefined
	let mode: string | undefined;
	if (modeOverride) {
		mode = modeOverride;
	} else if (discriminator) {
		mode = process.env[discriminator as string];
	}

	// Start with environment-specific defaults if available
	let merged: Record<string, unknown> = {};
	if (mode && defaults?.[mode]) {
		merged = { ...defaults[mode] };
	}

	// Override with process.env values (only for keys that are set)
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			merged[key] = value;
		}
	}

	// If mode override was provided, set the discriminator value (after process.env so it takes precedence)
	if (modeOverride && discriminator) {
		merged[discriminator as string] = modeOverride;
	}

	// Validate if requested
	if (shouldValidate) {
		const result = await schema["~standard"].validate(merged);

		if (result.issues) {
			return {
				env: {},
				issues: result.issues as readonly ValidationIssue[],
			};
		}

		// Use the validated/transformed output
		const validated = result.value as Record<string, unknown>;

		// Convert all values to strings for environment variables
		const env: Record<string, string> = {};
		for (const [key, value] of Object.entries(validated)) {
			if (value !== undefined && value !== null) {
				env[key] = toEnvString(value);
			}
		}

		return { env };
	}

	// Without validation, just convert to strings
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(merged)) {
		if (value !== undefined && value !== null) {
			env[key] = toEnvString(value);
		}
	}

	return { env };
}
