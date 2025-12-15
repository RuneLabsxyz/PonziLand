# syntax = docker/dockerfile:1

FROM oven/bun:1.3-slim AS base

# SvelteKit app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS prepared-deps

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3


# SvelteKit app lives here
WORKDIR /app
# Install node modules
COPY bun.lock package.json ./
RUN --mount=type=bind,source=packages,target=/src \
    mkdir -p /app/packages && \
    cd /src && \
    find . -name "package.json" -type f | while read file; do \
    mkdir -p "/app/packages/$(dirname "$file")" && \
    cp "$file" "/app/packages/$file"; \
    done
COPY client/package.json ./client/package.json
COPY playtest/package.json ./playtest/package.json
COPY docs/package.json ./docs/package.json
RUN ls -la .
COPY patches ./patches

FROM prepared-deps as prod-deps
RUN bun install --frozen-lockfile --production

FROM prepared-deps as build-deps
RUN bun install --frozen-lockfile

# Then we can prepare the actual contents
FROM build-deps as build
COPY . .
RUN bun turbo prune docs --docker
RUN bun turbo build

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/docs/node_modules ./docs/node_modules
COPY --from=build /app/docs/dist ./docs/dist

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["node", "./docs/dist/server/entry.mjs"]
