# Contributing to Cloudflare DynDNS Worker

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

Be respectful, constructive, and inclusive. We welcome contributions from everyone and aim to maintain a positive and welcoming environment.

## Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/cloudflare-dyndns-worker.git
cd cloudflare-dyndns-worker

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Coding Standards

- Use TypeScript with strict mode enabled
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Keep the codebase minimal and lightweight
- Use built-in Node.js APIs when possible (no unnecessary dependencies)

## Testing

- Run tests before submitting: `npm test`
- Ensure code compiles: `npm run build`
- Test manually with a Cloudflare account
- Add tests for bug fixes and new features

## Documentation

- Update README for user-facing changes
- Update comments for complex logic
- Document new environment variables
- Update CHANGELOG for significant changes

## Areas for Contribution

We welcome contributions in:
- Bug fixes
- New IP detection providers
- Enhanced error handling
- Documentation improvements
- Test coverage
- Performance optimizations
- Additional platforms/architectures

## Getting Help

- Open an issue for questions
- Check existing issues first
- Join discussions for feature proposals
- Review pull requests from others for learning

Thank you for contributing! 🚀
