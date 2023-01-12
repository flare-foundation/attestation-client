
import { expectEvent, expectRevert, time } from "@openzeppelin/test-helpers";
import { BitVotingInstance } from "../../typechain-truffle";
import { BitVoting } from "../../typechain-web3-v1/BitVoting";
import { getTestFile } from "../test-utils/test-utils";

const BitVoting = artifacts.require("BitVoting");

describe(`BitVoting (${getTestFile(__filename)})`, function () {

  let bitVoting: BitVotingInstance;
  let BUFFER_TIMESTAMP_OFFSET: number;
  let BUFFER_WINDOW: number;
  let BIT_VOTE_DEADLINE: number;
  let now: number = 0;

  beforeEach(async () => {
    bitVoting = await BitVoting.new();
    BUFFER_TIMESTAMP_OFFSET = (await bitVoting.BUFFER_TIMESTAMP_OFFSET()).toNumber();
    BUFFER_WINDOW = (await bitVoting.BUFFER_WINDOW()).toNumber();
    BIT_VOTE_DEADLINE = (await bitVoting.BIT_VOTE_DEADLINE()).toNumber();
  });

  it("Should successfully vote", async function () {
    now = (await time.latest()).toNumber();
    let data = "0x1234";
    let currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
    let windowStartTime = BUFFER_TIMESTAMP_OFFSET + currentBufferNumber * BUFFER_WINDOW;
    let delay = now - windowStartTime;
    if (delay > BIT_VOTE_DEADLINE) {
      await time.increaseTo(now + BIT_VOTE_DEADLINE);
      currentBufferNumber++;
    }
    let receipt = await bitVoting.submitVote(currentBufferNumber, data);
    expectEvent(receipt, "BitVote", { data });
  });

  it("Should fail if wrong buffer number", async function () {
    now = (await time.latest()).toNumber();
    let data = "0x1234";
    let currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
    let promise = bitVoting.submitVote(currentBufferNumber + 1, data);
    await expectRevert(promise, "wrong bufferNumber");
  });

  it("Should fail voting too late", async function () {
    now = (await time.latest()).toNumber();
    let data = "0x1234";
    let currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
    let windowStartTime = BUFFER_TIMESTAMP_OFFSET + currentBufferNumber * BUFFER_WINDOW;
    let delay = now - windowStartTime;
    if (delay < BIT_VOTE_DEADLINE) {
      await time.increaseTo(now + BIT_VOTE_DEADLINE);
    }

    let promise = bitVoting.submitVote(currentBufferNumber, data);
    await expectRevert(promise, "bit vote deadline passed");
  });


});
