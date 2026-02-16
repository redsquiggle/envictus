import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineConfig, mergeDefaults } from "../config.js";
import { getEnv } from "../getEnv.js";

describe("mergeDefaults", () => {
	it("merges defaults from two sources", () => {
		const a = {
			development: { PORT: 3000 },
			production: { PORT: 8080 },
		};
		const b = {
			development: { DATABASE_URL: "postgres://localhost/dev" },
			production: { DATABASE_URL: "postgres://prod/db" },
		};

		const merged = mergeDefaults(a, b);

		expect(merged).toEqual({
			development: { PORT: 3000, DATABASE_URL: "postgres://localhost/dev" },
			production: { PORT: 8080, DATABASE_URL: "postgres://prod/db" },
		});
	});

	it("later sources override earlier for the same property", () => {
		const a = {
			development: { PORT: 3000 },
		};
		const b = {
			development: { PORT: 4000 },
		};

		const merged = mergeDefaults(a, b);

		expect(merged).toEqual({
			development: { PORT: 4000 },
		});
	});

	it("handles keys that only exist in one source", () => {
		const a = {
			development: { PORT: 3000 },
		};
		const b = {
			production: { PORT: 8080 },
		};

		const merged = mergeDefaults(a, b);

		expect(merged).toEqual({
			development: { PORT: 3000 },
			production: { PORT: 8080 },
		});
	});

	it("merges three sources", () => {
		const a = { development: { A: 1 } };
		const b = { development: { B: 2 } };
		const c = { development: { C: 3 } };

		const merged = mergeDefaults(a, b, c);

		expect(merged).toEqual({
			development: { A: 1, B: 2, C: 3 },
		});
	});

	it("handles empty sources", () => {
		const a = { development: { PORT: 3000 } };

		const merged = mergeDefaults(a, {});

		expect(merged).toEqual({
			development: { PORT: 3000 },
		});
	});

	it("preserves undefined values for explicit unsetting", () => {
		const a = {
			production: { DEBUG: true, PORT: 8080 },
		};
		const b = {
			production: { DEBUG: undefined },
		};

		const merged = mergeDefaults(a, b);

		expect(merged.production).toEqual({ DEBUG: undefined, PORT: 8080 });
		expect("DEBUG" in (merged.production ?? {})).toBe(true);
	});

	describe("integration with defineConfig and getEnv", () => {
		const originalEnv = process.env;

		beforeEach(() => {
			process.env = { ...originalEnv };
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it("works end-to-end with defineConfig", async () => {
			const sharedSchema = z.object({
				NODE_ENV: z.enum(["development", "production"]).default("development"),
				LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
			});

			const serverSchema = z.object({
				DATABASE_URL: z.string().url(),
				PORT: z.coerce.number(),
			});

			const sharedDefaults = {
				development: { LOG_LEVEL: "debug" as const },
				production: { LOG_LEVEL: "warn" as const },
			};

			const serverDefaults = {
				development: { DATABASE_URL: "postgres://localhost:5432/dev", PORT: 3000 },
				production: { DATABASE_URL: "postgres://prod.example.com:5432/db", PORT: 8080 },
			};

			const config = defineConfig({
				schema: sharedSchema.merge(serverSchema),
				discriminator: "NODE_ENV",
				defaults: mergeDefaults(sharedDefaults, serverDefaults),
			});

			delete process.env.NODE_ENV;

			const devEnv = await getEnv(config, "development");
			expect(devEnv.LOG_LEVEL).toBe("debug");
			expect(devEnv.DATABASE_URL).toBe("postgres://localhost:5432/dev");
			expect(devEnv.PORT).toBe(3000);

			const prodEnv = await getEnv(config, "production");
			expect(prodEnv.LOG_LEVEL).toBe("warn");
			expect(prodEnv.DATABASE_URL).toBe("postgres://prod.example.com:5432/db");
			expect(prodEnv.PORT).toBe(8080);
		});
	});
});
