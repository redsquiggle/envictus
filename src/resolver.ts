import type { EnvictusConfig, InferOutput, ObjectSchema, ResolvedEnv } from './types.js'

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
  TSchema extends ObjectSchema,
  TDiscriminator extends keyof InferOutput<TSchema>,
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
 * returns config.defaults?.development
 */
export function getDefaultsForDiscriminator<
  TSchema extends ObjectSchema,
  TDiscriminator extends keyof InferOutput<TSchema>,
>(
  config: EnvictusConfig<TSchema, TDiscriminator>,
  discriminatorValue: string,
): Partial<Record<string, unknown>> | undefined {
  return config.defaults?.[discriminatorValue]
}

/**
 * Merge environment variables from all sources
 *
 * Resolution order (lowest to highest priority):
 * 1. Schema defaults (handled during validation)
 * 2. Discriminator-specific defaults (e.g., defaults.development)
 * 3. .env file(s)
 * 4. process.env
 * 5. --mode flag override (sets the discriminator key)
 */
export function mergeEnv<
  TSchema extends ObjectSchema,
  TDiscriminator extends keyof InferOutput<TSchema>,
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
 * Uses the standard-schema validate method which works with any
 * compliant schema library (Zod, Valibot, ArkType, etc.)
 *
 * Returns the validated env and any validation issues
 */
export async function validateEnv<TSchema extends ObjectSchema>(
  schema: TSchema,
  env: Record<string, string>,
): Promise<ResolvedEnv> {
  const result = await schema['~standard'].validate(env)

  if (result.issues) {
    return {
      env,
      issues: result.issues,
    }
  }

  // Convert validated output back to string record for env vars
  const validatedEnv: Record<string, string> = {}
  for (const [key, value] of Object.entries(result.value)) {
    if (value !== undefined && value !== null) {
      validatedEnv[key] = String(value)
    }
  }

  return { env: validatedEnv }
}

/**
 * Full resolution pipeline: merge all sources and validate
 */
export async function resolveEnv<
  TSchema extends ObjectSchema,
  TDiscriminator extends keyof InferOutput<TSchema>,
>(
  config: EnvictusConfig<TSchema, TDiscriminator>,
  envFilePaths: string[],
  shouldValidate: boolean,
  modeOverride?: string,
): Promise<ResolvedEnv> {
  // TODO: Implement
  throw new Error('Not implemented')
}
