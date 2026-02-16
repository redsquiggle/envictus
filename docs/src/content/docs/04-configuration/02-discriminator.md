---
title: Discriminator
slug: configuration/discriminator
sidebar:
  order: 2
---

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
