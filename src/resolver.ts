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

	// Determine the current mode from modeOverride, process.env, or schema default
	let mode: string | undefined;
	if (modeOverride) {
		mode = modeOverride;
	} else if (discriminator) {
		// First check process.env
		mode = process.env[discriminator as string];

		// If not in process.env, try to get the schema's default value for the discriminator
		if (!mode && defaults) {
			// Try validating to get the default - some schemas support partial validation
			const defaultResult = await schema["~standard"].validate({});
			// If validation succeeds, extract the discriminator's default value
			if (!defaultResult.issues && defaultResult.value) {
				const defaultValue = (defaultResult.value as Record<string, unknown>)[discriminator as string];
				if (typeof defaultValue === "string") {
					mode = defaultValue;
				}
			}
			// Fallback: if we couldn't get the default from the schema, use the first key from defaults
			if (!mode) {
				const defaultsRecord = defaults as Record<string, Record<string, unknown>>;
				const availableModes = Object.keys(defaultsRecord);
				if (availableModes.length > 0) {
					mode = availableModes[0];
				}
			}
		}
	}

	// Start with environment-specific defaults if available
	let merged: Record<string, unknown> = {};
	if (mode && defaults) {
		// Cast to Record for runtime access - type safety is enforced at config definition time
		const defaultsRecord = defaults as Record<string, Record<string, unknown>>;
		if (defaultsRecord[mode]) {
			merged = { ...defaultsRecord[mode] };
		}
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
