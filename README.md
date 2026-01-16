# envictus

Type-safe environment variable management for Node.js. Uses [Standard Schema](https://standardschema.dev/) for library-agnostic validation (Zod, Valibot, ArkType, Yup, Joi, and more) with discriminator-based environment defaults.

## Installation

```bash
npm install envictus zod
# or with your preferred schema library
npm install envictus valibot
npm install envictus arktype
npm install envictus yup
npm install envictus joi
```

## Quick Start

Create an `env.config.ts` config file:

```typescript
import { defineConfig } from "envictus";
import { z } from "zod";

export default defineConfig({
	schema: z.object({
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		DATABASE_URL: z.string().url(),
		PORT: z.coerce.number().min(1).max(65535),
		DEBUG: z.coerce.boolean().optional(),
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			DATABASE_URL: "postgres://localhost:5432/dev",
			PORT: 3000,
			DEBUG: true,
		},
		production: {
			DATABASE_URL: "postgres://prod.example.com:5432/prod",
			PORT: 8080,
			DEBUG: false,
		},
		test: {
			DATABASE_URL: "postgres://localhost:5432/test",
			PORT: 3001,
			DEBUG: false,
		},
	},
});
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

# Skip validation (just merge and inject)
envictus --no-validate -- npm run dev

# Validate without running a command
envictus check

# Scaffold a new config file
envictus init
envictus init ./config/env.config.ts
```

### Setting the Environment Mode

The discriminator value (e.g., `NODE_ENV`) is read from the environment:

```bash
# Development (default)
envictus -- npm run dev

# Production
NODE_ENV=production envictus -- node dist/server.js

# Or export it
export NODE_ENV=production
envictus -- node dist/server.js
```

## Configuration

### Schema

Define your environment variables using any Standard Schema-compatible library:

**Zod:**
```typescript
import { z } from "zod";

schema: z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	DATABASE_URL: z.string().url(),
	PORT: z.coerce.number().min(1).max(65535),
	API_KEY: z.string().min(1),
	DEBUG: z.coerce.boolean().optional(),
})
```

**Valibot:**
```typescript
import * as v from "valibot";

schema: v.object({
	NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "development"),
	DATABASE_URL: v.pipe(v.string(), v.url()),
	PORT: v.pipe(v.string(), v.transform(Number), v.minValue(1), v.maxValue(65535)),
})
```

**ArkType:**
```typescript
import { type } from "arktype";

schema: type({
	NODE_ENV: "'development' | 'production' | 'test' = 'development'",
	DATABASE_URL: "string.url",
	PORT: "string.numeric.parse.integer > 0",
})
```

### Discriminator

The discriminator determines which defaults to use. **Defaults to `NODE_ENV`** when not specified:

```typescript
export default defineConfig({
	schema: z.object({
		APP_ENV: z.enum(["local", "staging", "prod"]),
		API_URL: z.string().url(),
	}),
	discriminator: "APP_ENV",
	defaults: {
		local: {
			API_URL: "http://localhost:4000",
		},
		staging: {
			API_URL: "https://staging.api.example.com",
		},
		prod: {
			API_URL: "https://api.example.com",
		},
	},
});
```

### Loading Defaults from .env Files

Use `parseEnv()` to load defaults from .env files:

```typescript
import { defineConfig, parseEnv } from "envictus";
import { z } from "zod";

export default defineConfig({
	schema: z.object({
		APP_ENV: z.enum(["local", "staging", "prod"]).default("local"),
		API_URL: z.string().url(),
		API_KEY: z.string().min(1),
	}),
	discriminator: "APP_ENV",
	defaults: {
		local: parseEnv(".env.local"),
		staging: parseEnv(".env.staging"),
		prod: parseEnv(".env.prod"),
	},
});
```

**Options:**

```typescript
// Ignore missing files (useful for optional local overrides)
parseEnv(".env.local", { onMissing: "ignore" })

// Warn but don't fail on missing files
parseEnv(".env.local", { onMissing: "warn" })

// Decrypt SOPS-encrypted env files
parseEnv(".env.prod.enc", { decrypt: "sops" })
```

## Resolution Order

Environment variables are resolved in this order (lowest to highest priority):

1. Schema `.default()` values
2. Environment-specific defaults (from `config.defaults[mode]`)
3. `process.env` (actual environment variables)

## Examples

### Basic Node.js App

```typescript
// env.config.ts
import { defineConfig } from "envictus";
import { z } from "zod";

export default defineConfig({
	schema: z.object({
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		PORT: z.coerce.number().default(3000),
		DATABASE_URL: z.string().url(),
		REDIS_URL: z.string().url().optional(),
		LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			LOG_LEVEL: "debug",
		},
		production: {
			LOG_LEVEL: "warn",
		},
		test: {
			LOG_LEVEL: "error",
			DATABASE_URL: "postgres://localhost:5432/test",
		},
	},
});
```

```bash
# Development (uses development defaults)
envictus -- npm run dev

# Production
NODE_ENV=production envictus -- node dist/server.js

# Testing
NODE_ENV=test envictus -- npm test
```

### Multi-Environment Deployment

```typescript
// env.config.ts
import { defineConfig } from "envictus";
import { z } from "zod";

export default defineConfig({
	schema: z.object({
		DEPLOY_ENV: z.enum(["local", "dev", "staging", "prod"]).default("local"),
		API_BASE_URL: z.string().url(),
		CDN_URL: z.string().url(),
		FEATURE_FLAGS: z.string().transform((s) => s.split(",")),
	}),
	discriminator: "DEPLOY_ENV",
	defaults: {
		local: {
			API_BASE_URL: "http://localhost:3000",
			CDN_URL: "http://localhost:3001",
			FEATURE_FLAGS: "debug,experimental",
		},
		dev: {
			API_BASE_URL: "https://dev.api.example.com",
			CDN_URL: "https://dev.cdn.example.com",
			FEATURE_FLAGS: "debug",
		},
		staging: {
			API_BASE_URL: "https://staging.api.example.com",
			CDN_URL: "https://staging.cdn.example.com",
			FEATURE_FLAGS: "",
		},
		prod: {
			API_BASE_URL: "https://api.example.com",
			CDN_URL: "https://cdn.example.com",
			FEATURE_FLAGS: "",
		},
	},
});
```

## Debugging

Use the `--verbose` (or `-v`) flag to enable debug output:

```bash
envictus --verbose -- npm run dev
envictus -v check
```

This will show detailed information about discriminator resolution and mode selection.

## Supported Schema Libraries

Any library implementing the [Standard Schema](https://standardschema.dev/) spec:

- [Zod](https://zod.dev/)
- [Valibot](https://valibot.dev/)
- [ArkType](https://arktype.io/)
- [Yup](https://github.com/jquense/yup)
- [Joi](https://joi.dev/) (via [@sjsf/joi-integration](https://www.npmjs.com/package/@sjsf/joi-integration))

## License

MIT
