import { ChainType, MCC } from "@flarenetwork/mcc";
import { IDBBlockBase } from "../../../../entity/indexer/dbBlock";
import { IDBTransactionBase } from "../../../../entity/indexer/dbTransaction";
import { prepareIndexerTables } from "../../../../indexer/indexer-utils";
import { readSecureConfig } from "../../../../utils/config/configSecure";
import { VerifierServerConfig } from "../config-models/VerifierServerConfig";

export class VerifierConfigurationService {
  config: VerifierServerConfig;
  verifierType = process.env.VERIFIER_TYPE ? process.env.VERIFIER_TYPE : "vpws";
  _initialized = false;
  transactionTable: IDBTransactionBase[];
  blockTable: IDBBlockBase;

  constructor() {
    let chainType = MCC.getChainType(this.verifierType.toUpperCase());
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported verifier type '${this.verifierType}'`);
    }
    let { transactionTable, blockTable } = prepareIndexerTables(chainType);
    this.transactionTable = transactionTable;
    this.blockTable = blockTable;
  }

  async initialize() {
    if (this._initialized) return;
    this.config = await readSecureConfig(new VerifierServerConfig(), `verifier-server/${this.verifierType}-verifier`);
    this._initialized = true;
  }
}

export class ExternalDBVerifierConfigurationService {
  config: VerifierServerConfig;
  verifierType = process.env.VERIFIER_TYPE ? process.env.VERIFIER_TYPE : "vpws";
  _initialized = false;

  constructor() {
    let chainType = MCC.getChainType(this.verifierType.toUpperCase());
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported verifier type '${this.verifierType}'`);
    }
  }

  async initialize() {
    if (this._initialized) return;
    this.config = await readSecureConfig(new VerifierServerConfig(), `verifier-server/${this.verifierType}-verifier`);
    this._initialized = true;
  }
}
