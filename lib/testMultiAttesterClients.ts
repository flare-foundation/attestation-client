import * as fs from "fs";
import yargs from "yargs";
import { AttesterClient } from "./attester/AttesterClient";
import { AttesterClientConfiguration } from "./attester/AttesterClientConfiguration";
import { createLogger, getGlobalLogger } from "./utils/logger";

// Args parsing
const args = yargs
  .option("config", {
    alias: "c",
    type: "string",
    description: "Path to config json file",
    default: "./config.json",
    demand: false,
  })
  .option("multiconfig", {
    alias: "m",
    type: "string",
    description: "Path to config for multi test json file",
    default: "./config.multitest.json",
    demand: false,
  })
  .option("clients", {
    alias: "n",
    type: "number",
    description: "Number of Attester clients to run",
    default: 5,
    demand: false,
  })
  .option("keys", {
    alias: "k",
    type: "string",
    description: "Path to private keys",
    default: "./test-1020-accounts.json",
    demand: false,
  }).argv;

class MultiAttesterConfig {
  privateKeyFile1020Index!: number;
  rpcUrls!: string[];
  commitTimeRange!: number[];
  revealTimeRange!: number[];
}

function getRandomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

async function runMultiAttesterClients() {
  const logger = getGlobalLogger();

  const version = "1000";
  logger.error(`Starting Flare MULTI Attester Client v${version}`);
  const clients = (args as any).clients;
  logger.warning(` * starting ${clients} clients`);

  // Reading configurations
  const multiconf: MultiAttesterConfig = JSON.parse(fs.readFileSync((args as any).multiconfig).toString()) as MultiAttesterConfig;
  const privateKeys = JSON.parse(fs.readFileSync((args as any).keys).toString());

  // Create and start Attester Client
  for (let c = 0; c < clients; c++) {
    const conf: AttesterClientConfiguration = JSON.parse(fs.readFileSync((args as any).config).toString()) as AttesterClientConfiguration;

    conf.commitTime = getRandomInt(multiconf.commitTimeRange[0], multiconf.commitTimeRange[1]);
    conf.revealTime = getRandomInt(multiconf.revealTimeRange[0], multiconf.revealTimeRange[1]);
    conf.rpcUrl = multiconf.rpcUrls[c % multiconf.rpcUrls.length];
    conf.accountPrivateKey = privateKeys[multiconf.privateKeyFile1020Index + c].privateKey;

    logger.error(`Starting Flare Attester Client #${c} ${conf.rpcUrl}`);

    const attesterClient = new AttesterClient(conf, createLogger(`multi${c}`));
    attesterClient.start();
  }
}

runMultiAttesterClients();
