import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineConfig } from "../config.js";
import { getEnv } from "../getEnv.js";
import { resolveEnv } from "../resolver.js";
import { EnvValidationError } from "../validation.js";

describe("groups", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	// Reusable group config
	const stripeGroup = defineConfig({
		schema: z.object({
			STRIPE_SECRET_KEY: z.string(),
			STRIPE_WEBHOOK_SECRET: z.string(),
		}),
		discriminator: "STRIPE_ENV",
		defaults: {
			development: {
				STRIPE_SECRET_KEY: "sk_test_123",
				STRIPE_WEBHOOK_SECRET: "whsec_test_456",
			},
			production: {
				STRIPE_SECRET_KEY: "sk_live_required",
				STRIPE_WEBHOOK_SECRET: "whsec_live_required",
			},
		},
	});

	describe("resolution via resolveEnv", () => {
		it("group falls back to root mode when group discriminator is unset", async () => {
			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
				},
				groups: { stripe: stripeGroup },
			});

			process.env.APP_ENV = "development";
			// STRIPE_ENV not set → falls back to APP_ENV's mode ("development")

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_test_123");
			expect(result.env.STRIPE_WEBHOOK_SECRET).toBe("whsec_test_456");
		});

		it("STRIPE_ENV=production with APP_ENV=development → stripe production, root development", async () => {
			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
				},
				groups: { stripe: stripeGroup },
			});

			process.env.APP_ENV = "development";
			process.env.STRIPE_ENV = "production";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000"); // root development
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_live_required"); // stripe production
			expect(result.env.STRIPE_WEBHOOK_SECRET).toBe("whsec_live_required");
		});

		it("process.env overrides group defaults", async () => {
			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { stripe: stripeGroup },
			});

			process.env.APP_ENV = "development";
			process.env.STRIPE_SECRET_KEY = "sk_test_override";
			process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_override";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_test_override");
			expect(result.env.STRIPE_WEBHOOK_SECRET).toBe("whsec_test_override");
		});

		it("multiple groups resolve independently", async () => {
			const authGroup = defineConfig({
				schema: z.object({
					AUTH_SECRET: z.string(),
				}),
				discriminator: "AUTH_ENV",
				defaults: {
					development: { AUTH_SECRET: "dev_secret" },
					production: { AUTH_SECRET: "prod_secret" },
				},
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
				},
				groups: { stripe: stripeGroup, auth: authGroup },
			});

			process.env.APP_ENV = "development";
			process.env.STRIPE_ENV = "production";
			// AUTH_ENV not set → falls back to root mode

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000"); // root development
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_live_required"); // stripe production
			expect(result.env.AUTH_SECRET).toBe("dev_secret"); // auth cascaded from root development
		});

		it("explicitlyUnset works across root/group boundaries", async () => {
			const groupWithUnset = defineConfig({
				schema: z.object({
					FEATURE_FLAG: z.coerce.boolean().optional().default(true),
				}),
				discriminator: "GROUP_ENV",
				defaults: {
					development: {},
					production: { FEATURE_FLAG: undefined },
				},
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
				},
				groups: { flags: groupWithUnset },
			});

			process.env.APP_ENV = "production";
			process.env.GROUP_ENV = "production";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.FEATURE_FLAG).toBeUndefined();
		});

		it("no matching group mode → skip silently", async () => {
			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
					PORT: z.coerce.number().default(3000),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { stripe: stripeGroup },
			});

			process.env.APP_ENV = "staging";
			// STRIPE_ENV not set → falls back to root mode "staging"
			// "staging" has no stripe defaults → no group defaults applied
			// stripe schema requires values → must come from process.env
			process.env.STRIPE_SECRET_KEY = "sk_test_staging";
			process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_staging";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_test_staging");
			expect(result.env.STRIPE_WEBHOOK_SECRET).toBe("whsec_test_staging");
		});
	});

	describe("onMissingDiscriminator", () => {
		it("callback receives parent.discriminator and parent.mode", async () => {
			let captured: { discriminator: string; availableModes: string[]; parent?: unknown } | undefined;

			const groupWithCallback = defineConfig({
				schema: z.object({
					SERVICE_KEY: z.string(),
				}),
				discriminator: "SERVICE_ENV",
				defaults: {
					development: { SERVICE_KEY: "dev_key" },
					production: { SERVICE_KEY: "prod_key" },
				},
				onMissingDiscriminator(context) {
					captured = context;
					return context.availableModes[0];
				},
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { service: groupWithCallback },
			});

			process.env.APP_ENV = "development";
			// SERVICE_ENV not set → triggers onMissingDiscriminator

			await resolveEnv(config, { validate: true });

			expect(captured).toBeDefined();
			expect(captured!.discriminator).toBe("SERVICE_ENV");
			expect(captured!.availableModes).toEqual(["development", "production"]);
			expect(captured!.parent).toEqual({
				discriminator: "APP_ENV",
				mode: "development",
			});
		});

		it("callback returning value → used as group mode", async () => {
			const groupWithCallback = defineConfig({
				schema: z.object({
					SERVICE_KEY: z.string(),
				}),
				discriminator: "SERVICE_ENV",
				defaults: {
					development: { SERVICE_KEY: "dev_key" },
					production: { SERVICE_KEY: "prod_key" },
				},
				onMissingDiscriminator() {
					return "production";
				},
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { service: groupWithCallback },
			});

			process.env.APP_ENV = "development";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000"); // root development
			expect(result.env.SERVICE_KEY).toBe("prod_key"); // callback chose production
		});

		it("callback returning undefined → group contributes nothing", async () => {
			const groupWithCallback = defineConfig({
				schema: z.object({
					SERVICE_KEY: z.string(),
				}),
				discriminator: "SERVICE_ENV",
				defaults: {
					development: { SERVICE_KEY: "dev_key" },
					production: { SERVICE_KEY: "prod_key" },
				},
				onMissingDiscriminator() {
					return undefined;
				},
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { service: groupWithCallback },
			});

			process.env.APP_ENV = "development";
			// SERVICE_KEY must come from process.env since callback returned undefined
			process.env.SERVICE_KEY = "env_key";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.SERVICE_KEY).toBe("env_key");
		});

		it("no callback → defaults to parent.mode", async () => {
			const groupNoCallback = defineConfig({
				schema: z.object({
					SERVICE_KEY: z.string(),
				}),
				discriminator: "SERVICE_ENV",
				defaults: {
					development: { SERVICE_KEY: "dev_key" },
					production: { SERVICE_KEY: "prod_key" },
				},
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
				},
				groups: { service: groupNoCallback },
			});

			process.env.APP_ENV = "production";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("8080"); // root production
			expect(result.env.SERVICE_KEY).toBe("prod_key"); // cascaded from root production
		});

		it("standalone config (no parent) → parent is undefined", async () => {
			let captured: { parent?: unknown } | undefined;

			const standaloneConfig = defineConfig({
				schema: z.object({
					NODE_ENV: z.string().optional(),
					PORT: z.coerce.number().default(3000),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				onMissingDiscriminator(context) {
					captured = context;
					return context.availableModes[0];
				},
			});

			delete process.env.NODE_ENV;

			await resolveEnv(standaloneConfig, { validate: true });

			expect(captured).toBeDefined();
			expect(captured!.parent).toBeUndefined();
		});
	});

	describe("programmatic API via getEnv", () => {
		it("returns nested object with group namespaces", async () => {
			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
				},
				groups: { stripe: stripeGroup },
			});

			process.env.APP_ENV = "development";

			const env = await getEnv(config);

			// Root fields
			expect(env.APP_ENV).toBe("development");
			expect(env.PORT).toBe(3000);

			// Group namespace
			expect(env.stripe).toBeDefined();
			expect(env.stripe.STRIPE_SECRET_KEY).toBe("sk_test_123");
			expect(env.stripe.STRIPE_WEBHOOK_SECRET).toBe("whsec_test_456");
		});

		it("group validation errors throw EnvValidationError", async () => {
			const strictGroup = defineConfig({
				schema: z.object({
					REQUIRED_KEY: z.string().min(1),
				}),
				discriminator: "GROUP_ENV",
				defaults: {},
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number().default(3000),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { strict: strictGroup },
			});

			process.env.APP_ENV = "development";
			// REQUIRED_KEY not set → group validation should fail

			await expect(getEnv(config)).rejects.toBeInstanceOf(EnvValidationError);
		});

		it("both root + group issues reported via resolveEnv", async () => {
			const failingGroup = defineConfig({
				schema: z.object({
					GROUP_KEY: z.string().min(1),
				}),
			});

			const config = defineConfig({
				schema: z.object({
					ROOT_KEY: z.string().min(1),
				}),
				groups: { failing: failingGroup },
			});

			// Neither ROOT_KEY nor GROUP_KEY set

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeDefined();
			expect(result.issues!.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("CLI path via resolveEnv", () => {
		it("output is flat Record<string, string> including all group vars", async () => {
			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { stripe: stripeGroup },
			});

			process.env.APP_ENV = "development";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			// All vars are flat strings
			expect(typeof result.env.PORT).toBe("string");
			expect(typeof result.env.STRIPE_SECRET_KEY).toBe("string");
			expect(typeof result.env.STRIPE_WEBHOOK_SECRET).toBe("string");
			// No nested objects
			expect(result.env.stripe).toBeUndefined();
		});
	});

	describe("recursive (nested) groups", () => {
		it("resolves defaults from nested subgroups", async () => {
			const paymentGroup = defineConfig({
				schema: z.object({
					PAYMENT_KEY: z.string(),
				}),
				discriminator: "PAYMENT_ENV",
				defaults: {
					development: { PAYMENT_KEY: "pay_test_123" },
					production: { PAYMENT_KEY: "pay_live_456" },
				},
			});

			const stripeWithSubgroup = defineConfig({
				schema: z.object({
					STRIPE_SECRET_KEY: z.string(),
				}),
				discriminator: "STRIPE_ENV",
				defaults: {
					development: { STRIPE_SECRET_KEY: "sk_test_123" },
					production: { STRIPE_SECRET_KEY: "sk_live_456" },
				},
				groups: { payment: paymentGroup },
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
				}),
				discriminator: "APP_ENV",
				defaults: { development: {}, production: {} },
				groups: { stripe: stripeWithSubgroup },
			});

			process.env.APP_ENV = "development";

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_test_123");
			expect(result.env.PAYMENT_KEY).toBe("pay_test_123");
		});

		it("subgroup discriminator overrides parent cascade", async () => {
			const paymentGroup = defineConfig({
				schema: z.object({
					PAYMENT_KEY: z.string(),
				}),
				discriminator: "PAYMENT_ENV",
				defaults: {
					development: { PAYMENT_KEY: "pay_test_123" },
					production: { PAYMENT_KEY: "pay_live_456" },
				},
			});

			const stripeWithSubgroup = defineConfig({
				schema: z.object({
					STRIPE_SECRET_KEY: z.string(),
				}),
				discriminator: "STRIPE_ENV",
				defaults: {
					development: { STRIPE_SECRET_KEY: "sk_test_123" },
					production: { STRIPE_SECRET_KEY: "sk_live_456" },
				},
				groups: { payment: paymentGroup },
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
				}),
				discriminator: "APP_ENV",
				defaults: { development: {}, production: {} },
				groups: { stripe: stripeWithSubgroup },
			});

			process.env.APP_ENV = "development";
			process.env.STRIPE_ENV = "development";
			process.env.PAYMENT_ENV = "production"; // subgroup uses its own discriminator

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_test_123");
			expect(result.env.PAYMENT_KEY).toBe("pay_live_456");
		});

		it("getEnv returns deeply nested group namespaces", async () => {
			const paymentGroup = defineConfig({
				schema: z.object({
					PAYMENT_KEY: z.string(),
				}),
				discriminator: "PAYMENT_ENV",
				defaults: {
					development: { PAYMENT_KEY: "pay_test_123" },
				},
			});

			const stripeWithSubgroup = defineConfig({
				schema: z.object({
					STRIPE_SECRET_KEY: z.string(),
				}),
				discriminator: "STRIPE_ENV",
				defaults: {
					development: { STRIPE_SECRET_KEY: "sk_test_123" },
				},
				groups: { payment: paymentGroup },
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
				}),
				discriminator: "APP_ENV",
				defaults: { development: {} },
				groups: { stripe: stripeWithSubgroup },
			});

			process.env.APP_ENV = "development";

			const env = await getEnv(config);

			expect(env.stripe.STRIPE_SECRET_KEY).toBe("sk_test_123");
			expect(env.stripe.payment.PAYMENT_KEY).toBe("pay_test_123");
		});

		it("subgroup cascades to parent group mode when no discriminator set", async () => {
			const paymentGroup = defineConfig({
				schema: z.object({
					PAYMENT_KEY: z.string(),
				}),
				discriminator: "PAYMENT_ENV",
				defaults: {
					development: { PAYMENT_KEY: "pay_test" },
					production: { PAYMENT_KEY: "pay_live" },
				},
			});

			const stripeWithSubgroup = defineConfig({
				schema: z.object({
					STRIPE_SECRET_KEY: z.string(),
				}),
				discriminator: "STRIPE_ENV",
				defaults: {
					development: { STRIPE_SECRET_KEY: "sk_test" },
					production: { STRIPE_SECRET_KEY: "sk_live" },
				},
				groups: { payment: paymentGroup },
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
				}),
				discriminator: "APP_ENV",
				defaults: { development: {}, production: {} },
				groups: { stripe: stripeWithSubgroup },
			});

			process.env.APP_ENV = "production";
			process.env.STRIPE_ENV = "production";
			// PAYMENT_ENV not set → cascades to STRIPE_ENV mode: "production"

			const result = await resolveEnv(config, { validate: true });

			expect(result.issues).toBeUndefined();
			expect(result.env.STRIPE_SECRET_KEY).toBe("sk_live");
			expect(result.env.PAYMENT_KEY).toBe("pay_live");
		});
	});

	describe("config.env with groups", () => {
		it("resolves env with group namespaces via config.env", async () => {
			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "APP_ENV",
				defaults: {
					development: { PORT: 3000 },
				},
				groups: { stripe: stripeGroup },
			});

			process.env.APP_ENV = "development";

			const env = await config.env;

			expect(env.PORT).toBe(3000);
			expect(env.stripe.STRIPE_SECRET_KEY).toBe("sk_test_123");
		});
	});
});
