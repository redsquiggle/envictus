#!/usr/bin/env node

import { program, resolveConfigPath } from "./cli.js";
import { check } from "./commands/check.js";
import { init } from "./commands/init.js";
import { printenv } from "./commands/printenv.js";
import { run } from "./commands/run.js";

// Init command
program
	.command("init [path]")
	.description("create a new env.config.ts config file")
	.action(async (path?: string) => {
		await init(path);
	});

// Check command
program
	.command("check")
	.description("validate environment without running a command")
	.action(async () => {
		const opts = program.opts();
		const configPath = await resolveConfigPath(opts.config);
		const exitCode = await check({
			config: configPath,
			validate: opts.validate,
			verbose: opts.verbose,
		});
		process.exit(exitCode);
	});

// Printenv command
program
	.command("printenv")
	.description("print resolved environment variables to stdout")
	.option("-f, --format <format>", "output format (dotenv or json)", "dotenv")
	.action(async (cmdOpts: { format: string }) => {
		const opts = program.opts();
		const configPath = await resolveConfigPath(opts.config);
		const format = cmdOpts.format === "json" ? "json" : "dotenv";
		const exitCode = await printenv({
			config: configPath,
			validate: opts.validate,
			verbose: opts.verbose,
			format,
		});
		process.exit(exitCode);
	});

// Default run command (handles everything after --)
program.argument("[command...]", "command to run with resolved environment").action(async (command: string[]) => {
	// If no command provided and no subcommand matched, show help
	if (command.length === 0) {
		program.help();
		return;
	}

	const opts = program.opts();
	const configPath = await resolveConfigPath(opts.config);
	const exitCode = await run(
		{
			config: configPath,
			validate: opts.validate,
			verbose: opts.verbose,
		},
		command,
	);
	process.exit(exitCode);
});

program.parse();
