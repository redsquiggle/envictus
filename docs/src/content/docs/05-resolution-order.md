---
title: Resolution Order
slug: resolution-order
sidebar:
  order: 5
---

Environment variables are resolved in this order (lowest to highest priority):

1. Schema `.default()` values
2. Environment-specific defaults (from `config.defaults[mode]`)
3. `process.env` (actual environment variables)
