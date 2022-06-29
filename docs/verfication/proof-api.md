# Proof API

The Attestation Suite comes with a web server, that enables web service access to the votes data of the attestation provider for each voting round. While operating, attestation client stores all attestation requests and attestation responses for each voting round into the database. Once the attestation requests can be revealed, they become accessible through the web services.

## Running REST API server

To run the rest API server locally in development mode, run

```bash
yarn devbackend
```

The corresponding config files `backend-config.json` and `backend-credentials.json` should be set in `configs/dev` folder, where a port of the web server is defined as well. The REST API server is also installed as a service, if installation is done using the install procedure on Ubuntu server.

## Web service routes

The web service routes are documented using the Swagger interface. They include:

- `api/proof/votes-for-round/{roundId}` - given a `roundId` it returns a JSON response containing the list of attestation objects. Each attestation object contains attestation round, attestation hash, attestation request and attestation response. The data can be used for creating the attestation proofs.
- `api/proof/status` - returns an object that includes current buffer number and the latest available round id, for which the attestation responses are available. 
- `api/status/services` - provides the status of all deployed services from the attestation suite (indexers, attestation client).
- `api/status/services-html` - a simple self-refreshing html page showing the status of all deployed services from the attestation suite (indexers, attestation client).

Next: [Verification workflow](./verification-workflow.md)

[Back to home](../README.md)

