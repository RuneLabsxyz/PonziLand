FROM rust:1.89 AS builder
WORKDIR /app
COPY ./Cargo.* .
COPY ./crates ./crates

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive \
    apt-get install --no-install-recommends --assume-yes \
    protobuf-compiler libprotobuf-dev

# Copy the .sqlx files
COPY ./.sqlx ./.sqlx
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    SQLX_OFFLINE=true cargo build --release --package indexer

FROM frolvlad/alpine-glibc:glibc-2.42
RUN apk add --no-cache libgcc
COPY --from=builder /app/target/release/indexer /
CMD ["./indexer"]
