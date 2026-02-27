# Groups Example

Demonstrates cascading sub-discriminators with `groups`. Each group is a regular `defineConfig` that resolves independently with its own discriminator and defaults, while inheriting the parent's mode as a fallback.

## Structure

```
stripe.env.config.ts  # Stripe config — works standalone or as a group
env.config.ts         # Root config — composes Stripe as a group
```

## How it works

1. **`stripe.env.config.ts`** defines a standalone Stripe config with its own discriminator (`STRIPE_ENV`) and per-environment defaults
2. **`env.config.ts`** imports the Stripe config and passes it as a group — no wrapper function needed, just `groups: { stripe }`
3. When `STRIPE_ENV` is set, the group uses that mode. When unset, it cascades to the root's resolved `APP_ENV` mode

## Usage

```bash
# Everything uses development defaults
APP_ENV=development envictus -- node server.js

# App is development, but Stripe uses production keys
APP_ENV=development STRIPE_ENV=production envictus -- node server.js

# Validate all schemas (root + groups)
APP_ENV=development envictus check

# Validate with mixed modes
APP_ENV=development STRIPE_ENV=production envictus check
```

## Programmatic usage

The `.env` property nests group outputs under their key:

```ts
import config from "./env.config.js";

const env = await config.env;

// Root fields — flat access
env.PORT;          // number
env.DATABASE_URL;  // string
env.LOG_LEVEL;     // "debug" | "info" | "warn" | "error"

// Group fields — namespaced
env.stripe.STRIPE_SECRET_KEY;      // string
env.stripe.STRIPE_WEBHOOK_SECRET;  // string
env.stripe.STRIPE_PUBLISHABLE_KEY; // string
```

## Standalone usage

Each group config works on its own too:

```ts
import { stripe } from "./stripe.env.config.js";

const stripeEnv = await stripe.env;
stripeEnv.STRIPE_SECRET_KEY; // string
```
