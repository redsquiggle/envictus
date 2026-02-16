# Composition Example

Demonstrates splitting environment configuration into separate client and server configs, where the client schema serves as the shared base that the server extends via `mergeDefaults`.

## Structure

```
client.env.config.ts  # Client config (public, browser-safe vars) — the shared base
server.env.config.ts  # Server config — extends client with secrets and internal config
```

## How it works

1. **`client.env.config.ts`** defines and exports the client schema and defaults — only prefixed, browser-safe variables
2. **`server.env.config.ts`** imports the client schema/defaults and extends them with server-only variables (secrets, internal services)
3. Frameworks like Next.js and Vite strip unprefixed env vars from the client bundle, so the client schema naturally contains only public vars — making it the right base for composition

## Usage

```bash
# Validate server config
envictus check -c examples/composition/server.env.config.ts

# Validate client config
envictus check -c examples/composition/client.env.config.ts

# Run with server config
envictus -c examples/composition/server.env.config.ts -- node server.js

# Run with client config (e.g., for a build step)
envictus -c examples/composition/client.env.config.ts -- next build
```

## Programmatic usage

```ts
import { getEnv } from "envictus";
import clientConfig from "./client.env.config.js";
import serverConfig from "./server.env.config.js";

// Each config resolves independently with full type safety
const clientEnv = await getEnv(clientConfig);
//    ^? { NEXT_PUBLIC_APP_ENV: ..., NEXT_PUBLIC_API_URL: ..., ... }

const serverEnv = await getEnv(serverConfig);
//    ^? { NEXT_PUBLIC_APP_ENV: ..., NEXT_PUBLIC_API_URL: ..., LOG_LEVEL: ..., DATABASE_URL: ..., ... }
```
