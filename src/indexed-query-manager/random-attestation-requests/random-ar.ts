import { BtcTransaction, DogeTransaction, MccClient, XrpTransaction } from "@flarenetwork/mcc";
import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { AttestationDefinitionStore } from "../../external-libs/AttestationDefinitionStore";
import { getUnixEpochTimestamp } from "../../utils/helpers/utils";
import { AttLogger } from "../../utils/logging/logger";
import { IndexedQueryManager } from "../IndexedQueryManager";
import { prepareRandomizedRequestPayment } from "./random-ar-00001-payment";
import { prepareRandomizedRequestBalanceDecreasingTransaction } from "./random-ar-00002-balance-decreasing-transaction";
import { prepareRandomizedRequestConfirmedBlockHeightExists } from "./random-ar-00003-confirmed-block-height-exists";
import { prepareRandomizedRequestReferencedPaymentNonexistence } from "./random-ar-00004-referenced-payment-nonexistence";
import { RandomDBIterator, fetchRandomConfirmedBlocks, fetchRandomTransactions } from "./random-query";

/////////////////////////////////////////////////////////////////
// Helper functions for generating random attestation requests
// for specific attestation types by using indexer database
/////////////////////////////////////////////////////////////////

export async function getRandomAttestationRequest(
  defStore: AttestationDefinitionStore,
  logger: AttLogger,
  randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>,
  indexedQueryManager: IndexedQueryManager,
  sourceId: string,
  client?: MccClient
) {
  let TransactionClass: new (...args: any[]) => any;

  switch(sourceId) {
    case "BTC":
      TransactionClass = BtcTransaction;
      break;
    case "DOGE":
      TransactionClass = DogeTransaction;
      break;
    case "XRP":
      TransactionClass = XrpTransaction;
      break;
    default:
      throw new Error("Invalid sourceId");
  }

  const { attestationType, generator } = randomGeneratorChoiceWithAttestationType(randomGenerators);
  if (generator.size <= 0) {
    console.log(`Empty generator ${generator.label}`);
    return null;
  }
  const txOrBlock = await generator.next();

  switch (attestationType) {
    case "Payment":
      return prepareRandomizedRequestPayment(defStore, logger, indexedQueryManager, txOrBlock as DBTransactionBase, sourceId, TransactionClass, undefined, client);
    case "BalanceDecreasingTransaction":
      return prepareRandomizedRequestBalanceDecreasingTransaction(defStore, logger, indexedQueryManager, txOrBlock as DBTransactionBase, sourceId, TransactionClass, undefined, client);
    case "ConfirmedBlockHeightExists":
      return prepareRandomizedRequestConfirmedBlockHeightExists(defStore, logger, indexedQueryManager, txOrBlock as DBBlockBase, sourceId, TransactionClass, undefined, client);
    case "ReferencedPaymentNonexistence":
      return prepareRandomizedRequestReferencedPaymentNonexistence(defStore, logger, indexedQueryManager, txOrBlock as DBTransactionBase, sourceId, TransactionClass, undefined, client);
    default:
      throw new Error("Invalid attestation type");
  }
}

// export function createTestAttestationFromRequest(defStore: AttestationDefinitionStore, request: ARBase, roundId: number, logger?: AttLogger): Attestation {
//   try {
//     const data = new AttestationData();
//     data.type = request.attestationType;
//     data.sourceId = request.sourceId;
//     data.request = defStore.encodeRequest(request);
//     const attestation = new Attestation(undefined, data);
//     attestation.setTestRoundId(roundId);
//     return attestation;
//   } catch (e) {
//     logger?.error(`Error creating attestation from request: ${request}\n ERROR ${e}`);
//     throw e;
//   }
// }

export enum TxOrBlockGeneratorType {
  TxNativePayment = 0,
  TxNativeReferencedPayment = 1,
  TxReferenced = 2,
  TxGeneral = 3,
  BlockConfirmed = 4,
}

