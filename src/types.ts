import type { StandardSchemaV1 } from '@standard-schema/spec'

/**
 * A schema that validates to an object with string keys
 */
export type ObjectSchema = StandardSchemaV1<unknown, Record<string, unknown>>

/**
 * Infer the output type of a standard schema
 */
export type InferOutput<T extends StandardSchemaV1> = StandardSchemaV1.InferOutput<T>

/**
 * Infer the input type of a standard schema
 */
export type InferInput<T extends StandardSchemaV1> = StandardSchemaV1.InferInput<T>

/**
 * The defaults object type - partial input of the schema
 */
export type EnvDefaults<TSchema extends ObjectSchema> = Partial<InferInput<TSchema>>

/**
 * Configuration for discriminator-based defaults
 *
 * Since standard-schema doesn't expose enum values at the type level,
 * users must explicitly define their discriminator values and defaults.
 */
export type EnvictusConfig<
  TSchema extends ObjectSchema,
  TDiscriminator extends keyof InferOutput<TSchema> = never,
> = {
  /** The schema to validate environment variables against */
  schema: TSchema

  /**
   * The discriminator field used to select environment-specific defaults.
   * Typically 'NODE_ENV' or similar.
   */
  discriminator?: TDiscriminator

  /**
   * Environment-specific defaults keyed by discriminator value.
   * For example: { development: { PORT: 3000 }, production: { PORT: 8080 } }
   */
  defaults?: Record<string, EnvDefaults<TSchema>>
}

/**
 * CLI options parsed from command line arguments
 */
export interface CLIOptions {
  config: string
  env: string[]
  validate: boolean
  /** Override the discriminator value (e.g., --mode production) */
  mode: string | undefined
  command: string[]
}

/**
 * A validation issue from standard-schema
 */
export type ValidationIssue = StandardSchemaV1.Issue

/**
 * Result of merging and validating environment variables
 */
export interface ResolvedEnv {
  env: Record<string, string>
  issues?: readonly ValidationIssue[]
}
