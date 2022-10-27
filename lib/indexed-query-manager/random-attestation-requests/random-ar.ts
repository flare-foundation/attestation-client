import { Attestation } from "../../attester/Attestation";
import { AttestationData } from "../../attester/AttestationData";
import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { getUnixEpochTimestamp } from "../../utils/utils";
import { encodeRequest } from "../../verification/generated/attestation-request-encode";
import { ARType } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { fetchRandomConfirmedBlocks, fetchRandomTransactions, RandomDBIterator } from "./random-query";
import { IndexedQueryManager } from "../IndexedQueryManager";
import { prepareRandomizedRequestPayment } from "./random-ar-00001-payment";
import { prepareRandomizedRequestBalanceDecreasingTransaction } from "./random-ar-00002-balance-decreasing-transaction";
import { prepareRandomizedRequestConfirmedBlockHeightExists } from "./random-ar-00003-confirmed-block-height-exists";
import { prepareRandomizedRequestReferencedPaymentNonexistence } from "./random-ar-00004-referenced-payment-nonexistence";

/////////////////////////////////////////////////////////////////
// Helper functions for generating random attestation requests
// for specific attestation types by using indexer database
/////////////////////////////////////////////////////////////////

export async function getRandomAttestationRequest(
  randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>,
  indexedQueryManager: IndexedQueryManager,
  sourceId: SourceId,
  roundId: number,
  numberOfConfirmations: number
) {
  const { attestationType, generator } = randomGeneratorChoiceWithAttestationType(randomGenerators);
  if (generator.size <= 0) {
    console.log(`Empty generator ${generator.label}`);
    return null;
  }
  const txOrBlock = await generator.next();

  switch (attestationType) {
    case AttestationType.Payment:
      return prepareRandomizedRequestPayment(indexedQueryManager, txOrBlock as DBTransactionBase, sourceId, roundId, numberOfConfirmations);
    case AttestationType.BalanceDecreasingTransaction:
      return prepareRandomizedRequestBalanceDecreasingTransaction(
        indexedQueryManager,
        txOrBlock as DBTransactionBase,
        sourceId,
        roundId,
        numberOfConfirmations
      );
    case AttestationType.ConfirmedBlockHeightExists:
      return prepareRandomizedRequestConfirmedBlockHeightExists(indexedQueryManager, txOrBlock as DBBlockBase, sourceId, roundId, numberOfConfirmations);
    case AttestationType.ReferencedPaymentNonexistence:
      return prepareRandomizedRequestReferencedPaymentNonexistence(
        indexedQueryManager,
        txOrBlock as DBTransactionBase,
        sourceId,
        roundId,
        numberOfConfirmations
      );
    default:
      throw new Error("Invalid attestation type");
  }
}

export function createTestAttestationFromRequest(request: ARType, roundId: number, numberOfConfirmations: number): Attestation {
  const data = new AttestationData();
  data.type = request.attestationType;
  data.sourceId = request.sourceId;
  data.request = encodeRequest(request);
  const attestation = new Attestation(undefined, data, undefined);
  attestation.setTestNumberOfConfirmationBlocks(numberOfConfirmations);
  attestation.setTestRoundId(roundId);
  return attestation;
}

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
      ((_: never): void => {})(type);
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
    type: AttestationType.Payment,
    generatorTypes: [TxOrBlockGeneratorType.TxNativePayment, TxOrBlockGeneratorType.TxNativeReferencedPayment],
  },
  {
    type: AttestationType.BalanceDecreasingTransaction,
    generatorTypes: [TxOrBlockGeneratorType.TxGeneral],
  },
  {
    type: AttestationType.ConfirmedBlockHeightExists,
    generatorTypes: [TxOrBlockGeneratorType.BlockConfirmed],
  },
  {
    type: AttestationType.ReferencedPaymentNonexistence,
    generatorTypes: [TxOrBlockGeneratorType.TxReferenced],
  },
];

export function randomGeneratorTypeForAttestationType(
  attestationType: AttestationType,
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
