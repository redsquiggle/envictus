import type { z } from 'zod'
import type { EnvictusConfig } from './types.js'

/**
 * Define an envictus configuration with full type inference
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   schema: z.object({
 *     NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
 *     DATABASE_URL: z.string().url(),
 *     PORT: z.coerce.number().min(1).max(65535),
 *   }),
 *   developmentDefaults: {
 *     PORT: 3000,
 *   },
 *   productionDefaults: {
 *     PORT: 8080,
 *   },
 * })
 * ```
 */
export function defineConfig<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TDiscriminator extends keyof z.infer<TSchema> = 'NODE_ENV',
>(config: EnvictusConfig<TSchema, TDiscriminator>): EnvictusConfig<TSchema, TDiscriminator> {
  return config
}
