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

## Groups

Groups let you compose independent sub-configs that each resolve with their own discriminator and defaults. When a group's discriminator isn't set, it cascades to the parent's resolved mode.

Define a standalone config for a service:

```typescript
// stripe.env.config.ts
import { defineConfig } from "envictus";
import { z } from "zod";

export const stripe = defineConfig({
	schema: z.object({
		STRIPE_SECRET_KEY: z.string().min(1),
		STRIPE_WEBHOOK_SECRET: z.string().min(1),
		STRIPE_PUBLISHABLE_KEY: z.string().min(1),
	}),
	discriminator: "STRIPE_ENV",
	defaults: {
		development: {
			STRIPE_SECRET_KEY: "sk_test_placeholder",
			STRIPE_WEBHOOK_SECRET: "whsec_test_placeholder",
			STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
		},
		production: {
			STRIPE_SECRET_KEY: undefined,
			STRIPE_WEBHOOK_SECRET: undefined,
			STRIPE_PUBLISHABLE_KEY: undefined,
		},
	},
});
```

Compose it into your root config with `groups`:

```typescript
// env.config.ts
import { defineConfig } from "envictus";
import { z } from "zod";
import { stripe } from "./stripe.env.config.js";

export default defineConfig({
	schema: z.object({
		APP_ENV: z.enum(["development", "production"]).default("development"),
		PORT: z.coerce.number().min(1).max(65535),
		DATABASE_URL: z.string().url(),
	}),
	discriminator: "APP_ENV",
	defaults: {
		development: {
			PORT: 3000,
			DATABASE_URL: "postgres://localhost:5432/myapp_dev",
		},
		production: { PORT: 8080 },
	},
	groups: { stripe },
});
```

Each group resolves independently. Override a group's mode without affecting the rest:

```bash
# Everything uses development defaults
APP_ENV=development envictus -- node server.js

# App is development, but Stripe uses production keys
APP_ENV=development STRIPE_ENV=production envictus -- node server.js
```

The `.env` property nests group outputs under their key:

```typescript
import config from "./env.config.js";

const env = await config.env;

env.PORT;                        // number (root)
env.stripe.STRIPE_SECRET_KEY;    // string (namespaced)
```

Each group config also works standalone:

```typescript
import { stripe } from "./stripe.env.config.js";

const stripeEnv = await stripe.env;
stripeEnv.STRIPE_SECRET_KEY; // string
```

## License

MIT
