import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignore: [
		"**/*.d.ts",
		"**/dist/**",
		"examples/**",
		".test-configs/**",
		".test-fixtures-*/**",
		"scripts/**",
		"docs/**",
	],
	ignoreExportsUsedInFile: true,
};

export default config;
