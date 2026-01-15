import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignore: ["**/*.d.ts", "**/dist/**", "examples/**"],
	ignoreExportsUsedInFile: true,
};

export default config;
