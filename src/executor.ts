import type { ChildProcess } from "node:child_process";

/**
 * Execute a command with the resolved environment variables
 *
 * Spawns the command as a child process with:
 * - Merged environment (resolved env + inherited process.env)
 * - Inherited stdio (stdin, stdout, stderr)
 * - Signal forwarding (SIGINT, SIGTERM, etc.)
 *
 * @returns The child process exit code
 */
export function executeCommand(_command: string[], _env: Record<string, string>): Promise<number> {
	// TODO: Implement using child_process.spawn
	throw new Error("Not implemented");
}

/**
 * Setup signal forwarding from parent to child process
 */
export function setupSignalForwarding(_child: ChildProcess): void {
	// TODO: Implement
	throw new Error("Not implemented");
}
