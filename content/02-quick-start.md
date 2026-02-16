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
