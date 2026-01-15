import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["**/*.d.ts", "**/dist/**", "examples/**"],
  ignoreDependencies: [
    // Used for testing standard-schema compatibility
    "zod",
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
