import { ChainType, MCC, UtxoMccCreate } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { IIndexedQueryManager } from "../../../../../indexed-query-manager/IIndexedQueryManager";
import { IndexedQueryManager } from "../../../../../indexed-query-manager/IndexedQueryManager";
import { IndexedQueryManagerOptions } from "../../../../../indexed-query-manager/indexed-query-manager-types";
import { VerifierConfigurationService } from "../verifier-configuration.service";

export class BTCProcessorService {
  client: MCC.BTC;
  indexedQueryManager: IIndexedQueryManager;

  constructor(private config: VerifierConfigurationService, private manager: EntityManager) {
    this.client = new MCC.BTC(this.config.config.chainConfiguration.mccCreate as UtxoMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.BTC,
      entityManager: this.manager,
      numberOfConfirmations: () => {
        return this.config.config.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);
  }
}
