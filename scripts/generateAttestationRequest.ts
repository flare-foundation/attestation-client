import { etherToValue, getTestStateConnectorAddress } from "../lib/utils";

async function main2() {

  const StateConnector = artifacts.require("StateConnector");
  let stateConnector = await StateConnector.at(getTestStateConnectorAddress());

  let id = "0x1230000000000000000000000000000000000000000000000000000000000000"
  let instructions = "1";
  let value = etherToValue(web3, 2);
  let request = await stateConnector.requestAttestations(instructions, id, { value });

  console.log(request);
}

main2()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
