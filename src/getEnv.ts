import { buildMergedEnv } from "./resolver.js";
import type { EnvictusConfig, GroupEnvOutput, InferOutput, ObjectSchema, ValidationIssue } from "./types.js";
import { EnvValidationError } from "./validation.js";

/**
 * Validate a group's schema and recursively process its subgroups,
 * returning the validated output with subgroup outputs nested under their keys.
 */
async function resolveGroupValue(
	group: { schema: ObjectSchema; groups?: Record<string, { schema: ObjectSchema }> | undefined },
	merged: Record<string, unknown>,
	explicitlyUnset: Set<string>,
): Promise<Record<string, unknown>> {
	const result = await group.schema["~standard"].validate(merged);
	if (result.issues) {
		throw new EnvValidationError(result.issues as readonly ValidationIssue[]);
	}
	const value = result.value as Record<string, unknown>;
	if (explicitlyUnset.size > 0) {
		for (const key of explicitlyUnset) {
			delete value[key];
		}
	}
	if (group.groups) {
		for (const [name, subGroup] of Object.entries(group.groups)) {
			value[name] = await resolveGroupValue(subGroup, merged, explicitlyUnset);
		}
	}
	return value;
}

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

	// Process groups — validate each group schema and nest under group key (recursively)
	const groups = config.groups as
		| Record<string, { schema: ObjectSchema; groups?: Record<string, { schema: ObjectSchema }> }>
		| undefined;
	if (groups) {
		for (const [name, group] of Object.entries(groups)) {
			value[name] = await resolveGroupValue(group, merged, explicitlyUnset);
		}
	}

	return value as InferOutput<TSchema> & GroupEnvOutput<TGroups>;
}
