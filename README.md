<!-- This file is generated from content/. Do not edit directly. -->

# envictus

Type-safe environment variable management for Node.js. Uses [Standard Schema](https://standardschema.dev/) for library-agnostic validation (Zod, Valibot, ArkType, Yup, Joi, and more) with discriminator-based environment defaults.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
  - [Config Path in package.json](#config-path-in-packagejson)
  - [Setting the Environment Mode](#setting-the-environment-mode)
- [Configuration](#configuration)
  - [Schema](#schema)
  - [Discriminator](#discriminator)
  - [Loading Defaults from .env Files](#loading-defaults-from-env-files)
- [Resolution Order](#resolution-order)
- [Examples](#examples)
  - [ArkType](#arktype)
  - [Composition](#composition)
  - [Custom Discriminator](#custom-discriminator)
  - [Env Files](#env-files)
  - [Joi](#joi)
  - [Valibot](#valibot)
  - [Yup](#yup)
  - [Zod](#zod)
- [Printing Environment Variables](#printing-environment-variables)
- [Debugging](#debugging)
- [Supported Schema Libraries](#supported-schema-libraries)
- [License](#license)

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

# Print resolved environment to stdout
envictus printenv
envictus printenv --format json

# Scaffold a new config file
envictus init
envictus init ./config/env.config.ts
```

### Config Path in package.json

Instead of passing `--config` every time, you can set the config path in your `package.json`:

```json
{
  "name": "my-app",
  "envictus": {
    "configPath": "./config/env.config.ts"
  }
}
```

The CLI resolves the config path in this order:

1. `--config` flag (highest priority)
2. `package.json` `envictus.configPath`
3. `env.config.ts` in current directory (default)

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

Configuration is defined in an `env.config.ts` file using `defineConfig()`. It consists of a schema, an optional discriminator, and environment-specific defaults.

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

The discriminator determines which defaults to use. **Defaults to `NODE_ENV`** when not specified.

> **Note:** `NODE_ENV` is a Node.js runtime concern — libraries like React and Express change behavior based on its value, and it's conventionally limited to `development`, `production`, and `test`. For selecting environment-specific defaults (local dev URLs, staging credentials, etc.), a dedicated variable like `APP_ENV` is a better fit. You can have `NODE_ENV=production` in both staging and production while using `APP_ENV` to distinguish between them.

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

Real-world configuration examples using popular schema libraries:

### ArkType

Demonstrates envictus with [ArkType](https://arktype.io) for schema validation.

```typescript
/**
 * ArkType example - uses string-based type expressions for concise schema definitions.
 * - Inline defaults: `= 'value'` syntax (e.g., `"'dev' | 'prod' = 'dev'"`)
 * - Optional fields: `"key?"` syntax (e.g., `"DEBUG?"`)
 * - Built-in validators: `string.url`, `string.numeric`, etc.
 */

import { type } from "arktype";
import { defineConfig } from "envictus";

export default defineConfig({
	schema: type({
		NODE_ENV: "'development' | 'production' | 'test' = 'development'",
		DATABASE_URL: "string.url",
		PORT: "string.numeric",
		"DEBUG?": "string",
		LOG_LEVEL: "'debug' | 'info' | 'warn' | 'error' = 'info'",
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			DATABASE_URL: "postgres://localhost:5432/dev",
			PORT: "3000",
			DEBUG: "true",
			LOG_LEVEL: "debug",
		},

		production: {
			DATABASE_URL: "postgres://prod.example.com:5432/prod",
			PORT: "8080",
			DEBUG: "false",
			LOG_LEVEL: "warn",
		},

		test: {
			DATABASE_URL: "postgres://localhost:5432/test",
			PORT: "3001",
			DEBUG: "false",
			LOG_LEVEL: "error",
		},
	},
});
```

### Composition

Demonstrates splitting environment configuration into separate client and server configs, where the client schema serves as the shared base that the server extends via `mergeDefaults`.

`client.env.config.ts`

```typescript
import { defineConfig } from "envictus";
import { z } from "zod";

// Client schema is the base — only browser-safe, prefixed variables.
// Frameworks like Next.js and Vite strip unprefixed vars from the client bundle,
// so this schema doubles as the shared foundation that the server config extends.

export const clientSchema = z.object({
	NEXT_PUBLIC_APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
	NEXT_PUBLIC_API_URL: z.string().url(),
	NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export const clientDefaults = {
	local: {
		NEXT_PUBLIC_API_URL: "http://localhost:3000/api",
	},
	staging: {
		NEXT_PUBLIC_API_URL: "https://staging.api.example.com",
		NEXT_PUBLIC_SENTRY_DSN: "https://abc@sentry.io/123",
	},
	production: {
		NEXT_PUBLIC_API_URL: "https://api.example.com",
		NEXT_PUBLIC_SENTRY_DSN: "https://abc@sentry.io/456",
	},
};

export default defineConfig({
	schema: clientSchema,
	discriminator: "NEXT_PUBLIC_APP_ENV",
	defaults: clientDefaults,
});
```

`server.env.config.ts`

```typescript
import { defineConfig, mergeDefaults } from "envictus";
import { z } from "zod";
import { clientDefaults, clientSchema } from "./client.env.config.js";

// Server config extends the client schema with secrets and internal config.
// The server needs public vars too (e.g. API_URL for SSR, Sentry DSN for error reporting).

const serverSchema = z.object({
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
	DATABASE_URL: z.string().url(),
	REDIS_URL: z.string().url(),
	SESSION_SECRET: z.string().min(32),
	PORT: z.coerce.number().min(1).max(65535),
});

const serverDefaults = {
	local: {
		LOG_LEVEL: "debug" as const,
		DATABASE_URL: "postgres://localhost:5432/myapp_dev",
		REDIS_URL: "redis://localhost:6379",
		SESSION_SECRET: "local-secret-that-is-at-least-32-characters",
		PORT: 3000,
	},
	staging: {
		LOG_LEVEL: "info" as const,
		PORT: 8080,
	},
	production: {
		LOG_LEVEL: "warn" as const,
		PORT: 8080,
	},
};

export default defineConfig({
	schema: clientSchema.merge(serverSchema),
	discriminator: "NEXT_PUBLIC_APP_ENV",
	defaults: mergeDefaults(clientDefaults, serverDefaults),
});
```

### Custom Discriminator

Demonstrates envictus with a custom discriminator variable instead of the default `NODE_ENV`.

```typescript
import { defineConfig } from "envictus";
import { z } from "zod";

// Example with a custom discriminator (not NODE_ENV)
export default defineConfig({
	schema: z.object({
		APP_ENV: z.enum(["local", "staging", "prod"]).default("local"),
		API_URL: z.string().url(),
		API_KEY: z.string().min(1),
		TIMEOUT_MS: z.coerce.number().positive().default(5000),
	}),
	discriminator: "APP_ENV",
	defaults: {
		local: {
			API_URL: "http://localhost:4000",
			API_KEY: "local-dev-key",
			TIMEOUT_MS: 10000,
		},

		staging: {
			API_URL: "https://staging.api.example.com",
			API_KEY: "staging-key",
			TIMEOUT_MS: 5000,
		},

		prod: {
			API_URL: "https://api.example.com",
			API_KEY: "prod-key",
			TIMEOUT_MS: 3000,
		},
	},
});
```

### Env Files

Demonstrates envictus loading defaults from `.env` files using `parseEnv()`.

```typescript
import { defineConfig, parseEnv } from "envictus";
import { z } from "zod";

// Example loading defaults from .env files
export default defineConfig({
	schema: z.object({
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		API_URL: z.string().url(),
		API_KEY: z.string().min(1),
		TIMEOUT_MS: z.coerce.number().positive().default(5000),
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			...parseEnv(".env.local", { onMissing: "ignore" }),
			API_URL: "https://localhost:3000/api",
		},
		test: {
			API_URL: "https://localhost:3000/api",
			API_KEY: "test-key",
		},
		production: {
			API_URL: "https://api.example.com",
			// API_KEY required with no default in prod
		},
	},
});
```

### Joi

Demonstrates envictus with [Joi](https://joi.dev) for schema validation.

```typescript
/**
 * Joi example - strict by default, requires explicit allowances for extra fields.
 * - `.unknown()` on object allows extra env vars to pass through without errors
 * - `.valid()` constrains to specific values (enum-like behavior)
 * - Built-in validators: `.port()` (1-65535), `.uri()`, etc.
 */

import { defineConfig } from "envictus";
import Joi from "joi";

export default defineConfig({
	schema: Joi.object({
		NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
		DATABASE_URL: Joi.string().uri().required(),
		PORT: Joi.number().port().required(),
		DEBUG: Joi.boolean().optional(),
		LOG_LEVEL: Joi.string().valid("debug", "info", "warn", "error").default("info"),
	}).unknown(),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			DATABASE_URL: "postgres://localhost:5432/dev",
			PORT: 3000,
			DEBUG: true,
			LOG_LEVEL: "debug",
		},

		production: {
			DATABASE_URL: "postgres://prod.example.com:5432/prod",
			PORT: 8080,
			DEBUG: false,
			LOG_LEVEL: "warn",
		},

		test: {
			DATABASE_URL: "postgres://localhost:5432/test",
			PORT: 3001,
			DEBUG: false,
			LOG_LEVEL: "error",
		},
	},
});
```

### Valibot

Demonstrates envictus with [Valibot](https://valibot.dev) for schema validation.

```typescript
/**
 * Valibot example - requires explicit transformation pipelines for type coercion.
 * - `v.pipe()` chains validators/transformers (e.g., unknown -> transform -> validate)
 * - `v.unknown()` accepts any input, allowing subsequent transform/validation
 * - Boolean transform needed because env vars are strings ("true"/"1" -> boolean)
 */

import { defineConfig } from "envictus";
import * as v from "valibot";

export default defineConfig({
	schema: v.object({
		NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "development"),
		DATABASE_URL: v.pipe(v.string(), v.url()),
		PORT: v.pipe(v.unknown(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(65535)),
		DEBUG: v.optional(
			v.pipe(
				v.unknown(),
				v.transform((val) => val === "true" || val === "1"),
			),
		),
		LOG_LEVEL: v.optional(v.picklist(["debug", "info", "warn", "error"]), "info"),
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			DATABASE_URL: "postgres://localhost:5432/dev",
			PORT: 3000,
			DEBUG: true,
			LOG_LEVEL: "debug",
		},

		production: {
			DATABASE_URL: "postgres://prod.example.com:5432/prod",
			PORT: 8080,
			DEBUG: false,
			LOG_LEVEL: "warn",
		},

		test: {
			DATABASE_URL: "postgres://localhost:5432/test",
			PORT: 3001,
			DEBUG: false,
			LOG_LEVEL: "error",
		},
	},
});
```

### Yup

Demonstrates envictus with [Yup](https://github.com/jquense/yup) for schema validation.

```typescript
/**
 * Yup example - has built-in coercion for common types (string -> number, string -> boolean).
 * - `.required()` marks field as mandatory; `.optional()` allows undefined
 * - `.oneOf()` constrains to specific values (enum-like behavior)
 * - `.default()` provides fallback value if field is undefined
 */

import { defineConfig } from "envictus";
import * as yup from "yup";

export default defineConfig({
	schema: yup.object({
		NODE_ENV: yup.string().oneOf(["development", "production", "test"]).default("development"),
		DATABASE_URL: yup.string().url().required(),
		PORT: yup.number().min(1).max(65535).required(),
		DEBUG: yup.boolean().optional(),
		LOG_LEVEL: yup.string().oneOf(["debug", "info", "warn", "error"]).default("info"),
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			DATABASE_URL: "https://db.example.com/dev",
			PORT: 3000,
			DEBUG: true,
			LOG_LEVEL: "debug",
		},

		production: {
			DATABASE_URL: "https://db.example.com/prod",
			PORT: 8080,
			DEBUG: false,
			LOG_LEVEL: "warn",
		},

		test: {
			DATABASE_URL: "https://db.example.com/test",
			PORT: 3001,
			DEBUG: false,
			LOG_LEVEL: "error",
		},
	},
});
```

### Zod

Demonstrates envictus with [Zod](https://zod.dev) for schema validation.

```typescript
import { defineConfig } from "envictus";
import { z } from "zod";

export default defineConfig({
	schema: z.object({
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		DATABASE_URL: z.string().url(),
		PORT: z.coerce.number().min(1).max(65535),
		DEBUG: z.coerce.boolean().optional(),
		LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
	}),
	discriminator: "NODE_ENV",
	defaults: {
		// Defaults when NODE_ENV=development
		development: {
			DATABASE_URL: "postgres://localhost:5432/dev",
			PORT: 3000,
			DEBUG: true,
			LOG_LEVEL: "debug",
		},

		// Defaults when NODE_ENV=production
		production: {
			DATABASE_URL: "postgres://prod.example.com:5432/prod",
			PORT: 8080,
			DEBUG: false,
			LOG_LEVEL: "warn",
		},

		// Defaults when NODE_ENV=test
		test: {
			DATABASE_URL: "postgres://localhost:5432/test",
			PORT: 3001,
			DEBUG: false,
			LOG_LEVEL: "error",
		},
	},
});
```

## Printing Environment Variables

Use `envictus printenv` to output the resolved environment variables to stdout. This is useful for piping to other tools:

```bash
# Print in dotenv format (default)
envictus printenv

# Print in JSON format
envictus printenv --format json
envictus printenv -f json

# Pipe to wrangler secret bulk
envictus printenv | wrangler secret bulk

# Pipe to other tools
envictus printenv -f json | jq '.DATABASE_URL'
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
