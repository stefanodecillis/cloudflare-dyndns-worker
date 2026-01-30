# Security Policy

## Supported Versions

| Version | Supported |
|---------|------------|
| 0.1.0  | ✅        |

Only the latest version receives security updates. Older versions are supported on a best-effort basis.

## Reporting a Vulnerability

If you discover a security vulnerability, **please report it privately** instead of creating a public issue.

### How to Report

1. **Email**: security@example.com (replace with actual email)
2. **Subject**: [Security] Cloudflare DynDNS Worker - Vulnerability Report
3. **Include**:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Proposed fix (if any)
   - Your contact info (for follow-up)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix**: Depends on severity and complexity
- **Release**: As soon as fix is validated

### Security Best Practices for Reporters

- **Do Not** create public issues for vulnerabilities
- **Do Not** exploit vulnerabilities in production systems
- **Do Provide** detailed reproduction steps
- **Do Allow** time for assessment before public disclosure

## Security Features

This project includes several security features:

### Environment Variables Configuration

- **API Tokens**: Stored in environment variables, never in code
- **No Secrets in Code**: All sensitive data via env vars
- **.gitignore**: .env files excluded from version control

### Container Security

- **Non-Root User**: Runs as `nodejs:1001` (not root)
- **No Exposed Ports**: Outbound-only (no network attack surface)
- **Minimal Base**: Alpine Linux with minimal packages
- **No Sudo**: Container doesn't require elevated privileges

### Dependency Management

- **Minimal Dependencies**: Only TypeScript and @types/node
- **Built-in APIs**: Uses Node.js native features (fetch, etc.)
- **No Third-Party Libs**: Reduced attack surface

### API Security

- **Token Scoping**: Use minimal permissions (Zone DNS Edit only)
- **Specific Zones**: Scope to specific zones, not "All zones"
- **No Legacy Auth**: Recommended to use API tokens, not email+key

### CI/CD Security

- **Secrets Management**: Docker credentials via GitHub Secrets
- **Vulnerability Scanning**: Trivy scanner on every build
- **SARIF Upload**: Security results uploaded to GitHub Security tab
- **Manual Review**: Builds blocked on critical vulnerabilities

### Runtime Security

- **Input Validation**: All configuration validated at startup
- **Error Handling**: Comprehensive error handling prevents crashes
- **Graceful Shutdown**: Clean exit on signals, no orphaned processes
- **Retry Limits**: Prevents infinite loops and excessive API calls

## Security Considerations for Users

### API Token Management

**Do:**
- Create dedicated tokens for this worker
- Use minimal permissions (Zone DNS Edit + Zone Read)
- Scope to specific zones
- Rotate tokens regularly (every 90 days)
- Use Docker secrets or vault tools

**Don't:**
- Use account-wide API keys
- Share tokens in code repositories
- Log tokens in files
- Use tokens with excessive permissions

### Deployment Security

**Do:**
- Run containers as non-root (already configured)
- Use resource limits (prevents DoS)
- Enable log rotation (prevents disk fill)
- Monitor logs for errors
- Keep worker updated
- Use firewall rules to restrict unnecessary access

**Don't:**
- Run as root user
- Expose unnecessary ports
- Ignore security updates
- Store secrets in Dockerfile
- Use outdated Docker images

### Network Security

**Do:**
- Run in isolated network (Docker bridge)
- Restrict outbound if possible
- Monitor network traffic
- Use firewall rules

**Don't:**
- Allow unrestricted outbound (if not needed)
- Run in privileged mode
- Share host network (--network host)

## Known Security Considerations

### Environment Variables

- **Risk**: Env vars can be leaked via logs, process listings
- **Mitigation**: Don't log sensitive values, use secrets management

### Docker Images

- **Risk**: Vulnerabilities in base images or dependencies
- **Mitigation**: Trivy scanning, minimal base image, regular updates

### API Rate Limits

- **Risk**: Excessive API calls could trigger rate limiting
- **Mitigation**: Change detection (only update when IP changes), configurable intervals

### Logs

- **Risk**: Logs may contain sensitive data
- **Mitigation**: No sensitive values in logs, log rotation, secure log storage

## Vulnerability Severity Levels

| Level | Description | Example |
|-------|-------------|----------|
| **Critical** | Allows remote code execution or data exfiltration | RCE, SQL injection |
| **High** | Major security breach, requires user interaction | XSS, CSRF, auth bypass |
| **Medium** | Limited impact, requires specific conditions | Local file inclusion, info disclosure |
| **Low** | Minor impact, difficult to exploit | Self-XSS, minor info disclosure |
| **Info** | Security best practice, not exploitable | Missing headers, weak crypto config |

## Dependency Vulnerabilities

We actively monitor for vulnerabilities in dependencies:

- **TypeScript**: Official releases tracked
- **@types/node**: Official releases tracked
- **Docker Base (Alpine)**: Security advisories monitored
- **Node.js Runtime**: Official releases tracked

Vulnerabilities are addressed promptly:
- **Critical/High**: Patch within 7 days, release immediately
- **Medium**: Patch within 14 days, release in next version
- **Low**: Patch in next scheduled release

## Security Audits

External security audits are welcome! If you'd like to perform a security audit:

1. Contact us first to coordinate
2. Report vulnerabilities privately (see "Reporting a Vulnerability")
3. Allow reasonable time for assessment
4. We'll credit you for findings

## Security Updates

When security vulnerabilities are fixed:

1. **Patch**: Fix in private branch
2. **Test**: Validate fix thoroughly
3. **Release**: Security release immediately
4. **Advisory**: Publish security advisory
5. **Announcement**: Public announcement with upgrade guidance

Users should:
- Update to latest version ASAP
- Review security advisories
- Apply workarounds if upgrade not immediate

## Contact

For security matters:
- **Email**: security@example.com (replace with actual email)
- **PGP Key**: Available on request (for secure communication)

For general issues:
- **GitHub Issues**: [Create an issue](https://github.com/stefanodecillis/cloudflare-dyndns-worker/issues)
- **Discussions**: [Start a discussion](https://github.com/stefanodecillis/cloudflare-dyndns-worker/discussions)

---

Thank you for helping keep this project secure! 🛡️
