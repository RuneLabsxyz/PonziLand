FROM rust:1.86 as builder
WORKDIR /app
COPY ./Cargo.* .
COPY ./crates ./crates

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive \
    apt-get install --no-install-recommends --assume-yes \
    protobuf-compiler
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo build --release --package indexer

RUN ls -la . ./crates/indexer ./target/release

FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/indexer /
CMD ["./indexer"]
