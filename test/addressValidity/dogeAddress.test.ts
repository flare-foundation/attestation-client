import { getTestFile } from "../test-utils/test-utils";
import { expect, assert } from "chai";
import { VerificationStatus } from "../../src/verification/attestation-types/attestation-types";
import { verifyAddressDOGE } from "../../src/servers/verifier-server/src/verification/address-validity/address-validity-doge";
import { AddressValidity_Request, AddressValidity_RequestBody } from "../../src/servers/verifier-server/src/dtos/attestation-types/AddressValidity.dto";
import { DOGEAddressValidityVerifierService } from "../../src/servers/verifier-server/src/services/doge/doge-address-validity-verifier.service";
import { ZERO_BYTES_32, encodeAttestationName } from "../../src/external-libs/utils";

describe(`Address validity doge, ${getTestFile(__filename)}`, function () {
  it("should confirm valid p2pkh address", function () {
    const address = "DJXvHTVFXxgKPxwCC1MfmHxNySoApA87Pc";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
    assert(resp.response.isValid);
  });

  it("should confirm valid p2sh address 1", function () {
    const address = "ADNbM5fBujCRBW1vqezNeAWmnsLp19ki3n";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
    assert(resp.response.isValid);
  });

  it("should confirm valid p2sh address 1", function () {
    const address = "9vtqCtAkxNM516GXbiLpMePpizZEisT8pN";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
    assert(resp.response.isValid);
  });

  it("should not confirm random string", function () {
    const address = "afasfasfg";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
    assert(!resp.response.isValid);
  });

  it("should not confirm address with invalid character", function () {
    const address = "njrpt4uw8ApfaHVwwxWWPigqTx5XxN7axV";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
    assert(!resp.response.isValid);
  });

  it("should not confirm valid testnet address string", function () {
    const address = "9vtqCtAkxNM516GXbILpMePpizZEisT8pN";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
    assert(!resp.response.isValid);
  });

  it("should not confirm invalid p2sh address 1", function () {
    const address = "9vtcCtAkxNM516GXbiLpMePpizZEisT8pN";

    const resp = verifyAddressDOGE(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
    assert(!resp.response.isValid);
  });

  describe("server functions", function () {
    const requestBody: AddressValidity_RequestBody = {
      addressStr: "DJXvHTVFXxgKPxwCC1MfmHxNySoApA87Pc",
    };

    const attestationType = encodeAttestationName("AddressValidity");
    const sourceId = encodeAttestationName("DOGE");

    const request: AddressValidity_Request = {
      attestationType,
      sourceId,
      messageIntegrityCode: ZERO_BYTES_32,
      requestBody,
    };

    const services = new DOGEAddressValidityVerifierService();

    it("should compute mic", async function () {
      const mic = await services.mic(request);

      expect(mic.messageIntegrityCode.length).to.eq(66);
    });

    it("should prepare request", async function () {
      const encoded = await services.prepareRequest(request);

      delete request.messageIntegrityCode;
      const encoded2 = await services.prepareRequest(request);

      expect(encoded.abiEncodedRequest).to.eq(encoded2.abiEncodedRequest);
    });
  });
});
