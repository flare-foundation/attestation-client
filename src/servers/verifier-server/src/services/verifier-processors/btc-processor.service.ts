import { ChainType, MCC, UtxoMccCreate } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { IndexedQueryManagerOptions } from "../../../../../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../../../../indexed-query-manager/IndexedQueryManager";
import { AttestationRequest } from "../../../../../verification/attestation-types/attestation-types";
import { hexlifyBN } from "../../../../../verification/attestation-types/attestation-types-helpers";
import { verifyBTC } from "../../../../../verification/verifiers/verifier_routing";
import { VerifierConfigurationService } from "../verifier-configuration.service";
import { VerifierProcessor } from "./verifier-processor";

export class BTCProcessorService extends VerifierProcessor {
  client: MCC.BTC;
  indexedQueryManager: IndexedQueryManager;

  constructor(private config: VerifierConfigurationService, private manager: EntityManager) {
    super();
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

  public async verify(attestationRequest: AttestationRequest) {
    this.assertIsSupported(attestationRequest);
    let response = await verifyBTC(this.client, attestationRequest.request, this.indexedQueryManager);
    return hexlifyBN(response);
  }

  public supportedAttestationTypes(): string[] {
    return this.config.config.attestationTypes;
  }

  public supportedSource(): string {
    return this.config.config.sourceId;
  }
}
