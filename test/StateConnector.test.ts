// Instructions:
// 1) compile artifacts
//   yarn c
// 2) Start the hardhat node and deploy StateConnector contract (use one terminal)
//   yarn stateconnector
// 3) Run the test on local hardhat node network
//   yarn hardhat test test/StateConnector.ts --network local 

import { expectEvent, expectRevert } from "@openzeppelin/test-helpers";
import { etherToValue, getTestStateConnectorAddress } from "../lib/utils";
import { StateConnectorInstance } from "../typechain-truffle";


describe("State connector", function () {
  const StateConnector = artifacts.require("StateConnector");
  let stateConnector: StateConnectorInstance;
  beforeEach(async () => {
    stateConnector = await StateConnector.at(getTestStateConnectorAddress());    
  });

  it("Should submit some attestation request and receive event", async function () {
    let id = "0x1230000000000000000000000000000000000000000000000000000000000000"
    let instructions = "1";
    let value = etherToValue(web3,2);
    let request = await stateConnector.requestAttestations(instructions, "0x2", id, "0x1", {value});
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
    let value = etherToValue(web3,0);
    let request = stateConnector.requestAttestations(instructions, "0x2", id, "0x1", {value});
    await expectRevert.unspecified(request);
  });
});
