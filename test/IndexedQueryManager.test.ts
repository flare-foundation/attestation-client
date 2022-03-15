import { ChainType, MCC } from "flare-mcc";
import { IndexedQueryManager, IndexedQueryManagerOptions } from "../lib/indexed-query-manager/IndexedQueryManager";
import * as config from "../configs/config-indexer.json"
import { AttesterClientConfiguration } from "../lib/attester/AttesterClientConfiguration";
import { getSourceName } from "../lib/verification/attestation-types/attestation-types-helpers";
import { AttLogger, getGlobalLogger } from "../lib/utils/logger";
import { DotEnvExt } from "../lib/utils/DotEnvExt";

console.log("This test should run while XRP indexer is running")
 
const CHAIN_ID = ChainType.XRP;
const MINUTES = 60;
const HISTORY_WINDOW = 5 * MINUTES;

DotEnvExt();

describe("Indexed query manager", () => {
   let indexedQueryManager: IndexedQueryManager;
   let client: MCC.XRP;
   let configuration: AttesterClientConfiguration;
   let chainName: string;
   let logger: AttLogger;
   let startTime = 0;

   
   before(async () => {
      configuration = config as any as AttesterClientConfiguration;
      chainName = getSourceName(CHAIN_ID);
      let chainConfiguration = config.chains.find(chain => chain.name === chainName);
      client = MCC.Client(CHAIN_ID, {
         ...chainConfiguration.mccCreate,
         rateLimitOptions: chainConfiguration.rateLimitOptions
       }) as MCC.XRP;
       logger = getGlobalLogger(chainName);
       startTime = Math.floor(Date.now()/1000) - HISTORY_WINDOW;
       const options: IndexedQueryManagerOptions = {
         chainType: ChainType.XRP,
         noConfirmations: 1,
         // todo: return epochStartTime - query window length, add query window length into DAC
         windowStartTime: (epochId: number) => { return startTime; }
       };      
      indexedQueryManager = new IndexedQueryManager(client, options);
      await indexedQueryManager.dbService.waitForDBConnection();
   });

   it("Should get last confirmed block number", async () => {
      let lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
      assert(lastConfirmedBlock > 0);
      console.log(`Last confirmed block ${lastConfirmedBlock}`);
      console.log(await indexedQueryManager.getRandomTransaction())
   });


   it("Should get a transaction from old enough block", async () => {
   });

   it("Should query transactions by payment reference", async () => {
   });

   it("Should get a block by a hash", async () => {
   });
});
