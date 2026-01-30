# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Unit and integration tests
- Health check endpoint
- Metrics export (Prometheus)
- Web UI for configuration
- Support for multiple IP detection providers
- Configuration file support (in addition to env vars)

## [0.1.0] - 2026-01-30

### Added
- Initial release
- Public IP detection with multiple fallback providers
- Cloudflare API v4 client
- Automatic DNS record updates
- Change detection (only updates when IP changes)
- Multi-architecture Docker support (amd64, arm64)
- Configuration via environment variables
- Exponential backoff retry logic
- Consecutive error tracking
- Graceful shutdown (SIGTERM, SIGINT)
- Detailed logging with timestamps
- Health monitoring (stale sync warnings)
- Multi-zone and multi-record support
- IPv4 (A) and IPv6 (AAAA) record support
- Docker Compose configuration
- GitHub Actions CI/CD pipeline
- Security scanning with Trivy
- Multi-stage Docker builds for minimal image size
- Non-root user in Docker container
- Resource limits for NAS compatibility
- Log rotation
- Comprehensive documentation (README, FAQ, Deployment Guide)
- MIT License
- Contributing guidelines

### Features
- **Lightweight**: ~32MB RAM, <0.1 CPU idle
- **Reliable**: Multiple IP providers, retry logic, error handling
- **Easy Setup**: Docker-based deployment, env var configuration
- **Production-Ready**: Security scanning, multi-arch, graceful shutdown
- **Open Source**: MIT licensed, community-driven

### Security
- Non-root Docker user
- No exposed ports
- Environment variable configuration (no secrets in code)
- Trivy vulnerability scanning in CI/CD
- Minimal dependencies (reduced attack surface)

### Documentation
- Comprehensive README with examples
- Deployment guide for NAS, VPS, local dev
- FAQ with common questions
- Configuration reference in .env.example
- Contributing guidelines

### Performance
- Multi-stage Docker builds (50-100MB image)
- GitHub Actions cache (faster builds)
- Smart retry logic (exponential backoff)
- Change detection (no unnecessary API calls)

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible functionality additions
- **PATCH**: Backward-compatible bug fixes
