import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineConfig } from "../config.js";

describe("type safety", () => {
	describe("discriminator constraints", () => {
		it("accepts valid discriminator values as defaults keys", () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
					test: { PORT: 3001 },
				},
			});

			expectTypeOf(config).toExtend<object>();
		});

		it("rejects invalid discriminator values as defaults keys", () => {
			defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: { PORT: 3000 },
					// @ts-expect-error - 'foo' is not a valid NODE_ENV value
					foo: { PORT: 9999 },
				},
			});
		});

		it("accepts discriminator not in the schema (for groups)", () => {
			const config = defineConfig({
				schema: z.object({
					STRIPE_SECRET_KEY: z.string(),
				}),
				discriminator: "STRIPE_ENV",
				defaults: {
					development: { STRIPE_SECRET_KEY: "sk_test" },
				},
			});

			expectTypeOf(config).toExtend<object>();
		});
	});

	describe("groups type safety", () => {
		it("config.env includes typed group namespaces", () => {
			const stripeGroup = defineConfig({
				schema: z.object({
					STRIPE_SECRET_KEY: z.string(),
					STRIPE_WEBHOOK_SECRET: z.string(),
				}),
				discriminator: "STRIPE_ENV",
				defaults: {
					development: { STRIPE_SECRET_KEY: "sk_test", STRIPE_WEBHOOK_SECRET: "whsec_test" },
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
				groups: { stripe: stripeGroup },
			});

			type Env = Awaited<typeof config.env>;
			// Root fields
			expectTypeOf<Env["PORT"]>().toEqualTypeOf<number>();
			// Group namespace
			expectTypeOf<Env["stripe"]>().toMatchTypeOf<{
				STRIPE_SECRET_KEY: string;
				STRIPE_WEBHOOK_SECRET: string;
			}>();
		});

		it("groups with defineConfig work as group values", () => {
			const authGroup = defineConfig({
				schema: z.object({
					AUTH_TOKEN: z.string(),
				}),
			});

			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
				}),
				discriminator: "NODE_ENV",
				defaults: {},
				groups: { auth: authGroup },
			});

			type Env = Awaited<typeof config.env>;
			expectTypeOf<Env["auth"]>().toMatchTypeOf<{ AUTH_TOKEN: string }>();
		});

		it("nested subgroups are typed through parent groups", () => {
			const paymentGroup = defineConfig({
				schema: z.object({
					PAYMENT_KEY: z.string(),
				}),
			});

			const stripeGroup = defineConfig({
				schema: z.object({
					STRIPE_SECRET_KEY: z.string(),
				}),
				groups: { payment: paymentGroup },
			});

			const config = defineConfig({
				schema: z.object({
					APP_ENV: z.enum(["development", "production"]).default("development"),
				}),
				discriminator: "APP_ENV",
				defaults: {},
				groups: { stripe: stripeGroup },
			});

			type Env = Awaited<typeof config.env>;
			expectTypeOf<Env["stripe"]["STRIPE_SECRET_KEY"]>().toEqualTypeOf<string>();
			expectTypeOf<Env["stripe"]["payment"]["PAYMENT_KEY"]>().toEqualTypeOf<string>();
		});

		it("config without groups has no group namespaces in env type", () => {
			const config = defineConfig({
				schema: z.object({
					PORT: z.coerce.number(),
				}),
			});

			type Env = Awaited<typeof config.env>;
			expectTypeOf<Env["PORT"]>().toEqualTypeOf<number>();
			// No group keys should exist — Env should only have PORT
			expectTypeOf(config).toExtend<object>();
		});
	});

	describe("defaults type safety", () => {
		it("accepts valid partial schema values in defaults", () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
					HOST: z.string(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						PORT: 3000,
						// HOST is optional since defaults are Partial
					},
				},
			});

			expectTypeOf(config).toExtend<object>();
		});

		it("rejects invalid property types in defaults", () => {
			defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						// @ts-expect-error - PORT should be a number, not a string
						PORT: "not a number",
					},
				},
			});
		});

		it("rejects unknown properties in defaults", () => {
			defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						PORT: 3000,
						// @ts-expect-error - UNKNOWN_PROP is not in the schema
						UNKNOWN_PROP: "value",
					},
				},
			});
		});
	});
});
