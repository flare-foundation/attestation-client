import { ChainType, MCC, UtxoMccCreate } from '@flarenetwork/mcc';
import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { IndexedQueryManagerOptions } from '../../../../../indexed-query-manager/indexed-query-manager-types';
import { IndexedQueryManager } from '../../../../../indexed-query-manager/IndexedQueryManager';
import { AttestationRequest } from '../../../../../verification/attestation-types/attestation-types';
import { hexlifyBN } from '../../../../../verification/attestation-types/attestation-types-helpers';
import { verifyLTC } from '../../../../../verification/verifiers/verifier_routing';
import { VerifierConfigurationService } from '../verifier-configuration.service';
import { VerifierProcessor } from './verifier-processor';

@Injectable()
export class LTCProcessorService extends VerifierProcessor {
  client: MCC.LTC;
  indexedQueryManager: IndexedQueryManager;

  constructor(
    @Inject("VERIFIER_CONFIG") private config: VerifierConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) {
    super();
    this.client = new MCC.LTC(this.config.wsServerCredentials.chainConfiguration.mccCreate as UtxoMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.LTC,
      entityManager: this.manager,
      maxValidIndexerDelaySec: this.config.wsServerCredentials.chainConfiguration.maxValidIndexerDelaySec,

      numberOfConfirmations: () => {
        return this.config.wsServerCredentials.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);

  }

  public async verify(attestationRequest: AttestationRequest) {
    this.assertIsSupported(attestationRequest);
    let response = await verifyLTC(
      this.client,
      attestationRequest.request,
      attestationRequest.options,
      this.indexedQueryManager
    );
    return hexlifyBN(response);
  }

  public supportedAttestationTypes(): string[] {
    return this.config.wsServerConfiguration.attestationTypes;
  }

  public supportedSource(): string {
    return this.config.wsServerConfiguration.sourceId;
  }

}
