import { ChainType, MCC, XrpMccCreate } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { IndexedQueryManager } from "../../../../../indexed-query-manager/IndexedQueryManager";
import { IndexedQueryManagerOptions } from "../../../../../indexed-query-manager/indexed-query-manager-types";
import { VerifierConfigurationService } from "../verifier-configuration.service";

export class XRPProcessorService {
  client: MCC.XRP;
  indexedQueryManager: IndexedQueryManager;

  constructor(private config: VerifierConfigurationService, private manager: EntityManager) {
    this.client = new MCC.XRP(this.config.config.chainConfiguration.mccCreate as XrpMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.XRP,
      entityManager: this.manager,
      numberOfConfirmations: () => {
        return this.config.config.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);
  }

}
