import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../loader.js";

describe("loadConfig", () => {
	it("loads a TypeScript config file with default export", async () => {
		const configPath = resolve(import.meta.dirname, "../../examples/envictus.ts");
		const config = await loadConfig(configPath);

		expect(config).toBeDefined();
		expect(config.schema).toBeDefined();
		expect(config.discriminator).toBe("NODE_ENV");
		expect(config.defaults).toBeDefined();
		expect(config.defaults?.development).toBeDefined();
		expect(config.defaults?.production).toBeDefined();
	});

	it("loads a config with custom discriminator", async () => {
		const configPath = resolve(import.meta.dirname, "../../examples/custom-discriminator.ts");
		const config = await loadConfig(configPath);

		expect(config).toBeDefined();
		expect(config.discriminator).toBe("APP_ENV");
		expect(config.defaults?.local).toBeDefined();
		expect(config.defaults?.staging).toBeDefined();
		expect(config.defaults?.prod).toBeDefined();
	});

	it("loads a Valibot config file", async () => {
		const configPath = resolve(import.meta.dirname, "../../examples/valibot.ts");
		const config = await loadConfig(configPath);

		expect(config).toBeDefined();
		expect(config.schema).toBeDefined();
		expect(config.discriminator).toBe("NODE_ENV");
		expect(config.defaults).toBeDefined();
		expect(config.defaults?.development).toBeDefined();
		expect(config.defaults?.production).toBeDefined();
		expect(config.defaults?.test).toBeDefined();
	});

	it("loads an ArkType config file", async () => {
		const configPath = resolve(import.meta.dirname, "../../examples/arktype.ts");
		const config = await loadConfig(configPath);

		expect(config).toBeDefined();
		expect(config.schema).toBeDefined();
		expect(config.discriminator).toBe("NODE_ENV");
		expect(config.defaults).toBeDefined();
		expect(config.defaults?.development).toBeDefined();
		expect(config.defaults?.production).toBeDefined();
		expect(config.defaults?.test).toBeDefined();
	});

	it("loads a Yup config file", async () => {
		const configPath = resolve(import.meta.dirname, "../../examples/yup.ts");
		const config = await loadConfig(configPath);

		expect(config).toBeDefined();
		expect(config.schema).toBeDefined();
		expect(config.discriminator).toBe("NODE_ENV");
		expect(config.defaults).toBeDefined();
		expect(config.defaults?.development).toBeDefined();
		expect(config.defaults?.production).toBeDefined();
		expect(config.defaults?.test).toBeDefined();
	});

	it("throws error for invalid config path", async () => {
		await expect(loadConfig("/nonexistent/path.ts")).rejects.toThrow();
	});
});
