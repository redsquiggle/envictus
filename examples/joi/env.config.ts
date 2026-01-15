/**
 * Joi example - strict by default, requires explicit allowances for extra fields.
 * - `.unknown()` on object allows extra env vars to pass through without errors
 * - `.valid()` constrains to specific values (enum-like behavior)
 * - Built-in validators: `.port()` (1-65535), `.uri()`, etc.
 */

import { defineConfig } from "@redsquiggle/envictus";
import Joi from "joi";

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
			DATABASE_URL: "postgres://localhost:5432/dev",
			PORT: 3000,
			DEBUG: true,
			LOG_LEVEL: "debug",
		},

		production: {
			DATABASE_URL: "postgres://prod.example.com:5432/prod",
			PORT: 8080,
			DEBUG: false,
			LOG_LEVEL: "warn",
		},

		test: {
			DATABASE_URL: "postgres://localhost:5432/test",
			PORT: 3001,
			DEBUG: false,
			LOG_LEVEL: "error",
		},
	},
});
