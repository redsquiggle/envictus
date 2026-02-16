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
