import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineConfig } from "../config.js";
import { getEnv } from "../getEnv.js";
import { EnvValidationError } from "../validation.js";

describe("getEnv", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns typed validated output for a given mode", async () => {
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

		const env = await getEnv(config, "production");

		expect(env.NODE_ENV).toBe("production");
		expect(env.PORT).toBe(8080);
		expect(env.DEBUG).toBe(false);
	});

	it("applies mode-specific defaults", async () => {
		const config = defineConfig({
			schema: z.object({
				NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
				API_URL: z.string(),
			}),
			discriminator: "NODE_ENV",
			defaults: {
				development: {
					API_URL: "http://localhost:3000",
				},
				staging: {
					API_URL: "https://staging.example.com",
				},
				production: {
					API_URL: "https://api.example.com",
				},
			},
		});

		const env = await getEnv(config, "staging");

		expect(env.NODE_ENV).toBe("staging");
		expect(env.API_URL).toBe("https://staging.example.com");
	});

	it("process.env overrides defaults", async () => {
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

		process.env.PORT = "9999";

		const env = await getEnv(config, "development");

		expect(env.PORT).toBe(9999);
	});

	it("throws EnvValidationError on validation failure", async () => {
		const config = defineConfig({
			schema: z.object({
				PORT: z.coerce.number().min(1).max(65535),
				HOST: z.string(),
			}),
		});

		// No PORT or HOST set, should fail validation
		try {
			await getEnv(config);
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(EnvValidationError);
			const validationError = error as EnvValidationError;
			expect(validationError.message).toContain("Environment validation failed:");
			expect(validationError.issues).toBeDefined();
			expect(validationError.issues.length).toBeGreaterThan(0);
		}
	});

	it("falls back to process.env for discriminator when no mode provided", async () => {
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

		process.env.NODE_ENV = "production";

		const env = await getEnv(config);

		expect(env.NODE_ENV).toBe("production");
		expect(env.PORT).toBe(8080);
	});

	it("falls back to schema default when no mode and no process.env discriminator", async () => {
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

		delete process.env.NODE_ENV;

		const env = await getEnv(config);

		expect(env.NODE_ENV).toBe("development");
		expect(env.PORT).toBe(3000);
	});

	it("respects explicitlyUnset (undefined overrides in defaults)", async () => {
		const config = defineConfig({
			schema: z.object({
				NODE_ENV: z.enum(["development", "production"]).default("development"),
				DEBUG: z.coerce.boolean().optional().default(true),
			}),
			discriminator: "NODE_ENV",
			defaults: {
				development: {},
				production: {
					DEBUG: undefined,
				},
			},
		});

		const devEnv = await getEnv(config, "development");
		expect(devEnv.DEBUG).toBe(true);

		const prodEnv = await getEnv(config, "production");
		expect(prodEnv.DEBUG).toBeUndefined();
	});

	it("works without discriminator or defaults", async () => {
		const config = defineConfig({
			schema: z.object({
				PORT: z.coerce.number().default(3000),
				HOST: z.string().default("localhost"),
			}),
		});

		const env = await getEnv(config);

		expect(env.PORT).toBe(3000);
		expect(env.HOST).toBe("localhost");
	});

	describe("config.env", () => {
		it("resolves env from the config directly", async () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number(),
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: { PORT: 3000 },
					production: { PORT: 8080 },
				},
			});

			process.env.NODE_ENV = "production";

			const env = await config.env;

			expect(env.NODE_ENV).toBe("production");
			expect(env.PORT).toBe(8080);
		});

		it("returns the same promise on subsequent accesses", async () => {
			const config = defineConfig({
				schema: z.object({
					PORT: z.coerce.number().default(3000),
				}),
			});

			expect(config.env).toBe(config.env);
		});
	});

	it("explicit mode overrides process.env discriminator", async () => {
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

		// Explicit mode should win over process.env
		const env = await getEnv(config, "production");

		expect(env.NODE_ENV).toBe("production");
		expect(env.PORT).toBe(8080);
	});
});
