import { AttestationType } from "../lib/AttestationData";
import { ChainType } from "../lib/MCC/MCClientSettings";
import { sleepms } from "../lib/Sleep";
import { etherToValue, getTestStateConnectorAddress } from "../lib/utils";

async function main2() {

  let inst : number = 1;

  while( true )
  {

    console.log( `sending attestation ${inst}`);

    const StateConnector = artifacts.require("StateConnector");
    let stateConnector = await StateConnector.at(getTestStateConnectorAddress());

    // attest transaction on XRP chain
    const instructions = AttestationType.Transaction | ( ChainType.XRP << 16 );
    const id = "0x2BE5EA966817B0BF4E3F66711C979A4B4C88E0EBF99D836505FFA06DC49BA";

    let value = etherToValue(web3, 2);
    throw Error("Not yet implemented")
    // let request = await stateConnector.requestAttestations(instructions, id, { value });

    inst++;

    //console.log(request);

    await sleepms( 2000 );
  }
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
