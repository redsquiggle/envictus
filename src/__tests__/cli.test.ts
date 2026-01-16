import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PROJECT_ROOT = join(__dirname, "../..");
const CLI_PATH = join(PROJECT_ROOT, "dist/bin.js");
const EXAMPLES_DIR = join(PROJECT_ROOT, "examples");

/**
 * Execute CLI command and return result
 */
function runCli(
	args: string[],
	options: { cwd?: string; env?: Record<string, string> } = {},
): { stdout: string; stderr: string; exitCode: number } {
	try {
		const result = execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
			encoding: "utf-8",
			cwd: options.cwd ?? PROJECT_ROOT,
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

describe("CLI integration tests", () => {
	let fixturesDir: string;

	function createFixture(name: string, content: string): string {
		const path = join(fixturesDir, name);
		writeFileSync(path, content, "utf-8");
		return path;
	}

	beforeAll(() => {
		if (!existsSync(CLI_PATH)) {
			throw new Error("CLI not built. Run `pnpm build` first.");
		}

		const fixturesRoot = join(PROJECT_ROOT, ".test-fixtures");
		mkdirSync(fixturesRoot, { recursive: true });
		fixturesDir = mkdtempSync(join(fixturesRoot, "run-"));
	});

	afterAll(() => {
		if (existsSync(fixturesDir)) {
			rmSync(fixturesDir, { recursive: true });
		}
	});

	describe("--help", () => {
		it("displays help message", () => {
			const result = runCli(["--help"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("envictus");
			expect(result.stdout).toContain("Type-safe environment variable management");
			expect(result.stdout).toContain("--config");
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
			const configPath = join(fixturesDir, "init-config.ts");

			if (existsSync(configPath)) {
				rmSync(configPath);
			}

			const result = runCli(["init", configPath]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Created");
			expect(existsSync(configPath)).toBe(true);
		});

		it("fails if config already exists", () => {
			const configPath = createFixture("existing-config.ts", "// existing");

			const result = runCli(["init", configPath]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("already exists");
		});
	});

	describe("check command", () => {
		describe("examples/zod", () => {
			const exampleDir = join(EXAMPLES_DIR, "zod");

			it("validates successfully", () => {
				const result = runCli(["check"], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("Environment is valid");
			});

			it("validates with NODE_ENV=development", () => {
				const result = runCli(["check"], { cwd: exampleDir, env: { NODE_ENV: "development" } });

				expect(result.exitCode).toBe(0);
			});

			it("validates with NODE_ENV=production", () => {
				const result = runCli(["check"], { cwd: exampleDir, env: { NODE_ENV: "production" } });

				expect(result.exitCode).toBe(0);
			});

			it("validates with NODE_ENV=test", () => {
				const result = runCli(["check"], { cwd: exampleDir, env: { NODE_ENV: "test" } });

				expect(result.exitCode).toBe(0);
			});
		});

		describe("examples/custom-discriminator", () => {
			const exampleDir = join(EXAMPLES_DIR, "custom-discriminator");

			it("validates successfully with default mode", () => {
				const result = runCli(["check"], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
			});

			it("validates with APP_ENV=staging", () => {
				const result = runCli(["check"], { cwd: exampleDir, env: { APP_ENV: "staging" } });

				expect(result.exitCode).toBe(0);
			});

			it("validates with APP_ENV=prod", () => {
				const result = runCli(["check"], { cwd: exampleDir, env: { APP_ENV: "prod" } });

				expect(result.exitCode).toBe(0);
			});
		});

		describe("examples/env-files", () => {
			const exampleDir = join(EXAMPLES_DIR, "env-files");

			it("validates with parseEnv loading .env.local", () => {
				const result = runCli(["check"], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
			});
		});

		describe("examples/arktype", () => {
			const exampleDir = join(EXAMPLES_DIR, "arktype");

			it("validates successfully", () => {
				const result = runCli(["check"], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
			});
		});

		describe("examples/valibot", () => {
			const exampleDir = join(EXAMPLES_DIR, "valibot");

			it("validates successfully", () => {
				const result = runCli(["check"], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
			});
		});

		describe("examples/yup", () => {
			const exampleDir = join(EXAMPLES_DIR, "yup");

			it("validates successfully", () => {
				const result = runCli(["check"], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
			});
		});

		describe("examples/joi", () => {
			const exampleDir = join(EXAMPLES_DIR, "joi");

			it("validates successfully", () => {
				const result = runCli(["check"], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
			});
		});

		it("skips validation with --no-validate", () => {
			const configPath = createFixture(
				"skip-validate.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../../src/index.js';

export default defineConfig({
  schema: z.object({
    REQUIRED_VAR: z.string(),
  }),
});
`,
			);

			const result = runCli(["check", "--config", configPath, "--no-validate"]);

			expect(result.exitCode).toBe(0);
		});

		it("fails when config file does not exist", () => {
			const result = runCli(["check", "--config", "nonexistent.ts"]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Error");
		});
	});

	describe("run command", () => {
		describe("examples/zod", () => {
			const exampleDir = join(EXAMPLES_DIR, "zod");

			it("runs command with resolved environment", () => {
				const result = runCli(["--", "node", "-e", '"console.log(process.env.PORT)"'], {
					cwd: exampleDir,
					env: { NODE_ENV: "development" },
				});

				expect(result.exitCode).toBe(0);
				expect(result.stdout.trim()).toBe("3000");
			});

			it("applies mode-specific defaults for production", () => {
				const result = runCli(["--", "node", "-e", '"console.log(process.env.PORT)"'], {
					cwd: exampleDir,
					env: { NODE_ENV: "production" },
				});

				expect(result.exitCode).toBe(0);
				expect(result.stdout.trim()).toBe("8080");
			});

			it("applies mode-specific defaults for test", () => {
				const result = runCli(["--", "node", "-e", '"console.log(process.env.PORT)"'], {
					cwd: exampleDir,
					env: { NODE_ENV: "test" },
				});

				expect(result.exitCode).toBe(0);
				expect(result.stdout.trim()).toBe("3001");
			});
		});

		describe("examples/custom-discriminator", () => {
			const exampleDir = join(EXAMPLES_DIR, "custom-discriminator");

			it("runs with local mode defaults", () => {
				const result = runCli(["--", "node", "-e", '"console.log(process.env.API_URL)"'], { cwd: exampleDir });

				expect(result.exitCode).toBe(0);
				expect(result.stdout.trim()).toBe("http://localhost:4000");
			});

			it("runs with prod mode defaults", () => {
				const result = runCli(["--", "node", "-e", '"console.log(process.env.API_URL)"'], {
					cwd: exampleDir,
					env: { APP_ENV: "prod" },
				});

				expect(result.exitCode).toBe(0);
				expect(result.stdout.trim()).toBe("https://api.example.com");
			});
		});

		describe("examples/env-files", () => {
			const exampleDir = join(EXAMPLES_DIR, "env-files");

			it("loads API_KEY from .env.local via parseEnv", () => {
				const result = runCli(["--", "node", "-e", '"console.log(process.env.API_KEY)"'], {
					cwd: exampleDir,
					env: { NODE_ENV: "development" },
				});

				expect(result.exitCode).toBe(0);
				expect(result.stdout.trim()).toBe("local-dev-key-12345");
			});
		});

		it("passes through exit code from child process", () => {
			const exampleDir = join(EXAMPLES_DIR, "zod");

			const result = runCli(["--", "node", "-e", '"process.exit(42)"'], { cwd: exampleDir });

			expect(result.exitCode).toBe(42);
		});

		it("fails validation before running command", () => {
			const configPath = createFixture(
				"fail-run.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../../src/index.js';

export default defineConfig({
  schema: z.object({
    REQUIRED: z.string(),
  }),
});
`,
			);

			const result = runCli(["--config", configPath, "--", "node", "-e", "\"console.log('should not run')\""]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("validation failed");
			expect(result.stdout).not.toContain("should not run");
		});
	});

	describe("error handling", () => {
		it("handles invalid TypeScript config", () => {
			const configPath = createFixture("syntax-error.ts", "this is not valid typescript {{{");

			const result = runCli(["check", "--config", configPath]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Error");
		});

		it("handles config without default export", () => {
			const configPath = createFixture(
				"no-export.ts",
				`
import { z } from 'zod';
const config = { schema: z.object({}) };
`,
			);

			const result = runCli(["check", "--config", configPath]);

			expect(result.exitCode).toBe(1);
		});

		it("reports validation errors for missing required fields", () => {
			const configPath = createFixture(
				"missing-required.ts",
				`
import { z } from 'zod';
import { defineConfig } from '../../src/index.js';

export default defineConfig({
  schema: z.object({
    REQUIRED_VAR: z.string(),
  }),
});
`,
			);

			const result = runCli(["check", "--config", configPath]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("validation failed");
		});
	});
});
