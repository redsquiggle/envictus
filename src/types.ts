import type { z } from 'zod'

/**
 * Extract the enum values from a Zod enum schema
 */
type ZodEnumValues<T> = T extends z.ZodEnum<infer U> ? U[number] : never

/**
 * Extract the enum values from a Zod schema with a default
 */
type ZodDefaultEnumValues<T> = T extends z.ZodDefault<infer U>
  ? ZodEnumValues<U>
  : ZodEnumValues<T>

/**
 * Generate `${enumValue}Defaults` keys from a discriminator field
 */
type DiscriminatorDefaultsKeys<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema>,
> = `${ZodDefaultEnumValues<TSchema['shape'][TDiscriminator]>}Defaults`

/**
 * The defaults object type - partial input of the schema
 */
type EnvDefaults<TSchema extends z.ZodObject<z.ZodRawShape>> = Partial<
  z.input<TSchema>
>

/**
 * Base config without discriminator-specific defaults
 */
type BaseConfig<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema>,
> = {
  schema: TSchema
  discriminator?: TDiscriminator
}

/**
 * Discriminator-specific defaults as optional keys
 */
type DiscriminatorDefaults<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema>,
> = {
  [K in DiscriminatorDefaultsKeys<TSchema, TDiscriminator>]?: EnvDefaults<TSchema>
}

/**
 * Full config type combining base config with discriminator defaults
 */
export type EnvictusConfig<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema> = 'NODE_ENV',
> = BaseConfig<TSchema, TDiscriminator> &
  DiscriminatorDefaults<TSchema, TDiscriminator>

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
 * Result of merging and validating environment variables
 */
export interface ResolvedEnv {
  env: Record<string, string>
  errors?: z.ZodError
}
