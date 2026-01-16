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

		it("requires discriminator to be a key of the schema", () => {
			defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				// @ts-expect-error - 'INVALID_KEY' is not a key in the schema
				discriminator: "INVALID_KEY",
				defaults: {},
			});
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
