import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignore: ["**/*.d.ts", "**/dist/**", "examples/**", ".test-configs/**", ".test-fixtures-*/**"],
	ignoreExportsUsedInFile: true,
};

export default config;
