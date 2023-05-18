import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { getRandomRequestForAttestationTypeAndSourceId } from "../../src/verification/generated/attestation-random-utils";
import { AttestationType, getAttestationTypeName } from "../../src/verification/generated/attestation-types-enum";
import { SourceId, getSourceName, toSourceId } from "../../src/verification/sources/sources";
import { getTestFile } from "../test-utils/test-utils";
import { arrayRemoveElement } from "../../src/utils/helpers/utils";
import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionStore";
import { prefix0xSigned } from "../../src/verification/attestation-types/attestation-types-helpers";
import { assertEqualsByScheme } from "../../src/verification/attestation-types/attestation-types-utils";

chai.use(chaiAsPromised);

let defStore = new AttestationDefinitionStore()

describe(`Misc verifier utils, (${getTestFile(__filename)})`,  function () {
  before(async function () {
    await defStore.initialize();
  })

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

  it("Should not get source name", function () {
    const res = getSourceName(15);
    expect(res).to.eq(null);
  });

  it("Should  convert to source id", function () {
    const res1 = toSourceId(15);
    expect(res1).to.eq(15);

    const res2 = toSourceId(undefined);
    expect(res2).to.eq(-1);
  });

  describe("Equality of requests", function () {
    it("Should check that request are not equal if they are of different types", function () {
      const res1 = getRandomRequestForAttestationTypeAndSourceId(AttestationType.ConfirmedBlockHeightExists, SourceId.BTC);
      const res2 = getRandomRequestForAttestationTypeAndSourceId(AttestationType.Payment, SourceId.BTC);
      const res = defStore.equalsRequest(res1, res2);
      assert(!res);
    });

    for (let j = 1; j < 5; j++) {
      it(`Should check that request of type ${getAttestationTypeName(j)} are different source`, function () {
        const res1 = getRandomRequestForAttestationTypeAndSourceId(j, SourceId.BTC);
        const res2 = getRandomRequestForAttestationTypeAndSourceId(j, SourceId.ALGO);

        const res = defStore.equalsRequest(res1, res2);

        assert(!res);
      });
    }
    it(`Should check that two randomly generated requests equal type and sourceId are different`, function () {
      for (let j = 1; j < 5; j++) {
        for (let i = 0; i < 5; i++) {
          const res1 = getRandomRequestForAttestationTypeAndSourceId(j, i);
          const res2 = getRandomRequestForAttestationTypeAndSourceId(j, i);

          const res = defStore.equalsRequest(res1, res2);

          assert(!res, `${getAttestationTypeName(j)}, ${SourceId[i]}`);
        }
      }
    });

    it("Should not check  equality for unknown type", function () {
      expect(() => assertEqualsByScheme(undefined, undefined, "not valid")).to.throw("Wrong type");
    });
  });
});
