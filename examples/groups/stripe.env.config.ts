import { defineConfig } from "envictus";
import { z } from "zod";

/**
 * Stripe environment configuration — works standalone or as a group.
 *
 * Uses its own discriminator (STRIPE_ENV) independent of the app's main
 * environment. When used as a group, falls back to the parent's mode
 * if STRIPE_ENV is not set.
 */
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
			// In production, all Stripe keys must come from the environment.
			// Setting undefined ensures schema defaults don't leak through.
			STRIPE_SECRET_KEY: undefined,
			STRIPE_WEBHOOK_SECRET: undefined,
			STRIPE_PUBLISHABLE_KEY: undefined,
		},
	},
});
