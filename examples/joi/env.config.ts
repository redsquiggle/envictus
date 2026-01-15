/**
 * Joi example - strict by default, requires explicit allowances for extra fields.
 * - `.unknown()` on object allows extra env vars to pass through without errors
 * - `.valid()` constrains to specific values (enum-like behavior)
 * - Built-in validators: `.port()` (1-65535), `.uri()`, etc.
 */
import Joi from "joi";
import { defineConfig, parseEnv } from "../../src/index.js";

export default defineConfig({
	schema: Joi.object({
		NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
		DATABASE_URL: Joi.string().uri().required(),
		PORT: Joi.number().port().required(),
		DEBUG: Joi.boolean().optional(),
		LOG_LEVEL: Joi.string().valid("debug", "info", "warn", "error").default("info"),
	}).unknown(),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			...parseEnv(".env", { onMissing: "ignore" }),
			PORT: 3000,
			DEBUG: true,
			LOG_LEVEL: "debug",
		},

		production: {
			...parseEnv(".env", { onMissing: "ignore" }),
			PORT: 8080,
			DEBUG: false,
			LOG_LEVEL: "warn",
		},

		test: {
			...parseEnv(".env", { onMissing: "ignore" }),
			PORT: 3001,
			DEBUG: false,
			LOG_LEVEL: "error",
		},
	},
});
