# Manual Testing Checklist

This checklist ensures the Cloudflare DynDNS Worker is production-ready and works correctly in various scenarios.

## Pre-Deployment Checklist

- [ ] **Configuration**
  - [ ] All environment variables set correctly
  - [ ] API token has correct permissions (Zone DNS Edit, Zone Read)
  - [ ] Zone IDs match Cloudflare dashboard
  - [ ] Record names are full domain names (e.g., "www.example.com")
  - [ ] Record types match network (A for IPv4, AAAA for IPv6)
  - [ ] Intervals are >= 10 seconds

- [ ] **Docker**
  - [ ] Dockerfile builds successfully: `docker build -t test .`
  - [ ] Image runs without errors: `docker run --rm test`
  - [ ] Resource limits configured (optional but recommended)

- [ ] **Code Quality**
  - [ ] TypeScript compiles without errors: `npm run build`
  - [ ] Linting passes (if configured)
  - [ ] No console errors during startup
  - [ ] No unhandled exceptions

## Functional Testing

### 1. Startup Verification

- [ ] **Clean Startup**
  ```bash
  docker run --rm -e CLOUDFLARE_API_TOKEN=... -e CLOUDFLARE_ZONES=... worker-image
  ```
  Expected output:
  - [ ] Startup banner displayed
  - [ ] Configuration summary shown (zones, records, intervals)
  - [ ] No errors in startup

- [ ] **Initial Sync**
  Expected output:
  - [ ] First DNS check runs immediately
  - [ ] IP is detected successfully
  - [ ] DNS records are checked/updated
  - [ ] Summary displayed (updates, errors, skipped)

### 2. IP Change Detection

- [ ] **IPv4 Update**
  Steps:
  1. Set record IP to a known value in Cloudflare dashboard
  2. Start worker
  3. Verify worker detects different IP
  4. Verify DNS record is updated
  Expected:
  - [ ] Worker detects IP change
  - [ ] DNS record updated in Cloudflare
  - [ ] Log shows "X record(s) updated"
  - [ ] New IP matches current public IP

- [ ] **No Update (IP Unchanged)**
  Steps:
  1. Set DNS record to current public IP in Cloudflare dashboard
  2. Start worker
  3. Wait for one check cycle
  Expected:
  - [ ] Worker compares IPs
  - [ ] No API call to update DNS
  - [ ] Log shows "X record(s) unchanged"
  - [ ] No unnecessary DNS updates

- [ ] **IPv6 Update** (if supported)
  Steps:
  1. Configure AAAA record in Cloudflare
  2. Start worker with IPv6 record in config
  3. Verify IPv6 is detected and updated
  Expected:
  - [ ] Worker detects IPv6 address
  - [ ] DNS AAAA record updated
  - [ ] Log shows update with IPv6 address

### 3. Multiple Zones

- [ ] **Multiple Zone Updates**
  Configuration: 2+ zones in CLOUDFLARE_ZONES
  Expected:
  - [ ] All zones are processed
  - [ ] Records in each zone are checked
  - [ ] Changes in any zone trigger updates
  - [ ] Log shows updates per zone

