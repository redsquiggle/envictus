#!/usr/bin/env node

import { parseArgs, printHelp, printVersion } from './cli.js'
import { init } from './commands/init.js'
import { check } from './commands/check.js'
import { run } from './commands/run.js'

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Handle subcommands
  if (args[0] === 'init') {
    await init(args[1])
    return
  }

  if (args[0] === 'check') {
    const options = parseArgs(args.slice(1))
    const exitCode = await check(options)
    process.exit(exitCode)
  }

  if (args[0] === '--help' || args[0] === '-h') {
    printHelp()
    return
  }

  if (args[0] === '--version' || args[0] === '-v') {
    printVersion()
    return
  }

  // Default: run command
  const options = parseArgs(args)

  if (options.command.length === 0) {
    printHelp()
    process.exit(1)
  }

  const exitCode = await run(options)
  process.exit(exitCode)
}

main().catch((error) => {
  console.error('envictus:', error.message)
  process.exit(1)
})
