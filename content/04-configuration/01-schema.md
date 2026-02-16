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