- [ ] **Zone Isolation**
  Steps:
  1. Configure zone 1 with correct credentials
  2. Configure zone 2 with invalid credentials (intentionally wrong)
  3. Start worker
  Expected:
  - [ ] Zone 1 updates successfully
  - [ ] Zone 2 shows errors
  - [ ] Zone 1 continues working (zone 2 doesn't block it)
  - [ ] Errors are logged with zone context

### 4. Error Handling

- [ ] **Network Timeout**
  Steps:
  1. Temporarily block outbound traffic (firewall)
  2. Start worker
  3. Observe behavior
  Expected:
  - [ ] Worker retries with exponential backoff
  - [ ] Logs show retry attempts (1s, 2s, 4s)
  - [ ] Doesn't crash immediately
  - [ ] Continues retrying after timeout

- [ ] **API Rate Limit**
  Steps:
  1. Set low IP_CHECK_INTERVAL (e.g., 1 second)
  2. Start worker
  3. Observe rate limiting behavior
  Expected:
  - [ ] Worker handles 429 errors
  - [ ] Retries with exponential backoff
  - [ ] Logs rate limit errors clearly
  - [ ] Doesn't crash

- [ ] **Authentication Error**
  Steps:
  1. Use invalid API token
  2. Start worker
  3. Observe behavior
  Expected:
  - [ ] 401/403 error logged
  - [ ] Clear error message ("Authentication error")
  - [ ] Worker exits (doesn't retry auth errors)
  - [ ] Helpful error message for user

- [ ] **Missing DNS Record**
  Steps:
  1. Configure zone with non-existent record
  2. Start worker
  3. Observe behavior
  Expected:
  - [ ] Error logged: "DNS record not found"
  - [ ] Worker continues processing other records
  - [ ] Error doesn't crash worker

### 5. Graceful Shutdown

- [ ] **SIGTERM (docker stop)**
  Steps:
  1. Start worker
  2. Run: `docker stop <container_name>`
  Expected:
  - [ ] Shutdown signal received
  - [ ] "Shutting down gracefully..." message
  - [ ] Final statistics displayed
  - [ ] Clean exit (code 0)
  - [ ] No orphaned processes

- [ ] **SIGINT (Ctrl+C)**
  Steps:
  1. Start worker
  2. Press Ctrl+C
  Expected:
  - [ ] Shutdown signal received
  - [ ] "Shutting down gracefully..." message
  - [ ] Final statistics displayed
  - [ ] Clean exit (code 0)

- [ ] **Consecutive Errors**
  Steps:
  1. Configure invalid API token
  2. Set low IP_CHECK_INTERVAL (10s)
  3. Start worker
  4. Observe behavior over time
  Expected:
  - [ ] Error count increments each check
  - [ ] Logs show "Consecutive errors: N/10"
  - [ ] After 10 errors, worker exits
  - [ ] Clear error message about too many failures

### 6. Logging

- [ ] **Timestamp Format**
  Expected:
  - [ ] All logs have ISO timestamps
  - [ ] Format: "YYYY-MM-DD HH:MM:SS"
  - [ ] Timezone consistent (UTC)

- [ ] **Log Levels**
  Expected:
  - [ ] INFO logs for normal operations
  - [ ] WARN logs for recoverable errors
  - [ ] ERROR logs for failures
  - [ ] Clear level prefixes in logs

- [ ] **Log Content**
  Expected:
  - [ ] Zone names in logs
  - [ ] Record names in logs
  - [ ] IP addresses in logs
  - [ ] Error details in logs
  - [ ] No sensitive data (API tokens) in logs

### 7. Long-Running Stability

- [ ] **24-Hour Run**
  Steps:
  1. Start worker with valid configuration
  2. Let run for 24 hours
  3. Monitor logs and resource usage
  Expected:
  - [ ] No crashes
  - [ ] No memory leaks (memory stable)
  - [ ] Periodic checks continue
  - [ ] Logs are manageable (rotated)
  - [ ] Resource usage minimal and stable

- [ ] **IP Changes Over Time**
  Steps:
  1. Start worker
  2. Wait for IP to change naturally (or force change)
  3. Verify detection and update
  Expected:
  - [ ] IP changes detected
  - [ ] DNS updated promptly
  - [ ] Log shows update details
  - [ ] Worker continues running

## Docker-Specific Testing

### 8. Multi-Architecture

- [ ] **amd64 Image**
  Steps:
  1. Pull image: `docker pull ghcr.io/stefanodecillis/cloudflare-dyndns-worker:latest`
  2. Run on x86_64 system
  Expected:
  - [ ] Image pulls successfully
  - [ ] Container starts without errors
  - [ ] Worker runs normally

- [ ] **arm64 Image** (Raspberry Pi)
  Steps:
  1. Pull image (multi-arch)
  2. Run on ARM64 system
  Expected:
  - [ ] Image pulls successfully (arm64 variant)
  - [ ] Container starts without errors
  - [ ] Worker runs normally

### 9. Docker Compose

- [ ] **docker compose up**
  Steps:
  1. Configure docker-compose.yml
  2. Run: `docker compose up -d`
  Expected:
  - [ ] Container starts in detached mode
  - [ ] Logs accessible via `docker compose logs`
  - [ ] Restart policy works

- [ ] **docker compose down**
  Steps:
  1. Run: `docker compose down`
  Expected:
  - [ ] Container stops
  - [ ] Container removed
  - [ ] No error messages

- [ ] **Resource Limits**
  Steps:
  1. Configure limits in docker-compose.yml
  2. Start container
  3. Check usage: `docker stats`
  Expected:
  - [ ] CPU respects limits
  - [ ] Memory respects limits
  - [ ] Worker runs within limits
  - [ ] No OOM (Out of Memory) kills

### 10. Environment Variables

- [ ] **.env File**
  Steps:
  1. Create .env from .env.example
  2. Add to docker-compose.yml: `env_file: .env`
  3. Run: `docker compose up`
  Expected:
  - [ ] Variables loaded from .env
  - [ ] Worker runs correctly
  - [ ] No need to pass vars inline

- [ ] **Docker Secrets**
  Steps (Docker Swarm/Kubernetes):
  1. Create Docker secret
  2. Reference in compose file
  3. Deploy
  Expected:
  - [ ] Secret not visible in logs
  - [ ] Worker authenticates successfully
  - [ ] Secure credential handling

## Integration Testing

### 11. Cloudflare Dashboard Verification

- [ ] **Manual DNS Update**
  Steps:
  1. Worker detects IP change
  2. Check Cloudflare dashboard → DNS
  Expected:
  - [ ] DNS record shows new IP
  - [ ] Proxied status preserved (if applicable)
  - [ ] TTL preserved
  - [ ] Timestamp updated

- [ ] **Multiple Records**
  Steps:
  1. Configure 3+ records per zone
  2. Trigger IP change
  3. Verify all records updated
  Expected:
  - [ ] All records updated
  - [ ] No records missed
  - [ ] Dashboard shows all updated

## Security Testing

### 12. Credential Handling

- [ ] **No Secrets in Logs**
  Steps:
  1. Start worker
  2. Check logs: `docker logs <container_name>`
  Expected:
  - [ ] API token NOT in logs
  - [ ] API key NOT in logs
  - [ ] Email NOT in logs
  - [ ] No sensitive data visible

- [ ] **Non-Root User**
  Steps:
  1. Check container: `docker exec -it <container_name> whoami`
  Expected:
  - [ ] User is "nodejs"
  - [ ] NOT root

## Performance Testing

### 13. Resource Usage

- [ ] **Memory Usage**
  Steps:
  1. Start worker
  2. Monitor: `docker stats`
  Expected:
  - [ ] Memory ~32-64MB (idle)
  - [ ] Memory ~64-128MB (during update)
  - [ ] No memory growth over time (no leaks)

- [ ] **CPU Usage**
  Steps:
  1. Start worker
  2. Monitor: `docker stats`
  Expected:
  - [ ] CPU ~0-5% (idle)
  - [ ] CPU ~10-50% (during DNS update)
  - [ ] Returns to idle after update

- [ ] **Network Usage**
  Steps:
  1. Monitor network during operation
  Expected:
  - [ ] Minimal outbound traffic (only IP checks + DNS updates)
  - [ ] No inbound traffic (outbound-only)
  - [ ] API calls only when IP changes

## Documentation Testing

### 14. README Verification

- [ ] **Quick Start Instructions Work**
  Steps:
  1. Follow README Quick Start exactly
  Expected:
  - [ ] Commands work without modification
  - [ ] Worker starts successfully
  - [ ] Configuration steps are clear

- [ ] **Examples Are Valid**
  Steps:
  1. Copy-paste code examples from README
  2. Verify syntax
  Expected:
  - [ ] JSON examples are valid JSON
  - [ ] Shell commands work
  - [ ] No typos or errors

## Edge Cases

### 15. Special Scenarios

- [ ] **Empty DNS Records** (edge case)
  Steps:
  1. Configure zone with no records (invalid)
  2. Start worker
  Expected:
  - [ ] Validation error on startup
  - [ ] Clear error message
  - [ ] Worker doesn't run

- [ ] **Invalid JSON Configuration**
  Steps:
  1. Set CLOUDFLARE_ZONES to invalid JSON
  2. Start worker
  Expected:
  - [ ] Clear error about invalid JSON
  - [ ] Worker doesn't run
  - [ ] Helpful error message

- [ ] **Network Recovery**
  Steps:
  1. Start worker
  2. Simulate network outage
  3. Restore network
  Expected:
  - [ ] Retries during outage
  - [ ] Continues after recovery
  - [ ] No manual intervention needed

## Sign-Off

**Pre-Deployment:**
- [ ] All pre-deployment items checked
- [ ] No critical issues found
- [ ] Ready for production

**Functional:**
- [ ] IP detection works
- [ ] DNS updates work
- [ ] Error handling works
- [ ] Graceful shutdown works

**Quality:**
- [ ] Logs are clear and useful
- [ ] No memory leaks
- [ ] Resource usage is minimal
- [ ] Security best practices followed

**Documentation:**
- [ ] README is accurate
- [ ] Examples work
- [ ] Configuration is clear

**Overall Production Readiness:**
- [ ] All critical tests passed
- [ ] No blocking issues
- [ ] Ready for deployment

---

## Notes

Document any issues found during testing:
1. Issue description:
   Severity:
   Resolution:

2. Issue description:
   Severity:
   Resolution:

## Tester Information

- Tester Name:
- Date:
- Test Environment (OS, Docker version, Node.js version):
- Cloudflare Account:
- Zones/Records Tested:

---
