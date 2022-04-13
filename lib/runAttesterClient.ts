import { AttesterClient } from "./attester/AttesterClient";
import { AttesterClientConfiguration, AttesterCredentials } from "./attester/AttesterClientConfiguration";
import { ChainsConfiguration } from "./chain/ChainConfiguration";
import { readConfig, readCredentials } from "./utils/config";

// Reading configuration
const chains = readConfig(new ChainsConfiguration(), "chains");
const config = readConfig(new AttesterClientConfiguration(), "attester");
const credentials = readCredentials(new AttesterCredentials(), "attester");

// Create and start Attester Client
const attesterClient = new AttesterClient(config, credentials, chains);

attesterClient.start();
