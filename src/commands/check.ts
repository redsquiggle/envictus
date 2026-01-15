import type { CLIOptions } from '../types.js'

/**
 * Check/validate environment without running a command
 *
 * Useful for CI/CD pipelines or debugging
 *
 * @returns Exit code (0 = valid, 1 = invalid)
 */
export async function check(options: Omit<CLIOptions, 'command'>): Promise<number> {
  // TODO: Implement
  throw new Error('Not implemented')
}

/**
 * Print the resolved environment variables (for debugging)
 */
export function printResolvedEnv(env: Record<string, string>): void {
  // TODO: Implement
  throw new Error('Not implemented')
}
