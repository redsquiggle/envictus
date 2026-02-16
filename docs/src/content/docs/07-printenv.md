---
title: Printing Environment Variables
slug: printenv
sidebar:
  order: 7
---

Use `envictus printenv` to output the resolved environment variables to stdout. This is useful for piping to other tools:

```bash
# Print in dotenv format (default)
envictus printenv

# Print in JSON format
envictus printenv --format json
envictus printenv -f json

# Pipe to wrangler secret bulk
envictus printenv | wrangler secret bulk

# Pipe to other tools
envictus printenv -f json | jq '.DATABASE_URL'
```
