import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DEFAULT_CONFIG_NAME = 'envictus.ts'

/**
 * Initialize a new envictus.ts config file
 */
export async function init(targetPath?: string): Promise<void> {
  const configPath = resolve(targetPath ?? DEFAULT_CONFIG_NAME)

  if (existsSync(configPath)) {
    console.error(`✗ Config file already exists: ${configPath}`)
    process.exit(1)
  }

  const template = generateConfigTemplate()
  await writeFile(configPath, template, 'utf-8')

  console.log(`✓ Created ${configPath}`)
  console.log('\nNext steps:')
  console.log('  1. Install a schema library: npm install zod')
  console.log('  2. Edit envictus.ts to define your environment schema')
  console.log('  3. Run: envictus -- npm start')
}

/**
 * Generate the default config file contents
 */
export function generateConfigTemplate(): string {
  return `import { z } from 'zod'
import { defineConfig } from 'envictus'

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().min(1).max(65535).default(3000),
    // Add your environment variables here
  }),

  discriminator: 'NODE_ENV',

  defaults: {
    development: {
      // Development-specific defaults
    },
    production: {
      // Production-specific defaults
    },
    test: {
      // Test-specific defaults
    },
  },
})
`
}
