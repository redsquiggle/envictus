import { z } from 'zod'
import { defineConfig } from '../src/index.js'

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().min(1).max(65535),
    DEBUG: z.coerce.boolean().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),

  discriminator: 'NODE_ENV',

  defaults: {
    // Defaults when NODE_ENV=development
    development: {
      PORT: 3000,
      DEBUG: true,
      LOG_LEVEL: 'debug',
    },

    // Defaults when NODE_ENV=production
    production: {
      PORT: 8080,
      DEBUG: false,
      LOG_LEVEL: 'warn',
    },

    // Defaults when NODE_ENV=test
    test: {
      PORT: 3001,
      DEBUG: false,
      LOG_LEVEL: 'error',
    },
  },
})
