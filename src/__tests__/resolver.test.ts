import { type } from "arktype";
import Joi from "joi";
import * as v from "valibot";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as yup from "yup";
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

	describe("valibot schema support", () => {
		it("resolves environment variables with valibot schema", async () => {
			const config = defineConfig({
				schema: v.object({
					PORT: v.pipe(v.unknown(), v.transform(Number), v.number()),
					HOST: v.string(),
				}),
			});

			process.env.PORT = "3000";
			process.env.HOST = "localhost";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.HOST).toBe("localhost");
		});

		it("returns validation issues for invalid valibot values", async () => {
			const config = defineConfig({
				schema: v.object({
					PORT: v.pipe(v.unknown(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(65535)),
				}),
			});

			process.env.PORT = "invalid";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeDefined();
			expect(result.issues?.length).toBeGreaterThan(0);
		});

		it("applies valibot schema defaults", async () => {
			const config = defineConfig({
				schema: v.object({
					PORT: v.optional(v.pipe(v.unknown(), v.transform(Number), v.number()), 3000),
					DEBUG: v.optional(v.boolean(), false),
				}),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.DEBUG).toBe("false");
		});

		it("applies discriminator defaults with valibot schema", async () => {
			const config = defineConfig({
				schema: v.object({
					NODE_ENV: v.optional(v.picklist(["development", "production"]), "development"),
					PORT: v.pipe(v.unknown(), v.transform(Number), v.number()),
					DEBUG: v.optional(v.boolean()),
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
	});

	describe("arktype schema support", () => {
		it("resolves environment variables with arktype schema", async () => {
			const config = defineConfig({
				schema: type({
					PORT: "string.numeric",
					HOST: "string",
				}),
			});

			process.env.PORT = "3000";
			process.env.HOST = "localhost";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.HOST).toBe("localhost");
		});

		it("returns validation issues for invalid arktype values", async () => {
			const config = defineConfig({
				schema: type({
					PORT: "string.numeric",
				}),
			});

			process.env.PORT = "invalid";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeDefined();
			expect(result.issues?.length).toBeGreaterThan(0);
		});

		it("applies arktype schema defaults", async () => {
			const config = defineConfig({
				schema: type({
					PORT: "string.numeric = '3000'",
					DEBUG: "string = 'false'",
				}),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.DEBUG).toBe("false");
		});

		it("applies discriminator defaults with arktype schema", async () => {
			const config = defineConfig({
				schema: type({
					NODE_ENV: "'development' | 'production' = 'development'",
					PORT: "string.numeric",
					"DEBUG?": "string",
				}),
				discriminator: "NODE_ENV",
				defaults: {
					development: {
						PORT: "3000",
						DEBUG: "true",
					},
					production: {
						PORT: "8080",
						DEBUG: "false",
					},
				},
			});

			process.env.NODE_ENV = "development";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.DEBUG).toBe("true");
		});
	});

	describe("yup schema support", () => {
		it("resolves environment variables with yup schema", async () => {
			const config = defineConfig({
				schema: yup.object({
					PORT: yup.number().required(),
					HOST: yup.string().required(),
				}),
			});

			process.env.PORT = "3000";
			process.env.HOST = "localhost";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.HOST).toBe("localhost");
		});

		it("returns validation issues for invalid yup values", async () => {
			const config = defineConfig({
				schema: yup.object({
					PORT: yup.number().min(1).max(65535).required(),
				}),
			});

			process.env.PORT = "invalid";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeDefined();
			expect(result.issues?.length).toBeGreaterThan(0);
		});

		it("applies yup schema defaults", async () => {
			const config = defineConfig({
				schema: yup.object({
					PORT: yup.number().default(3000),
					DEBUG: yup.boolean().default(false),
				}),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.DEBUG).toBe("false");
		});

		it("applies discriminator defaults with yup schema", async () => {
			const config = defineConfig({
				schema: yup.object({
					NODE_ENV: yup.string().oneOf(["development", "production"]).default("development"),
					PORT: yup.number().required(),
					DEBUG: yup.boolean().optional(),
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
	});

	describe("joi schema support", () => {
		it("resolves environment variables with joi schema", async () => {
			const config = defineConfig({
				schema: Joi.object({
					PORT: Joi.number().required(),
					HOST: Joi.string().required(),
				}).unknown(),
			});

			process.env.PORT = "3000";
			process.env.HOST = "localhost";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.HOST).toBe("localhost");
		});

		it("returns validation issues for invalid joi values", async () => {
			const config = defineConfig({
				schema: Joi.object({
					PORT: Joi.number().port().required(),
				}).unknown(),
			});

			process.env.PORT = "invalid";

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeDefined();
			expect(result.issues?.length).toBeGreaterThan(0);
		});

		it("applies joi schema defaults", async () => {
			const config = defineConfig({
				schema: Joi.object({
					PORT: Joi.number().default(3000),
					DEBUG: Joi.boolean().default(false),
				}).unknown(),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.PORT).toBe("3000");
			expect(result.env.DEBUG).toBe("false");
		});

		it("applies discriminator defaults with joi schema", async () => {
			const config = defineConfig({
				schema: Joi.object({
					NODE_ENV: Joi.string().valid("development", "production").default("development"),
					PORT: Joi.number().required(),
					DEBUG: Joi.boolean().optional(),
				}).unknown(),
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
	});

	describe("edge cases", () => {
		it("succeeds when discriminator value has no matching defaults entry", async () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
					PORT: z.coerce.number().default(3000),
					DEBUG: z.coerce.boolean().default(false),
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

			// Set NODE_ENV to "staging" which has no defaults entry
			process.env.NODE_ENV = "staging";

			const result = await resolveEnv(config, true);

			// Should succeed without errors, using schema defaults
			expect(result.issues).toBeUndefined();
			expect(result.env.NODE_ENV).toBe("staging");
			expect(result.env.PORT).toBe("3000"); // schema default
			expect(result.env.DEBUG).toBe("false"); // schema default
		});

		it("succeeds with empty defaults object", async () => {
			const config = defineConfig({
				schema: z.object({
					NODE_ENV: z.enum(["development", "production"]).default("development"),
					PORT: z.coerce.number().default(3000),
				}),
				discriminator: "NODE_ENV",
				defaults: {},
			});

			process.env.NODE_ENV = "development";

			const result = await resolveEnv(config, true);

			// Should succeed without errors, using schema defaults
			expect(result.issues).toBeUndefined();
			expect(result.env.NODE_ENV).toBe("development");
			expect(result.env.PORT).toBe("3000"); // schema default
		});

		it("JSON stringifies array values", async () => {
			const config = defineConfig({
				schema: z.object({
					ALLOWED_HOSTS: z.array(z.string()).default(["localhost", "127.0.0.1"]),
				}),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.ALLOWED_HOSTS).toBe('["localhost","127.0.0.1"]');
		});

		it("JSON stringifies nested object values", async () => {
			const config = defineConfig({
				schema: z
					.object({
						CONFIG: z
							.object({
								host: z.string(),
								port: z.number(),
							})
							.default({ host: "localhost", port: 3000 }),
					})
					.passthrough(),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			expect(result.env.CONFIG).toBe('{"host":"localhost","port":3000}');
		});

		it("excludes null values from resolved env", async () => {
			const config = defineConfig({
				schema: z.object({
					OPTIONAL_VALUE: z.string().nullable().default(null),
					REQUIRED_VALUE: z.string().default("present"),
				}),
			});

			const result = await resolveEnv(config, true);

			expect(result.issues).toBeUndefined();
			// null values should be excluded from the env object
			expect(result.env.OPTIONAL_VALUE).toBeUndefined();
			expect(result.env.REQUIRED_VALUE).toBe("present");
		});
	});
});
