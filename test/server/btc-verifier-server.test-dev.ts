// This should always be on the top of the file, before imports
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getUnixEpochTimestamp } from "../../lib/utils/utils";
import { AttestationRequest } from "../../lib/verification/attestation-types/attestation-types";

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
    let port = 9000;
    const URL = `http://localhost:${port}/query`
    let request = "XXXXXXX"
    let roundId = 1;
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
