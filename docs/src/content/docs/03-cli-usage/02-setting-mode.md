---
title: Setting the Environment Mode
slug: cli-usage/setting-mode
sidebar:
  order: 2
---

The discriminator value (e.g., `NODE_ENV`) is read from the environment:

```bash
# Development (default)
envictus -- npm run dev

# Production
NODE_ENV=production envictus -- node dist/server.js

# Or export it
export NODE_ENV=production
envictus -- node dist/server.js
```
