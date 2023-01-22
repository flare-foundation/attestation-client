import { ChainType, MCC, XrpMccCreate } from '@flarenetwork/mcc';
import { EntityManager } from 'typeorm';
import { IndexedQueryManagerOptions } from '../../../../../indexed-query-manager/indexed-query-manager-types';
import { IndexedQueryManager } from '../../../../../indexed-query-manager/IndexedQueryManager';
import { AttestationRequest } from '../../../../../verification/attestation-types/attestation-types';
import { hexlifyBN } from '../../../../../verification/attestation-types/attestation-types-helpers';
import { verifyXRP } from '../../../../../verification/verifiers/verifier_routing';
import { VerifierConfigurationService } from '../verifier-configuration.service';
import { VerifierProcessor } from './verifier-processor';

export class XRPProcessorService extends VerifierProcessor {
  client: MCC.XRP;
  indexedQueryManager: IndexedQueryManager;

  constructor(
    private config: VerifierConfigurationService,
    private manager: EntityManager
  ) {
    super();
    this.client = new MCC.XRP(this.config.config.chainConfiguration.mccCreate as XrpMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.XRP,
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
    let response = await verifyXRP(
      this.client,
      attestationRequest.request,
      attestationRequest.options || {},
      this.indexedQueryManager
    );
    return hexlifyBN(response);
  }

  public supportedAttestationTypes(): string[] {
    return this.config.config.attestationTypes;
  }

  public supportedSource(): string {
    return this.config.config.sourceId;
  }

}
