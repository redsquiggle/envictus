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

/** Result of merging environment sources before validation */
export interface MergeResult {
	merged: Record<string, unknown>;
	explicitlyUnset: Set<string>;
}

/**
 * Build merged environment from all sources (before validation)
 *
 * Resolution order (later sources override earlier):
 * 1. Environment-specific defaults (from config.defaults[mode])
 * 2. process.env values
 * 3. If mode is explicitly provided, set the discriminator key
 */
export async function buildMergedEnv<TSchema extends ObjectSchema, TDiscriminator extends keyof InferOutput<TSchema>>(
	config: EnvictusConfig<TSchema, TDiscriminator>,
	options?: { mode?: string | undefined; verbose?: boolean | undefined },
): Promise<MergeResult> {
	const { schema, defaults } = config;
	const { mode: explicitMode, verbose = false } = options ?? {};
	const log = createLogger(verbose);

	// Use NODE_ENV as the default discriminator when none is specified
	const discriminator = config.discriminator ?? (DEFAULT_DISCRIMINATOR as TDiscriminator);

	// Determine the current mode: explicit param > process.env > schema default
	let mode: string | undefined = explicitMode ?? process.env[discriminator as string];
	if (mode) {
		log.debug(`Using ${String(discriminator)}${explicitMode ? " from explicit mode" : " from environment"}: ${mode}`);
	}

	// If not resolved yet, try to get the schema's default value for the discriminator
	if (!mode && defaults) {
		const defaultResult = await schema["~standard"].validate({});
		if (!defaultResult.issues && defaultResult.value) {
			const defaultValue = (defaultResult.value as Record<string, unknown>)[discriminator as string];
			if (typeof defaultValue === "string") {
				mode = defaultValue;
				log.debug(`Using schema default for discriminator '${String(discriminator)}': ${mode}`);
			}
		}
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
	// Track keys explicitly set to undefined (to unset schema defaults)
	const merged: Record<string, unknown> = {};
	const explicitlyUnset = new Set<string>();
	if (mode && defaults) {
		const defaultsRecord = defaults as Record<string, Record<string, unknown>>;
		const modeDefaults = defaultsRecord[mode];
		if (modeDefaults) {
			for (const [key, value] of Object.entries(modeDefaults)) {
				if (value === undefined) {
					explicitlyUnset.add(key);
				} else {
					merged[key] = value;
				}
			}
		}
	}

	// Override with process.env values (only for keys that are set)
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			merged[key] = value;
		}
	}

	// If mode was explicitly provided, set the discriminator key
	if (explicitMode) {
		merged[discriminator as string] = explicitMode;
	}

	return { merged, explicitlyUnset };
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
	const { schema } = config;
	const { validate: shouldValidate, verbose = false } = options;

	const { merged, explicitlyUnset } = await buildMergedEnv(config, { verbose });

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
		// Exclude keys that were explicitly set to undefined in environment defaults
		const env: Record<string, string> = {};
		for (const [key, value] of Object.entries(validated)) {
			if (value !== undefined && value !== null && !explicitlyUnset.has(key)) {
				env[key] = toEnvString(value);
			}
		}

		return { env };
	}

	// Without validation, just convert to strings
	// Exclude keys that were explicitly set to undefined in environment defaults
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(merged)) {
		if (value !== undefined && value !== null && !explicitlyUnset.has(key)) {
			env[key] = toEnvString(value);
		}
	}

	return { env };
}
