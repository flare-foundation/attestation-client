import { ChainType, MCC } from "@flarenetwork/mcc";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { arrayRemoveElement } from "../../src/utils/helpers/utils";
import { prefix0xSigned } from "../../src/verification/attestation-types/attestation-types-helpers";
import { randomBalanceDecreasingTransactionExample } from "../random-example-generators/BalanceDecreasingTransaction";
import { randomConfirmedBlockHeightExistsExample } from "../random-example-generators/ConfirmedBlockHeightExists";
import { randomPaymentExample } from "../random-example-generators/Payment";
import { randomReferencedPaymentNonexistenceExample } from "../random-example-generators/ReferencedPaymentNonexistence";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

const  defStore = new AttestationDefinitionStore("configs/type-definitions")
const SOURCES = ["XRP", "BTC", "DOGE"];
const ATTESTATION_TYPES = ["Payment", "BalanceDecreasingTransaction", "ConfirmedBlockHeightExists", "ReferencedPaymentNonexistence"]
const VOTING_ROUND = 100;
const RANDOM_GENERATOR = {
  "Payment": randomPaymentExample, 
  "BalanceDecreasingTransaction": randomBalanceDecreasingTransactionExample, 
  "ConfirmedBlockHeightExists": randomConfirmedBlockHeightExistsExample, 
  "ReferencedPaymentNonexistence": randomReferencedPaymentNonexistenceExample
}

describe(`Misc verifier utils, (${getTestFile(__filename)})`,  function () {
  before(async function () {
  })

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
    const res = MCC.getChainTypeName(ChainType.invalid);
    expect(res).to.eq("invalid");
  });

  describe("Equality of requests", function () {
    it("Should check that request are not equal if they are of different types", function () {
      const res1 = randomConfirmedBlockHeightExistsExample(100, "BTC").request;
      const res2 = randomPaymentExample(100, "BTC").request;
      const res = defStore.equalsRequest(res1, res2);
      assert(!res);
    });

    for (let attestationType of ATTESTATION_TYPES) {
      it(`Should check that request of type ${attestationType} are different source`, function () {
        const res1 = RANDOM_GENERATOR[attestationType](VOTING_ROUND, "BTC").request;
        const res2 = RANDOM_GENERATOR[attestationType](VOTING_ROUND, "DOGE").request;
        const res = defStore.equalsRequest(res1, res2);
        assert(!res);
      });
    }
    it(`Should check that two randomly generated requests equal type and sourceId are different`, function () {
      for (let attestationType of ATTESTATION_TYPES) {
        for (let sourceId of SOURCES) {
          const res1 = RANDOM_GENERATOR[attestationType](VOTING_ROUND, sourceId, true).request;
          const res2 = RANDOM_GENERATOR[attestationType](VOTING_ROUND, sourceId, true).request;
          const res = defStore.equalsRequest(res1, res2);
          assert(!res, `${attestationType}, ${sourceId}`);
        }
      }
    });
  });
});
