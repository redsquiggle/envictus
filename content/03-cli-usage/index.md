## CLI Usage

```bash
# Run a command with validated env
envictus -- <command>

# Custom config path
envictus -c ./config/env.ts -- node server.js
envictus --config ./config/env.ts -- node server.js

# Skip validation (just merge and inject)
envictus --no-validate -- npm run dev

# Validate without running a command
envictus check

# Print resolved environment to stdout
envictus printenv
envictus printenv --format json

# Scaffold a new config file
envictus init
envictus init ./config/env.config.ts
```
