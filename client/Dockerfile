# syntax = docker/dockerfile:1

FROM oven/bun:1-slim AS base

# SvelteKit app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules
COPY bun.lock package.json ./
COPY patches ./patches
RUN bun install --frozen-lockfile

# Copy application code
COPY . .
COPY ./test.json ./manifest.json

# Generate .svelte-kit directory
RUN DYNAMIC_CONFIG="true" \
    MANIFEST_PATH="./manifest.json" \
    DOCKER="true" \
    bun --bun svelte-kit sync
# Build application
RUN DYNAMIC_CONFIG="true" \
    MANIFEST_PATH="./manifest.json" \
    DOCKER="true" \
    bun --bun run build

# Remove development dependencies
RUN rm -rf node_modules && \
    bun install --ci --frozen-lockfile


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app/build /app/build
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "bun", "./build/index.js" ]
