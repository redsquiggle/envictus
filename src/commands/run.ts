import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { printValidationIssues } from "../cli.js";
import { loadConfig } from "../loader.js";
import { resolveEnv } from "../resolver.js";

export interface RunOptions {
	config: string;
	env?: string;
	mode?: string;
	validate: boolean;
}

/**
 * Main run command - resolve env and execute wrapped command
 *
 * This is the default command when using:
 * envictus -- <command>
 */
export async function run(options: RunOptions, command: string[]): Promise<number> {
	if (command.length === 0) {
		console.error("✗ No command specified. Usage: envictus -- <command>");
		return 1;
	}

	const configPath = resolve(options.config);
	const envFiles =
		options.env
			?.split(",")
			.map((f) => f.trim())
			.filter(Boolean) ?? [];

	try {
		const config = await loadConfig(configPath);
		const result = await resolveEnv(config, envFiles, options.validate, options.mode);

		if (result.issues && result.issues.length > 0) {
			printValidationIssues(result.issues);
			return 1;
		}

		// Execute the command with resolved environment
		const [cmd, ...args] = command;
		if (!cmd) {
			console.error("✗ No command specified");
			return 1;
		}

		const child = spawn(cmd, args, {
			stdio: "inherit",
			env: { ...process.env, ...result.env },
			shell: true,
		});

		return new Promise((resolvePromise) => {
			child.on("close", (code: number | null) => {
				resolvePromise(code ?? 0);
			});

			child.on("error", (err: Error) => {
				console.error(`✗ Failed to execute command: ${err.message}`);
				resolvePromise(1);
			});
		});
	} catch (error) {
		console.error("✗ Error:", error instanceof Error ? error.message : error);
		return 1;
	}
}
