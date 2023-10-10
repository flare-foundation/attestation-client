import { getTestFile } from "../test-utils/test-utils";
import { expect } from "chai";
import { VerificationStatus } from "../../src/verification/attestation-types/attestation-types";
import { verifyAddressDOGE } from "../../src/servers/verifier-server/src/verification/address-validity/address-validity-doge";

describe(`Address validity doge, ${getTestFile(__filename)}`, function () {
  it("should confirm valid p2pkh address", function () {
    const address = "DJXvHTVFXxgKPxwCC1MfmHxNySoApA87Pc";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm valid p2sh address", function () {
    const address = "ADNbM5fBujCRBW1vqezNeAWmnsLp19ki3n";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });
});
