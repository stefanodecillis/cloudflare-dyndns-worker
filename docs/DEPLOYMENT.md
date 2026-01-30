# Deployment Guide

This guide covers deploying Cloudflare DynDNS Worker on various platforms.

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [NAS Deployment](#nas-deployment)
- [VPS/Cloud Deployment](#vpscloud-deployment)
- [Local Development](#local-development)
- [Configuration Best Practices](#configuration-best-practices)

## Docker Deployment

### Pulling the Image

```bash
docker pull yourusername/cloudflare-dyndns-worker:latest
```

### Running with Environment Variables

```bash
docker run -d \
  --name cloudflare-dyndns \
  --restart unless-stopped \
  -e CLOUDFLARE_API_TOKEN=your_token \
  -e CLOUDFLARE_ZONES='[{"zoneId":"abc123","domain":"example.com","records":[{"name":"example.com","type":"A"}]}]' \
  yourusername/cloudflare-dyndns-worker:latest
```

### Using Docker Compose

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Edit `.env` with your configuration
4. Run `docker compose up -d`

### Viewing Logs

```bash
# Live logs
docker logs -f cloudflare-dyndns

# Docker Compose logs
docker compose logs -f

# Last 100 lines
docker logs --tail 100 cloudflare-dyndns
```

### Stopping and Restarting

```bash
# Stop
docker stop cloudflare-dyndns

# Start
docker start cloudflare-dyndns

# Restart
docker restart cloudflare-dyndns

# Remove container
docker rm cloudflare-dyndns
```

## NAS Deployment

### Synology

1. Install Docker application from Package Center
2. SSH into Synology NAS
3. Create project directory:
   ```bash
   mkdir -p /volume1/docker/cloudflare-dyndns
   cd /volume1/docker/cloudflare-dyndns
   ```
4. Create `docker-compose.yml` (see repository)
5. Create `.env` with your configuration
6. Run:
   ```bash
   docker compose up -d
   ```
7. Verify in Docker application

### QNAP

1. Install Container Station from App Center
2. Create new container
3. Set image: `yourusername/cloudflare-dyndns-worker:latest`
4. Add environment variables
5. Configure resource limits
6. Start container

### TrueNAS

1. Install "Docker" plugin in Apps
2. Click "Launch Docker Image"
3. Image name: `yourusername/cloudflare-dyndns-worker:latest`
4. Configure environment variables
5. Set resource limits
6. Start

### Asustor (ASUSTOR)

1. Install Docker from App Central
2. Create container using GUI
3. Set image and environment variables
4. Configure volume mounts (optional)
5. Start container

## VPS/Cloud Deployment

### DigitalOcean

1. Create Droplet (Ubuntu 20.04+ recommended)
2. SSH into droplet
3. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```
4. Deploy worker:
   ```bash
   git clone https://github.com/yourusername/cloudflare-dyndns-worker.git
   cd cloudflare-dyndns-worker
   cp .env.example .env
   nano .env
   docker compose up -d
   ```

### AWS EC2

1. Launch t3.nano or t3.micro instance (Amazon Linux 2)
2. Connect via SSH
3. Install Docker
4. Clone repository and deploy (see DigitalOcean above)
5. Configure Security Group: Allow outbound traffic (no inbound needed)

### Google Cloud Platform

1. Create e2-micro instance (Debian/Ubuntu)
2. SSH into instance
3. Install Docker
4. Deploy using Docker Compose

### Azure

1. Create B1s virtual machine (Ubuntu)
2. Connect via SSH
3. Install Docker
4. Deploy using Docker Compose

## Local Development

### Prerequisites

- Node.js 20+
- npm or yarn
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/cloudflare-dyndns-worker.git
cd cloudflare-dyndns-worker

# Install dependencies
npm install

# Copy example config
cp .env.example .env

# Edit configuration
nano .env

# Build
npm run build

# Run
npm start
```

### Development Mode

```bash
# Build and run (development)
npm run dev
```

## Configuration Best Practices

### API Token Permissions

**Recommended Permissions:**
- Zone - DNS - Edit (required)
- Zone - Zone - Read (required)

**Include:** Specific zone(s) only (not "All zones") for security

### Zone Configuration

**Use Specific Zone IDs:**
- Go to Cloudflare Dashboard → Domain → Overview
- Copy Zone ID from right sidebar
- More reliable than domain names

**Record Names:**
- Use full domain names: `www.example.com`
- Not: `www` (Cloudflare expects full name)

### Intervals

**Recommended Settings:**
- `IP_CHECK_INTERVAL`: 60 seconds (1 minute)
- `SYNC_INTERVAL`: 300 seconds (5 minutes)

**Considerations:**
- Lower intervals = faster updates but more API calls
- Cloudflare free tier: 1,200 requests/day (plenty for this)
- Minimum allowed: 10 seconds

### Resource Limits

**For NAS:**
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 128M
    reservations:
      cpus: '0.1'
      memory: 32M
```

**For VPS:**
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 256M
```

### Logging

**Recommended:**
- Keep logs for debugging
- Rotate logs to prevent disk fill
- Monitor logs for errors

**Docker Compose:**
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Security

**Best Practices:**

1. **Never commit secrets** to version control
   - Use `.env` files (add to `.gitignore`)
   - Use secrets management (Docker secrets, GitHub Secrets, etc.)

2. **Use specific API tokens** with minimal permissions
   - Don't use account-wide tokens
   - Scope to specific zones

3. **Run as non-root user** (Docker container does this)
   - Reduces attack surface
   - Prevents privilege escalation

4. **No exposed ports**
   - Worker is outbound-only
   - No network attack surface

5. **Regular updates**
   - Pull latest Docker image regularly
   - Monitor for security updates

### High Availability

**Multiple Instances:**

Run multiple workers for redundancy:
```bash
# Instance 1 (primary)
docker run -d --name dyndns-1 -e CLOUDFLARE_API_TOKEN=... worker-image

# Instance 2 (backup, different host)
# (same configuration on different server)
```

**Load Balancing:**

Not needed - workers are independent and stateless.

### Monitoring

**Health Checks:**

Monitor logs for:
- Successful updates (look for "record(s) updated")
- Errors (look for [ERROR] tags)
- Stale sync warnings (>1 hour since last success)

**Alerts:**

Set up alerts for:
- Container crashes
- High error rates
- Stale sync (>24 hours)

## Troubleshooting

### Container Won't Start

1. Check logs: `docker logs cloudflare-dyndns`
2. Verify environment variables: Are they set correctly?
3. Validate JSON: Is `CLOUDFLARE_ZONES` valid JSON?
4. Check API token: Does it have correct permissions?

### DNS Not Updating

1. Verify zone ID: Matches Cloudflare dashboard
2. Check record name: Full domain name (e.g., "www.example.com")
3. Review logs: Any errors during update?
4. Test API: Try updating manually via Cloudflare dashboard

### High Memory Usage

1. Check for memory leaks: Restart container
2. Review resource limits: Increase if needed
3. Monitor logs: Excessive errors?
4. Check Docker stats: `docker stats`

### Network Issues

1. Test connectivity: `curl -I https://api.cloudflare.com`
2. Check DNS: `nslookup example.com`
3. Verify firewall: Allow outbound traffic
4. Check proxy: If behind proxy, configure accordingly

## Backup and Recovery

### Backup Configuration

Save `.env` file securely:
```bash
cp .env .env.backup
```

### Restore Configuration

```bash
# Restore from backup
cp .env.backup .env

# Restart container
docker compose restart
```

### Configuration Migration

When moving to new host:
1. Copy `.env` file
2. Update host-specific settings (if any)
3. Deploy using same steps
4. Verify DNS updates work

## Performance Tuning

### Optimization Tips

1. **Reduce API Calls**: Lower `SYNC_INTERVAL` only if IP changes frequently
2. **Use Record IDs**: Add `id` to record config for faster lookups
3. **Monitor Resources**: Adjust limits based on actual usage
4. **Log Rotation**: Prevent disk fill with old logs

### Scaling

**Single Instance:** Handles unlimited zones/records (Cloudflare API limit: 1,200 req/day)

**Multiple Instances:** Run multiple workers on different hosts for redundancy

**Load Balancing:** Not needed - workers are stateless and independent

---

For additional help, see [README.md](README.md) or [open an issue](https://github.com/yourusername/cloudflare-dyndns-worker/issues).
