import { ChainType } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { VerifierConfigurationService } from "../../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { AttLogger, getGlobalLogger, initializeTestGlobalLogger } from "../../../src/utils/logger";
import { Test } from '@nestjs/testing';
import { VerifierServerModule } from "../../../src/servers/verifier-server/src/verifier-server.module";
import { WsAdapter } from "@nestjs/platform-ws";
import { getEntityManagerToken } from "@nestjs/typeorm";
import { generateTestIndexerDB, selectedReferencedTx } from "../../indexed-query-manager/utils/indexerTestDataGenerator";
import { AttestationData } from "../../../src/attester/AttestationData";
import { encodeRequest } from "../../../src/verification/generated/attestation-request-encode";
import { Attestation } from "../../../src/attester/Attestation";
import { ARType } from "../../../src/verification/generated/attestation-request-types";
import { DBTransactionBase, DBTransactionBTC0, DBTransactionXRP0 } from "../../../src/entity/indexer/dbTransaction";
import { getUnixEpochTimestamp } from "../../../src/utils/utils";
import { DBBlockBTC, DBBlockXRP } from "../../../src/entity/indexer/dbBlock";
import { option } from "yargs";

export interface VerifierBootstrapOptions {
   lastTimestamp?: number;
   whichXRP?: number;
   whichBTC?: number;
   CONFIG_PATH: string;
   FIRST_BLOCK: number;
   LAST_BLOCK: number;
   LAST_CONFIRMED_BLOCK: number;
   TXS_IN_BLOCK: number;
   BLOCK_CHOICE: number;
}

export interface VerifierTestSetup {
   app: INestApplication;
   selectedTransaction: DBTransactionBase;
   entityManager: EntityManager;
   config: VerifierConfigurationService;
}
export interface VerifierTestSetups {
   lastTimestamp: number;
   startTime: number;
   XRP: VerifierTestSetup;
   BTC: VerifierTestSetup;
   logger: AttLogger;
};

export async function bootstrapTestVerifiers(options: VerifierBootstrapOptions, initTestLogger = true) {
   delete process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST;
   if (initTestLogger) {
      initializeTestGlobalLogger();
   }
   const logger = getGlobalLogger("web");

   let lastTimestamp = options.lastTimestamp ?? getUnixEpochTimestamp();

   let appXRP = await bootstrapVerifier("xrp", lastTimestamp, DBBlockXRP, DBTransactionXRP0, logger, options);
   let entityManagerXRP = appXRP.get(getEntityManagerToken("indexerDatabase"));
   let configXRP = appXRP.get("VERIFIER_CONFIG") as VerifierConfigurationService;
   let selectedTransactionXRP = await selectedReferencedTx(entityManagerXRP, DBTransactionXRP0, options.BLOCK_CHOICE, options.whichXRP ?? 0);

   let appBTC = await bootstrapVerifier("btc", lastTimestamp, DBBlockBTC, DBTransactionBTC0, logger, options);
   let entityManagerBTC = appBTC.get(getEntityManagerToken("indexerDatabase"));
   let configBTC = appBTC.get("VERIFIER_CONFIG") as VerifierConfigurationService;
   let selectedTransactionBTC = await selectedReferencedTx(entityManagerBTC, DBTransactionBTC0, options.BLOCK_CHOICE, options.whichBTC ?? 0);

   let startTime = lastTimestamp - (options.LAST_BLOCK - options.FIRST_BLOCK);
   console.log(`BLOCK TIMES: from: ${startTime} to: ${lastTimestamp}`)
   return {
      startTime,
      lastTimestamp,
      XRP: {
         app: appXRP,
         entityManager: entityManagerXRP,
         config: configXRP,
         selectedTransaction: selectedTransactionXRP
      },
      BTC: {
         app: appBTC,
         entityManager: entityManagerBTC,
         config: configBTC,
         selectedTransaction: selectedTransactionBTC
      }
   } as VerifierTestSetups;

}

export async function bootstrapVerifier(
   verifierType: 'xrp' | 'btc',
   lastTimestamp: number,
   dbBlock: any,
   dbTransaction: any,
   logger: AttLogger,
   options: VerifierBootstrapOptions
): Promise<INestApplication> {
   process.env.CONFIG_PATH = options.CONFIG_PATH;
   process.env.NODE_ENV = "development";
   process.env.VERIFIER_TYPE = verifierType;

   const chainType = ChainType[verifierType.toUpperCase()]
   let app: INestApplication;
   let configurationService: VerifierConfigurationService;
   let entityManager: EntityManager;

   const module = await Test.createTestingModule({
      imports: [VerifierServerModule]
   }).compile();
   app = module.createNestApplication();
   app.useWebSocketAdapter(new WsAdapter(app));
   await app.init();

   configurationService = app.get("VERIFIER_CONFIG") as VerifierConfigurationService;
   entityManager = app.get(getEntityManagerToken("indexerDatabase"));

   let port = configurationService.config.port;
   await app.listen(port, undefined, () => {
      logger.info(`Server started listening at http://localhost:${configurationService.config.port}`);
      logger.info(`Websocket server started listening at ws://localhost:${configurationService.config.port}`)
   })


   await generateTestIndexerDB(
      chainType,
      entityManager,
      dbBlock,
      dbTransaction,
      options.FIRST_BLOCK,
      options.LAST_BLOCK,
      lastTimestamp,
      options.LAST_CONFIRMED_BLOCK,
      options.TXS_IN_BLOCK,
      lastTimestamp
   );
   return app;
}

export function prepareAttestation(request: ARType, startTime: number): Attestation {
   const data = new AttestationData();
   data.type = request.attestationType;
   data.sourceId = request.sourceId;
   data.request = encodeRequest(request);
   const attestation = new Attestation(undefined, data);
   // attestation.windowStartTime = startTime + 1;
   return attestation;
}
