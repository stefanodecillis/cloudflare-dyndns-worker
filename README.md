# Cloudflare DynDNS Worker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Multi-arch](https://img.shields.io/badge/arch-amd64%20%7C%20arm64-blue)]()

A lightweight, open-source Cloudflare DynDNS worker that automatically updates DNS records when your public IP changes. Perfect for running on NAS devices or anywhere via Docker.

## ✨ Features

- 🚀 **Lightweight** - Minimal resource usage (~32MB RAM, <0.1 CPU)
- 🔄 **Automatic Updates** - DNS updates only when IP changes
- 📦 **Docker Ready** - Multi-arch support (amd64, arm64)
- 🎯 **Simple Config** - No zone IDs needed, just domain + subdomain
- 🛡️ **Reliable** - Retry logic with exponential backoff
- 🌍 **IPv4 & IPv6** - Support for both A and AAAA records
- 🔐 **Secure** - Non-root user, no exposed ports, minimal dependencies
- 📊 **Detailed Logging** - Timestamps, levels, actionable messages

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name cloudflare-dyndns \
  --restart unless-stopped \
  -e CLOUDFLARE_API_TOKEN=your_api_token_here \
  -e CLOUDFLARE_RECORDS='[{"zone":"stefanodecillis.com","subdomain":"ha-trani","proxy":false}]' \
  cloudflare-dyndns-worker:latest
```

### Using Docker Compose

**Option A: Using .env file (recommended)**

1. Copy `.env.example` to `.env`
2. Edit `.env` with your configuration:
   ```bash
   CLOUDFLARE_API_TOKEN=your_api_token_here
   CLOUDFLARE_RECORDS=[{"zone":"example.com","subdomain":"www","proxy":false},{"zone":"example.com","subdomain":"api","proxy":false}]
   ```
3. Start: `docker compose up -d`

**Option B: Inline in docker-compose.yml**

```yaml
services:
  cloudflare-dyndns:
    image: ghcr.io/stefanodecillis/cloudflare-dyndns-worker:latest
    restart: unless-stopped
    environment:
      CLOUDFLARE_API_TOKEN: your_api_token_here
      CLOUDFLARE_RECORDS: '[{"zone":"example.com","subdomain":"www","proxy":false}]'
```

> **Note:** Wrap JSON in single quotes (`'[...]'`) to avoid YAML parsing issues.

**View logs:**
```bash
docker compose logs -f
```

## ⚙️ Configuration

### Simple Array Format (RECOMMENDED)

**Required:**
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_RECORDS` - JSON array of records to manage

**Optional:**
- `IP_CHECK_INTERVAL` - Seconds between IP checks (default: 60)
- `SYNC_INTERVAL` - Seconds between sync attempts (default: 300)

### Configuration Examples

**Single subdomain:**
```bash
CLOUDFLARE_RECORDS=[{"zone":"stefanodecillis.com","subdomain":"ha-trani","proxy":false}]
```

**Multiple subdomains on same domain:**
```bash
CLOUDFLARE_RECORDS=[
  {"zone":"stefanodecillis.com","subdomain":"ha-trani","proxy":false},
  {"zone":"stefanodecillis.com","subdomain":"immich","proxy":false}
]
```

**Root domain (no subdomain):**
```bash
CLOUDFLARE_RECORDS=[{"zone":"stefanodecillis.com","subdomain":"","proxy":false}]
```

**With Cloudflare proxy enabled:**
```bash
CLOUDFLARE_RECORDS=[{"zone":"stefanodecillis.com","subdomain":"www","proxy":true}]
```

**IPv6 support:**
```bash
CLOUDFLARE_RECORDS=[{"zone":"stefanodecillis.com","subdomain":"ipv6","proxy":false,"type":"AAAA"}]
```

**Multiple domains:**
```bash
CLOUDFLARE_RECORDS=[
  {"zone":"stefanodecillis.com","subdomain":"ha-trani","proxy":false},
  {"zone":"another-domain.com","subdomain":"api","proxy":true}
]
```

