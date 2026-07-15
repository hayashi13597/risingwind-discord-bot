# Deployment Cleanup Guide

## Problem
The GVG ping notification fires twice because two bot processes run concurrently.

## Source 1: Stale VPS PM2 process

The GitHub Actions CI/CD workflow (`.github/workflows/ci-cd.yml`) deploys to VPS
via SSH + PM2. If you migrated to Railway but didn't stop the VPS PM2 process,
both VPS and Railway run the bot with the same Discord token.

### Check
SSH into VPS and run:
```bash
pm2 list
```
If you see `risingwind-bot` running, that's the stale process.

### Fix
```bash
pm2 delete risingwind-bot
pm2 save
```

### Prevent re-spawn
Disable the deploy job in `.github/workflows/ci-cd.yml`:
```yaml
deploy:
  if: false  # disabled — using Railway now
```

## Source 2: Railway replicas

### Check
Go to Railway dashboard → your service → Settings → Replicas.
Should be `1`.

### Fix
If replicas > 1, set to `1`.

## Source 3: Railway rolling deploy overlap

During deploy, Railway starts the new instance before the old one stops.
If the ping fires during this overlap window, both instances send.

The Discord-side dedup fix (checking channel's last message before sending)
handles this automatically — the second instance will see the first's message
and skip.

## Verification
After cleanup, check Railway logs at the next scheduled ping time.
You should see exactly one "Sent scheduled @everyone ping" log line.
