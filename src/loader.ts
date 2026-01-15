import type { EnvictusConfig, InferOutput, ObjectSchema } from './types.js'

/**
 * Load and execute a TypeScript/JavaScript config file
 *
 * Uses jiti for TypeScript support without requiring compilation
 */
export async function loadConfig<
  TSchema extends ObjectSchema,
  TDiscriminator extends keyof InferOutput<TSchema> = never,
>(configPath: string): Promise<EnvictusConfig<TSchema, TDiscriminator>> {
  // TODO: Implement using jiti or similar
  throw new Error('Not implemented')
}

/**
 * Parse a .env file and return key-value pairs
 *
 * Supports:
 * - KEY=value
 * - KEY="quoted value"
 * - KEY='single quoted'
 * - # comments
 * - Empty lines
 */
export function parseEnvFile(contents: string): Record<string, string> {
  // TODO: Implement .env parsing
  throw new Error('Not implemented')
}

/**
 * Load environment variables from one or more .env files
 *
 * Files are loaded in order, with later files overriding earlier ones
 */
export async function loadEnvFiles(paths: string[]): Promise<Record<string, string>> {
  // TODO: Implement
  throw new Error('Not implemented')
}
