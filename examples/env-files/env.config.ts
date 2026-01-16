import { defineConfig, parseEnv } from "envictus";
import { z } from "zod";

// Example loading defaults from .env files
export default defineConfig({
	schema: z.object({
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		API_URL: z.string().url(),
		API_KEY: z.string().min(1),
		TIMEOUT_MS: z.coerce.number().positive().default(5000),
	}),
	discriminator: "NODE_ENV",
	defaults: {
		development: {
			...parseEnv(".env.local", { onMissing: "ignore" }),
			API_URL: "https://localhost:3000/api",
		},
		test: {
			API_URL: "https://localhost:3000/api",
			API_KEY: "test-key",
		},
		production: {
			API_URL: "https://api.example.com",
			// API_KEY required with no default in prod
		},
	},
});