### Field Reference

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `zone` | ✅ Yes | Domain name (as shown in Cloudflare) | `"stefanodecillis.com"` |
| `subdomain` | ❌ No | Subdomain prefix or `""` for root | `"ha-trani"` or `""` |
| `proxy` | ❌ No | Cloudflare proxy (true/false, default: false) | `false` |
| `type` | ❌ No | Record type ("A" or "AAAA", default: "A") | `"A"` |

### Getting Your API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template "Edit Zone DNS" or create custom with:
   - **Zone - DNS - Edit** (required for updating records)
   - **Zone - Zone - Read** (required for finding your zones)
   - Include: All zones (or specific zones)
4. Copy the token

**No Zone IDs Needed!** The worker automatically finds your zones by domain name.

## 🔧 How It Works

1. **Startup** - Queries Cloudflare API to find your zones by domain name
2. **IP Detection** - Detects your current public IP using multiple providers (ipify, icanhazip, AWS)
3. **Comparison** - Compares current IP with DNS record
4. **Update** - Updates DNS only when IP has changed (saves API calls)
5. **Loop** - Repeats every `IP_CHECK_INTERVAL` seconds
6. **Error Handling** - Retries on transient errors with exponential backoff (1s, 2s, 4s)

## 🐳 Docker Deployment

### Build from Source

```bash
git clone https://github.com/stefanodecillis/cloudflare-dyndns-worker.git
cd cloudflare-dyndns-worker
docker build -t cloudflare-dyndns-worker .
```

### Multi-Architecture Support

The Docker image supports:
- **linux/amd64** - Intel/AMD 64-bit (servers, desktops, VPS)
- **linux/arm64** - ARM64 devices (Raspberry Pi 4+, NAS with ARM)

### Resource Requirements

- **CPU**: ~0.1 cores idle, ~0.5 cores during updates
- **Memory**: ~32-64MB
- **Network**: Outbound only (no exposed ports)

## 💻 Local Development

```bash
# Clone repository
git clone https://github.com/stefanodecillis/cloudflare-dyndns-worker.git
cd cloudflare-dyndns-worker

# Install dependencies
npm install

# Copy and configure .env
cp .env.example .env
# Edit .env with your configuration

# Build
npm run build

# Run
npm start
```

## 🔍 Troubleshooting

### Container won't start

Check logs:
```bash
docker logs cloudflare-dyndns
```

Common issues:
- Invalid JSON in `CLOUDFLARE_RECORDS`
- API token missing or invalid
- Zone not found in Cloudflare account

### DNS not updating

1. Check logs for errors
2. Verify zone name matches Cloudflare Dashboard exactly
3. Ensure API token has "Zone - DNS - Edit" permission
4. Check if record exists in Cloudflare (worker will error if record not found)

### Zone not found error

The worker searches for zones by domain name. Ensure:
- Domain name matches exactly (case-sensitive)
- API token has "Zone - Zone - Read" permission
- Domain is in your Cloudflare account

## 📖 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Detailed deployment instructions for NAS, VPS, and more
- [FAQ](docs/FAQ.md) - Frequently asked questions
- [Security Policy](SECURITY.md) - Vulnerability reporting and security features
- [Contributing](CONTRIBUTING.md) - Contribution guidelines
- [Changelog](CHANGELOG.md) - Version history

## 🛡️ Security

- ✅ Non-root Docker user (nodejs:1001)
- ✅ No exposed ports (outbound-only)
- ✅ Minimal dependencies (no runtime dependencies)
- ✅ Environment variable configuration (no secrets in code)
- ✅ Security scanning with Trivy in CI/CD

## 📋 Requirements

- **Runtime**: Node.js 20+
- **Docker**: Docker 20.10+ (for containerized deployment)
- **Cloudflare**: Account with API token
- **Network**: Outbound internet access

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## ⭐ Support

- 📖 [Documentation](.env.example)
- 🐛 [Issues](https://github.com/stefanodecillis/cloudflare-dyndns-worker/issues)
- 💬 [Discussions](https://github.com/stefanodecillis/cloudflare-dyndns-worker/discussions)

---

**Made with ❤️ for the homelab community**
