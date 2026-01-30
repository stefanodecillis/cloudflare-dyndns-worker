# Frequently Asked Questions

## General Questions

**Q: What is Cloudflare DynDNS Worker?**
A: A lightweight worker that automatically updates your Cloudflare DNS records when your public IP changes. It runs continuously and keeps your DNS up-to-date without manual intervention.

**Q: Why use this instead of other DynDNS solutions?**
A:
- **Open Source**: Fully auditable and modifiable
- **Lightweight**: Minimal resource usage (~32MB RAM)
- **No Dependencies**: Uses built-in Node.js features
- **Cloudflare Native**: Direct Cloudflare API integration
- **Containerized**: Easy deployment on NAS, VPS, etc.
- **Multi-Arch**: Supports both Intel/AMD and ARM (Raspberry Pi)

**Q: What are the system requirements?**
A:
- **Runtime**: Node.js 20+
- **Docker**: Docker 20.10+ (for containerized deployment)
- **Network**: Outbound internet access
- **Resources**: ~32MB RAM, <0.1 CPU (idle)

**Q: Does it work with IPv6?**
A: Yes! Configure record type as "AAAA" for IPv6 addresses. The worker automatically detects IPv6 when configured for AAAA records.

**Q: Can I update multiple domains?**
A: Yes! Include multiple zone objects in `CLOUDFLARE_ZONES`. Each zone can have multiple records.

## Configuration

**Q: How often does it check for IP changes?**
A: Default is every 60 seconds (`IP_CHECK_INTERVAL=60`). Configure this environment variable to change the frequency.

**Q: How often does it update DNS?**
A: Only when your IP actually changes! This avoids unnecessary API calls. DNS is also checked every `SYNC_INTERVAL` (default: 300 seconds = 5 minutes) for consistency.

**Q: What if my IP doesn't change?**
A: The worker detects IP, compares with DNS record, and skips the update if identical. No API calls are made to Cloudflare.

**Q: Can I set different intervals for different zones?**
A: Currently, intervals are global for all zones. If you need per-zone intervals, run multiple workers with different configurations.

**Q: How do I find my Zone ID?**
A:
1. Go to https://dash.cloudflare.com
2. Click on your domain
3. On the right sidebar, look for "Zone ID"
4. Click to copy

**Q: What permissions does the API token need?**
A:
- Zone - DNS - Edit (required)
- Zone - Zone - Read (required)

Scope to specific zones for security (not "All zones").

**Q: Can I use record IDs instead of names?**
A: Yes! Include the `id` field in your record configuration:
```json
{
  "id": "record_id_here",
  "name": "example.com",
  "type": "A"
}
```
This is faster but optional.

**Q: What's the difference between API Token and Legacy Auth?**
A:
- **API Token** (Recommended): Created from Cloudflare dashboard, more secure, fine-grained permissions
- **Legacy Auth** (Email + API Key): Older method, uses global API key with full account access

## Deployment

**Q: Can I run without Docker?**
A: Yes! Build with `npm run build` and run `node dist/index.js` with environment variables set.

**Q: Will it work on Raspberry Pi?**
A: Yes! The Docker image supports ARM64 architecture for Raspberry Pi 4+.

**Q: Can I run multiple instances?**
A: Yes! Run multiple workers for redundancy on different hosts. They're stateless and independent.

**Q: How do I update to the latest version?**
A:
```bash
# Docker
docker pull ghcr.io/stefanodecillis/cloudflare-dyndns-worker:latest
docker stop cloudflare-dyndns
docker rm cloudflare-dyndns
# Run again with same command

# Docker Compose
docker compose pull
docker compose up -d
```

**Q: Does it need to run as root?**
A: No! The Docker container runs as non-root user (nodejs:1001) for security.

