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
 * Works with string literal unions (e.g., "dev" | "prod") and enums.
 *
 * When the discriminator is a key of the schema output, extracts the
 * constrained values. Otherwise falls back to `string` — this supports
 * group configs where the discriminator (e.g., "STRIPE_ENV") is external
 * to the group's own schema.
 */
type DiscriminatorValues<
	TSchema extends ObjectSchema,
	TDiscriminator extends string,
> = TDiscriminator extends keyof InferOutput<TSchema>
	? InferOutput<TSchema>[TDiscriminator] extends string
		? InferOutput<TSchema>[TDiscriminator]
		: string
	: string;

/**
 * Extract output types from group configs, nested under their keys.
 *
 * Uses `string extends K ? never : K` to filter out the string index signature
 * from `Record<string, never>` (the default when no groups are provided),
 * leaving only concrete keys like `"stripe"` or `"auth"`.
 *
 * Recursively includes subgroup outputs when a group itself has `groups`.
 */
export type GroupEnvOutput<TGroups extends Record<string, { schema: ObjectSchema }>> = {
	[K in keyof TGroups as string extends K ? never : K]: InferOutput<TGroups[K]["schema"]> &
		(TGroups[K] extends { groups?: infer TSubGroups extends Record<string, { schema: ObjectSchema }> }
			? GroupEnvOutput<TSubGroups>
			: unknown);
};

/**
 * Configuration for discriminator-based defaults
 *
 * When a discriminator is specified, the defaults object keys are constrained
 * to the possible values of that discriminator field.
 *
 * The discriminator can be a key of the schema (providing type-safe defaults
 * keys) or any string (for group configs where the discriminator is external).
 * Autocomplete still suggests schema keys.
 */
export type EnvictusConfig<
	TSchema extends ObjectSchema,
	TDiscriminator extends (keyof InferOutput<TSchema> & string) | (string & {}) = never,
	TGroups extends Record<string, { schema: ObjectSchema }> = Record<string, never>,
> = {
	/** The schema to validate environment variables against */
	schema: TSchema;

	/**
	 * The discriminator field used to select environment-specific defaults.
	 * Typically 'NODE_ENV' or similar.
	 *
	 * Can be a key of the schema (type-safe defaults) or any string
	 * (e.g., for groups where the discriminator is external to the schema).
	 */
	discriminator?: TDiscriminator;

	/**
	 * Environment-specific defaults keyed by discriminator value.
	 * For example: { development: { PORT: 3000 }, production: { PORT: 8080 } }
	 *
	 * Keys are constrained to the possible values of the discriminator field.
	 *
	 * The `[TDiscriminator] extends [never]` check uses tuple wrapping to detect
	 * if no discriminator was provided. Without the tuple wrapper, `T extends never`
	 * is always false due to TypeScript's distributive conditional behavior over
	 * `never` (the empty union). Wrapping in tuples (`[T] extends [never]`) prevents
	 * distribution and correctly identifies when TDiscriminator defaults to `never`.
	 */
	defaults?: [TDiscriminator] extends [never]
		? Record<string, EnvDefaults<TSchema>>
		: Partial<Record<DiscriminatorValues<TSchema, TDiscriminator>, EnvDefaults<TSchema>>>;

	/**
	 * Sub-configs that resolve independently with their own discriminator and defaults.
	 *
	 * Each group is a regular `defineConfig` result. When used as a group, it inherits
	 * the parent's resolved mode as a fallback when its own discriminator is unset.
	 *
	 * The programmatic API nests group outputs under their key; the CLI flattens everything.
	 */
	groups?: TGroups;

	/**
	 * Called when the discriminator value cannot be determined from the environment,
	 * explicit mode, or schema defaults.
	 *
	 * By default, envictus warns and falls back to the first key in `defaults`.
	 * Use this callback to customize that behavior — return a mode string to use,
	 * return `undefined` to skip mode defaults entirely, or throw to abort.
	 *
	 * When used as a group inside another config, `parent` is populated with the
	 * parent config's discriminator and resolved mode. When standalone, `parent`
	 * is `undefined`.
	 *
	 * @example
	 * ```ts
	 * export default defineConfig({
	 *   schema,
	 *   discriminator: 'NODE_ENV',
	 *   defaults: { development: { PORT: 3000 }, production: { PORT: 8080 } },
	 *   onMissingDiscriminator({ discriminator, availableModes }) {
	 *     if (process.env.CI) {
	 *       throw new Error(`${discriminator} must be set explicitly in CI`);
	 *     }
	 *     // Silence the warning locally; fall back to first available mode
	 *     return availableModes[0];
	 *   },
	 * })
	 * ```
	 */
	onMissingDiscriminator?: (context: {
		discriminator: string;
		availableModes: string[];
		parent?: { discriminator: string; mode: string | undefined };
	}) => ([TDiscriminator] extends [never] ? string : DiscriminatorValues<TSchema, TDiscriminator>) | undefined;
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
