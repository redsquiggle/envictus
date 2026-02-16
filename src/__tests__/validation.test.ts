import { describe, expect, it } from "vitest";
import type { ValidationIssue } from "../types.js";
import { EnvValidationError, formatValidationIssues } from "../validation.js";

describe("formatValidationIssues", () => {
	it("formats a single issue with a path", () => {
		const issues: ValidationIssue[] = [{ message: "Required", path: ["PORT"] }];
		expect(formatValidationIssues(issues)).toBe("  - PORT: Required");
	});

	it("formats a nested path with object segments", () => {
		const issues: ValidationIssue[] = [{ message: "Invalid type", path: [{ key: "config" }, { key: "port" }] }];
		expect(formatValidationIssues(issues)).toBe("  - config.port: Invalid type");
	});

	it("uses (root) when path is missing", () => {
		const issues: ValidationIssue[] = [{ message: "Invalid input" }];
		expect(formatValidationIssues(issues)).toBe("  - (root): Invalid input");
	});

	it("formats multiple issues", () => {
		const issues: ValidationIssue[] = [
			{ message: "Required", path: ["PORT"] },
			{ message: "Required", path: ["HOST"] },
		];
		const result = formatValidationIssues(issues);
		expect(result).toBe("  - PORT: Required\n  - HOST: Required");
	});
});

describe("EnvValidationError", () => {
	it("has the correct name", () => {
		const error = new EnvValidationError([{ message: "Required", path: ["PORT"] }]);
		expect(error.name).toBe("EnvValidationError");
	});

	it("is an instance of Error", () => {
		const error = new EnvValidationError([{ message: "Required", path: ["PORT"] }]);
		expect(error).toBeInstanceOf(Error);
	});

	it("includes formatted issues in the message", () => {
		const issues: ValidationIssue[] = [
			{ message: "Required", path: ["PORT"] },
			{ message: "Invalid type", path: ["HOST"] },
		];
		const error = new EnvValidationError(issues);
		expect(error.message).toBe("Environment validation failed:\n  - PORT: Required\n  - HOST: Invalid type");
	});

	it("exposes the original issues array", () => {
		const issues: ValidationIssue[] = [{ message: "Required", path: ["PORT"] }];
		const error = new EnvValidationError(issues);
		expect(error.issues).toBe(issues);
	});
});
