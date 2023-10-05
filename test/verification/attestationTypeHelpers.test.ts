import { expect } from "chai";
import { randomListElement } from "../../src/verification/attestation-types/attestation-types-helpers";
import { getTestFile } from "../test-utils/test-utils";

describe(`Attestation Helpers Tests (${getTestFile(__filename)})`, function () {
  describe(`randomListElement`, function () {
    it("empty array", function () {
      const arr: number[] = []
      const randomElem = randomListElement(arr);

      expect(randomElem).to.eq(undefined);
      expect(typeof randomElem).to.eq('undefined')
    });
  });
});
