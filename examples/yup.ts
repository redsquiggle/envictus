import * as yup from "yup";
import { defineConfig } from "../src/index.js";

export default defineConfig({
	schema: yup.object({
		NODE_ENV: yup.string().oneOf(["development", "production", "test"]).default("development"),
		DATABASE_URL: yup.string().url().required(),
		PORT: yup.number().min(1).max(65535).required(),
		DEBUG: yup.boolean().optional(),
		LOG_LEVEL: yup.string().oneOf(["debug", "info", "warn", "error"]).default("info"),
	}),

	discriminator: "NODE_ENV",

	defaults: {
		development: {
			PORT: 3000,
			DEBUG: true,
			LOG_LEVEL: "debug",
		},

		production: {
			PORT: 8080,
			DEBUG: false,
			LOG_LEVEL: "warn",
		},

		test: {
			PORT: 3001,
			DEBUG: false,
			LOG_LEVEL: "error",
		},
	},
});
