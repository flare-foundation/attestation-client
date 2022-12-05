import { ChainType, MCC, UtxoMccCreate } from '@flarenetwork/mcc';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { IndexedQueryManagerOptions } from '../../../../../indexed-query-manager/indexed-query-manager-types';
import { IndexedQueryManager } from '../../../../../indexed-query-manager/IndexedQueryManager';
import { AttestationRequest } from '../../../../../verification/attestation-types/attestation-types';
import { verifyBTC } from '../../../../../verification/verifiers/verifier_routing';
import { WSServerConfigurationService } from '../../../../common/src';

@Injectable()
export class BTCProcessorService {
  client: MCC.BTC;
  indexedQueryManager: IndexedQueryManager;

  constructor(
    private config: WSServerConfigurationService,
    @InjectEntityManager("attesterDatabase") private manager: EntityManager
  ) {
    this.client = new MCC.BTC(this.config.wsServerCredentials.chainConfiguration.mccCreate as UtxoMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.BTC,
      entityManager: this.manager,
      maxValidIndexerDelaySec: this.config.wsServerCredentials.chainConfiguration.maxValidIndexerDelaySec,

      numberOfConfirmations: () => {
        return this.config.wsServerCredentials.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);

  }

  public async verify(attestationRequest: AttestationRequest) {
    return verifyBTC(
      this.client,
      attestationRequest.request,
      attestationRequest.options,
      this.indexedQueryManager
    )
  }

}
