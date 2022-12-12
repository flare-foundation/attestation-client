import { ChainType, Managed } from "@flarenetwork/mcc";
import { DBBlockBase, IDBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { IDBTransactionBase } from "../entity/indexer/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { AttLogger, logException } from "../utils/logger";
import { retry } from "../utils/PromiseTimeout";
import { getChainN, getStateEntry, prepareIndexerTables } from "./indexer-utils";

/**
 * Class that manages interactions of indexer with DataBase
 */
@Managed()
export class IndexerToDB {
  // interlace = new Interlacing();
  dbService: DatabaseService;
  dbTransactionClasses: IDBTransactionBase[];
  dbBlockClass: IDBBlockBase;
  chainName: string;
  chainType: ChainType;
  logger!: AttLogger;
  bottomBlockTime: number;
  chainHeight = 0;
  // N - last processed and saved block
  N = 0;

  constructor(logger: AttLogger, dbService: DatabaseService, chainType: ChainType) {
    // this.interlace = interlace;
    this.logger = logger;
    this.dbService = dbService;
    const tables = prepareIndexerTables(chainType);
    this.dbTransactionClasses = tables.transactionTable;
    this.dbBlockClass = tables.blockTable;
    this.chainType = chainType;
    this.chainName = ChainType[chainType];
  }
  /**
   * @returns Returns last N saved into the database
   */
  public async getNfromDB(): Promise<number> {
    const res = await this.dbService.manager.findOne(DBState, { where: { name: getChainN(this.chainName) } });

    if (res === undefined || res === null) return 0;

    return res.valueNumber;
  }

  /**
   * Finds minimal block number that appears in interlacing transaction tables
   * @returns
   * NOTE: we assume there is no gaps
   */
  public async getBottomDBBlockNumberFromStoredTransactions(): Promise<number> {
    const query0 = this.dbService.manager.createQueryBuilder(this.dbTransactionClasses[0] as any, "blocks");
    query0.select(`MIN(blocks.blockNumber)`, "min");
    const result0 = await query0.getRawOne();

    const query1 = this.dbService.manager.createQueryBuilder(this.dbTransactionClasses[1] as any, "blocks");
    query1.select(`MIN(blocks.blockNumber)`, "min");
    const result1 = await query1.getRawOne();

    if (!result0.min && !result1.min) {
      return undefined;
    }
    if (!result0.min) return result1.min;
    if (!result1.min) return result0.min;

    return result0.min < result1.min ? result0.min : result1.min;
  }

  /**
   * Saves the bottom block number and timestamp into the state table in the database.
   * The bottom block is the minimal block for confirmed transactions that are currently
   * stored in the interlacing transaction tables.
   */
  async saveBottomState() {
    try {
      const bottomBlockNumber = await this.getBottomDBBlockNumberFromStoredTransactions();
      if (bottomBlockNumber) {
        const bottomBlock = await this.dbService.manager.findOne(this.dbBlockClass, { where: { blockNumber: bottomBlockNumber, confirmed: true } });
        this.bottomBlockTime = (bottomBlock as DBBlockBase).timestamp;

        this.logger.debug(`block bottom state ${bottomBlockNumber}`);
        const bottomStates = [getStateEntry(`Nbottom`, this.chainName, bottomBlockNumber), getStateEntry(`NbottomTime`, this.chainName, this.bottomBlockTime)];
        await this.dbService.manager.save(bottomStates);
      } else {
        this.logger.debug(`block bottom state is undefined`);
      }
    } catch (error) {
      logException(error, `saving block bottom state`);
    }
  }

  // /**
  //  * Saves block and related transaction entities into the database in
  //  * database transaction safe way with retries.
  //  * After saving it triggers transaction table interlacing update.
  //  * @param block block entity to be saved
  //  * @param transactions block transaction entities to be saved
  //  * @returns
  //  */
  // public async blockSave(block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean> {
  //   const Np1 = this.N + 1;

  //   if (block.blockNumber !== Np1) {
  //     failureCallback(`unexpected block number: expected to save blockNumber ${Np1} (but got ${block.blockNumber})`);
  //     // function exits
  //     return false;
  //   }

  //   this.logger.debug(`start save block N+1=${Np1} (transaction table index ${this.interlace.activeIndex})`);
  //   const transactionClass = this.interlace.getActiveTransactionWriteTable();

  //   // fix data
  //   block.transactions = transactions.length;

  //   const time0 = Date.now();

  //   // create transaction and save everything with retry (terminate app on failure)
  //   await retry(`blockSave N=${Np1}`, async () => {
  //     await this.dbService.connection.transaction(async (transaction) => {
  //       // save state N, T and T_CHECK_TIME
  //       const stateEntries = [getStateEntry("N", this.chainName, Np1), getStateEntry("T", this.chainName, this.chainHeight)];

  //       // block must be marked as confirmed
  //       if (transactions.length > 0) {
  //         // let newTransactions = [];

  //         // for( const tx of transactions ) {
  //         //   const newTx = new transactionClass();

  //         //   newTx.chainType=tx.chainType;
  //         //   newTx.transactionId=tx.transactionId;
  //         //   newTx.blockNumber=tx.blockNumber;
  //         //   newTx.timestamp=tx.timestamp;
  //         //   newTx.paymentReference=tx.paymentReference;
  //         //   newTx.response=tx.response;
  //         //   newTx.isNativePayment=tx.isNativePayment;
  //         //   newTx.transactionType=tx.transactionType;

  //         //   newTransactions.push( newTx );
  //         // }

  //         // await transaction.save(newTransactions);

  //         // fix transactions class to active interlace tranascation class
  //         const dummy = new transactionClass();
  //         for (let transaction of transactions) {
  //           Object.setPrototypeOf(transaction, Object.getPrototypeOf(dummy));
  //         }

  //         await transaction.save(transactions);
  //       } else {
  //         // save dummy transaction to keep transaction table block continuity
  //         this.logger.debug(`block ${block.blockNumber} no transactions (dummy tx added)`);

  //         const dummyTx = new transactionClass();

  //         dummyTx.chainType = this.chainType;
  //         dummyTx.blockNumber = block.blockNumber;
  //         dummyTx.transactionType = "EMPTY_BLOCK_INDICATOR";

  //         await transaction.save(dummyTx);
  //       }

  //       await transaction.save(block);
  //       await transaction.save(stateEntries);
  //     });
  //     return true;
  //   });

  //   // increment N if all is ok
  //   this.N = Np1;

  //   // if bottom block is undefined then save it (this happens only on clean start or after database reset)
  //   if (!this.bottomBlockTime) {
  //     await this.saveBottomState();
  //   }

  //   this.blockProcessorManager.clearProcessorsUpToBlockNumber(Np1);
  //   const time1 = Date.now();
  //   this.logger.info(`^g^Wsave completed - next N=${Np1}^^ (${transactions.length} transaction(s), time=${round(time1 - time0, 2)}ms)`);

  //   // table interlacing
  //   if (await this.interlace.update(block.timestamp, block.blockNumber)) {
  //     // bottom state was changed because one table was dropped - we need to save new value
  //     await this.saveBottomState();
  //   }

  //   return true;
  // }

  async dropAllStateInfo() {
    this.logger.info(`drop all state info for '${this.chainName}'`);

    await this.dbService.manager
      .createQueryBuilder()
      .delete()
      .from(DBState)
      .where("`name` like :name", { name: `%${this.chainName}_%` })
      .execute();
  }

  //do we want to drop or truncate???
  /**
   * Securely drops the table given the name
   * @param name name of the table to be dropped
   * @returns
   */
  async dropTable(name: string) {
    try {
      this.logger.info(`dropping table ${name}`);

      await this.dbService.connection.query(`TRUNCATE ${name};`);
      // const queryRunner = this.dbService.connection.createQueryRunner();
      // const table = await queryRunner.getTable(name);
      // if (!table) {
      //   this.logger.error(`unable to find table ${name}`);
      //   return;
      // }
      // await queryRunner.dropTable(table);
      // await queryRunner.release();
    } catch (error) {
      logException(error, `dropTable`);
    }
  }

  /**
   * Drops all block and transactions tables for the specified chain
   * @param chain chain name (XRP, LTC, BTC, DOGE, ALGO)
   */
  public async dropAllChainTables(chain: string) {
    chain = chain.toLocaleLowerCase();

    await this.dropTable(`${chain}_block`);
    await this.dropTable(`${chain}_transactions0`);
    await this.dropTable(`${chain}_transactions1`);
  }

  /**
   * Saves the last top height into the database state
   * @param T top height
   */
  public async writeT(T: number) {
    // every update save last T
    const stateTcheckTime = getStateEntry("T", this.chainName, T);

    await retry(`writeT`, async () => await this.dbService.manager.save(stateTcheckTime));
  }
}
