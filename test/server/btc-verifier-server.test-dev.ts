// This should always be on the top of the file, before imports
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getUnixEpochTimestamp } from "../../src/utils/utils";
import { AttestationRequest } from "../../src/verification/attestation-types/attestation-types";

chai.use(chaiAsPromised);

const axios = require("axios");

async function sendToVerifier(url: string, attestationRequest: AttestationRequest) {
  const resp = await axios.post(
    url,
    attestationRequest
  );
  return resp.data;
}


describe(`Test request`, () => {


  before(async () => {

  });


  it(`Should verify Payment attestation`, async function () {
    let port = 9500;
    const URL = `http://localhost:${port}/query`
    let request = "0x000200000000000000000000002f5e45a195844c4f53ebfcadd6d2b86eaea254143aa03c8a160e894916fc498c1b480b83452b91fa50281bc843f82dc7b1573e58ad19554fe200";
    let roundId = 396106;
    let now = getUnixEpochTimestamp();
    let startTime = now - 3600*5;
    let attestationRequest = {
      apiKey: "123456",
      request,
      options: {
        roundId,
        recheck: false,
        windowStartTime: startTime + 1, // must exist one block with timestamp lower
        UBPCutoffTime: startTime
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(URL, attestationRequest);
    console.log(resp)

  });

});
