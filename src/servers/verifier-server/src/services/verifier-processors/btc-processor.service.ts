import { BtcTransaction, ChainType, MCC, MccClient, UtxoMccCreate } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { IndexedQueryManager } from "../../../../../indexed-query-manager/IndexedQueryManager";
import { IndexedQueryManagerOptions } from "../../../../../indexed-query-manager/indexed-query-manager-types";
import { VerifierConfigurationService } from "../verifier-configuration.service";
import { AttestationResponse } from "../../../../../external-libs/AttestationResponse";
import { ARBase } from "../../../../../external-libs/interfaces";
import { ZERO_BYTES_32 } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { VerificationResponse } from "../../verification/verification-utils";

export class BTCProcessorService {
  client: MCC.BTC;
  indexedQueryManager: IndexedQueryManager;
  txClass = BtcTransaction;

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
