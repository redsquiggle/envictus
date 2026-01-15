# CLAUDE.md

## Project Overview

**envictus** is a type-safe environment variable management CLI and library. It uses Standard Schema for library-agnostic validation (supporting Zod, Valibot, ArkType, Yup, Joi, and many more) and provides discriminator-based defaults for different environments.

## Project Structure

```
src/
├── __tests__/       # Vitest test files
├── commands/        # CLI command implementations
│   ├── check.ts     # Validate environment
│   ├── init.ts      # Scaffold new config
│   └── run.ts       # Execute command with resolved env
├── bin.ts           # CLI entry point
├── cli.ts           # Command program setup
├── config.ts        # defineConfig() helper
├── env.ts           # parseEnv() for .env files
├── index.ts         # Public API exports
├── loader.ts        # TypeScript config loading (jiti)
├── resolver.ts      # Core resolution logic
└── types.ts         # TypeScript types/interfaces

examples/            # Example configs for each schema library
dist/                # Compiled output (gitignored)
```

## Commands

```bash
pnpm build          # Compile TypeScript
pnpm dev            # Watch mode
pnpm test           # Run Vitest
pnpm lint           # Biome linting
pnpm lint:fix       # Auto-fix lint issues
pnpm format         # Format with Biome
pnpm check-types    # Type checking
pnpm knip           # Dead code detection
pnpm check          # Full validation (lint, types, build, knip)
```

## Code Style

- **Formatter/Linter**: Biome
- **Line width**: 120 characters
- **Indentation**: Tabs
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Trailing commas**: All

## Commit Conventions

Uses conventional commits with commitlint enforcement:

```
type: subject in lowercase

Optional body
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Rules**:
- Subject must be lowercase (no uppercase letters)
- No period at end of subject
- Max 100 characters for subject

## Git Hooks (lefthook)

**Pre-commit**: Runs biome, knip, type checking, and tests
**Commit-msg**: Validates conventional commit format

## TypeScript Configuration

- **Module system**: ESM (`"type": "module"`)
- **Target**: ESNext with NodeNext module resolution
- **Strict mode**: Enabled with additional strictness (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`)

## Testing

- **Framework**: Vitest
- **Location**: `src/__tests__/*.test.ts`
- **Fixtures**: Created in `.test-fixtures/` directory (gitignored)

**Patterns**:
- Isolate process.env changes with backup/restore in beforeEach/afterEach
- Use `mkdtempSync` for temp directories in integration tests
- Test against actual example configs for real-world validation

## Architecture

**Resolution pipeline**:
1. Load config from `envictus.ts` (TypeScript via jiti)
2. Determine discriminator value (--mode flag → process.env → schema default → "development")
3. Merge: schema defaults → environment-specific defaults → process.env → mode override
4. Validate against Standard Schema
5. Convert to environment variable strings
6. Execute command with merged environment

**Key design principles**:
- Standard Schema compatibility for library-agnostic validation
- Full type inference through generics
- Configuration as code (TypeScript config files)
