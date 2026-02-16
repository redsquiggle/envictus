# envictus

Type-safe environment variable management for Node.js. Uses [Standard Schema](https://standardschema.dev/) for library-agnostic validation (Zod, Valibot, ArkType, Yup, Joi, and more) with discriminator-based environment defaults.

## Documentation

Full documentation at **[envictus.dev](https://envictus.dev)**.

## Quick Start

```bash
npm install envictus zod
```

Create an `env.config.ts`:

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

## Programmatic Usage

`defineConfig` returns a lazy `.env` property that resolves and caches validated environment variables on first access. Use top-level `await` to export a typed, ready-to-use env object:

```typescript
// env.config.ts
import { defineConfig, parseEnv } from "envictus";

const config = defineConfig({
	schema: envSchema,
	discriminator: "APP_ENV",
	defaults: {
		dev: {
			DATABASE_URL: "postgres://localhost:5432/myapp_dev",
			PUBLIC_URL: "https://app-dev.example.com",
			LOG_LEVEL: "debug",
		},
		prod: {
			PUBLIC_URL: "https://app.example.com",
			LOG_LEVEL: "error",
			...parseEnv(".env.prod", { onMissing: "ignore" }),
		},
	},
});

export default config;
export const env = await config.env;
```

```typescript
// app.ts
import { env } from "./env.config";

env.PUBLIC_URL; // fully typed, validated, and ready to use
```

## License

MIT
