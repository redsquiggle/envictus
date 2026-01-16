# Custom Discriminator Example

Demonstrates envictus with a custom discriminator variable instead of the default `NODE_ENV`.

## Setup

```bash
cd examples/custom-discriminator
npm install
```

## Configuration

[env.config.ts](env.config.ts) defines:

- **Schema**: Environment variables validated with Zod
- **Discriminator**: Uses `APP_ENV` (instead of `NODE_ENV`) with values `local`, `staging`, and `prod`
- **Defaults**: Different API URLs and timeouts for each environment

The [.env](.env) file provides shared values (like `API_KEY`) that get merged with mode-specific defaults.

## Usage

```bash
# Run with local defaults (default)
envictus -- node -e "console.log(process.env.API_URL)"  # http://localhost:4000

# Run with staging defaults (via environment variable)
APP_ENV=staging envictus -- node -e "console.log(process.env.API_URL)"  # https://staging.api.example.com

# Run with prod defaults (via -m flag)
envictus -m prod -- node -e "console.log(process.env.API_URL)"  # https://api.example.com

# Validate configuration
envictus check

# Validate production configuration
APP_ENV=prod envictus check
```
