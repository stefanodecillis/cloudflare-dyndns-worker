# Single stage: Bun runs TypeScript directly
FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Switch to non-root user
USER appuser

# Set production environment
ENV NODE_ENV=production

# No ports to expose (worker is outbound-only)

# Run application directly from TypeScript
CMD ["bun", "run", "src/index.ts"]
