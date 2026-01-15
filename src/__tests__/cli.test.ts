import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Use project root for tests so zod and other deps are available
const PROJECT_ROOT = join(__dirname, "../..");
const CLI_PATH = join(PROJECT_ROOT, "dist/bin.js");
const TEST_DIR = join(PROJECT_ROOT, ".test-configs");

/**
 * Execute CLI command and return result
 */
function runCli(
	args: string[],
	options: { env?: Record<string, string> } = {},
): { stdout: string; stderr: string; exitCode: number } {
	try {
		const result = execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
			encoding: "utf-8",
			cwd: PROJECT_ROOT,
			env: { ...process.env, ...options.env },
			stdio: ["pipe", "pipe", "pipe"],
		});
		return { stdout: result, stderr: "", exitCode: 0 };
	} catch (error) {
		const err = error as { stdout?: string; stderr?: string; status?: number };
		return {
			stdout: err.stdout ?? "",
			stderr: err.stderr ?? "",
			exitCode: err.status ?? 1,
		};
	}
}

/**
 * Create a test config file in .test-configs/
 */
function createTestConfig(name: string, content: string): string {
	const path = join(TEST_DIR, name);
	writeFileSync(path, content, "utf-8");
	return `.test-configs/${name}`;
}

describe("CLI integration tests", () => {
	beforeAll(() => {
		// Ensure dist is built
		if (!existsSync(CLI_PATH)) {
			throw new Error("CLI not built. Run `pnpm build` first.");
		}

		// Create test directory
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterAll(() => {
		// Cleanup test directory
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
	});

	describe("--help", () => {
		it("displays help message", () => {
			const result = runCli(["--help"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("envictus");
			expect(result.stdout).toContain("Type-safe environment variable management");
			expect(result.stdout).toContain("--config");
			expect(result.stdout).toContain("--mode");
		});
	});

	describe("--version", () => {
		it("displays version", () => {
			const result = runCli(["--version"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
		});
	});

	describe("init command", () => {
		it("creates a new config file", () => {
			const configPath = join(TEST_DIR, "init-new-config.ts");

			// Ensure file doesn't exist
			if (existsSync(configPath)) {
				rmSync(configPath);
			}

			const result = runCli(["init", ".test-configs/init-new-config.ts"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Created");
			expect(existsSync(configPath)).toBe(true);
		});

		it("fails if config already exists", () => {
			const configPath = join(TEST_DIR, "existing-config.ts");
			writeFileSync(configPath, "// existing", "utf-8");

			const result = runCli(["init", ".test-configs/existing-config.ts"]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("already exists");
		});
	});

	describe("check command", () => {
		it("validates a valid config", () => {
			const configPath = createTestConfig(
				"valid-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(3000),
  }),
});
`,
			);

			const result = runCli(["check", "--config", configPath]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Environment is valid");
		});

		it("reports validation errors for invalid config", () => {
			const configPath = createTestConfig(
				"invalid-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    REQUIRED_VAR: z.string(), // No default, not in env
  }),
});
`,
			);

			const result = runCli(["check", "--config", configPath]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("validation failed");
		});

		it("skips validation with --no-validate", () => {
			const configPath = createTestConfig(
				"skip-validate-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    REQUIRED_VAR: z.string(), // Would fail validation
  }),
});
`,
			);

			const result = runCli(["check", "--config", configPath, "--no-validate"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Environment is valid");
		});

		it("uses --mode to override discriminator", () => {
			const configPath = createTestConfig(
				"mode-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.coerce.number(),
  }),
  discriminator: 'NODE_ENV',
  defaults: {
    development: { PORT: 3000 },
    production: { PORT: 8080 },
  },
});
`,
			);

			const result = runCli(["check", "--config", configPath, "--mode", "production"]);

			expect(result.exitCode).toBe(0);
		});

		it("fails when config file does not exist", () => {
			const result = runCli(["check", "--config", ".test-configs/nonexistent.ts"]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Error");
		});
	});

	describe("run command", () => {
		it("executes command with resolved environment", () => {
			const configPath = createTestConfig(
				"run-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    TEST_VAR: z.string().default('hello'),
  }),
});
`,
			);

			// Use node to echo the env var
			const result = runCli(["--config", configPath, "--", "node", "-e", '"console.log(process.env.TEST_VAR)"']);

			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim()).toBe("hello");
		});

		it("passes through exit code from child process", () => {
			const configPath = createTestConfig(
				"exit-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.string().default('test'),
  }),
});
`,
			);

			const result = runCli(["--config", configPath, "--", "node", "-e", '"process.exit(42)"']);

			expect(result.exitCode).toBe(42);
		});

		it("fails validation before running command", () => {
			const configPath = createTestConfig(
				"fail-run-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    REQUIRED: z.string(), // No default
  }),
});
`,
			);

			const result = runCli(["--config", configPath, "--", "node", "-e", "\"console.log('should not run')\""]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("validation failed");
			expect(result.stdout).not.toContain("should not run");
		});

		it("applies mode-specific defaults", () => {
			const configPath = createTestConfig(
				"mode-run-config.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../src/index.js';

export default defineConfig({
  schema: z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    API_URL: z.string(),
  }),
  discriminator: 'NODE_ENV',
  defaults: {
    development: { API_URL: 'http://localhost:3000' },
    production: { API_URL: 'https://api.example.com' },
  },
});
`,
			);

			const result = runCli([
				"--config",
				configPath,
				"--mode",
				"production",
				"--",
				"node",
				"-e",
				'"console.log(process.env.API_URL)"',
			]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim()).toBe("https://api.example.com");
		});
	});

	describe("error handling", () => {
		it("handles invalid TypeScript config", () => {
			const configPath = createTestConfig("syntax-error.ts", "this is not valid typescript {{{");

			const result = runCli(["check", "--config", configPath]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Error");
		});

		it("handles config without default export", () => {
			const configPath = createTestConfig(
				"no-export.ts",
				`
import { z } from 'zod';
const config = { schema: z.object({}) };
`,
			);

			const result = runCli(["check", "--config", configPath]);

			expect(result.exitCode).toBe(1);
		});
	});
});
