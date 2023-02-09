import { expect, assert } from "chai";
import { AttesterState } from "../../src/attester/AttesterState";
import { DBRoundResult } from "../../src/entity/attester/dbRoundResult";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

describe(`Attester State (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const databaseConnectOptions = new DatabaseConnectOptions();

  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  const attesterState = new AttesterState(dataService);

  it("Should construct AttesterState", function () {
    assert(attesterState);
  });

  it("Should get entity manager", function () {
    const res = attesterState.entityManager;
    assert(res);
  });

  describe.skip("bitVotes", function () {
    it("Should save voted bit vote", async function () {
      const state = new DBRoundResult();
      state.roundId = 1434;
      await attesterState.saveRoundBitVoted(15, 1724398, "0xfaketx", "0xfakevote");
      await attesterState.entityManager.getRepository(DBRoundResult).save(state);
      const res = await attesterState.entityManager.getRepository(DBRoundResult).findOne({});
      expect(res.bitVote).to.eq("0xfakevote");
    });
  });
});
