import type { EnvictusConfig, InferOutput, ObjectSchema, ResolvedEnv } from "./types.js";

/**
 * Full resolution pipeline: merge all sources and validate
 */
export async function resolveEnv<TSchema extends ObjectSchema, TDiscriminator extends keyof InferOutput<TSchema>>(
	_config: EnvictusConfig<TSchema, TDiscriminator>,
	_shouldValidate: boolean,
	_modeOverride?: string,
): Promise<ResolvedEnv> {
	// TODO: Implement
	throw new Error("Not implemented");
}
