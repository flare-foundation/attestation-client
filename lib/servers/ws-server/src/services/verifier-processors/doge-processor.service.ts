import { ChainType, MCC, UtxoMccCreate } from '@flarenetwork/mcc';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { IndexedQueryManagerOptions } from '../../../../../indexed-query-manager/indexed-query-manager-types';
import { IndexedQueryManager } from '../../../../../indexed-query-manager/IndexedQueryManager';
import { AttestationRequest } from '../../../../../verification/attestation-types/attestation-types';
import { hexlifyBN } from '../../../../../verification/attestation-types/attestation-types-helpers';
import { verifyDOGE } from '../../../../../verification/verifiers/verifier_routing';
import { WSServerConfigurationService } from '../../../../common/src';
import { VerifierProcessor } from './verifier-processor';

@Injectable()
export class DOGEProcessorService extends VerifierProcessor {
  client: MCC.DOGE;
  indexedQueryManager: IndexedQueryManager;

  constructor(
    private config: WSServerConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) {
    super();
    this.client = new MCC.DOGE(this.config.wsServerCredentials.chainConfiguration.mccCreate as UtxoMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.DOGE,
      entityManager: this.manager,
      maxValidIndexerDelaySec: this.config.wsServerCredentials.chainConfiguration.maxValidIndexerDelaySec,

      numberOfConfirmations: () => {
        return this.config.wsServerCredentials.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);

  }

  public async verify(attestationRequest: AttestationRequest) {
    let response = await verifyDOGE(
      this.client,
      attestationRequest.request,
      attestationRequest.options,
      this.indexedQueryManager
    );
    return hexlifyBN(response);
  }

}
