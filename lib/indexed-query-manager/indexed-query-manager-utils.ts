import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { DBBlockBase } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";
import { IndexedQueryManager } from "./IndexedQueryManager";

export async function getRandomTransaction(iqm: IndexedQueryManager): Promise<DBTransactionBase | undefined> {
   let result: DBTransactionBase | undefined;
   while (!result) {
      let tableId = Math.round(Math.random());
      let table = iqm.transactionTable[tableId];
      const query = AttestationRoundManager.dbService.connection.manager.createQueryBuilder(table, "transaction")
         .select(["MIN(transaction.id) AS min", "MAX(transaction.id) as max"])
      const { min, max } = await query.getRawOne();
      let randN = Math.floor(Math.random() * (max - min + 1)) + min;
      result = await AttestationRoundManager.dbService.connection.manager.findOne(table, { where: { id: randN } }) as DBTransactionBase;
   }
   return result;
}

export async function getRandomTransactionWithPaymentReference(iqm: IndexedQueryManager): Promise<DBTransactionBase | undefined> {
   let result: DBTransactionBase | undefined;
   let maxReps = 5;
   while (!result) {
      let tableId = Math.round(Math.random());
      let table = iqm.transactionTable[tableId];
      let query = AttestationRoundManager.dbService.connection.manager.createQueryBuilder(table, "transaction")
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


export async function getRandomConfirmedBlock(iqm: IndexedQueryManager): Promise<DBBlockBase|undefined> {
   let query = AttestationRoundManager.dbService.connection.manager.createQueryBuilder(iqm.blockTable, "block")
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