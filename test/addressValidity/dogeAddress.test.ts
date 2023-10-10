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

  it("should confirm valid p2sh address 1", function () {
    const address = "ADNbM5fBujCRBW1vqezNeAWmnsLp19ki3n";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm valid p2sh address 1", function () {
    const address = "9vtqCtAkxNM516GXbiLpMePpizZEisT8pN";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should not confirm random string", function () {
    const address = "afasfasfg";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm address with invalid character", function () {
    const address = "njrpt4uw8ApfaHVwwxWWPigqTx5XxN7axV";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm valid testnet address string", function () {
    const address = "9vtqCtAkxNM516GXbILpMePpizZEisT8pN";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm invalid p2sh address 1", function () {
    const address = "9vtcCtAkxNM516GXbiLpMePpizZEisT8pN";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });
});
