import yargs from "yargs";
import { AttesterClient } from "./attester/AttesterClient";
import { AttesterClientConfiguration, AttesterCredentials } from "./attester/AttesterClientConfiguration";
import { readConfig, readCredentials } from "./utils/config";

// Args parsing
const args = yargs
  .option("config", { alias: "c", type: "string", description: "Path to config json file", default: "", demand: false, })
  .argv;

// Reading configuration
const config = readConfig<AttesterClientConfiguration>("attester");
const credentials = readCredentials<AttesterCredentials>("attester");

// Create and start Attester Client
const attesterClient = new AttesterClient(config, credentials);

attesterClient.start();
