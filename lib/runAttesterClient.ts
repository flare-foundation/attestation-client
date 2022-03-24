import yargs from "yargs";
import { AttesterClient } from "./attester/AttesterClient";
import { AttesterClientConfiguration, AttesterCredentials } from "./attester/AttesterClientConfiguration";
import { readConfig, readCredentials } from "./utils/config";

// Args parsing
const args = yargs
  //.option("config", { alias: "c", type: "string", description: "Path to config json file", default: "./configs/attester-config.json", demand: false, })
  //.option("credentials", { alias: "cred", type: "string", description: "Path to credentials json file", default: "./configs/attester-credentials.json", demand: false, })
  .option("simulate", { alias: "s", type: "boolean", description: "Turn on simulation", default: false, demand: false, })
  .argv;

// Reading configuration
const config = readConfig<AttesterClientConfiguration>("attester");
const credentials = readCredentials<AttesterCredentials>("attester");

if ((args as any).simulate) {
  config.simulation = true;
}

// Create and start Attester Client
const attesterClient = new AttesterClient(config, credentials);

attesterClient.start();
