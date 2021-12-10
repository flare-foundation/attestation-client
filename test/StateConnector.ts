// import { expectEvent } from '@openzeppelin/test-helpers';
import { expectEvent } from "@openzeppelin/test-helpers";
import { getTestStateConnectorAddress } from "../lib/utils";

describe("State connector", function () {
  it("Should submit some attestation request and receive event", async function () {
    const StateConnector = artifacts.require("StateConnector");
    const stateConnector = await StateConnector.at(getTestStateConnectorAddress());
    console.log(stateConnector.address)

    let id = "0x1230000000000000000000000000000000000000000000000000000000000000"
    let instructions = "1";
    let request = await stateConnector.requestAttestations(instructions, id, {
      value: web3.utils.toWei(
        web3.utils.toBN(2)
        ,"ether"
      )
    });

    // console.log(request.logs[0])
    //   event AttestationRequest(
    //     uint256 timestamp,
    //     uint256 instructions, 
    //     bytes32 id
    // );

    expectEvent(request, "AttestationRequest", {instructions, id});

  });
});
