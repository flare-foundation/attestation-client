import { getTestFile } from "../test-utils/test-utils";
import { expect } from "chai";
import { VerificationStatus } from "../../src/verification/attestation-types/attestation-types";
import { validCharacters, verifyAddressXRP } from "../../src/servers/verifier-server/src/verification/address-validity/address-validity-xrp";

describe(`Address validity xrp, ${getTestFile(__filename)}`, function () {
  it("should confirm a valid address", function () {
    const address = "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv";

    const resp = verifyAddressXRP(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm a valid address", function () {
    const address = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

    const resp = verifyAddressXRP(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it.only("should confirm a valid address", function () {
    const address = "rrrrrrrrrrrrrrrrrrrrBZbvji";

    console.log(address.length);
    validCharacters(address);

    const resp = verifyAddressXRP(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should not confirm random string 1", function () {
    const address = "afasfasfg";

    const resp = verifyAddressXRP(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm random string 2", function () {
    const address = "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr";

    const resp = verifyAddressXRP(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });
});
