import { ChainType, Managed } from "@flarenetwork/mcc";
import { AttLogger } from "../utils/logging/logger";
import { sleepms } from "../utils/helpers/utils";
import { IDBTransactionBase } from "../entity/indexer/dbTransaction";
import { prepareIndexerTables, SECONDS_PER_DAY } from "./indexer-utils";
import { IDBBlockBase } from "../entity/indexer/dbBlock";
import { DatabaseService } from "../utils/database/DatabaseService";

/**
 * Manages table double buffering for transactions (DBTransactionBase)
 *
 * We have two tables that we use to optimize how to control number if items in the tables.
 *
 * We first fill one table when we reach table limits we continue with another and once this one is filled as well,
 * we drop the first one and recreate a new one and continue on it.
 *
 * When one table has more than `endBlock` blocks and last block timestamp is above `endTime` we drop
 * the last table and create a new one.
 */
@Managed()
export class Interlacing {
  // current active table index
  private index = 0;
  private endBlockTime = -1;
  private endBlockNumber = -1;

  private logger: AttLogger;

  private timeRange: number = 2 * SECONDS_PER_DAY;

  private blockRange = 100;

  private tableLock = false;

  private dbService: DatabaseService;

  private dbTransactionClasses: IDBTransactionBase[];
  public dbBlockClass: IDBBlockBase; // quick fix, to be stored somewhere else

  chainType: ChainType;
  public chainName: string;

  /**
   * Sets the initial limits for the interlacing.
   *
   * @param logger
   * @param dbService
   * @param chainType
   * @param timeRangeSec
   * @param blockRange
   * @returns
   */
  public async initialize(logger: AttLogger, dbService: DatabaseService, chainType: ChainType, timeRangeSec: number, blockRange: number) {
    const items = [];

    this.logger = logger;
    this.dbService = dbService;
    await this.dbService.connect(); //creates connection to database if there is none

    this.timeRange = timeRangeSec * SECONDS_PER_DAY;
    this.blockRange = blockRange;
    const prepared = prepareIndexerTables(chainType);
    this.dbBlockClass = prepared.blockTable;
    this.dbTransactionClasses = prepared.transactionTable;
    this.chainType = chainType;
    this.chainName = ChainType[chainType];

    // get first block from both transaction tables
    items.push(await dbService.manager.getRepository(this.dbTransactionClasses[0]).find({ order: { blockNumber: "ASC" }, take: 1 }));
    items.push(await dbService.manager.getRepository(this.dbTransactionClasses[1]).find({ order: { blockNumber: "ASC" }, take: 1 }));

    if (items[0].length === 0 && items[1].length === 0) {
      // if both tables are empty we start with 0 and leave timeRange at -1, this indicates that it will be set on 1st update
      this.index = 0;
      return;
    }

    this.index = 0;

    if (items[0].length && items[1].length) {
      // if both exists take the last one
      if (items[0][0].timestamp < items[1][0].timestamp) {
        this.index = 1;
      }
    } else {
      // if one is missing take the one that exists
      if (items[1].length) {
        this.index = 1;
      }
    }

    // setup last active index end values
    this.endBlockTime = items[this.index][0].timestamp + this.timeRange;
    this.endBlockNumber = items[this.index][0].blockNumber + this.blockRange;
  }

  public get activeIndex(): number {
    return this.index;
  }

  public get DBBlockClass(): IDBBlockBase {
    return this.dbBlockClass;
  }

  public get DBTransactionClasses(): IDBTransactionBase[] {
    return this.dbTransactionClasses;
  }

  public getActiveTransactionWriteTable(): IDBTransactionBase {
    // we write into table by active index:
    //  0 - table0
    //  1 - table1
    return this.dbTransactionClasses[this.index];
  }

  public getTransactionDropTableName(): string {
    // we drop table by active index:
    //  0 - table0
    //  1 - table1
    return this.getTransactionTableNameForIndex(this.activeIndex);
  }

  private getTransactionTableNameForIndex(index: number): string {
    return `${this.chainName.toLowerCase()}_transactions${index}`;
  }

  /**
   * Given a new block data checks the conditions and performs table change if necessary.
   *
   * @param blockTime
   * @param blockNumber
   * @returns
   */
  public async update(blockTime: number, blockNumber: number): Promise<boolean> {
    // in case table drop was requested in another async we need to wait until drop is completed
    while (this.tableLock) {
      await sleepms(1);
    }

    if (this.endBlockTime === -1) {
      // initialize
      this.endBlockTime = blockTime + this.timeRange;
      this.endBlockNumber = blockNumber + this.blockRange;
      return false;
    }

    if (blockTime < this.endBlockTime || blockNumber < this.endBlockNumber) return false;

    // check if tables need to be dropped and new created
    this.tableLock = true;

    this.endBlockTime = blockTime + this.timeRange;
    this.endBlockNumber = blockNumber + this.blockRange;

    // change interlacing index
    this.index ^= 1;

    this.logger.debug(`interlace ${this.index}`);

    // drop inactive table and create new one
    const time0 = Date.now();
    const queryRunner = this.dbService.manager.connection.createQueryRunner();
    const tableName = this.getTransactionDropTableName();
    const table = await queryRunner.getTable(tableName);
    await queryRunner.dropTable(table);
    await queryRunner.createTable(table);
    await queryRunner.release();
    const time1 = Date.now();

    this.logger.info(`drop table '${tableName}' (time ${time1 - time0}ms)`);

    this.tableLock = false;

    return true;
  }

  /***
   * reset all - drop both tables
   */
  public async resetAll() {
    // in case table drop was requested in another async we need to wait until drop is completed
    while (this.tableLock) {
      await sleepms(1);
    }

    this.endBlockTime = -1;
    this.endBlockNumber = -1;

    this.tableLock = true;

    // change interlacing index
    this.index = 0;

    this.logger.debug(`interlace reset all`);

    // drop inactive table and create new one
    for (let i = 0; i < 2; i++) {
      const queryRunner = this.dbService.manager.connection.createQueryRunner();
      const tableName = this.getTransactionTableNameForIndex(i);
      await queryRunner.connect();
      const table = await queryRunner.getTable(tableName);
      await queryRunner.dropTable(table);
      await queryRunner.createTable(table);
      await queryRunner.release();
    }

    // drop all state info (moved to indexer)
    // await this.indexer.dropAllStateInfo();

    this.tableLock = false;
  }
}
