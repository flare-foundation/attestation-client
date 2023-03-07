# Attestation client configurations

Attestation client specific configurations are defined and documented in [attester-config.json](../../configs/.install/templates/attester-config.json).
These mostly include attestation database connection credential, Flare blockchain connection credentials and specific time setting for submissions of data to blockchain. Beside those configurations two more types of configurations are used in operation of the attestation client:
- global configurations,
- verifier routes configurations.

Both types of configurations reside in specific folders in multiple files, each of them indicating from which round on a particular configuration is valid. Management of those configurations is done by class [GlobalConfigManager](../../src/attester/GlobalConfigManager.ts). In essence this class takes care for initial loading of both types of configurations and periodic hot-swap style loading of verifier route configurations.

## Global configurations

Global configurations define which attestation types are supported, what are system wise rate limits for specific types, what is the set of assigner addresses for the default set of data providers and what is the 

Global configurations are described by class [GlobalAttestationConfig](../../src/attester/configs/GlobalAttestationConfig.ts) and classes used in it. These are deserialization classes which are able to read files of the form the files that have to have the prescribed form: `global-<startRoundId>-config.json`, where `startRoundId` is integer number matching the `startRoundId` key in the file and indicates from which attestation round the configuration is valid. The configuration files of this form are usually contained in folder `configs/global-configs/<network-name>` and are a part of the current attestation suite deployment. But they can be also moved to other folder (see the setting `globalConfigurationsFolder` in [attester-config.json](../../configs/.install/templates/attester-config.json)). A global configuration for a given `startRoundId` is valid from that round id on (including) up to the round with round id one less of the next configuration with `startRoundId` strictly larger. Global configurations are loaded at the start of attestation client using class [GlobalConfigManager](../../src/attester/GlobalConfigManager.ts).

## Verifier routes configurations

Verifier routes configurations are configurations used in class [VerifierRouter](../../src/verification/routing/VerifierRouter.ts). They define credentials for verifier servers (urls, API keys) based on data source and attestation type. The configurations are deserialized from JSON configuration
files into class [VerifierRouteConfig](../../src/verification/routing/configs/VerifierRouteConfig.ts). JSON configuration files have the form `verifier-routes-<startRoundId>-config.json` (see [example](../../configs/.install/templates/verifier-client/verifier-routes-150-config.json)), where `startRoundId` is integer number matching the `startRoundId` key in the file and indicates from which attestation round the configuration is valid. These configuration files are usually contained on relative path `templates/verifier-client`, relative to the path set in `SECURE_CONFIG_PATH` environment variable. A verifer route configuration for a given `startRoundId` is valid from that round id on (including) up to the round with round id one less of the next verifier routes configuration with `startRoundId` strictly larger. Global configurations are loaded at the start of attestation client using class [GlobalConfigManager](../../src/attester/GlobalConfigManager.ts). Verifier routes configurations are loaded on start of the attestation client and periodically (currently fixed to 80s).

[Back to home](../README.md)