import axios from "axios";
import {
  AlgoMccCreate,
  IAlgoBlockData,
  IAlgoGetBlockHeaderRes,
  IAlgoGetBlockRes,
  IAlgoGetTransactionRes,
  IAlgoListTransactionRes,
  IAlgoLitsTransaction,
  IAlgoStatusRes,
  IAlgoTransaction,
  TransactionSuccessStatus,
} from "../types";
import { algo_ensure_data, toCamelCase, toSnakeCase } from "../utils";

const ALGOCLIENTTIMEOUT = 60000;

function algoResponseValidator(responseCode: number) {
  return responseCode >= 200 && responseCode < 300;
}
export class ALGOImplementation {
  algodClient: any;
  indexerClient: any;

  inRegTest: boolean;

  constructor(createConfig: AlgoMccCreate) {
    this.algodClient = axios.create({
      baseURL: createConfig.algod.url,
      timeout: ALGOCLIENTTIMEOUT,
      headers: {
        "Content-Type": "application/json",
        "X-Algo-API-Token": createConfig.algod.token,
      },
      validateStatus: algoResponseValidator,
    });
    if (createConfig.indexer) {
      this.indexerClient = axios.create({
        baseURL: createConfig.indexer.url,
        timeout: ALGOCLIENTTIMEOUT,
        headers: {
          "Content-Type": "application/json",
          "X-Algo-API-Token": createConfig.indexer.token,
        },
        validateStatus: algoResponseValidator,
      });
    }
    if (!createConfig.inRegTest) {
      this.inRegTest = false;
    } else {
      this.inRegTest = createConfig.inRegTest;
    }
  }

  async isHealthy(): Promise<boolean> {
    let res = await this.algodClient.get("health"); // TODO all apps must be healthy
    const response_code = res.status;
    return response_code === 200;
  }

  async getStatus(): Promise<IAlgoStatusRes> {
    let res = await this.algodClient.get("v2/status");
    algo_ensure_data(res);
    return toCamelCase(res.data) as IAlgoStatusRes;
  }

  async getBlockHeader(round?: number): Promise<IAlgoGetBlockHeaderRes> {
    if (round === undefined) {
      const status = await this.getStatus();
      round = status.lastRound;
    }
    let res = await this.algodClient.get(`/v2/blocks/${round}`);
    algo_ensure_data(res);
    let responseData = toCamelCase(res.data) as IAlgoGetBlockHeaderRes;
    responseData.type = "IAlgoGetBlockHeaderRes";
    return responseData;
  }

  async getBlock(round?: number): Promise<IAlgoGetBlockRes> {
    if (round === undefined) {
      const status = await this.getStatus();
      round = status.lastRound - 1;
    }
    let res = await this.indexerClient.get(`/v2/blocks/${round}`);
    algo_ensure_data(res);
    let camelList = toCamelCase(res.data) as IAlgoGetBlockRes;
    camelList.transactions = [];
    camelList.type = "IAlgoGetBlockRes";
    for (let key of Object.keys(res.data.transactions)) {
      camelList.transactions.push(toCamelCase(res.data.transactions[key]) as IAlgoTransaction);
    }
    return camelList as IAlgoGetBlockRes;
  }

  async getBlockHeight(): Promise<number> {
    const blockData = await this.getBlockHeader();
    return blockData.block.rnd;
  }

  async getBlockHash(blockData?: IAlgoBlockData): Promise<string> {
    if (blockData === undefined) {
      const blockData = await this.getBlock();
      return blockData.genesisHash;
    } else {
      return blockData.genesisHash;
    }
  }

  async getTransaction(txid: string): Promise<IAlgoGetTransactionRes> {
    let res = await this.indexerClient.get(`/v2/transactions/${txid}`);
    algo_ensure_data(res);
    return toCamelCase(res.data) as IAlgoGetTransactionRes;
  }

  async listTransactions(options?: IAlgoLitsTransaction): Promise<IAlgoListTransactionRes> {
    let snakeObject = {};
    if (options !== undefined) {
      snakeObject = toSnakeCase(options);
    }
    let res = await this.indexerClient.get(`/v2/transactions`, {
      params: snakeObject,
    });
    algo_ensure_data(res);
    // let camelList = toCamelCase(res.data) as IAlgoListTransactionRes
    let camelList = {
      currentRound: res.data["current-round"],
      nextToken: res.data["next-token"],
      transactions: [] as IAlgoTransaction[],
    };
    for (let key of Object.keys(res.data.transactions)) {
      camelList.transactions.push(toCamelCase(res.data.transactions[key]) as IAlgoTransaction);
    }
    return camelList as IAlgoListTransactionRes;
    // return toCamelCase(res.data) as IAlgoGetTransactionRes;
  }

  async getTransactionHashesFromBlock(blockDataOrHeight: IAlgoGetBlockRes | IAlgoGetBlockHeaderRes | number): Promise<string[]> {
    let blockNumber = 0;
    if (typeof blockDataOrHeight === "number") {
      blockNumber = blockDataOrHeight;
    } else if (blockDataOrHeight.type === "IAlgoGetBlockRes") {
      if (blockDataOrHeight.transactions) {
        return blockDataOrHeight.transactions?.map(filterHashes);
      } else return [];
    } else {
      blockNumber = blockDataOrHeight.block.rnd;
    }
    let transactionsList = (await this.listTransactions({ round: blockNumber })).transactions.map(filterHashes);
    return transactionsList;
  }

  getTransactionStatus(tx: IAlgoTransaction) {
    // TODO: Check transaction status!!!
    return TransactionSuccessStatus.SUCCESS;
  }
}

function filterHashes(trans: IAlgoTransaction) {
  if (trans.id) {
    return trans.id;
  } else {
    return "";
  }
}
