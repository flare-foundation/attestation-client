import axios from "axios";
import {
    AlgoMccCreate,
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

    async listTransactions(options?: IAlgoLitsTransaction): Promise<IAlgoListTransactionRes> {
        let snakeObject = {}
        if(options !== undefined){
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

    async getTransactionHashesFromBlock(blockDataOrHeight: IAlgoGetBlockRes | number): Promise<string[]> {
        let blockNumber = 0;
        if (typeof blockDataOrHeight === "number") {
            blockNumber = blockDataOrHeight;
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
