import { ChainType, MCC, UtxoMccCreate } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { DogeIndexedQueryManager } from "../../../../../indexed-query-manager/DogeIndexQueryManager";
import { IIndexedQueryManager } from "../../../../../indexed-query-manager/IIndexedQueryManager";
import { IndexedQueryManagerOptions } from "../../../../../indexed-query-manager/indexed-query-manager-types";
import { VerifierConfigurationService } from "../verifier-configuration.service";

export class DOGEProcessorService {
  client: MCC.DOGE;
  indexedQueryManager: IIndexedQueryManager;

  constructor(private config: VerifierConfigurationService, private manager: EntityManager) {
    this.client = new MCC.DOGE(this.config.config.chainConfiguration.mccCreate as UtxoMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.DOGE,
      entityManager: this.manager,
      numberOfConfirmations: () => {
        return this.config.config.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new DogeIndexedQueryManager(options);
  }

}
