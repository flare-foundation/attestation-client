import { getTestFile } from "../test-utils/test-utils";
import { verifyAddressBTC } from "../../src/servers/verifier-server/src/verification/address-validity/address-validity-btc";
import { expect } from "chai";
import { VerificationStatus } from "../../src/verification/attestation-types/attestation-types";

describe(`Address validity btc, ${getTestFile(__filename)}`, function () {
  it("should confirm valid p2pkh address", function () {
    const address = "1EMrwRAgyAoGEVZNZ5JjJbdBscdAeNhGmQ";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm valid p2sh address", function () {
    const address = "3KutBt4wHMh3ikFJ2HfB1sQYWurVFqqrQg";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm valid p2wpkh address", function () {
    const address = "bc1qzgamwn59wf7xnjvmprt8fmdxt5j9jgrwl9vrv5";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm valid p2wpkh address all uppercase", function () {
    const address = "bc1qzgamwn59wf7xnjvmprt8fmdxt5j9jgrwl9vrv5";

    const resp = verifyAddressBTC(address.toUpperCase());

    expect(resp.status).to.eq(VerificationStatus.OK);
    expect(resp.response.standardAddress).to.eq(address);
  });

  it("should confirm valid p2wsh address", function () {
    const address = "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm valid p2tr address", function () {
    const address = "bc1pvsyqs8vfyhag3r47acqhpzchcn5vq2vapym6dlgf4lvekk7cyngs9dfwux";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm valid p2tr address 2", function () {
    const address = "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should confirm", function () {
    const address = "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.OK);
  });

  it("should not confirm random string", function () {
    const address = "asfasf";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm invalid p2pkh address", function () {
    const address = "1EMrwRAgyAoGEVZNZ5JjJbdBscdAeNhGmO";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm invalid p2sh address", function () {
    const address = "3dutBt4wHMh3ikFJ2HfB1sQYWurVFqqrQg";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm invalid p2wsh address", function () {
    const address = "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce1xj0gdcccefvpysxf3qccfmvz";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm invalid length version 0", function () {
    const address = "BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm valid mixedcase p2wsh address", function () {
    const address = "bc1qrp33g0q5c5tXsp9arysrx4k6zdkfs4nce1xj0gdcccefvpysxf3qccfmvz";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm version 0 address with new checksum", function () {
    const address = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm address with zero padding of more than 4 bits", function () {
    const address = "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v07qwwzcrf";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm version 1 address with old checksum", function () {
    const address = "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7k7grplx";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm segwit address with higher version", function () {
    const address = "bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });

  it("should not confirm testnet segwit address", function () {
    const address = "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7";

    const resp = verifyAddressBTC(address);

    expect(resp.status).to.eq(VerificationStatus.NOT_CONFIRMED);
  });
});
