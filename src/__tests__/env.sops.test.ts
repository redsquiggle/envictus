/**
 * Tests for parseEnv SOPS decryption functionality.
 *
 * These tests require mocking node:child_process to simulate SOPS behavior.
 * They are in a separate file because vi.mock is hoisted and affects all tests.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create the mock function at the top level using vi.hoisted
const mockExecSync = vi.hoisted(() => vi.fn());

// Mock node:child_process before importing parseEnv
vi.mock("node:child_process", () => ({
	execSync: mockExecSync,
}));

// Import after mock is set up
import { parseEnv } from "../env.js";

describe("parseEnv with decrypt: 'sops'", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(path.join(os.tmpdir(), "envictus-sops-test-"));
		vi.clearAllMocks();
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	describe("successful decryption", () => {
		it("calls sops with correct arguments and parses decrypted output", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content placeholder");

			mockExecSync.mockReturnValue("PORT=3000\nHOST=localhost\nSECRET=decrypted-value");

			const result = parseEnv(encryptedPath, { decrypt: "sops" });

			expect(mockExecSync).toHaveBeenCalledWith(`sops -d "${encryptedPath}"`, {
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			});
			expect(result).toEqual({
				PORT: "3000",
				HOST: "localhost",
				SECRET: "decrypted-value",
			});
		});

		it("handles empty decrypted content", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted empty content");

			mockExecSync.mockReturnValue("");

			const result = parseEnv(encryptedPath, { decrypt: "sops" });

			expect(result).toEqual({});
		});

		it("handles decrypted content with comments", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			mockExecSync.mockReturnValue("# Comment\nPORT=3000\n# Another comment\nHOST=localhost");

			const result = parseEnv(encryptedPath, { decrypt: "sops" });

			expect(result).toEqual({
				PORT: "3000",
				HOST: "localhost",
			});
		});
	});

	describe("file not found handling", () => {
		it("respects onMissing: 'error' before attempting decryption", () => {
			const missingPath = path.join(tempDir, "nonexistent.env.enc");

			expect(() => parseEnv(missingPath, { decrypt: "sops" })).toThrow(`Env file not found: ${missingPath}`);
			expect(mockExecSync).not.toHaveBeenCalled();
		});

		it("respects onMissing: 'warn' before attempting decryption", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const missingPath = path.join(tempDir, "nonexistent.env.enc");

			const result = parseEnv(missingPath, { decrypt: "sops", onMissing: "warn" });

			expect(result).toEqual({});
			expect(warnSpy).toHaveBeenCalledWith(`[envictus] Env file not found: ${missingPath}`);
			expect(mockExecSync).not.toHaveBeenCalled();
		});

		it("respects onMissing: 'ignore' before attempting decryption", () => {
			const missingPath = path.join(tempDir, "nonexistent.env.enc");

			const result = parseEnv(missingPath, { decrypt: "sops", onMissing: "ignore" });

			expect(result).toEqual({});
			expect(mockExecSync).not.toHaveBeenCalled();
		});
	});

	describe("SOPS error handling", () => {
		it("throws helpful error when sops binary is not found (command not found)", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			const error = new Error("Command failed") as Error & { stderr: string };
			error.stderr = "sops: command not found";
			mockExecSync.mockImplementation(() => {
				throw error;
			});

			let caughtError: Error | undefined;
			try {
				parseEnv(encryptedPath, { decrypt: "sops" });
			} catch (err) {
				caughtError = err as Error;
			}

			expect(caughtError).toBeDefined();
			expect(caughtError!.message).toBe(`Failed to read env file: ${encryptedPath}`);
			expect((caughtError!.cause as Error).message).toBe(
				"SOPS binary not found. Install it from https://github.com/getsops/sops or ensure it's in your PATH.",
			);
		});

		it("throws helpful error when sops binary is not found (executable file not found)", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			const error = new Error("Command failed") as Error & { stderr: string };
			error.stderr = "executable file not found in $PATH";
			mockExecSync.mockImplementation(() => {
				throw error;
			});

			let caughtError: Error | undefined;
			try {
				parseEnv(encryptedPath, { decrypt: "sops" });
			} catch (err) {
				caughtError = err as Error;
			}

			expect(caughtError).toBeDefined();
			expect((caughtError!.cause as Error).message).toBe(
				"SOPS binary not found. Install it from https://github.com/getsops/sops or ensure it's in your PATH.",
			);
		});

		it("throws helpful error on decryption failure (could not decrypt)", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			const error = new Error("Command failed") as Error & { stderr: string };
			error.stderr = "could not decrypt data key";
			mockExecSync.mockImplementation(() => {
				throw error;
			});

			let caughtError: Error | undefined;
			try {
				parseEnv(encryptedPath, { decrypt: "sops" });
			} catch (err) {
				caughtError = err as Error;
			}

			expect(caughtError).toBeDefined();
			expect((caughtError!.cause as Error).message).toBe(
				`SOPS decryption failed for ${encryptedPath}. Check that you have the correct decryption key.`,
			);
		});

		it("throws helpful error on decryption failure (decryption failed)", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			const error = new Error("Command failed") as Error & { stderr: string };
			error.stderr = "decryption failed: no matching keys";
			mockExecSync.mockImplementation(() => {
				throw error;
			});

			let caughtError: Error | undefined;
			try {
				parseEnv(encryptedPath, { decrypt: "sops" });
			} catch (err) {
				caughtError = err as Error;
			}

			expect(caughtError).toBeDefined();
			expect((caughtError!.cause as Error).message).toBe(
				`SOPS decryption failed for ${encryptedPath}. Check that you have the correct decryption key.`,
			);
		});

		it("includes stderr in error message for unknown sops errors", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			const error = new Error("Command failed") as Error & { stderr: string };
			error.stderr = "some unexpected sops error";
			mockExecSync.mockImplementation(() => {
				throw error;
			});

			let caughtError: Error | undefined;
			try {
				parseEnv(encryptedPath, { decrypt: "sops" });
			} catch (err) {
				caughtError = err as Error;
			}

			expect(caughtError).toBeDefined();
			expect((caughtError!.cause as Error).message).toBe("SOPS decryption failed: some unexpected sops error");
		});

		it("uses error message when stderr is not available", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			const error = new Error("Generic error message");
			mockExecSync.mockImplementation(() => {
				throw error;
			});

			let caughtError: Error | undefined;
			try {
				parseEnv(encryptedPath, { decrypt: "sops" });
			} catch (err) {
				caughtError = err as Error;
			}

			expect(caughtError).toBeDefined();
			expect((caughtError!.cause as Error).message).toBe("SOPS decryption failed: Generic error message");
		});

		it("wraps sops errors with file context", () => {
			const encryptedPath = path.join(tempDir, ".env.enc");
			writeFileSync(encryptedPath, "encrypted content");

			const error = new Error("sops error") as Error & { stderr: string };
			error.stderr = "some error";
			mockExecSync.mockImplementation(() => {
				throw error;
			});

			expect(() => parseEnv(encryptedPath, { decrypt: "sops" })).toThrow(`Failed to read env file: ${encryptedPath}`);
		});
	});
});
