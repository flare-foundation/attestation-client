# Attestation Client Suite

Current production tag is 2.0.4.

The Attestation Client Suite is a set of software modules for handling tasks related to performing attestations in Flare's State Connector protocol. It includes the following modules:

- Attestation client
- Chain indexers (BTC, DOGE, XRP) and verifier servers
- Attestation client web server providing attestation results
- Auxiliary development tools (logging, monitoring, ...)

The project depends heavily on the [Multi Chain Client library (MCC)](https://github.com/flare-foundation/multi-chain-client) that provides a unified interface to multiple blockchain APIs.

For further details see [Installation and technical reference.](./docs/README.md)
