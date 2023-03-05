import { expect, assert } from "chai";
import { AttestationRound } from "../../src/attester/AttestationRound";
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

  before(async function () {
    await dataService.connect();
  });

  it("Should construct AttesterState", function () {
    assert(attesterState);
  });

  it("Should get entity manager", function () {
    const res = attesterState.entityManager;
    assert(res);
  });

  describe("save round", function () {
    it("Should save round", async function () {
      let round = new AttestationRound(20, undefined, undefined, undefined, undefined, undefined, undefined);
      round.roundRandom = "2001";
      round.roundMerkleRoot = "0x000000fake";
      round.roundMaskedMerkleRoot = "0x00000moreFake";
      await attesterState.saveRound(round);
      const res = await attesterState.entityManager.findOne(DBRoundResult, { where: { roundId: 20 } });
      expect(res.random).to.eq("2001");
    });

    it("Should save comment", async function () {
      let round = new AttestationRound(21, undefined, undefined, undefined, undefined, undefined, undefined);
      round.roundRandom = "2001";
      round.roundMerkleRoot = "0x000000fakealt";
      round.roundMaskedMerkleRoot = "0x00000moreFakealt";
      await attesterState.saveRoundComment(round);
      const res = await attesterState.entityManager.findOne(DBRoundResult, { where: { roundId: 21 } });
      expect(res.transactionCount).to.eq(0);
    });
  });

  describe("bitVotes", function () {
    it("Should save voted bit vote", async function () {
      const state = new DBRoundResult();
      state.roundId = 1434;
      await attesterState.saveRoundBitVoted(15, 1724398, "0xfakeTx", "0xfakeVote");
      const res = await attesterState.entityManager.findOne(DBRoundResult, { where: { roundId: 15 } });
      expect(res.bitVote).to.eq("0xfakeVote");
    });

    it("Should saveRoundBitVoteResult", async function () {
      const state = new DBRoundResult();
      state.roundId = 1434;
      await attesterState.saveRoundBitVoteResult(15, "0xfakeVoteWin");
      const res = await attesterState.entityManager.findOne(DBRoundResult, { where: { roundId: 15 } });
      expect(res.bitVoteResult).to.eq("0xfakeVoteWin");
    });

    it("Should saveRoundCommitted vote", async function () {
      const state = new DBRoundResult();
      state.roundId = 1434;
      await attesterState.saveRoundCommitted(15, 1724398, "0xfakeTxId");
      const res = await attesterState.entityManager.findOne(DBRoundResult, { where: { roundId: 15 } });
      expect(res.commitTransactionId).to.eq("0xfakeTxId");
    });

    it("Should saveRoundRevealed vote", async function () {
      const state = new DBRoundResult();
      state.roundId = 1434;
      await attesterState.saveRoundRevealed(15, 1724398, "0xfakeTxIdRev");
      const res = await attesterState.entityManager.findOne(DBRoundResult, { where: { roundId: 15 } });
      expect(res.revealTransactionId).to.eq("0xfakeTxIdRev");
    });

    it("Should getRound results", async function () {
      const res = await attesterState.getRound(15);
      expect(res.bitVote).to.eq("0xfakeVote");
    });

    it("Should not getRound results", async function () {
      const res = await attesterState.getRound(16);
      expect(res).to.be.undefined;
    });
  });
});
