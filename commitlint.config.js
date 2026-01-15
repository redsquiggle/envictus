export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"type-enum": [
			2,
			"always",
			[
				"feat", // New feature
				"fix", // Bug fix
				"docs", // Documentation
				"style", // Formatting (no code change)
				"refactor", // Code change (no new feature or fix)
				"perf", // Performance improvement
				"test", // Adding tests
				"build", // Build system or dependencies
				"ci", // CI configuration
				"chore", // Maintenance
				"revert", // Revert previous commit
			],
		],
		"subject-case": [2, "always", "lower-case"],
		"subject-empty": [2, "never"],
		"subject-full-stop": [2, "never", "."],
		"header-max-length": [2, "always", 100],
	},
};
