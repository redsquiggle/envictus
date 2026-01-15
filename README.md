# envictus

Type-safe environment variable management for Node.js. Validate and inject env vars into your shell commands using Zod schemas with environment-specific defaults.

## Installation

```bash
npm install envictus zod
```

## Quick Start

Create an `env.config.ts` config file:

```typescript
import { z } from 'zod'
import { defineConfig } from 'envictus'

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().min(1).max(65535),
    DEBUG: z.coerce.boolean().optional(),
  }),

  developmentDefaults: {
    PORT: 3000,
    DEBUG: true,
  },

  productionDefaults: {
    PORT: 8080,
    DEBUG: false,
  },
})
```

Run your command with validated environment:

```bash
envictus -- npm run dev
```

## CLI Usage

```bash
# Run a command with validated env
envictus -- <command>

# Custom config path
envictus -c ./config/env.ts -- node server.js
envictus --config ./config/env.ts -- node server.js

# Load .env files (comma-separated, later files override earlier)
envictus --env .env,.env.local -- npm start

# Override the environment mode (sets discriminator value)
envictus -m production -- npm run build
envictus --mode staging -- npm run deploy

# Skip validation (just merge and inject)
envictus --no-validate -- npm run dev

# Validate without running a command
envictus check
envictus check --mode production  # Check production config

# Scaffold a new config file
envictus init
envictus init ./config/env.config.ts
```

## Configuration

### Schema

Define your environment variables using a Zod object schema:

```typescript
schema: z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().min(1).max(65535),
  API_KEY: z.string().min(1),
  DEBUG: z.coerce.boolean().optional(),
})
```

### Discriminator

The discriminator determines which defaults to use. **Defaults to `NODE_ENV`** when not specified:

```typescript
export default defineConfig({
  schema: z.object({
    APP_ENV: z.enum(['local', 'staging', 'prod']),
    API_URL: z.string().url(),
  }),

  discriminator: 'APP_ENV',

  localDefaults: {
    API_URL: 'http://localhost:4000',
  },
  stagingDefaults: {
    API_URL: 'https://staging.api.example.com',
  },
  prodDefaults: {
    API_URL: 'https://api.example.com',
  },
})
```

### Environment-Specific Defaults

Based on your discriminator's enum values, you can define `*Defaults` objects:

```typescript
// If discriminator is NODE_ENV with enum ['development', 'production', 'test']
developmentDefaults: { ... }
productionDefaults: { ... }
testDefaults: { ... }

// If discriminator is APP_ENV with enum ['local', 'staging', 'prod']
localDefaults: { ... }
stagingDefaults: { ... }
prodDefaults: { ... }
```

## Resolution Order

Environment variables are resolved in this order (lowest to highest priority):

1. Zod schema `.default()` values
2. Environment-specific defaults (e.g., `developmentDefaults`)
3. `.env` file(s) via `--env` flag
4. `process.env` (actual environment variables)
5. `--mode` flag (overrides the discriminator value)

## Examples

### Basic Node.js App

```typescript
// env.config.ts
import { z } from 'zod'
import { defineConfig } from 'envictus'

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),

  developmentDefaults: {
    LOG_LEVEL: 'debug',
  },

  productionDefaults: {
    LOG_LEVEL: 'warn',
  },

  testDefaults: {
    LOG_LEVEL: 'error',
    DATABASE_URL: 'postgres://localhost:5432/test',
  },
})
```

```bash
# Development (uses developmentDefaults)
envictus -- npm run dev

# Production with --mode flag (no need to set NODE_ENV)
envictus --mode production --env .env.production -- node dist/server.js

# Testing
envictus -m test -- npm test
```

### Multi-Environment Deployment

```typescript
// env.config.ts
import { z } from 'zod'
import { defineConfig } from 'envictus'

export default defineConfig({
  schema: z.object({
    DEPLOY_ENV: z.enum(['local', 'dev', 'staging', 'prod']).default('local'),
    API_BASE_URL: z.string().url(),
    CDN_URL: z.string().url(),
    FEATURE_FLAGS: z.string().transform((s) => s.split(',')),
  }),

  discriminator: 'DEPLOY_ENV',

  localDefaults: {
    API_BASE_URL: 'http://localhost:3000',
    CDN_URL: 'http://localhost:3001',
    FEATURE_FLAGS: 'debug,experimental',
  },

  devDefaults: {
    API_BASE_URL: 'https://dev.api.example.com',
    CDN_URL: 'https://dev.cdn.example.com',
    FEATURE_FLAGS: 'debug',
  },

  stagingDefaults: {
    API_BASE_URL: 'https://staging.api.example.com',
    CDN_URL: 'https://staging.cdn.example.com',
    FEATURE_FLAGS: '',
  },

  prodDefaults: {
    API_BASE_URL: 'https://api.example.com',
    CDN_URL: 'https://cdn.example.com',
    FEATURE_FLAGS: '',
  },
})
```

## Debugging

Use the `--verbose` (or `-v`) flag to enable debug output:

```bash
envictus --verbose -- npm run dev
envictus -v check
```

This will show detailed information about discriminator resolution and mode selection.

## License

MIT