**Q: What ports need to be open?**
A: None! The worker is outbound-only (doesn't listen for connections). Only needs outbound internet access.

## Operation

**Q: How much CPU/memory does it use?**
A:
- **Idle**: ~0.1 CPU, ~32MB RAM
- **Peak** (during DNS update): ~0.5 CPU, ~64MB RAM

**Q: What happens when Cloudflare API is down?**
A: The worker retries with exponential backoff (1s, 2s, 4s) and logs errors. It continues checking and will update when Cloudflare recovers.

**Q: What happens if there are network issues?**
A: Network errors trigger automatic retries. If issues persist for 10 consecutive checks, the worker exits to prevent getting stuck.

**Q: How do I know if it's working?**
A: Check logs for:
```
[timestamp] [INFO] DNS Check #1
---
[timestamp] [INFO] 1 record(s) updated
[timestamp] [INFO] Next check in 60s (...)
```

**Q: What happens during a graceful shutdown?**
A: The worker:
1. Stops accepting new checks
2. Waits for in-progress operations
3. Logs final statistics
4. Exits cleanly with code 0

**Q: Can I see what IP it detected?**
A: Yes! Logs show detected IP when updates occur:
```
[timestamp] [INFO] example.com: example.com → 1.2.3.4
```

**Q: Does it work with Cloudflare Proxy?**
A: Yes! It preserves existing proxy settings when updating DNS records.

## Troubleshooting

**Q: Container won't start - what should I do?**
A:
1. Check logs: `docker logs cloudflare-dyndns`
2. Verify environment variables: Are they set correctly?
3. Validate JSON: Is `CLOUDFLARE_ZONES` valid JSON?
4. Check API token: Does it have correct permissions?

**Q: DNS not updating - why?**
A:
1. Check logs for errors
2. Verify zone ID matches Cloudflare dashboard
3. Ensure record name is full domain (e.g., "www.example.com")
4. Confirm API token has "Zone - DNS - Edit" permission
5. Test manual update via Cloudflare dashboard

**Q: Getting 401/403 errors - what's wrong?**
A:
- **401 Unauthorized**: API token is invalid or expired
- **403 Forbidden**: Token lacks required permissions

Fix: Create new API token with correct permissions.

**Q: Connection errors - what to check?**
A:
1. Test connectivity: `curl -I https://api.cloudflare.com`
2. Check DNS: `nslookup api.cloudflare.com`
3. Verify firewall: Allow outbound traffic
4. Check proxy: If behind proxy, may need configuration

**Q: IP not detected - why?**
A:
1. Different providers: Worker uses multiple with automatic fallback
2. IPv6 vs IPv4: Ensure record type matches network
3. Network: Check firewall rules allow outbound
4. Try different `IP_CHECK_INTERVAL`: May be rate-limited

**Q: High error rate - what's happening?**
A:
1. Check logs: Are errors consistent or intermittent?
2. Network issues: May affect connectivity
3. API limits: Reduce `IP_CHECK_INTERVAL`
4. Configuration: Verify zone IDs, record names, API token

## Security

**Q: Is my API token safe?**
A: Yes! Store in environment variables, never commit to version control. Docker secrets management is recommended.

**Q: Can someone steal my API token?**
A: Only if they have access to your environment variables, Docker secrets, or the host system. Keep these secure.

**Q: Does it expose any ports?**
A: No! The worker is outbound-only and doesn't listen for connections.

**Q: Is the Docker image scanned for vulnerabilities?**
A: Yes! GitHub Actions runs Trivy scanner on every publish. Critical and HIGH severity vulnerabilities block deployment.

## Advanced

**Q: Can I customize the IP detection providers?**
A: Currently, providers are hardcoded for reliability. Future versions may allow customization.

**Q: Can I add logging to a file?**
A: Use Docker logging configuration or redirect stdout:
```bash
docker run -d -v /path/to/logs:/app/logs worker-image
```

**Q: Can I run it as a systemd service?**
A: Yes! Create a systemd unit file pointing to `node dist/index.js` with environment variables.

**Q: Can I integrate with monitoring tools?**
A: Yes! Parse logs or add health check endpoints. Logs are structured with timestamps and levels.

**Q: What's the Cloudflare API rate limit?**
A: Free tier allows 1,200 requests/day. This worker uses ~2,880 requests/day (60s interval), so consider using a Cloudflare account or reducing check frequency.

## Comparison

**Q: How does this compare to ddclient?**
A:
- **Cloudflare DynDNS Worker**: Modern, containerized, TypeScript, easy configuration
- **ddclient**: Mature, supports many providers, CLI-based, harder to configure

**Q: How does this compare to ddns-updater?**
A:
- **Cloudflare DynDNS Worker**: Cloudflare-specific, lighter, Docker-first
- **ddns-updater**: Multi-provider, Python-based, more features but heavier

## Support

**Q: Where can I get help?**
A:
- 📖 [Documentation](README.md)
- 📖 [Deployment Guide](docs/DEPLOYMENT.md)
- 🐛 [Issues](https://github.com/stefanodecillis/cloudflare-dyndns-worker/issues)
- 💬 [Discussions](https://github.com/stefanodecillis/cloudflare-dyndns-worker/discussions)

**Q: How can I contribute?**
A: See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We welcome bug reports, feature requests, and code contributions!

**Q: Is this officially supported by Cloudflare?**
A: No, this is an independent open-source project. It uses Cloudflare's public API but is not affiliated with Cloudflare.

---

Still have questions? [Open an issue](https://github.com/stefanodecillis/cloudflare-dyndns-worker/issues)!
