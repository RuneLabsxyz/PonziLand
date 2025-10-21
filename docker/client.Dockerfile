# syntax = docker/dockerfile:1

FROM oven/bun:1.3-slim AS base

# SvelteKit app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3


# SvelteKit app lives here
WORKDIR /app
# Install node modules
COPY bun.lock package.json ./
RUN --mount=type=bind,source=pkgs,target=/src \
    mkdir -p /app/pkgs && \
    cd /src && \
    find . -name "package.json" -type f | while read file; do \
    mkdir -p "/app/pkgs/$(dirname "$file")" && \
    cp "$file" "/app/pkgs/$file"; \
    done
COPY client/package.json ./client/package.json
COPY playtest/package.json ./playtest/package.json
RUN ls -la .
COPY patches ./patches
RUN bun install --frozen-lockfile

WORKDIR /app/client

# Copy application code
COPY ./client /app/client
COPY ./client/test.json ./manifest.json

COPY ./contracts/manifest_*.json /app/contracts/



RUN ls -la .

# Accept build arguments
ARG POSTHOG_KEY

# Generate .svelte-kit directory
RUN DYNAMIC_CONFIG="true" \
    MANIFEST_PATH="./manifest.json" \
    PAYMASTER_API_KEY="TEMP_KEY_WILL_BREAK_PLEASE_CHANGE_IN_PROD" \
    LAYERSWAP_TOKEN="TEMP_KEY_WILL_BREAK_PLEASE_CHANGE_IN_PROD" \
    DOCKER="true" \
    bun --bun svelte-kit sync
# Build application
RUN DYNAMIC_CONFIG="true" \
    MANIFEST_PATH="./manifest.json" \
    PAYMASTER_API_KEY="TEMP_KEY_WILL_BREAK_PLEASE_CHANGE_IN_PROD" \
    LAYERSWAP_TOKEN="TEMP_KEY_WILL_BREAK_PLEASE_CHANGE_IN_PROD" \
    DOCKER="true" \
    POSTHOG_KEY="$POSTHOG_KEY" \
    bun --bun run build


# Remove development dependencies
RUN rm -rf node_modules client/node_modules && \
    bun install --ci --frozen-lockfile


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app/client/build /app/client/build
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/client/node_modules /app/client/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/client/package.json /app/client/package.json

WORKDIR /app/client

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "bun", "./build/index.js" ]
