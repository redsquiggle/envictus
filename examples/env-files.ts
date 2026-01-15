import { z } from "zod";
import { defineConfig, parseEnv } from "../src/index.js";

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
			API_URL: "https://localhost:3000/api",
			...parseEnv(".env.local", { onMissing: "ignore" }),
		},
		test: {},
		production: {},
	},
});
