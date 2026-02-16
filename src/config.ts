import { getEnv } from "./getEnv.js";
import type { EnvictusConfig, InferOutput, ObjectSchema } from "./types.js";

/**
 * Merge result type that preserves property types from both sources per key.
 * When a discriminator key (e.g., "development") exists in both A and B,
 * the inner objects are intersected so all properties flow through.
 */
type MergedDefaults<
	A extends Record<string, Record<string, unknown>>,
	B extends Record<string, Record<string, unknown>>,
> = {
	[K in keyof A | keyof B]: (K extends keyof A ? A[K] : unknown) & (K extends keyof B ? B[K] : unknown);
};

/**
 * Merge multiple defaults objects into one, combining per-discriminator values.
 *
 * Each source is a map of discriminator values to partial defaults.
 * For each discriminator key, the defaults from all sources are shallow-merged
 * in order (later sources override earlier ones for the same property).
 *
 * @example
 * ```ts
 * // client.env.config.ts — the shared base
 * export const clientDefaults = {
 *   local: { NEXT_PUBLIC_API_URL: "http://localhost:3000/api" },
 *   production: { NEXT_PUBLIC_API_URL: "https://api.example.com" },
 * };
 *
 * // server.env.config.ts — extends client
 * const serverDefaults = {
 *   local: { DATABASE_URL: "postgres://localhost/dev", PORT: 3000 },
 *   production: { PORT: 8080 },
 * };
 *
 * export default defineConfig({
 *   schema: clientSchema.merge(serverSchema),
 *   discriminator: "NEXT_PUBLIC_APP_ENV",
 *   defaults: mergeDefaults(clientDefaults, serverDefaults),
 * });
 * ```
 */
export function mergeDefaults<
	A extends Record<string, Record<string, unknown>>,
	B extends Record<string, Record<string, unknown>>,
>(a: A, b: B): MergedDefaults<A, B>;
export function mergeDefaults<
	A extends Record<string, Record<string, unknown>>,
	B extends Record<string, Record<string, unknown>>,
	C extends Record<string, Record<string, unknown>>,
>(
	a: A,
	b: B,
	c: C,
): {
	[K in keyof A | keyof B | keyof C]: (K extends keyof A ? A[K] : unknown) &
		(K extends keyof B ? B[K] : unknown) &
		(K extends keyof C ? C[K] : unknown);
};
export function mergeDefaults(
	...sources: Record<string, Record<string, unknown>>[]
): Record<string, Record<string, unknown>>;
export function mergeDefaults(
	...sources: Record<string, Record<string, unknown>>[]
): Record<string, Record<string, unknown>> {
	const result: Record<string, Record<string, unknown>> = {};
	for (const source of sources) {
		for (const [mode, defaults] of Object.entries(source)) {
			result[mode] = { ...(result[mode] ?? {}), ...defaults };
		}
	}
	return result;
}

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
): EnvictusConfig<TSchema, TDiscriminator> & { readonly env: Promise<InferOutput<TSchema>> } {
	let cached: Promise<InferOutput<TSchema>> | undefined;
	return {
		...config,
		get env() {
			if (!cached) {
				cached = getEnv(config);
			}
			return cached;
		},
	};
}
