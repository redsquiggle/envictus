# ArkType Example

Demonstrates envictus with [ArkType](https://arktype.io) for schema validation.

## Setup

```bash
cd examples/arktype
npm install
```

## Configuration

[envictus.ts](envictus.ts) defines:

- **Schema**: Environment variables using string-based type expressions (e.g., `"'dev' | 'prod' = 'dev'"`)
- **Discriminator**: Uses `NODE_ENV` to select environment-specific defaults
- **Defaults**: Different values for development, production, and test modes

The [.env](.env) file provides shared values (like `DATABASE_URL`) that get merged with mode-specific defaults.

## Usage

```bash
# Run with development defaults (default)
envictus -- node -e "console.log(process.env.PORT)"  # 3000

# Run with production defaults (via environment variable)
NODE_ENV=production envictus -- node -e "console.log(process.env.PORT)"  # 8080

# Run with production defaults (via -m flag)
envictus -m production -- node -e "console.log(process.env.PORT)"  # 8080

# Validate configuration
envictus check

# Validate production configuration
NODE_ENV=production envictus check
```
