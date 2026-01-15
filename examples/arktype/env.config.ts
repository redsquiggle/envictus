/**
 * ArkType example - uses string-based type expressions for concise schema definitions.
 * - Inline defaults: `= 'value'` syntax (e.g., `"'dev' | 'prod' = 'dev'"`)
 * - Optional fields: `"key?"` syntax (e.g., `"DEBUG?"`)
 * - Built-in validators: `string.url`, `string.numeric`, etc.
 */

import { defineConfig } from "@redsquiggle/envictus";
import { type } from "arktype";

export default defineConfig({
	schema: type({
		NODE_ENV: "'development' | 'production' | 'test' = 'development'",
		DATABASE_URL: "string.url",
		PORT: "string.numeric",
		"DEBUG?": "string",
		LOG_LEVEL: "'debug' | 'info' | 'warn' | 'error' = 'info'",
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			DATABASE_URL: "postgres://localhost:5432/dev",
			PORT: "3000",
			DEBUG: "true",
			LOG_LEVEL: "debug",
		},

		production: {
			DATABASE_URL: "postgres://prod.example.com:5432/prod",
			PORT: "8080",
			DEBUG: "false",
			LOG_LEVEL: "warn",
		},

		test: {
			DATABASE_URL: "postgres://localhost:5432/test",
			PORT: "3001",
			DEBUG: "false",
			LOG_LEVEL: "error",
		},
	},
});
