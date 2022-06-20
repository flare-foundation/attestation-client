import { Managed } from "@flarenetwork/mcc";
import { DatabaseService } from "../utils/databaseService";
import { AttLogger } from "../utils/logger";
import { SECONDS_PER_DAY } from "./indexer-utils";

@Managed()
export class Interlacing {
    // current active table index
    index: number;
    endTime: number = -1;
    endBlock: number = -1;
  
    logger: AttLogger;
  
    // todo: add settings per source
    timeRange: number = 2 * SECONDS_PER_DAY;
  
    blockRange: number = 100;
  
    async initialize(logger: AttLogger, dbService: DatabaseService, dbClasses: any[], timeRange: number, blockRange: number) {
      const items = [];
  
      this.timeRange = timeRange * 24 * 60 * 60;
      this.blockRange = blockRange;
  
      this.logger = logger;
  
      // get first block from both transaction tables
      items.push(await dbService.connection.getRepository(dbClasses[0]).find({ order: { blockNumber: 'ASC' }, take: 1 }));
      items.push(await dbService.connection.getRepository(dbClasses[1]).find({ order: { blockNumber: 'ASC' }, take: 1 }));
  
      if (items[0].length === 0 && items[1].length === 0) {
        // if both tables are empty we start with 0 and leave timeRange at -1, this indicates that it will be set on 1st update
        this.index = 0;
        return;
      }
  
      let itemIndex = 0;
  
      if (items[0].length && items[1].length) {
        if (items[0][0].timestamp < items[1][0].timestamp) {
          itemIndex = 1;
        }
      }
      else {
        if (items[1].length) {
          itemIndex = 1;
        }
      }
  
      // setup last active index end values
      this.endTime = items[itemIndex][0].timestamp + this.timeRange;
      this.endBlock = items[itemIndex][0].blockNumber + this.blockRange;
    }
  
    getActiveIndex() {
      return this.index;
    }
  
    update(time: number, block: number): boolean {
      if (this.endTime === -1) {
        // initialize
        this.endTime = time + this.timeRange;
        this.endBlock = block + this.blockRange;
        return false;
      }
  
      if (time < this.endTime || block < this.endBlock) return false;
  
      // change interlacing index
      this.index ^= 1;
  
      this.endTime = time + this.timeRange;
      this.endBlock = block + this.blockRange;
  
      this.logger.debug(`interlace ${this.index}`);
  
      return true;
    }
  }
  