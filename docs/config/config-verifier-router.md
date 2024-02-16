# Verifier routes credentials

Verifier routes credentials on attestation client is in file:

- `verifier-routes-credentials.json`

## Credentials

The file contains top-level key `verifierRoutes`, which is a list of the objects with the following fields

| Name       | Description                                                                                       | Default |
| ---------- | ------------------------------------------------------------------------------------------------- | ------- |
| `sourceId` | Source id string (one of `XRP`, `BTC`, `DOGE`, ...)                                               |         |
| `routes`   | A list of routes with for the specific source id. Routes are described as `VerifierRoute` objects |         |

The `VerifierRoute` objects consist of the following fields.

| Name               | Description                                                                                   | Default |
| ------------------ | --------------------------------------------------------------------------------------------- | ------- |
| `attestationTypes` | The list of strings, the names of the supported attestation types on the following route url. |         |
| `url`              | URL of the corresponding verifier server                                                      |         |
| `apiKey`           | API key for the corresponding verifier server                                                 |         |

[Home](../README.md)/[Configuration general](./config-general.md)
