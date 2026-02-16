### Config Path in package.json

Instead of passing `--config` every time, you can set the config path in your `package.json`:

```json
{
  "name": "my-app",
  "envictus": {
    "configPath": "./config/env.config.ts"
  }
}
```

The CLI resolves the config path in this order:
1. `--config` flag (highest priority)
2. `package.json` `envictus.configPath`
3. `env.config.ts` in current directory (default)
