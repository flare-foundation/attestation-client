# Verifier

Verifier is a service that accepts attestation requests and provides attestation responses, hence it validates attestation requests. It consists of a verifier server providing REST API routes for verification, verification code and the connection to the indexer database.

## Verification system

Verification system is based on pre-defined attestation types. In order to use or introduce new attestation types, a type needs to be well defined and approved by the attestation type community on [State Connector attestation type repo](https://github.com/flare-foundation/state-connector-attestation-types). Once a definition is approved, the procedures for implementing it into the attestation client code can start. When implemented, attestation providers start supporting new attestations from the certain voting round on, agreed on by the attestation provider community.

Based on definitions on [State Connector attestation type repo](https://github.com/flare-foundation/state-connector-attestation-types) the [definition files](../../src/verification/attestation-types/) are configured. To support easier implementation of the new attestation types the Attestation Client Suite includes [code generation utilities](./code-generation.md) which help in including new and updating existing attestation types in a standardized manner. Code generation features provide encoding/decoding/hashing/testing utilities for attestation types.

TODO:

Next: [Code generation](./code-generation.md)

[Back to home](../README.md)
