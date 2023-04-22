import { IBlock, IBlockHeader, IFullBlock, Managed, ReadRpcInterface } from "@flarenetwork/mcc";
import { DEFAULT_BACK_OFF_TIME, DEFAULT_RETRY, DEFAULT_TIMEOUT, failureCallback, retry } from "../utils/helpers/promiseTimeout";

/**
 * Class that manages interactions of indexer with CachedClient
 */
@Managed()
export class IndexerToClient {
  client: ReadRpcInterface;
  timeoutTime: number = DEFAULT_TIMEOUT;
  numRetry: number = DEFAULT_RETRY;
  backOffTime: number = DEFAULT_BACK_OFF_TIME;

  constructor(client: ReadRpcInterface, timeoutTime?: number, numRetry?: number, backOffTime?: number) {
    this.client = client;
    if (timeoutTime) this.timeoutTime = timeoutTime;
    if (numRetry) this.numRetry = numRetry;
    if (backOffTime) this.backOffTime = backOffTime;
  }

  /**
   *
   * @param label
   * @param blockNumber
   * @returns
   * @category BaseMethod
   */
  public async getBlockFromClient(label: string, blockNumber: number): Promise<IFullBlock> {
    // todo: implement MCC lite version of getBlock
    let thisreference = this;
    const result = await retry(
      `indexerToClient.getBlockFromClient.${label}`,
      async () => {
        return await this.client.getFullBlock(blockNumber);
      },
      thisreference.timeoutTime,
      thisreference.numRetry,
      thisreference.backOffTime
    );
    if (!result) {
      failureCallback(`indexerToClient.getBlockFromClient.${label} - null block returned`);
    }
    return result;
  }

  /**
   *
   * @param label
   * @param blockNumber
   * @returns
   * @category BaseMethod
   */
  public async getBlockHeaderFromClient(label: string, blockNumber: number): Promise<IBlockHeader> {
    // todo: implement MCC lite version of getBlock
    let thisreference = this;
    const result = await retry(
      `indexerToClient.getBlockHeaderFromClient.${label}`,
      async () => {
        return await this.client.getBlockHeader(blockNumber);
      },
      thisreference.timeoutTime,
      thisreference.numRetry,
      thisreference.backOffTime
    );
    if (!result) {
      failureCallback(`indexerToClient.getBlockHeaderFromClient.${label} - null block returned`);
    }
    return result;
  }

  /**
   *
   * @param label
   * @param blockHash
   * @returns
   * @category BaseMethod
   */
  public async getBlockFromClientByHash(label: string, blockHash: string): Promise<IBlock> {
    // todo: implement MCC lite version of getBlock
    let thisreference = this;
    const result = await retry(
      `indexerToClient.getBlockFromClientByHash.${label}`,
      async () => {
        return await this.client.getBlock(blockHash);
      },
      thisreference.timeoutTime,
      thisreference.numRetry,
      thisreference.backOffTime
    );
    if (!result) {
      failureCallback(`indexerTOClient.getBlockFromClientByHash.${label} - null block returned`);
    }
    return result;
  }

  /**
   *
   * @param label
   * @param blockHash
   * @returns
   * @category BaseMethod
   */
  public async getBlockHeaderFromClientByHash(label: string, blockHash: string): Promise<IBlockHeader> {
    // todo: implement MCC lite version of getBlock
    let thisreference = this;
    const result = await retry(
      `indexerToClient.getBlockHeaderFromClientByHash.${label}`,
      async () => {
        return await this.client.getBlockHeader(blockHash);
      },
      thisreference.timeoutTime,
      thisreference.numRetry,
      thisreference.backOffTime
    );
    if (!result) {
      failureCallback(`indexerToClient.getBlockHeaderFromClientByHash.${label} - null block returned`);
    }
    return result;
  }

  public async getBlockHeightFromClient(label: string): Promise<number> {
    let thisreference = this;
    return await retry(
      `indexerToClient.getBlockHeightFromClient.${label}`,
      async () => {
        return this.client.getBlockHeight();
      },
      thisreference.timeoutTime,
      thisreference.numRetry,
      thisreference.backOffTime
    );
  }

  public async getBottomBlockHeightFromClient(label: string): Promise<number> {
    let thisreference = this;
    return await retry(
      `indexerToClient.getBottomBlockHeightFromClient.${label}`,
      async () => {
        return this.client.getBottomBlockHeight();
      },
      thisreference.timeoutTime,
      thisreference.numRetry,
      thisreference.backOffTime
    );
  }

  /**
   *
   * @param blockNumber
   * @returns
   * @category AdvancedMethod
   */
  public async getBlockNumberTimestampFromClient(blockNumber: number): Promise<number> {
    // todo: get `getBlockLite` FAST version of block read since we only need timestamp
    const block = (await this.getBlockHeaderFromClient(`getBlockNumberTimestampFromClient`, blockNumber)) as IBlock;
    // block cannot be undefined as the above call will fatally fail and terminate app
    return block.unixTimestamp;
  }
}
