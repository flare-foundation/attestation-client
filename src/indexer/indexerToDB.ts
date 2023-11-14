import { ChainType, Managed } from "@flarenetwork/mcc";
import { DBBlockBase, IDBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { IDBTransactionBase } from "../entity/indexer/dbTransaction";
import { DatabaseService } from "../utils/database/DatabaseService";
import { retry } from "../utils/helpers/promiseTimeout";
import { AttLogger, logException } from "../utils/logging/logger";
import { getChainN, getStateEntry, prepareIndexerTables } from "./indexer-utils";

/**
 * Class that manages interactions of indexer with DataBase
 */
@Managed()
export class IndexerToDB {
  dbService: DatabaseService;
  dbTransactionClasses: IDBTransactionBase[];
  dbBlockClass: IDBBlockBase;
  chainName: string;
  chainType: ChainType;
  logger!: AttLogger;
  bottomBlockTime: number;

  constructor(logger: AttLogger, dbService: DatabaseService, chainType: ChainType) {
    this.logger = logger;
    this.dbService = dbService;
    const tables = prepareIndexerTables(chainType);
    this.dbTransactionClasses = tables.transactionTable;
    this.dbBlockClass = tables.blockTable;
    this.chainType = chainType;
    this.chainName = ChainType[chainType];
  }

  /////////////////////////////////////////////////////////////
  // get respective DB block number
  /////////////////////////////////////////////////////////////

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

  /////////////////////////////////////////////////////////////
  // save state
  /////////////////////////////////////////////////////////////

  /**
   * Saves the last tip height into the database state
   * @param tipHeight tip height
   */
  public async writeTipHeight(tipHeight: number) {
    // every update save last T
    const stateTcheckTime = getStateEntry("T", this.chainName, tipHeight);
    await retry(`writeT`, async () => await this.dbService.manager.save(stateTcheckTime));
  }

  /////////////////////////////////////////////////////////////
  // Save bottom N state (used for verification)
  /////////////////////////////////////////////////////////////

  /**
   * Saves the bottom block number and timestamp into the state table in the database.
   * The bottom block is the minimal block for confirmed transactions that are currently
   * stored in the interlacing transaction tables.
   */
  async saveBottomState(onNewBottomBlock?: (blockNumber: number) => void) {
    try {
      const bottomBlockNumber = await this.getBottomDBBlockNumberFromStoredTransactions();
      if (bottomBlockNumber) {
        const bottomBlock = await this.dbService.manager.findOne(this.dbBlockClass, { where: { blockNumber: bottomBlockNumber, confirmed: true } });
        this.bottomBlockTime = (bottomBlock as DBBlockBase).timestamp;

        this.logger.debug(`block bottom state ${bottomBlockNumber}`);
        const bottomStates = [getStateEntry(`Nbottom`, this.chainName, bottomBlockNumber), getStateEntry(`NbottomTime`, this.chainName, this.bottomBlockTime)];
        await this.dbService.manager.save(bottomStates);
        if (onNewBottomBlock) {
          onNewBottomBlock(bottomBlockNumber);
        }
      } else {
        this.logger.debug(`block bottom state is undefined`);
      }
    } catch (error) {
      logException(error, `saving block bottom state`);
    }
  }

  async dropAllStateInfo() {
    this.logger.info(`drop all state info for '${this.chainName}'`);

    await this.dbService.manager
      .createQueryBuilder()
      .delete()
      .from(DBState)
      .where("`name` like :name", { name: `%${this.chainName}_%` })
      .execute();
  }

  /**
   * Securely drops the table given the name
   * @param name name of the table to be dropped
   * @returns
   */
  async dropTable(name: string) {
    try {
      this.logger.info(`dropping table ${name}`);

      // await this.dbService.manager.query(`TRUNCATE ${name};`);
      const queryRunner = this.dbService.manager.connection.createQueryRunner();
      const table = await queryRunner.getTable(name);
      if (!table) {
        this.logger.error(`unable to find table ${name}`);
        return;
      }
      await queryRunner.dropTable(table);
      await queryRunner.createTable(table);
      await queryRunner.release();
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
}
