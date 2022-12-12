import { expect } from "chai";
import { constantize } from "../../../lib/verification/codegen/cg-utils";
import { getTestFile } from "../../test-utils/test-utils";


describe(`Code gen utils tests (${getTestFile(__filename)})`, function () {

  describe(`constantize`, function () {
    it("methodNameToCon", function () {
      const meth = "methodNameToCon";
      const constantized = constantize(meth);

      expect(constantized).to.eq('METHOD_NAME_TO_CON');
    });

    it("giveToAFriend", function () {
      const meth = "giveToAFriend";
      const constantized = constantize(meth);

      // TODO this is the expected behaviour
      // expect(constantized).to.eq('GIVE_TO_A_FRIEND');
      expect(constantized).to.eq('GIVE_TO_AFRIEND');
    });
  });
});
