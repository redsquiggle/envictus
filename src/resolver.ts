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
 * Minimal group config shape used at runtime for resolution.
 * Avoids generic variance issues with `EnvictusConfig<ObjectSchema, any>`.
 */
interface GroupConfigRuntime {
	schema: ObjectSchema;
	discriminator?: string | undefined;
	defaults?: Record<string, Record<string, unknown>> | undefined;
	onMissingDiscriminator?:
		| ((context: {
				discriminator: string;
				availableModes: string[];
				parent?: { discriminator: string; mode: string | undefined };
		  }) => string | undefined)
		| undefined;
}

/**
 * Build merged environment from all sources (before validation)
 *
 * Resolution order (later sources override earlier):
 * 1. Environment-specific defaults (from config.defaults[mode])
 * 2. Group defaults (from config.groups[name].defaults[groupMode])
 * 3. process.env values
 * 4. If mode is explicitly provided, set the discriminator key
 */
export async function buildMergedEnv<
	TSchema extends ObjectSchema,
	TDiscriminator extends (keyof InferOutput<TSchema> & string) | (string & {}),
	TGroups extends Record<string, { schema: ObjectSchema }> = Record<string, never>,
>(
	config: EnvictusConfig<TSchema, TDiscriminator, TGroups>,
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
				if (config.onMissingDiscriminator) {
					mode = config.onMissingDiscriminator({
						discriminator: discriminator as string,
						availableModes,
					});
				} else {
					mode = availableModes[0];
					log.warn(
						`Could not determine mode from '${String(discriminator)}'. ` +
							`Falling back to first defaults key: '${mode}'. ` +
							`Set ${String(discriminator)} in your environment to specify explicitly.`,
					);
				}
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

	// Process groups: resolve each group's mode and apply its defaults
	const groups = config.groups as Record<string, GroupConfigRuntime> | undefined;
	if (groups) {
		const rootDiscriminator = discriminator as string;
		for (const [name, group] of Object.entries(groups)) {
			const groupDiscriminator = group.discriminator ?? DEFAULT_DISCRIMINATOR;
			let groupMode: string | undefined = process.env[groupDiscriminator];

			if (groupMode) {
				log.debug(`Group '${name}': using ${groupDiscriminator} from environment: ${groupMode}`);
			} else if (group.defaults) {
				const availableModes = Object.keys(group.defaults);
				if (availableModes.length > 0) {
					if (group.onMissingDiscriminator) {
						groupMode = group.onMissingDiscriminator({
							discriminator: groupDiscriminator,
							availableModes,
							parent: { discriminator: rootDiscriminator, mode },
						});
					} else {
						// No callback → cascade to root mode
						groupMode = mode;
						log.debug(`Group '${name}': falling back to root mode: ${groupMode}`);
					}
				}
			}

			if (groupMode && group.defaults) {
				const groupModeDefaults = group.defaults[groupMode];
				if (groupModeDefaults) {
					for (const [key, value] of Object.entries(groupModeDefaults)) {
						if (value === undefined) {
							explicitlyUnset.add(key);
						} else {
							merged[key] = value;
							explicitlyUnset.delete(key);
						}
					}
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
export async function resolveEnv<
	TSchema extends ObjectSchema,
	TDiscriminator extends (keyof InferOutput<TSchema> & string) | (string & {}),
	TGroups extends Record<string, { schema: ObjectSchema }> = Record<string, never>,
>(config: EnvictusConfig<TSchema, TDiscriminator, TGroups>, options: ResolveEnvOptions): Promise<ResolvedEnv> {
	const { schema } = config;
	const { validate: shouldValidate, verbose = false } = options;

	const { merged, explicitlyUnset } = await buildMergedEnv(config, { verbose });

	// Validate if requested
	if (shouldValidate) {
		const allIssues: ValidationIssue[] = [];

		// Validate root schema
		const rootResult = await schema["~standard"].validate(merged);
		let rootValidated: Record<string, unknown> = {};
		if (rootResult.issues) {
			allIssues.push(...(rootResult.issues as ValidationIssue[]));
		} else {
			rootValidated = rootResult.value as Record<string, unknown>;
		}

		// Validate each group schema independently
		const groups = config.groups as Record<string, GroupConfigRuntime> | undefined;
		const groupResults = new Map<string, Record<string, unknown>>();
		if (groups) {
			for (const [name, group] of Object.entries(groups)) {
				const groupResult = await group.schema["~standard"].validate(merged);
				if (groupResult.issues) {
					allIssues.push(...(groupResult.issues as ValidationIssue[]));
				} else if (groupResult.value) {
					groupResults.set(name, groupResult.value as Record<string, unknown>);
				}
			}
		}

		if (allIssues.length > 0) {
			return {
				env: {},
				issues: allIssues,
			};
		}

		// Convert all values to strings for environment variables
		// Exclude keys that were explicitly set to undefined in environment defaults
		const env: Record<string, string> = {};
		for (const [key, value] of Object.entries(rootValidated)) {
			if (value !== undefined && value !== null && !explicitlyUnset.has(key)) {
				env[key] = toEnvString(value);
			}
		}

		// Flatten group validated outputs into the same env
		for (const groupValidated of groupResults.values()) {
			for (const [key, value] of Object.entries(groupValidated)) {
				if (value !== undefined && value !== null && !explicitlyUnset.has(key)) {
					env[key] = toEnvString(value);
				}
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
