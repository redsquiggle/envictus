import type { z } from 'zod'
import type { EnvictusConfig, ResolvedEnv } from './types.js'

/**
 * Get the current discriminator value from environment sources
 *
 * Resolution order:
 * 1. --mode flag (modeOverride)
 * 2. process.env
 * 3. .env files
 * 4. Schema default
 */
export function getDiscriminatorValue<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema>,
>(
  config: EnvictusConfig<TSchema, TDiscriminator>,
  envFileVars: Record<string, string>,
  modeOverride?: string,
): string | undefined {
  // TODO: Implement
  throw new Error('Not implemented')
}

/**
 * Get the defaults object for the current discriminator value
 *
 * @example
 * If discriminator is 'NODE_ENV' and value is 'development',
 * returns config.developmentDefaults
 */
export function getDefaultsForDiscriminator<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema>,
>(
  config: EnvictusConfig<TSchema, TDiscriminator>,
  discriminatorValue: string,
): Partial<z.input<TSchema>> | undefined {
  // TODO: Implement
  throw new Error('Not implemented')
}

/**
 * Merge environment variables from all sources
 *
 * Resolution order (lowest to highest priority):
 * 1. Zod schema defaults (handled during validation)
 * 2. Discriminator-specific defaults (e.g., developmentDefaults)
 * 3. .env file(s)
 * 4. process.env
 * 5. --mode flag override (sets the discriminator key)
 */
export function mergeEnv<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema>,
>(
  config: EnvictusConfig<TSchema, TDiscriminator>,
  envFileVars: Record<string, string>,
  modeOverride?: string,
): Record<string, string> {
  // TODO: Implement
  throw new Error('Not implemented')
}

/**
 * Validate merged environment variables against the schema
 *
 * Returns the validated env and any validation errors
 */
export function validateEnv<TSchema extends z.ZodObject<z.ZodRawShape>>(
  schema: TSchema,
  env: Record<string, string>,
): ResolvedEnv {
  // TODO: Implement
  throw new Error('Not implemented')
}

/**
 * Full resolution pipeline: merge all sources and validate
 */
export async function resolveEnv<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema>,
>(
  config: EnvictusConfig<TSchema, TDiscriminator>,
  envFilePaths: string[],
  shouldValidate: boolean,
  modeOverride?: string,
): Promise<ResolvedEnv> {
  // TODO: Implement
  throw new Error('Not implemented')
}
