import type { EnvictusConfig, InferOutput, ObjectSchema, ResolvedEnv, ValidationIssue } from "./types.js";

/** Default discriminator field when none is specified */
const DEFAULT_DISCRIMINATOR = "NODE_ENV";

/** Options for environment resolution */
export interface ResolveEnvOptions {
	/** Whether to validate the environment against the schema */
	validate: boolean;
	/** Enable verbose output for debugging */
	verbose?: boolean;
}

/**
 * Create a logger that respects verbose mode
 */
function createLogger(verbose: boolean) {
	return {
		debug: (message: string) => {
			if (verbose) {
				console.log(`[envictus] ${message}`);
			}
		},
		warn: (message: string) => {
			console.warn(`[envictus] Warning: ${message}`);
		},
	};
}

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
	options: ResolveEnvOptions,
): Promise<ResolvedEnv> {
	const { schema, defaults } = config;
	const { validate: shouldValidate, verbose = false } = options;
	const log = createLogger(verbose);

	// Use NODE_ENV as the default discriminator when none is specified
	const discriminator = config.discriminator ?? (DEFAULT_DISCRIMINATOR as TDiscriminator);

	// Determine the current mode from process.env or schema default
	let mode: string | undefined = process.env[discriminator as string];
	if (mode) {
		log.debug(`Using ${String(discriminator)} from environment: ${mode}`);
	}

	// If not in process.env, try to get the schema's default value for the discriminator
	if (!mode && defaults) {
		// Try validating to get the default - some schemas support partial validation
		const defaultResult = await schema["~standard"].validate({});
		// If validation succeeds, extract the discriminator's default value
		if (!defaultResult.issues && defaultResult.value) {
			const defaultValue = (defaultResult.value as Record<string, unknown>)[discriminator as string];
			if (typeof defaultValue === "string") {
				mode = defaultValue;
				log.debug(`Using schema default for discriminator '${String(discriminator)}': ${mode}`);
			}
		}
		// Fallback: if we couldn't get the default from the schema, use the first key from defaults
		if (!mode) {
			const defaultsRecord = defaults as Record<string, Record<string, unknown>>;
			const availableModes = Object.keys(defaultsRecord);
			if (availableModes.length > 0) {
				mode = availableModes[0];
				log.warn(
					`Could not determine mode from '${String(discriminator)}'. ` +
						`Falling back to first defaults key: '${mode}'. ` +
						`Set ${String(discriminator)} in your environment to specify explicitly.`,
				);
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
