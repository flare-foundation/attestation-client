// Instructions:
// 1) compile artifacts
//   yarn c
// 2) Start the hardhat node and deploy StateConnector contract (use one terminal)
//   yarn stateconnector
// 3) Run the test on local hardhat node network
//   yarn hardhat test test/StateConnector.ts --network local 

import { expectEvent, expectRevert } from "@openzeppelin/test-helpers";
import { zeroPad } from "ethers/lib/utils";
import { bytesToHex, isTopic } from "web3-utils";
import { etherToValue, getTestStateConnectorAddress } from "../lib/utils/utils";
import { StateConnectorInstance } from "../typechain-truffle";


describe("State connector", function () {
  const StateConnector = artifacts.require("StateConnector");
  let stateConnector: StateConnectorInstance;
  beforeEach(async () => {
    stateConnector = await StateConnector.at(getTestStateConnectorAddress());
  });


  // it("Should submit some attestation request and receive event", async function () {
  //   let data = "0x0";
  //   let id = "0x1234567890123456789012345678901234567890123456789012345678901234"
  //   let instructions = "1123456789012345678902345678";
  //   for (let i = 0; i < 10; i++) {
  //     let receipt = await stateConnector.requestAttestations(instructions, id, id, data);
  //     console.log(`${data.length - 2}\t${receipt.receipt.gasUsed}`)
  //     data += "12";
  //   }
  //   // console.log(receipt.logs[0])
  // });


  // it("Should submit some attestation request and receive event", async function () { 
  //   let data = "0x1234567890123456789012345678901234567890123456789012345678901234";
  //   let lst = [data];
  //   for(let i = 0; i < 10; i++) {
  //     let receipt = await stateConnector.requestAttestations(data);
  //     console.log(`${(data.length - 2)/64}\t${receipt.receipt.gasUsed}`)  
  //     data += "1234567890123456789012345678901234567890123456789012345678901234";
  //   }
  //   // console.log(receipt.logs[0])
  // });

  // https://medium.com/mycrypto/understanding-event-logs-on-the-ethereum-blockchain-f4ae7ba50378
  // Emitting events
  // 375 for isTopic
  // 8 for byte

  // Calldata:
  // 4 for 0-byte: 
  // 68 for non-zero (EIP-2028 -> 16)

  it("Should submit some attestation request and receive event", async function () {
    let data = "";
    let data2 = "";
    for (let i = 0; i < 100; i++) {
      // data +=  "1234567890123456789012345678901234567890123456789012345678909999";
      // data2 += "0000000000000000000000000000000000000000000000000000000000000000";
      data =  "ffffffff" + data;
      data2 = "0000aaff" + data2;
      let receipt = await stateConnector.requestAttestations("0x" + data);
      let receipt2 = await stateConnector.requestAttestations("0x" + data2);
      console.log(`${(data.length) / 2}\t${receipt.receipt.gasUsed}\t${receipt2.receipt.gasUsed}`)
    }
    // console.log(receipt.logs[0])
  });

  // it("Should submit some attestation request and receive event", async function () { 
  //   let data = "0x1234567890123456789012345678901234567890123456789012345678901234";
  //   for(let i = 0; i < 10; i++) {
  //     let receipt = await stateConnector.requestAttestations(data);
  //     console.log(`${(data.length - 2)/2}\t${receipt.receipt.gasUsed}`)  
  //     data += "1234567890123456789012345678901234567890123456789012345678901234";
  //   }
  //   // console.log(receipt.logs[0])

  // });

  // 24529
  // it("Should submit some attestation request and receive event", async function () {
  //   let id = "0x1234567890123456789012345678901234567890123456789012345678901234"
  //   let instructions = "1123456789012345678902345678";
  //   let value = etherToValue(web3,2);
  //   let request = await stateConnector.requestAttestations(instructions, id, id, "0x0", "0x0", "0x0");
  //   // console.log(request.logs[0])
  //   //   event AttestationRequest(
  //   //     uint256 timestamp,
  //   //     uint256 instructions, 
  //   //     bytes32 id
  //   // );
  //   console.log(request.receipt.gasUsed)
  //   // expectEvent(request, "AttestationRequest", {instructions, id});
  // });

  // it("Should fail submit attestation request if too low value", async function () {  
  //   let id = "0x1230000000000000000000000000000000000000000000000000000000000000"
  //   let instructions = "1";
  //   let value = etherToValue(web3,0);
  //   let request = stateConnector.requestAttestations(instructions, id, "0x1", {value});
  //   await expectRevert.unspecified(request);
  // });
});
