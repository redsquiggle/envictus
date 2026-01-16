// Public API - what users import from 'envictus'
export { defineConfig } from "./config.js";
export { type ParseEnvOptions, parseEnv } from "./env.js";
export type {
	EnvictusConfig,
	InferInput,
	InferOutput,
	ObjectSchema,
	ResolvedEnv,
	ValidationIssue,
} from "./types.js";
