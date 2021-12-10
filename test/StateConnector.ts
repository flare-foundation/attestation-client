// Instructions:
// 1) Start the hardhat node and deploy StateConnector contract (use one terminal)
//   yarn stateconnector
// 2) Run the test on local hardhat node network
//   yarn hardhat test test/StateConnector.ts --network local 

import { expectEvent, expectRevert } from "@openzeppelin/test-helpers";
import { getTestStateConnectorAddress } from "../lib/utils";
import { StateConnectorInstance } from "../typechain-truffle";

function etherToValue(eth: number) {
  return web3.utils.toWei(web3.utils.toBN(eth), "ether")
}

describe("State connector", function () {
  const StateConnector = artifacts.require("StateConnector");
  let stateConnector: StateConnectorInstance;
  beforeEach(async () => {
    stateConnector = await StateConnector.at(getTestStateConnectorAddress());    
  });

  it("Should submit some attestation request and receive event", async function () {
    let id = "0x1230000000000000000000000000000000000000000000000000000000000000"
    let instructions = "1";
    let value = etherToValue(2);
    let request = await stateConnector.requestAttestations(instructions, id, {value});
    // console.log(request.logs[0])
    //   event AttestationRequest(
    //     uint256 timestamp,
    //     uint256 instructions, 
    //     bytes32 id
    // );
    expectEvent(request, "AttestationRequest", {instructions, id});
  });

  it("Should fail submit attestation request if too low value", async function () {  
    let id = "0x1230000000000000000000000000000000000000000000000000000000000000"
    let instructions = "1";
    let value = etherToValue(0);
    let request = stateConnector.requestAttestations(instructions, id, {value});
    await expectRevert.unspecified(request);
  });
});
