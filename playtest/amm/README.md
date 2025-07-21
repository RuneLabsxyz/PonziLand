# Haiko AMM

This repo contains the core contracts of Haiko AMM.

You can get started by reading through the following docs:

- [Technical Overview](./docs/1-technical-overview.md)
- [Comparison of Haiko vs Uniswap](./docs/2-haiko-vs-uniswap.md)
- [Using the Test Suite](./docs/4-testing-suite.md)
- [List of WIP Test Cases and Features](./docs/3-wip.md)

## Getting started

```shell
# Run the tests
snforge test --max-n-steps 4294967295

# Build contracts
scarb build
```

## Version control

- [Scarb](https://github.com/software-mansion/scarb) 2.5.4
- [Cairo](https://github.com/starkware-libs/cairo) 2.5.4
- [Starknet Foundry](https://github.com/foundry-rs/starknet-foundry) 0.19.0
- [Haiko Common Library](https://github.com/haiko-xyz/library) 1.0.0
