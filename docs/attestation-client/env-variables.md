# A list of `env` variables

- `NODE_ENV` - node environment. Should be `development` for tests and development.
- `VERIFIER_TYPE` - used when running verifier server to obtain the correct configurations. Should be one of `btc`, `doge`, `xrp`.
- `INDEXER_TYPE` - used when running indexer to obtain the correct configurations. Should be one of `btc`, `doge`, `xrp`.
- `SECURE_CONFIG_PATH` - path to the configurations and credentials folder in deployment. Should contain templates and credentials.
- `FLARE_NETWORK` - network name. Used for pre-replacement of configuration stub keys, that are specific for the network. Use should be avoided. 
- `CREDENTIALS_KEY` - The credentials key address for decrypting credentials that overrides all settings.
- `CREDENTIALS_KEY_FILE` - The path to the file with credential key address.
- `LOG_LEVEL` - log level for global logging. See [logger.ts](../../src/utils/logging/logger.ts)
- `REQUIRE_ALL_ROUTES_CONFIGURED` - if set to non-empty all routes to verifier server must be set in verifier configurations. If not, exception is thrown and process terminated.
- `APP_BASE_PATH` - base path for application web services (base route prefix)
- `SAMPLING_REQUEST_INTERVAL_MS` - how often (in ms) should the the status of processed/received transactions is logged.
## Test environment variables

- `TEST_CREDENTIALS` - If non-empty, no credential encryption is used (credentials are in the config templates).
- `FINALIZING_BOT_PRIVATE_KEY` - finalizing bot private key. 
- `FINALIZING_BOT_PUBLIC_KEY` - finalizing bot address
- `TEST_HARDHAT_NODE` - used when test hardhat node is used. Disables handling of revert messages due to bug in combination with Ganache: https://github.com/web3/web3.js/issues/3742 or incompatibility.
- `TEST_OFFSET_TIME_MS` - Offset time for in ms.
- `TEST_SCHEDULER_TIME_MS` - Scheduler time. Not used. Experimental.
