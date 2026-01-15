/**
 * Tests for parseEnv error propagation behavior.
 *
 * These tests require mocking node:fs to simulate non-ENOENT errors (like EACCES permission errors).
 * They are in a separate file because vi.mock is hoisted to the top of the file and affects all tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create the mock function at the top level using vi.hoisted
const mockReadFileSync = vi.hoisted(() => vi.fn());

// Mock node:fs before importing parseEnv
vi.mock("node:fs", () => ({
	readFileSync: mockReadFileSync,
}));

// Import after mock is set up
import { parseEnv } from "../env.js";

describe("parseEnv error propagation (mocked fs)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("re-throws non-ENOENT errors", () => {
		it("wraps EACCES (permission denied) errors with file path context", () => {
			const permissionError = new Error("EACCES: permission denied, open '/path/to/file'") as NodeJS.ErrnoException;
			permissionError.code = "EACCES";
			mockReadFileSync.mockImplementation(() => {
				throw permissionError;
			});

			expect(() => parseEnv("/path/to/file")).toThrow("Failed to read env file: /path/to/file");

			// Verify original error is preserved as cause
			try {
				parseEnv("/path/to/file");
			} catch (err) {
				expect((err as Error).cause).toBe(permissionError);
			}
		});

		it("re-throws non-ENOENT errors even with onMissing: 'ignore'", () => {
			const permissionError = new Error("EACCES: permission denied, open '/path/to/file'") as NodeJS.ErrnoException;
			permissionError.code = "EACCES";
			mockReadFileSync.mockImplementation(() => {
				throw permissionError;
			});

			expect(() => parseEnv("/path/to/file", { onMissing: "ignore" })).toThrow("Failed to read env file:");
		});

		it("re-throws non-ENOENT errors even with onMissing: 'warn'", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const permissionError = new Error("EACCES: permission denied, open '/path/to/file'") as NodeJS.ErrnoException;
			permissionError.code = "EACCES";
			mockReadFileSync.mockImplementation(() => {
				throw permissionError;
			});

			expect(() => parseEnv("/path/to/file", { onMissing: "warn" })).toThrow("Failed to read env file:");
			// Should not log warning since this is not ENOENT
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it("wraps EISDIR (is a directory) errors", () => {
			const isDirError = new Error("EISDIR: illegal operation on a directory") as NodeJS.ErrnoException;
			isDirError.code = "EISDIR";
			mockReadFileSync.mockImplementation(() => {
				throw isDirError;
			});

			expect(() => parseEnv("/path/to/directory")).toThrow("Failed to read env file: /path/to/directory");

			// Verify original error is preserved as cause
			try {
				parseEnv("/path/to/directory");
			} catch (err) {
				expect((err as Error).cause).toBe(isDirError);
			}
		});

		it("wraps generic errors without code and preserves original as cause", () => {
			const genericError = new Error("Something went wrong");
			mockReadFileSync.mockImplementation(() => {
				throw genericError;
			});

			expect(() => parseEnv("/path/to/file")).toThrow("Failed to read env file: /path/to/file");

			try {
				parseEnv("/path/to/file");
			} catch (err) {
				expect((err as Error).cause).toBe(genericError);
			}
		});
	});

	describe("ENOENT handling with mocked fs", () => {
		it("transforms ENOENT to user-friendly error with onMissing: 'error'", () => {
			const notFoundError = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
			notFoundError.code = "ENOENT";
			mockReadFileSync.mockImplementation(() => {
				throw notFoundError;
			});

			expect(() => parseEnv("/path/to/missing.env")).toThrow("Env file not found: /path/to/missing.env");
		});

		it("returns empty object for ENOENT with onMissing: 'ignore'", () => {
			const notFoundError = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
			notFoundError.code = "ENOENT";
			mockReadFileSync.mockImplementation(() => {
				throw notFoundError;
			});

			const result = parseEnv("/path/to/missing.env", { onMissing: "ignore" });
			expect(result).toEqual({});
		});

		it("logs warning and returns empty object for ENOENT with onMissing: 'warn'", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const notFoundError = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
			notFoundError.code = "ENOENT";
			mockReadFileSync.mockImplementation(() => {
				throw notFoundError;
			});

			const result = parseEnv("/path/to/missing.env", { onMissing: "warn" });
			expect(result).toEqual({});
			expect(warnSpy).toHaveBeenCalledWith("[envictus] Env file not found: /path/to/missing.env");
		});
	});
});
