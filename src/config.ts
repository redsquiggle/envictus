import type { EnvictusConfig, InferOutput, ObjectSchema } from "./types.js";

/**
 * Define an envictus configuration with full type inference
 *
 * Works with any schema library that implements the standard-schema spec:
 * - Zod
 * - Valibot
 * - ArkType
 * - And more...
 *
 * @example
 * ```ts
 * // With Zod
 * import { z } from 'zod'
 *
 * export default defineConfig({
 *   schema: z.object({
 *     NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
 *     DATABASE_URL: z.string().url(),
 *     PORT: z.coerce.number().min(1).max(65535),
 *   }),
 *   discriminator: 'NODE_ENV',
 *   defaults: {
 *     development: { PORT: 3000 },
 *     production: { PORT: 8080 },
 *   },
 * })
 * ```
 *
 * @example
 * ```ts
 * // With Valibot
 * import * as v from 'valibot'
 *
 * export default defineConfig({
 *   schema: v.object({
 *     NODE_ENV: v.optional(v.picklist(['development', 'production', 'test']), 'development'),
 *     DATABASE_URL: v.pipe(v.string(), v.url()),
 *     PORT: v.pipe(v.unknown(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(65535)),
 *   }),
 *   discriminator: 'NODE_ENV',
 *   defaults: {
 *     development: { PORT: 3000 },
 *     production: { PORT: 8080 },
 *   },
 * })
 * ```
 */
export function defineConfig<TSchema extends ObjectSchema, TDiscriminator extends keyof InferOutput<TSchema> = never>(
	config: EnvictusConfig<TSchema, TDiscriminator>,
): EnvictusConfig<TSchema, TDiscriminator> {
	return config;
}