export function prepareGenerator(
  type: TxOrBlockGeneratorType,
  iqm: IndexedQueryManager,
  batchSize = 100,
  topUpThreshold = 0.25
): RandomDBIterator<DBTransactionBase | DBBlockBase> {
  const startTime = getUnixEpochTimestamp() - 5 * 60 * 60;
  switch (type) {
    case TxOrBlockGeneratorType.TxNativePayment:
      return new RandomDBIterator<DBTransactionBase>(
        iqm,
        () => fetchRandomTransactions(iqm, batchSize, { mustBeNativePayment: true, startTime }),
        batchSize,
        topUpThreshold,
        TxOrBlockGeneratorType[type]
      );
    case TxOrBlockGeneratorType.TxNativeReferencedPayment:
      return new RandomDBIterator<DBTransactionBase>(
        iqm,
        () => fetchRandomTransactions(iqm, batchSize, { mustBeNativePayment: true, mustHavePaymentReference: true, startTime }),
        batchSize,
        topUpThreshold,
        TxOrBlockGeneratorType[type]
      );
    case TxOrBlockGeneratorType.TxReferenced:
      return new RandomDBIterator<DBTransactionBase>(
        iqm,
        () => fetchRandomTransactions(iqm, batchSize, { mustBeNativePayment: true, mustHavePaymentReference: true, startTime }),
        batchSize,
        topUpThreshold,
        TxOrBlockGeneratorType[type]
      );
    case TxOrBlockGeneratorType.TxGeneral:
      return new RandomDBIterator<DBTransactionBase>(
        iqm,
        () => fetchRandomTransactions(iqm, batchSize, { startTime }),
        batchSize,
        topUpThreshold,
        TxOrBlockGeneratorType[type]
      );
    case TxOrBlockGeneratorType.BlockConfirmed:
      return new RandomDBIterator<DBBlockBase>(
        iqm,
        () => fetchRandomConfirmedBlocks(iqm, batchSize, startTime),
        batchSize,
        topUpThreshold,
        TxOrBlockGeneratorType[type]
      );
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(type);
  }
}

export async function prepareRandomGenerators(iqm: IndexedQueryManager, batchSize = 100, topUpThreshold = 0.25) {
  const mp = new Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>();
  const generators = Object.keys(TxOrBlockGeneratorType)
    .filter((x) => isNaN(x as any))
    .map((type) => {
      const generator = prepareGenerator(TxOrBlockGeneratorType[type], iqm, batchSize, topUpThreshold);
      mp.set(TxOrBlockGeneratorType[type], generator);
      return generator;
    });

  const promises = generators.map((generator) => generator.initialize());
  console.time("Generator promises");
  await Promise.all(promises);
  console.timeEnd("Generator promises");
  // generators.forEach((gen) => console.log(gen.label, gen.size))
  return mp;
}

export const GENERATORS_FOR_ATTESTATION_TYPES = [
  {
    type: "Payment",
    generatorTypes: [TxOrBlockGeneratorType.TxNativePayment, TxOrBlockGeneratorType.TxNativeReferencedPayment],
  },
  {
    type: "BalanceDecreasingTransaction",
    generatorTypes: [TxOrBlockGeneratorType.TxGeneral],
  },
  {
    type: "ConfirmedBlockHeightExists",
    generatorTypes: [TxOrBlockGeneratorType.BlockConfirmed],
  },
  {
    type: "ReferencedPaymentNonexistence",
    generatorTypes: [TxOrBlockGeneratorType.TxReferenced],
  },
];

export function randomGeneratorTypeForAttestationType(
  attestationType: string,
  mp: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>
) {
  const genTypes = GENERATORS_FOR_ATTESTATION_TYPES.find((type) => type.type === attestationType).generatorTypes;
  const genType = genTypes[Math.floor(Math.random() * genTypes.length)];
  return mp.get(genType);
}

export function randomGeneratorChoiceWithAttestationType(mp: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>) {
  const selection = GENERATORS_FOR_ATTESTATION_TYPES[Math.floor(Math.random() * GENERATORS_FOR_ATTESTATION_TYPES.length)];
  const attestationType = selection.type;
  const generatorType = selection.generatorTypes[Math.floor(Math.random() * selection.generatorTypes.length)];
  return {
    attestationType,
    generator: mp.get(generatorType),
  };
}
