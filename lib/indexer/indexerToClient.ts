import { IBlock, IBlockHeader, MccClient, ReadRpcInterface } from "@flarenetwork/mcc";
// import { CachedMccClient } from "../caching/CachedMccClient";
import { failureCallback, retry } from "../utils/PromiseTimeout";

/**
 * Class that manages interactions of indexer with CachedClient
 */
export class IndexerToClient {
  client: ReadRpcInterface;
  // cachedClient: CachedMccClient;

  constructor(client: ReadRpcInterface) {
    this.client = client;
  }

  //Error is handled by retry not by !result
  /**
   *
   * @param label
   * @param blockNumber
   * @returns
   * @category BaseMethod
   */
  public async getBlockFromClient(label: string, blockNumber: number): Promise<IBlock> {
    // todo: implement MCC lite version of getBlock
    const result = await retry(`indexer.getBlockFromClient.${label}`, async () => {
      return await this.client.getBlock(blockNumber);
    });
    if (!result) {
      failureCallback(`indexer.getBlockFromClient.${label} - null block returned`);
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
    const result = await retry(`indexer.getBlockFromClientByHash.${label}`, async () => {
      return await this.client.getBlock(blockHash);
    });
    if (!result) {
      failureCallback(`indexer.getBlockFromClientByHash.${label} - null block returned`);
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
    const result = await retry(`indexer.getBlockHeaderFromClientByHash.${label}`, async () => {
      return await this.client.getBlockHeader(blockHash);
    });
    if (!result) {
      failureCallback(`indexer.getBlockHeaderFromClientByHash.${label} - null block returned`);
    }
    return result;
  }

  public async getBlockHeightFromClient(label: string): Promise<number> {
    return await retry(`indexer.getBlockHeightFromClient.${label}`, async () => {
      return this.client.getBlockHeight();
    });
  }

  public async getBottomBlockHeightFromClient(label: string): Promise<number> {
    return await retry(`indexer.getBottomBlockHeightFromClient.${label}`, async () => {
      return this.client.getBottomBlockHeight();
    });
  }

  /**
   *
   * @param blockNumber
   * @returns
   * @category AdvancedMethod
   */
  public async getBlockNumberTimestampFromClient(blockNumber: number): Promise<number> {
    // todo: get `getBlockLite` FAST version of block read since we only need timestamp
    const block = (await this.getBlockFromClient(`getBlockNumberTimestampFromClient`, blockNumber)) as IBlock;
    // block cannot be undefined as the above call will fatally fail and terminate app
    return block.unixTimestamp;
  }
}
