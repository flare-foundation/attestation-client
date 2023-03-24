import { AttestationType, getAttestationTypeName } from "../../src/verification/generated/attestation-types-enum";
import { getTestFile } from "../test-utils/test-utils";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { getRandomRequestForAttestationTypeAndSourceId } from "../../src/verification/generated/attestation-random-utils";
import { SourceId } from "../../src/verification/sources/sources";
import { assertEqualsByScheme, equalsRequest } from "../../src/verification/generated/attestation-request-equals";
import { prefix0xSigned } from "../../src/verification/attestation-types/attestation-types-helpers";
import { array, number } from "yargs";
import { arrayRemoveElement } from "../../src/utils/helpers/utils";

chai.use(chaiAsPromised);

describe(`Misc verifier utils, (${getTestFile(__filename)})`, function () {
  it("Should get attestation type name", function () {
    const res1 = getAttestationTypeName(AttestationType.Payment);
    expect(res1).to.eq("Payment");
    const res2 = getAttestationTypeName(15);
    const res3 = getAttestationTypeName(null);

    expect(res2, "not in enum").to.eq(null);
    expect(res3, "undefined").to.eq(null);
  });

  it("Should remove element from the array", function () {
    let ar: number[][] = [];
    const el1 = [12];
    const el2 = [2, 3];
    ar.push(el1);
    ar.push(el1);
    ar.push(el2);

    arrayRemoveElement(ar, [1]);
    assert(ar.length == 3);
    arrayRemoveElement(ar, el1);

    expect(ar.length).to.eq(2);
  });

  describe("prefixes", function () {
    it("Should prefix signed hex", function () {
      const res = prefix0xSigned("-1a");
      expect(res).to.eq("-0x1a");
    });
  });

  describe("Equality of requests", function () {
    it("Should check that request are not equal if they are of different types", function () {
      const res1 = getRandomRequestForAttestationTypeAndSourceId(AttestationType.ConfirmedBlockHeightExists, SourceId.BTC);
      const res2 = getRandomRequestForAttestationTypeAndSourceId(AttestationType.Payment, SourceId.BTC);
      const res = equalsRequest(res1, res2);
      assert(!res);
    });

    for (let j = 1; j < 5; j++) {
      it(`Should check that request of type ${getAttestationTypeName(j)} are different source`, function () {
        const res1 = getRandomRequestForAttestationTypeAndSourceId(j, SourceId.BTC);
        const res2 = getRandomRequestForAttestationTypeAndSourceId(j, SourceId.ALGO);

        const res = equalsRequest(res1, res2);

        assert(!res);
      });
    }
    it(`Should check that two randomly generated requests equal type and sourceId are different`, function () {
      for (let j = 1; j < 5; j++) {
        for (let i = 0; i < 5; i++) {
          const res1 = getRandomRequestForAttestationTypeAndSourceId(j, i);
          const res2 = getRandomRequestForAttestationTypeAndSourceId(j, i);

          const res = equalsRequest(res1, res2);

          assert(!res, `${getAttestationTypeName(j)}, ${SourceId[i]}`);
        }
      }
    });

    it("Should not check  equality for unknown type", function () {
      expect(() => assertEqualsByScheme(undefined, undefined, "not valid")).to.throw("Wrong type");
    });
  });
});
