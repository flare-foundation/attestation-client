import axios from "axios";
import { AlgoMccCreate, IAlgoGetBlockRes, IAlgoGetTransactionRes, IAlgoLitsTransaction, IAlgoStatusRes } from "../types";
import { algo_ensure_data, toCamelCase } from "../utils";

const ALGOCLIENTTIMEOUT = 5000;

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
    let res = await this.algodClient.get("health");
    const response_code = res.status;
    return response_code === 200;
  }

  async getStatus(): Promise<IAlgoStatusRes> {
    let res = await this.algodClient.get("v2/status");
    algo_ensure_data(res);
    return toCamelCase(res.data) as IAlgoStatusRes;
  }

  async getBlock(): Promise<IAlgoGetBlockRes> {
    const status = await this.getStatus();
    let res = await this.algodClient.get(`/v2/blocks/${status.lastRound}`);
    algo_ensure_data(res);
    return res.data;
  }

  async getBlockHeight(): Promise<number> {
    const blockData = await this.getBlock();
    return blockData.block.rnd;
  }

  async getTransaction(txid: string): Promise<IAlgoGetTransactionRes> {
    let res = await this.indexerClient.get(`/v2/transactions/${txid}`);
    algo_ensure_data(res);
    return toCamelCase(res.data) as IAlgoGetTransactionRes;
  }

  async listTransactions(options: IAlgoLitsTransaction) {
    console.log(options);

    let res = await this.indexerClient.get(`/v2/transactions/`, {
      params: {
        address: "TJJOR7ZYLAO5ZT37EX4DBESELW7TAFFIAU2GRYBX2OY3V4M4XHIWWDMXRA",
      },
    });
    algo_ensure_data(res);
    console.log(res.data);

    // return toCamelCase(res.data) as IAlgoGetTransactionRes;
  }
}
