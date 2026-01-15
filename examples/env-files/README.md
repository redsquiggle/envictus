# Env Files Example

Demonstrates envictus loading defaults from `.env` files using `parseEnv()`.

## Setup

```bash
cd examples/env-files
npm install
```

## Configuration

[envictus.ts](envictus.ts) defines:

- **Schema**: Environment variables validated with Zod
- **Discriminator**: Uses `NODE_ENV` to select environment-specific defaults
- **Defaults**: Development mode loads from `.env.local`, while other modes use inline defaults

The [.env.local](.env.local) file provides local development values that get merged with mode-specific defaults.

## Usage

```bash
# Run with development defaults (loads from .env.local)
envictus -- node -e "console.log(process.env.API_URL)"  # https://localhost:3000/api

# Run with production defaults
NODE_ENV=production envictus -- node -e "console.log(process.env.API_URL)"  # https://api.example.com

# Run with production defaults (via -m flag)
envictus -m production -- node -e "console.log(process.env.API_URL)"  # https://api.example.com

# Validate configuration
envictus check

# Validate production configuration
NODE_ENV=production envictus check
```
