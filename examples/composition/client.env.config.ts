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
