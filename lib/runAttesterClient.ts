import * as fs from "fs";
import yargs from "yargs";
import { AttesterClient } from "./attester/AttesterClient";
import { AttesterClientConfiguration } from "./attester/AttesterClientConfiguration";

// Args parsing
const args = yargs.option("config", {
  alias: "c",
  type: "string",
  description: "Path to config json file",
  default: "./config.json",
  demand: true,
}).argv;

// Reading configuration
const conf: AttesterClientConfiguration = JSON.parse(fs.readFileSync((args as any).config).toString()) as AttesterClientConfiguration;

// Create and start Attester Client
const attesterClient = new AttesterClient(conf);
attesterClient.start();
