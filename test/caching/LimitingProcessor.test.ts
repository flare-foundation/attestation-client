import { ChainType, UtxoMccCreate } from "@flarenetwork/mcc";
import sinon from "sinon";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { DelayedExecution, LimitingProcessor } from "../../lib/caching/LimitingProcessor";
import { Interlacing } from "../../lib/indexer/interlacing";
import { DatabaseConnectOptions, DatabaseService } from "../../lib/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { sleepms } from "../../lib/utils/utils";
import { getTestFile } from "../test-utils/test-utils";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;

describe(`Limiting processor (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  describe("Delayed execution", () => {
    async function testFunc() {
      await sleepms(10);
      return "Succes";
    }

    async function testFuncFail() {
      await sleepms(10);
      throw "Fail";
    }

    let results = [];

    const delayedExecution = new DelayedExecution(
      testFunc,
      (res) => {
        results.push({ result: res, passed: 1 });
      },
      (res) => {
        results.push({ result: res, passed: -1 });
      }
    );

    const delayedExecutionFail = new DelayedExecution(
      testFuncFail,
      (res) => {
        results.push({ result: res, passed: 1 });
      },
      (res) => {
        results.push({ result: res, passed: -1 });
      }
    );

    it("Should create a DelayedExecution", () => {
      expect(delayedExecution).not.to.be.undefined;
    });

    it("Should run a DelayedExecution", async () => {
      await delayedExecution.run();
      expect(results[0]).to.be.deep.equal({ result: "Succes", passed: 1 });
    });

    it("Should catch an error DelayedExecution", async () => {
      await delayedExecutionFail.run();
      expect(results[1]).to.be.deep.equal({ result: "Fail", passed: -1 });
    });
  });

  describe("Limiting Processor", () => {
    const databaseConnectOptions = new DatabaseConnectOptions();
    const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

    const BtcMccConnection = {
      url: process.env.BTC_URL,
      username: process.env.BTC_USERNAME,
      password: process.env.BTC_PASSWORD,
    } as UtxoMccCreate;

    let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
      transactionCacheSize: 2,
      blockCacheSize: 2,
      cleanupChunkSize: 2,
      activeLimit: 1,
      clientConfig: BtcMccConnection,
    };

    const interlacing = new Interlacing();
    let limitingProcessor: LimitingProcessor;
    const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);

    before(async () => {
      initializeTestGlobalLogger();
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
      limitingProcessor = new LimitingProcessor(cachedClient);
      limitingProcessor.settings.retry = 4;
    });

    it("Should create limitingProcessor", async () => {
      expect(limitingProcessor).to.not.be.undefined;
      expect(limitingProcessor.isActive).to.be.true;
    });

    it("Should ignore resume", async () => {
      let res = await limitingProcessor.resume();
      expect(res).to.be.undefined;
      expect(limitingProcessor.isActive).to.be.true;
    });

    it("Should pause", () => {
      limitingProcessor.pause();
      expect(limitingProcessor.isActive).to.be.false;
    });

    it("Should registerTopLevelJob", () => {
      limitingProcessor.registerTopLevelJob();
      expect(limitingProcessor.topLevelJobsCounter).to.be.eq(1);
    });

    it("Should markTopLevelJobDone", () => {
      limitingProcessor.markTopLevelJobDone();
      expect(limitingProcessor.topLevelJobsDoneCounter).to.be.eq(1);
    });

    // fails
    //Put tasks in queue then run processor and expect it to run tasks
    it("Should call function and put it into the queue and call it after resume", async function (done) {
      const preFake1 = sinon.fake();
      const preFake2 = sinon.fake();
      console.log("tu smo 0");
      limitingProcessor
        .call(preFake1)
        .then(() => {
          limitingProcessor.call(preFake2).catch((e) => getGlobalLogger().error("limiting processor failed"));
          expect(limitingProcessor.queue.size).to.be.eq(1);
        })
        .then(() => {
          expect(preFake1.callCount).to.be.eq(1);
          expect(preFake2.callCount).to.be.eq(1);
          done();
        })
        .catch((err) => done(err));
      await limitingProcessor.resume();
    });

    it("Should call and process while running with debug on", function () {
      expect(limitingProcessor.isCompleted).to.be.false;

      limitingProcessor.resume(true).catch((e) => getGlobalLogger().error("Limiting processor resume failed"));

      expect(limitingProcessor.isActive).to.be.true;
      const firstFake = sinon.fake();
      const secondFake = sinon.fake();
      const thirdFake = sinon.fake();

      expect(limitingProcessor.isActive).to.be.true;
      limitingProcessor.debugOn();
      return limitingProcessor
        .call(firstFake)
        .then(() => limitingProcessor.call(secondFake))
        .then(() => limitingProcessor.call(thirdFake, true))
        .then(() => sleepms(1000))
        .then(() => expect(secondFake.callCount).to.be.equal(1))
        .then(() => expect(firstFake.callCount).to.be.equal(1))
        .then(() => expect(secondFake.calledAfter(thirdFake)).to.be.false);
    });

    // takes long time
    it.skip("Should ignore undefined tasks", function () {
      const testTask = null;
      // const spy = sinon.spy(testTask);

      return limitingProcessor.call(testTask).then(() => {
        console.log(12);
      });
    });

    it("Should destroy queue", async () => {
      limitingProcessor.pause();
      expect(limitingProcessor.isActive).to.be.false;
      limitingProcessor
        .call(() => {
          console.log("first");
          return "54321";
        }, true)
        .catch((e) => getGlobalLogger().error("Limiting processor call failed"));
      expect(limitingProcessor.queue.size).to.be.eq(1);
      limitingProcessor.destroy();
      expect(limitingProcessor.queue.size).to.be.eq(0);
    });

    it("Should stop", async () => {
      limitingProcessor.stop();
      expect(limitingProcessor.isActive).to.be.false;
      expect(limitingProcessor.isCompleted).to.be.true;
    });

    // crashes
    it.skip("Should initializeJobs throw an error", async function () {
      await expect(limitingProcessor.initializeJobs(null, null)).to.be.rejected;
    });

    describe("debug", function () {
      it("Should show debug info", function () {
        limitingProcessor.debugInfo();
      });

      it("Should turn debug off", function () {
        limitingProcessor.debugOff();
      });

      it("Should turn debug on", function () {
        limitingProcessor.debugOn();
      });

      it("Should turn debug off", function () {
        limitingProcessor.debugOff();
      });
    });
  });
});
