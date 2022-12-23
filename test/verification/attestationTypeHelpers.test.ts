import { expect } from "chai";
import { numberLikeToNumber, randomListElement } from "../../src/verification/attestation-types/attestation-types-helpers";
import { getTestFile } from "../test-utils/test-utils";

describe(`Attestation Helpers Tests (${getTestFile(__filename)})`, function () {
  describe(`numberLikeToNumber`, function () {
    it("string to number safe", function () {
      const num = "9007199254740991";
      const convertedNumber = numberLikeToNumber(num);

      expect(convertedNumber).to.eq(Number.MAX_SAFE_INTEGER);
      expect(Number.isSafeInteger(convertedNumber)).to.eq(true);
    });

    it("string to number unsafe", function () {
      const num = "9007199254740992";
      const convertedNumber = numberLikeToNumber(num);

      expect(convertedNumber).to.eq(Number.MAX_SAFE_INTEGER + 1);
      expect(convertedNumber).to.not.eq(Number.MAX_SAFE_INTEGER);
      expect(Number.isSafeInteger(convertedNumber)).to.eq(false);
    });
  });

  describe(`randomListElement`, function () {
    it("empty array", function () {
      const arr: number[] = []
      const randomElem = randomListElement(arr);

      expect(randomElem).to.eq(undefined);
      expect(typeof randomElem).to.eq('undefined')
    });
  });
});
