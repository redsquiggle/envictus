import { buildMergedEnv } from "./resolver.js";
import type { EnvictusConfig, GroupEnvOutput, InferOutput, ObjectSchema, ValidationIssue } from "./types.js";
import { EnvValidationError } from "./validation.js";

/**
 * Resolve and validate environment variables programmatically.
 *
 * Resolution order (later sources override earlier):
 * 1. Environment-specific defaults (from config.defaults[mode])
 * 2. Group defaults (from config.groups[name].defaults[groupMode])
 * 3. process.env values
 * 4. If mode is explicitly provided, set the discriminator key
 * 5. Validate root schema, then each group schema independently
 *
 * @param config - The envictus config (from defineConfig)
 * @param mode - Optional explicit discriminator value (e.g., "production")
 * @returns Validated, typed output from the schema with group outputs nested under their keys
 * @throws {EnvValidationError} on validation failure, with `.issues` and a formatted message
 */
export async function getEnv<
	TSchema extends ObjectSchema,
	TDiscriminator extends (keyof InferOutput<TSchema> & string) | (string & {}),
	TGroups extends Record<string, { schema: ObjectSchema }> = Record<string, never>,
>(
	config: EnvictusConfig<TSchema, TDiscriminator, TGroups>,
	mode?: string,
): Promise<InferOutput<TSchema> & GroupEnvOutput<TGroups>> {
	const { merged, explicitlyUnset } = await buildMergedEnv(config, { mode });

	const result = await config.schema["~standard"].validate(merged);

	if (result.issues) {
		throw new EnvValidationError(result.issues as readonly ValidationIssue[]);
	}

	const value = result.value as Record<string, unknown>;

	// Strip keys that were explicitly unset in defaults
	if (explicitlyUnset.size > 0) {
		for (const key of explicitlyUnset) {
			delete value[key];
		}
	}

	// Process groups — validate each group schema and nest under group key
	const groups = config.groups as Record<string, { schema: ObjectSchema }> | undefined;
	if (groups) {
		for (const [name, group] of Object.entries(groups)) {
			const groupResult = await group.schema["~standard"].validate(merged);
			if (groupResult.issues) {
				throw new EnvValidationError(groupResult.issues as readonly ValidationIssue[]);
			}
			const groupValue = groupResult.value as Record<string, unknown>;
			if (explicitlyUnset.size > 0) {
				for (const key of explicitlyUnset) {
					delete groupValue[key];
				}
			}
			value[name] = groupValue;
		}
	}

	return value as InferOutput<TSchema> & GroupEnvOutput<TGroups>;
}
