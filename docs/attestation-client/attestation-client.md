[TOC](../README.md)

# Attestation client

We provide an application that implements attestation protocol and manages interaction with `StateConnector` and `BitVoting` contracts.

The application collects listens to the events emitted by `StateConnector` and `BitVoting` contract.

Functions that manage to `StateConnector` and `BitVoting` are in [FlareConnection](../../src/attester/FlareConnection.ts)

Next: [Configurations](./attestation-configs.md)
