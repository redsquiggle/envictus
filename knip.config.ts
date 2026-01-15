import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignore: ["**/*.d.ts", "**/dist/**", "examples/**", ".test-configs/**"],
	ignoreExportsUsedInFile: true,
};

export default config;
