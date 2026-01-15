import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineConfig } from "../config.js";
import { resolveEnv } from "../resolver.js";

describe("resolveEnv", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset process.env before each test
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("basic resolution", () => {
		it("resolves environment variables from process.env", async () => {
			const config = defineConfig({
				schema: z.object({
					PORT: z.coerce.number(),
					HOST: z.string(),
				}),
			});

			process.env.PORT = "3000";
			process.env.HOST = "localhost";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.HOST).toBe("localhost");
		});

		it("returns validation issues for invalid values", async () => {
			const config = defineConfig({
				schema: z.object({
					PORT: z.coerce.number().min(1).max(65535),
				}),
			});

			process.env.PORT = "invalid";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeDefined();
			expect(result.issues?.length).toBeGreaterThan(0);
		});

		it("applies schema defaults", async () => {
			const config = defineConfig({
				schema: z.object({
					PORT: z.coerce.number().default(3000),
					DEBUG: z.coerce.boolean().default(false),
				}),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.DEBUG).toBe("false");
		});
	});

	describe("discriminator-based defaults", () => {
		it("applies defaults based on discriminator value from process.env", async () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
					DEBUG: z.coerce.boolean().optional(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						PORT: 3000,
						DEBUG: true,
					},
					production: {
						PORT: 8080,
						DEBUG: false,
					},
				},
			});

			process.env.NODE_ENV = "development";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.DEBUG).toBe("true");
		});

		it("applies production defaults when NODE_ENV is production", async () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
					DEBUG: z.coerce.boolean().optional(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						PORT: 3000,
						DEBUG: true,
					},
					production: {
						PORT: 8080,
						DEBUG: false,
					},
				},
			});

			process.env.NODE_ENV = "production";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("8080");
			expect(result.env.DEBUG).toBe("false");
		});

		it("process.env overrides discriminator defaults", async () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						PORT: 3000,
					},
				},
			});

			process.env.NODE_ENV = "development";
			process.env.PORT = "4000";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("4000");
		});
	});

	describe("mode override", () => {
		it("uses mode override instead of process.env discriminator", async () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						PORT: 3000,
					},
					production: {
						PORT: 8080,
					},
				},
			});

			process.env.NODE_ENV = "development";

			const result = await resolveEnv(config, true, "production");

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("8080");
			expect(result.env.NODE_ENV).toBe("production");
		});
	});

	describe("validation toggle", () => {
		it("skips validation when shouldValidate is false", async () => {
			const config = defineConfig({
				schema: z.object({
					PORT: z.coerce.number().min(1).max(65535),
				}),
			});

			process.env.PORT = "invalid";

			const result = await resolveEnv(config, false);

			// No validation, so no issues
			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("invalid");
		});
	});

	describe("value coercion", () => {
		it("converts boolean values to strings", async () => {
			const config = defineConfig({
				schema: z.object({
					ENABLED: z.coerce.boolean(),
				}),
			});

			process.env.ENABLED = "true";

			const result = await resolveEnv(config, true);

			expect(result.env.ENABLED).toBe("true");
		});

		it("converts number values to strings", async () => {
			const config = defineConfig({
				schema: z.object({
					COUNT: z.coerce.number(),
				}),
			});

			process.env.COUNT = "42";

			const result = await resolveEnv(config, true);

			expect(result.env.COUNT).toBe("42");
		});
	});
});
