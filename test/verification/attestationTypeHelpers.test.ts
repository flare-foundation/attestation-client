import { expect } from "chai";
import { numberLikeToNumber } from "../../lib/verification/attestation-types/attestation-types-helpers";

describe(`Attestation Helpers Tests`, function () {
  describe(`number like to number`, function () {
    it("string to number", function () {
      const num = "9007199254740991";
      const convertedNumber = numberLikeToNumber(num);

      expect(convertedNumber).to.eq(Number.MAX_SAFE_INTEGER);
      expect(Number.isSafeInteger(convertedNumber)).to.eq(true);
    });

    it("string to number", function () {
      const num = "9007199254740992";
      const convertedNumber = numberLikeToNumber(num);

      expect(convertedNumber).to.eq(Number.MAX_SAFE_INTEGER + 1);
      expect(convertedNumber).to.not.eq(Number.MAX_SAFE_INTEGER);
      expect(Number.isSafeInteger(convertedNumber)).to.eq(false);
    });
  });
});
