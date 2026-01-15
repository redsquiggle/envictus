/**
 * Valibot example - requires explicit transformation pipelines for type coercion.
 * - `v.pipe()` chains validators/transformers (e.g., unknown -> transform -> validate)
 * - `v.unknown()` accepts any input, allowing subsequent transform/validation
 * - Boolean transform needed because env vars are strings ("true"/"1" -> boolean)
 */
import * as v from "valibot";
import { defineConfig } from "../../src/index.js";

export default defineConfig({
	schema: v.object({
		NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "development"),
		DATABASE_URL: v.pipe(v.string(), v.url()),
		PORT: v.pipe(v.unknown(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(65535)),
		DEBUG: v.optional(
			v.pipe(
				v.unknown(),
				v.transform((val) => val === "true" || val === "1"),
			),
		),
		LOG_LEVEL: v.optional(v.picklist(["debug", "info", "warn", "error"]), "info"),
	}),
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
