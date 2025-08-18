# Testing suite

Haiko uses [Starknet Foundry](https://github.com/foundry-rs/starknet-foundry/tree/master) for testing.

## Libraries and utilities

Common actions such as deploying contracts, approving spend allowances etc have been abstracted into a set of helper libraries imported from the Haiko [Common Library](https://github.com/haiko-xyz/library).

When writing new test cases, it is recommended to use these libraries to ensure consistency and code reuse:

- [`actions`](https://github.com/haiko-xyz/library/tree/main/src/helpers/actions): contains common actions for interacting with each contract
- [`params`](https://github.com/haiko-xyz/library/tree/main/src/helpers/params.cairo): contains default parameters for each function call as well as helper functions for compiling calldata
- [`utils`](https://github.com/haiko-xyz/library/tree/main/src/helpers/utils.cairo): contains utility functions for testing

## Models

Haiko's execution logic is relatively complex. To help with testing, we rely on a set of [models](../models) to replicate the computations under each test case. The models produce a set of canonical results that can be compared to test outputs.

The models are written in Typescript and run on `decimal.js`, a high precision math library. They are designed to be as simple as possible to minimise the risk of bugs, although of course they are not guaranteed to be bug free.

Crucially, conceptual errors in the contracts will not be caught as they will make their way into both the contracts and the models. To mitigate this, we also write invariant tests to check for internal consistency in the contract logic itself.

## Running tests

To run `snforge` tests, make sure you have installed:

- [`scarb`](https://github.com/software-mansion/scarb/)
- [`cairo`](https://github.com/starkware-libs/cairo)
- [`snforge`](https://github.com/foundry-rs/starknet-foundry/)

```bash
snforge test snforge

# To override the default max number of steps
snforge test snforge --max-n-steps 4294967295
```

To run specific test cases, specify the full path or the test name, e.g.:

```bash
snforge test snforge::math::test_bit_math_invariants::test_msb_invariant

# same as above if test name is unique
snforge test test_msb_invariant
```
