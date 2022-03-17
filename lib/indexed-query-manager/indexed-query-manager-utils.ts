import { ChainType, prefix0x, toBN } from "flare-mcc";
import Web3 from "web3";
import { DBBlockBase } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";
import { AttestationTypeScheme, WeightedRandomChoice } from "../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../verification/attestation-types/attestation-types-helpers";
import { ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARPayment, ARReferencedPaymentNonexistence } from "../verification/generated/attestation-request-types";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { IndexedQueryManager } from "./IndexedQueryManager";

export async function getRandomTransaction(iqm: IndexedQueryManager): Promise<DBTransactionBase | undefined> {
   let result: DBTransactionBase | undefined;
   while (!result) {
      let tableId = Math.round(Math.random());
      let table = iqm.transactionTable[tableId];
      const query = iqm.dbService.connection.manager.createQueryBuilder(table, "transaction")
         .select(["MIN(transaction.id) AS min", "MAX(transaction.id) as max"])
      const { min, max } = await query.getRawOne();
      let randN = Math.floor(Math.random() * (max - min + 1)) + min;
      result = await iqm.dbService.connection.manager.findOne(table, { where: { id: randN } }) as DBTransactionBase;
   }
   return result;
}

export async function getRandomTransactionWithPaymentReference(iqm: IndexedQueryManager): Promise<DBTransactionBase | undefined> {
   let result: DBTransactionBase | undefined;
   let maxReps = 5;
   while (!result) {
      let tableId = Math.round(Math.random());
      let table = iqm.transactionTable[tableId];
      let query = iqm.dbService.connection.manager.createQueryBuilder(table, "transaction")
         .where("transaction.paymentReference != ''")

      let count = await query.getCount();
      if (count === 0) {
         maxReps--;
         if (maxReps === 0) {
            console.log("Probably no transactions in tables. Run the indexer.")
            return null;
         }
         continue;
      }
      let randN = Math.floor(Math.random() * count) + 1;
      query = query.offset(randN).limit(1);
      result = await query.getOne() as DBTransactionBase;
   }
   return result;
}


