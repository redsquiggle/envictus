import { z } from "zod";
import { defineConfig, parseEnv } from "../../src/index.js";

// Example with a custom discriminator (not NODE_ENV)
export default defineConfig({
	schema: z.object({
		APP_ENV: z.enum(["local", "staging", "prod"]).default("local"),
		API_URL: z.string().url(),
		API_KEY: z.string().min(1),
		TIMEOUT_MS: z.coerce.number().positive().default(5000),
	}),

	discriminator: "APP_ENV",

	defaults: {
		local: {
			...parseEnv(".env", { onMissing: "ignore" }),
			API_URL: "http://localhost:4000",
			TIMEOUT_MS: 10000,
		},

		staging: {
			...parseEnv(".env", { onMissing: "ignore" }),
			API_URL: "https://staging.api.example.com",
			TIMEOUT_MS: 5000,
		},

		prod: {
			...parseEnv(".env", { onMissing: "ignore" }),
			API_URL: "https://api.example.com",
			TIMEOUT_MS: 3000,
		},
	},
});
