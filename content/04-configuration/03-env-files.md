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
