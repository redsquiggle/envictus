// Public API - what users import from 'envictus'
export { defineConfig, mergeDefaults } from "./config.js";
export { type ParseEnvOptions, parseEnv } from "./env.js";
export { getEnv } from "./getEnv.js";
export type {
	EnvictusConfig,
	InferInput,
	InferOutput,
	ObjectSchema,
	ResolvedEnv,
	ValidationIssue,
} from "./types.js";
export { EnvValidationError, formatValidationIssues } from "./validation.js";
