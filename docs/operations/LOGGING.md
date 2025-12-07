# Logging Guide

## Overview

The application uses Winston for logging with support for console and file logging.

## Environment Variables

```env
# Log level: error, warn, info, debug
LOG_LEVEL=info

# Enable request logging
LOG_REQUESTS=true

# Enable response logging (can be verbose)
LOG_RESPONSES=false

# Enable file logging (default: true in production, false in development)
ENABLE_FILE_LOGGING=true

# Log directory (default: ./logs)
LOG_DIR=./logs
```

## Log Levels

- **error** (0) - Only errors
- **warn** (1) - Warnings + errors
- **info** (2) - Info + warnings + errors (recommended for production)
- **debug** (3) - All logs (development only)

## Checking Logs in Production

### Method 1: File Logs (Recommended)

Logs are written to files in the `./logs` directory:

```bash
# View all logs
tail -f logs/combined.log

# View only errors
tail -f logs/error.log

# Search logs
grep "ERROR" logs/combined.log

# View last 100 lines
tail -n 100 logs/combined.log

# Follow logs in real-time
tail -f logs/combined.log | jq  # If using JSON format
```

### Method 2: PM2 Logs (If using PM2)

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs alhomaidhi_whatsapp_bot

# View last 100 lines
pm2 logs --lines 100

# Clear logs
pm2 flush
```

### Method 3: Docker Logs (If containerized)

```bash
# View logs
docker logs <container-name>

# Follow logs
docker logs -f <container-name>

# View last 100 lines
docker logs --tail 100 <container-name>

# View logs with timestamps
docker logs -t <container-name>
```

### Method 4: Systemd Journal (If using systemd)

```bash
# View logs
journalctl -u your-service-name

# Follow logs
journalctl -u your-service-name -f

# View last 100 lines
journalctl -u your-service-name -n 100

# View logs from today
journalctl -u your-service-name --since today
```

### Method 5: Log Aggregation Services

For production, consider using:
- **CloudWatch** (AWS)
- **Datadog**
- **Sentry**
- **Loggly**
- **Papertrail**

## Log File Structure

```
logs/
├── combined.log    # All logs (info, warn, error, debug)
└── error.log      # Only errors
```

Log files are automatically rotated:
- Max size: 10MB per file
- Max files: 5 (keeps last 5 files)
- Format: JSON in production, readable in development

## Log Format

### Development (Console)
```
2024-01-15 10:30:45 [info]: Server started on port 3000
```

### Production (JSON)
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Server started on port 3000",
  "port": 3000,
  "env": "production"
}
```

## Usage Examples

```typescript
import { logger, logError, logInfo } from "./utils/logger.js";

// Basic logging
logger.info("Message sent successfully");
logger.error("Failed to send message");

// With context
logInfo("User action", { userId: "123", action: "login" });
logError(error, { context: "payment processing" });
```

## Best Practices

1. **Production**: Use `LOG_LEVEL=info` or `LOG_LEVEL=warn`
2. **Development**: Use `LOG_LEVEL=debug` for detailed logging
3. **File Logging**: Always enable in production (`ENABLE_FILE_LOGGING=true`)
4. **Response Logging**: Keep `LOG_RESPONSES=false` unless debugging
5. **Log Rotation**: Configured automatically (10MB, 5 files)
6. **Error Tracking**: Monitor `logs/error.log` for critical issues

## Monitoring Logs

### Real-time Monitoring

```bash
# Watch combined logs
watch -n 1 'tail -n 20 logs/combined.log'

# Monitor errors only
tail -f logs/error.log | grep ERROR
```

### Log Analysis

```bash
# Count errors
grep -c "ERROR" logs/combined.log

# Find specific errors
grep "payment" logs/error.log

# Extract unique error messages
grep "ERROR" logs/combined.log | jq -r '.message' | sort | uniq
```

## Troubleshooting

### Logs not appearing?

1. Check `LOG_LEVEL` - might be too restrictive
2. Check `ENABLE_FILE_LOGGING` - should be `true` in production
3. Check `LOG_DIR` - ensure directory exists and is writable
4. Check file permissions - logs directory needs write access

### Too many logs?

1. Increase `LOG_LEVEL` (e.g., `warn` instead of `info`)
2. Set `LOG_REQUESTS=false`
3. Set `LOG_RESPONSES=false`

### Log files too large?

Log rotation is automatic (10MB per file, 5 files max). If you need different settings, modify `src/utils/logger.ts`.

