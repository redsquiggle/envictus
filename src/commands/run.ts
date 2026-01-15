import type { CLIOptions } from '../types.js'

/**
 * Main run command - resolve env and execute wrapped command
 *
 * This is the default command when using:
 * envictus -- <command>
 */
export async function run(options: CLIOptions): Promise<number> {
  // TODO: Implement
  // 1. Load config
  // 2. Load .env files if specified
  // 3. Resolve environment
  // 4. Validate (unless --no-validate)
  // 5. Execute command
  throw new Error('Not implemented')
}
