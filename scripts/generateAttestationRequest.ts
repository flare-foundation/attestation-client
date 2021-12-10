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


/////////////////////////////////////////////////////

  // const StateConnector = artifacts.require("StateConnector");
  // let stateConnector = await StateConnector.at("0x7c2c195cd6d34b8f845992d380aadb2730bb9c6f");

  // let id = "0x1230000000000000000000000000000000000000000000000000000000000000"
  // let instructions = "1";
  // let value = web3.utils.toWei(web3.utils.toBN(2), "ether");
  // let request = await stateConnector.requestAttestations(instructions, id, { value });

  // console.log(request);
