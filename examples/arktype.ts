import { type } from "arktype";
import { defineConfig } from "../src/index.js";

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
			PORT: "3000",
			DEBUG: "true",
			LOG_LEVEL: "debug",
		},

		production: {
			PORT: "8080",
			DEBUG: "false",
			LOG_LEVEL: "warn",
		},

		test: {
			PORT: "3001",
			DEBUG: "false",
			LOG_LEVEL: "error",
		},
	},
});