export async function getRandomConfirmedBlock(iqm: IndexedQueryManager): Promise<DBBlockBase | undefined> {
   let query = iqm.dbService.connection.manager.createQueryBuilder(iqm.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
   let count = await query.getCount();
   if (count === 0) {
      console.log("No blocks. Run indexer.");
      return null;
   }
   let randN = Math.floor(Math.random() * count) + 1;
   query = query.offset(randN).limit(1);
   return await query.getOne() as DBBlockBase;
}

////////////////////////////////////////////////////////////
// Random attestation requests
////////////////////////////////////////////////////////////

export async function getRandomRequestPayment(indexedQueryManager: IndexedQueryManager, chainId: ChainType, roundId: number, numberOfConfirmations: number) {
   let randomTransaction = await getRandomTransaction(indexedQueryManager);
   if (!randomTransaction) {
      return null;
   }
   let confirmationBlock = await indexedQueryManager.queryBlock({
      blockNumber: randomTransaction.blockNumber + numberOfConfirmations,
      roundId
   })
   if (!confirmationBlock) {
      return null;
   }
   let options = [
      { name: "CORRECT", weight: 10 },
      { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
      { name: "WRONG_BLOCK_NUMBER", weight: 1 },
      { name: "NON_EXISTENT_TX_ID", weight: 1 }
   ] as WeightedRandomChoice[]

   let choice = randomWeightedChoice(options);

   let id = choice === "NON_EXISTENT_TX_ID" ? Web3.utils.randomHex(32) : randomTransaction.transactionId;
   let blockNumber = choice === "WRONG_BLOCK_NUMBER" ? toBN(randomTransaction.blockNumber - 1) : toBN(randomTransaction.blockNumber);
   let dataAvailabilityProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlock.blockHash);
   return {
      attestationType: AttestationType.Payment,
      chainId,
      blockNumber,
      utxo: toBN(0),  // TODO: randomize for UTXO chains
      inUtxo: toBN(0), // TODO: randomize for UTXO chains
      id,
      dataAvailabilityProof
   } as ARPayment;
}

export async function getRandomRequestBalanceDecreasingTransaction(indexedQueryManager: IndexedQueryManager, chainId: ChainType, roundId: number, numberOfConfirmations: number) {
   let randomTransaction = await getRandomTransaction(indexedQueryManager);
   if (!randomTransaction) {
      return null;
   }
   let confirmationBlock = await indexedQueryManager.queryBlock({
      blockNumber: randomTransaction.blockNumber + numberOfConfirmations,
      roundId
   })
   if (!confirmationBlock) {
      return null;
   }
   let options = [
      { name: "CORRECT", weight: 10 },
      { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
      { name: "WRONG_BLOCK_NUMBER", weight: 1 },
      { name: "NON_EXISTENT_TX_ID", weight: 1 }
   ] as WeightedRandomChoice[]

   let choice = randomWeightedChoice(options);

   let id = choice === "NON_EXISTENT_TX_ID" ? Web3.utils.randomHex(32) : randomTransaction.transactionId;
   let blockNumber = choice === "WRONG_BLOCK_NUMBER" ? toBN(randomTransaction.blockNumber - 1) : toBN(randomTransaction.blockNumber);
   let dataAvailabilityProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlock.blockHash);

   return {
      attestationType: AttestationType.BalanceDecreasingTransaction,
      chainId,
      blockNumber,
      inUtxo: toBN(0),  // TODO: randomize for UTXO chains
      id,
      dataAvailabilityProof
   } as ARBalanceDecreasingTransaction;

}

export async function getRandomRequestConfirmedBlockHeightExists(indexedQueryManager: IndexedQueryManager, chainId: ChainType, roundId: number, numberOfConfirmations: number) {
   let randomBlock = await getRandomConfirmedBlock(indexedQueryManager);
   if (!randomBlock) {
      return null;
   }
   let confirmationBlock = await indexedQueryManager.queryBlock({
      blockNumber: randomBlock.blockNumber + numberOfConfirmations,
      roundId
   })
   if (!confirmationBlock) {
      return null;
   }
   let options = [
      { name: "CORRECT", weight: 10 },
      { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
   ] as WeightedRandomChoice[]

   let choice = randomWeightedChoice(options);

   let blockNumber = toBN(randomBlock.blockNumber);
   let dataAvailabilityProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlock.blockHash);
   return {
      attestationType: AttestationType.ConfirmedBlockHeightExists,
      chainId,
      blockNumber,
      dataAvailabilityProof
   } as ARConfirmedBlockHeightExists;

}

export async function getRandomRequestReferencedPaymentNonexistence(indexedQueryManager: IndexedQueryManager, chainId: ChainType, roundId: number, numberOfConfirmations: number) {
   const START_BLOCK_OFFSET = 100;
   const OVERFLOW_BLOCK_OFFSET = 10;

   let randomTransaction = await getRandomTransactionWithPaymentReference(indexedQueryManager);
   if (!randomTransaction) {
      return null;
   }
   let startBlockNum = randomTransaction.blockNumber - START_BLOCK_OFFSET;
   let overflowBlockNum = randomTransaction.blockNumber + OVERFLOW_BLOCK_OFFSET;

   let blockStart = await indexedQueryManager.queryBlock({
      blockNumber: startBlockNum,
      confirmed: true,
      roundId
   })
   if (!blockStart) {
      return null;
   }
   let blockOverflow = await indexedQueryManager.queryBlock({
      blockNumber: overflowBlockNum,
      confirmed: true,
      roundId
   })
   if (!blockOverflow) {
      return null;
   }

   let options = [
      { name: "CORRECT", weight: 10 },
      { name: "EXISTS", weight: 1 },
      { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
   ] as WeightedRandomChoice[]

   let choice = randomWeightedChoice(options);

   let prevBlockIndex = overflowBlockNum - 1;
   let prevBlock = await indexedQueryManager.queryBlock({
      blockNumber: prevBlockIndex,
      confirmed: true,
      roundId
   })
   while (prevBlock.timestamp === blockOverflow.timestamp) {
      prevBlockIndex--;
      prevBlock = await indexedQueryManager.queryBlock({
         blockNumber: prevBlockIndex,
         confirmed: true,
         roundId
      })
   }

   let confirmationBlock = await indexedQueryManager.queryBlock({
      blockNumber: overflowBlockNum + numberOfConfirmations,
      roundId
   })

   if (!confirmationBlock) {
      return null;
   }

   let startBlock = startBlockNum;
   let endBlock = toBN(prevBlock.blockNumber);
   let endTimestamp = toBN(prevBlock.timestamp);
   let overflowBlock = overflowBlockNum;
   let dataAvailabilityProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlock.blockHash);
   let paymentReference = choice === "CORRECT" ? toBN(Web3.utils.randomHex(32)) : randomTransaction.paymentReference;
   // TODO
   // let destinationAmounts = randomTransaction.
   return {
      attestationType: AttestationType.ReferencedPaymentNonexistence,
      chainId,
      startBlock,
      endTimestamp,
      endBlock,
      destinationAddress: Web3.utils.randomHex(32), // TODO
      amount: toBN(Web3.utils.randomHex(16)),  // TODO
      paymentReference,
      overflowBlock,
      dataAvailabilityProof
   } as ARReferencedPaymentNonexistence;

}

export async function getRandomAttestationRequest(definitions: AttestationTypeScheme[], indexedQueryManager: IndexedQueryManager, chainId: ChainType, roundId: number, numberOfConfirmations: number) {
   let randN = Math.floor(Math.random() * definitions.length);
   let scheme = definitions[randN];
   let attestationType = scheme.id as AttestationType;
   switch (attestationType) {
      case AttestationType.Payment:
         return getRandomRequestPayment(indexedQueryManager, chainId, roundId, numberOfConfirmations);
      case AttestationType.BalanceDecreasingTransaction:
         return getRandomRequestBalanceDecreasingTransaction(indexedQueryManager, chainId, roundId, numberOfConfirmations);
      case AttestationType.ConfirmedBlockHeightExists:
         return getRandomRequestConfirmedBlockHeightExists(indexedQueryManager, chainId, roundId, numberOfConfirmations);
      case AttestationType.ReferencedPaymentNonexistence:
         return getRandomRequestReferencedPaymentNonexistence(indexedQueryManager, chainId, roundId, numberOfConfirmations);
      default:
         throw new Error("Invalid attestation type");
   }
}
