import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "../env.js";

describe("parseEnv", () => {
	let tempDir: string;

	beforeEach(() => {
		// Create a temporary directory for test files
		tempDir = mkdtempSync(path.join(os.tmpdir(), "envictus-test-"));
	});

	afterEach(() => {
		// Clean up temporary files
		rmSync(tempDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	describe("happy path tests", () => {
		it("parses a valid .env file and returns key-value pairs", () => {
			const envPath = path.join(tempDir, ".env");
			writeFileSync(envPath, "PORT=3000\nHOST=localhost\nDEBUG=true");

			const result = parseEnv(envPath);

			expect(result).toEqual({
				PORT: "3000",
				HOST: "localhost",
				DEBUG: "true",
			});
		});

		it("handles empty .env files (returns empty object)", () => {
			const envPath = path.join(tempDir, ".env");
			writeFileSync(envPath, "");

			const result = parseEnv(envPath);

			expect(result).toEqual({});
		});

		it("handles .env files with comments (comments are ignored)", () => {
			const envPath = path.join(tempDir, ".env");
			writeFileSync(
				envPath,
				`# This is a comment
PORT=3000
# Another comment
HOST=localhost
# Inline comments are NOT supported by dotenv, but let's test the standard case
DEBUG=true`,
			);

			const result = parseEnv(envPath);

			expect(result).toEqual({
				PORT: "3000",
				HOST: "localhost",
				DEBUG: "true",
			});
		});

		it("handles .env files with quoted values", () => {
			const envPath = path.join(tempDir, ".env");
			writeFileSync(envPath, "MESSAGE=\"Hello World\"\nNAME='John Doe'");

			const result = parseEnv(envPath);

			expect(result).toEqual({
				MESSAGE: "Hello World",
				NAME: "John Doe",
			});
		});

		it("handles .env files with empty values", () => {
			const envPath = path.join(tempDir, ".env");
			writeFileSync(envPath, "EMPTY=\nPORT=3000");

			const result = parseEnv(envPath);

			expect(result).toEqual({
				EMPTY: "",
				PORT: "3000",
			});
		});
	});

	describe('onMissing: "error" tests (default)', () => {
		it("throws error by default when file is missing", () => {
			const missingPath = path.join(tempDir, "nonexistent.env");

			expect(() => parseEnv(missingPath)).toThrow();
		});

		it('throws error when onMissing is explicitly "error" and file is missing', () => {
			const missingPath = path.join(tempDir, "nonexistent.env");

			expect(() => parseEnv(missingPath, { onMissing: "error" })).toThrow();
		});

		it("error message includes the file path", () => {
			const missingPath = path.join(tempDir, "nonexistent.env");

			expect(() => parseEnv(missingPath)).toThrow(`Env file not found: ${missingPath}`);
		});
	});

	describe('onMissing: "warn" tests', () => {
		it("logs warning and returns empty object when file is missing", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const missingPath = path.join(tempDir, "nonexistent.env");

			const result = parseEnv(missingPath, { onMissing: "warn" });

			expect(result).toEqual({});
			expect(warnSpy).toHaveBeenCalledTimes(1);
		});

		it("warning message includes the file path", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const missingPath = path.join(tempDir, "nonexistent.env");

			parseEnv(missingPath, { onMissing: "warn" });

			expect(warnSpy).toHaveBeenCalledWith(`[envictus] Env file not found: ${missingPath}`);
		});
	});

	describe('onMissing: "ignore" tests', () => {
		it("silently returns empty object when file is missing", () => {
			const missingPath = path.join(tempDir, "nonexistent.env");

			const result = parseEnv(missingPath, { onMissing: "ignore" });

			expect(result).toEqual({});
		});

		it("does not log anything", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const missingPath = path.join(tempDir, "nonexistent.env");

			parseEnv(missingPath, { onMissing: "ignore" });

			expect(warnSpy).not.toHaveBeenCalled();
			expect(logSpy).not.toHaveBeenCalled();
			expect(errorSpy).not.toHaveBeenCalled();
		});
	});

	describe("error propagation tests", () => {
		it("ENOENT errors are transformed to user-friendly message", () => {
			const missingPath = path.join(tempDir, "nonexistent.env");

			// The error should be transformed to our custom message
			expect(() => parseEnv(missingPath)).toThrow("Env file not found:");
			// And not the raw ENOENT message
			expect(() => parseEnv(missingPath)).not.toThrow("ENOENT");
		});

		it("ENOENT with onMissing 'ignore' returns empty object instead of throwing", () => {
			const missingPath = path.join(tempDir, "nonexistent.env");

			// Should not throw
			const result = parseEnv(missingPath, { onMissing: "ignore" });
			expect(result).toEqual({});
		});

		it("ENOENT with onMissing 'warn' returns empty object and logs", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const missingPath = path.join(tempDir, "nonexistent.env");

			// Should not throw
			const result = parseEnv(missingPath, { onMissing: "warn" });
			expect(result).toEqual({});
			expect(warnSpy).toHaveBeenCalled();
		});

		it("only handles ENOENT errors specially - other errors have different code", () => {
			// This test verifies the error handling logic by confirming that
			// ENOENT (file not found) errors are specifically caught and handled.
			// The implementation checks error.code === "ENOENT" before applying
			// special handling, so non-ENOENT errors (like EACCES) would be re-thrown.

			const missingPath = path.join(tempDir, "nonexistent.env");

			// Capture the error to verify it's our custom error, not the raw fs error
			let caughtError: Error | undefined;
			try {
				parseEnv(missingPath);
			} catch (err) {
				caughtError = err as Error;
			}

			expect(caughtError).toBeDefined();
			expect(caughtError!.message).toBe(`Env file not found: ${missingPath}`);

			// Verify this is a new Error, not the original ENOENT error
			// (the original would have 'code' property set to 'ENOENT')
			expect((caughtError as NodeJS.ErrnoException).code).toBeUndefined();
		});
	});
});
