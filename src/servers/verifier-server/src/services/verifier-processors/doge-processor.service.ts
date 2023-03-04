import { ChainType, MCC, UtxoMccCreate } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { IndexedQueryManagerOptions } from "../../../../../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../../../../indexed-query-manager/IndexedQueryManager";
import { AttestationRequest } from "../../../../../verification/attestation-types/attestation-types";
import { hexlifyBN } from "../../../../../verification/attestation-types/attestation-types-helpers";
import { verifyDOGE } from "../../../../../verification/verifiers/verifier_routing";
import { VerifierConfigurationService } from "../verifier-configuration.service";
import { VerifierProcessor } from "./verifier-processor";

export class DOGEProcessorService extends VerifierProcessor {
  client: MCC.DOGE;
  indexedQueryManager: IndexedQueryManager;
  _initialized = false;

  constructor(private config: VerifierConfigurationService, private manager: EntityManager) {
    super();
    this.client = new MCC.DOGE(this.config.config.chainConfiguration.mccCreate as UtxoMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.DOGE,
      entityManager: this.manager,
      maxValidIndexerDelaySec: this.config.config.chainConfiguration.maxValidIndexerDelaySec,

      numberOfConfirmations: () => {
        return this.config.config.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);
  }

  public async verify(attestationRequest: AttestationRequest) {
    this.assertIsSupported(attestationRequest);
    let response = await verifyDOGE(this.client, attestationRequest.request, this.indexedQueryManager);
    return hexlifyBN(response);
  }

  public supportedAttestationTypes(): string[] {
    return this.config.config.attestationTypes;
  }

  public supportedSource(): string {
    return this.config.config.sourceId;
  }
}
