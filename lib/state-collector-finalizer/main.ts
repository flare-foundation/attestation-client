import { runBot } from "./state-connecotr-validator-bot";

const { argv } = require("yargs")
  .scriptName("airdropTransactions")
  .option("a", {
    alias: "state-connector-address",
    describe: "State connector temp address",
    demandOption: "Provide the address of state connector temp contract address",
    type: "string",
    nargs: 1,
  })
  .option("r", {
    alias: "rpc",
    describe: "Rpc url",
    demandOption: "Provide rpc url",
    type: "string",
    nargs: 1,
  });

const { stateConnectorAddress, rpc } = argv;

runBot(stateConnectorAddress, rpc)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
