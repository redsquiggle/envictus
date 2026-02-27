import { defineConfig } from "envictus";
import { z } from "zod";
import { stripe } from "./stripe.env.config.js";

/**
 * Root application config that composes Stripe as a group.
 *
 * Groups resolve independently — each has its own discriminator and defaults.
 * When STRIPE_ENV is not set, the group cascades to APP_ENV's resolved mode.
 *
 * This means `APP_ENV=development envictus -- next dev` applies development
 * defaults everywhere, while `APP_ENV=development STRIPE_ENV=production envictus -- next dev`
 * uses production Stripe keys with development app settings.
 */
export default defineConfig({
	schema: z.object({
		APP_ENV: z.enum(["development", "production"]).default("development"),
		PORT: z.coerce.number().min(1).max(65535),
		DATABASE_URL: z.string().url(),
		LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
	}),
	discriminator: "APP_ENV",
	defaults: {
		development: {
			PORT: 3000,
			DATABASE_URL: "postgres://localhost:5432/myapp_dev",
			LOG_LEVEL: "debug",
		},
		production: {
			PORT: 8080,
			LOG_LEVEL: "warn",
		},
	},
	groups: { stripe },
});
