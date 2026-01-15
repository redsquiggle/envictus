import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * A schema that validates to an object with string keys
 */
export type ObjectSchema = StandardSchemaV1<unknown, Record<string, unknown>>;

/**
 * Infer the output type of a standard schema
 */
export type InferOutput<T extends StandardSchemaV1> = StandardSchemaV1.InferOutput<T>;

/**
 * Infer the input type of a standard schema
 */
export type InferInput<T extends StandardSchemaV1> = StandardSchemaV1.InferInput<T>;

/**
 * The defaults object type - partial input of the schema
 */
export type EnvDefaults<TSchema extends ObjectSchema> = Partial<InferInput<TSchema>>;

/**
 * Extract the possible values from a discriminator field type.
 * Works with string literal unions and enums.
 */
type DiscriminatorValues<
	TSchema extends ObjectSchema,
	TDiscriminator extends keyof InferOutput<TSchema>,
> = InferOutput<TSchema>[TDiscriminator] extends string ? InferOutput<TSchema>[TDiscriminator] : string;

/**
 * Configuration for discriminator-based defaults
 *
 * When a discriminator is specified, the defaults object keys are constrained
 * to the possible values of that discriminator field.
 */
export type EnvictusConfig<TSchema extends ObjectSchema, TDiscriminator extends keyof InferOutput<TSchema> = never> = {
	/** The schema to validate environment variables against */
	schema: TSchema;

	/**
	 * The discriminator field used to select environment-specific defaults.
	 * Typically 'NODE_ENV' or similar.
	 */
	discriminator?: TDiscriminator;

	/**
	 * Environment-specific defaults keyed by discriminator value.
	 * For example: { development: { PORT: 3000 }, production: { PORT: 8080 } }
	 *
	 * Keys are constrained to the possible values of the discriminator field.
	 */
	defaults?: [TDiscriminator] extends [never]
		? Record<string, EnvDefaults<TSchema>>
		: Partial<Record<DiscriminatorValues<TSchema, TDiscriminator>, EnvDefaults<TSchema>>>;
};

/**
 * A validation issue from standard-schema
 */
export type ValidationIssue = StandardSchemaV1.Issue;

/**
 * Result of merging and validating environment variables
 */
export interface ResolvedEnv {
	env: Record<string, string>;
	issues?: readonly ValidationIssue[];
}
