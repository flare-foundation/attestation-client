# Attestation Client Suite

Current production tag is 4.0.0

The Attestation Client Suite is a set of software modules for handling tasks related to performing attestations in Flare's State Connector protocol. It includes the following modules:

- Attestation client
- Chain indexers (BTC, XRP) and verifier servers
- Attestation client web server providing attestation results
- Auxiliary development tools (logging, monitoring, ...)

The project depends heavily on the [Multi Chain Client library (MCC)](https://github.com/flare-foundation/multi-chain-client) that provides a unified interface to multiple blockchain APIs.

For further details see [Installation and technical reference.](./docs/README.md)

# Testing

1. make sure you are using the correct node version (defined in .nvmrc)
2. install dependencies (we use `yarn`)
3. compile the smart contracts (`yarn c`)

You can run individual tests:

If they are `test-contract` kind, use `yarn htest <path_to_test.test-contract.ts>`.

Others can be run using `yarn test <path-to-test-file>`.

We test attestation client on multiple levels split intu multiple sections.

All of the scripts associated with testing are collected in `-------TESTS---------` section in package.json.

- Some tests are run in hardhat environment to test smart contracts and their interaction with network (`.test-contract.ts`)
- Others are run with mocha. They are split into three groups: regular tests (`.test.ts`), slower tests (`.test-slow.ts`) and tests that need some additional credentials(`.test-cred.ts`).

## Tooling

- [mocha](https://github.com/mochajs/mocha)
- [hardhat](https://github.com/NomicFoundation/hardhat)
- [sinon](https://github.com/sinonjs/sinon)
- [chai](https://github.com/chaijs/chai)
- [chai-as-promised](https://github.com/domenic/chai-as-promised)

## Coverage

run

Run all fast tests

```bash
yarn test:coverage
```

Run all tests except the tests that need api credentials

```bash
yarn test:coverage-full
```

Run all tests including the tests that need api credentials that need to be provided

```bash
yarn test:coverage-fullc
```