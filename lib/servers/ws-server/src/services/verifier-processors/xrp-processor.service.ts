import { ChainType, MCC, XrpMccCreate } from '@flarenetwork/mcc';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { IndexedQueryManagerOptions } from '../../../../../indexed-query-manager/indexed-query-manager-types';
import { IndexedQueryManager } from '../../../../../indexed-query-manager/IndexedQueryManager';
import { AttestationRequest } from '../../../../../verification/attestation-types/attestation-types';
import { verifyXRP } from '../../../../../verification/verifiers/verifier_routing';
import { WSServerConfigurationService } from '../../../../common/src';

@Injectable()
export class XRPProcessorService {
  client: MCC.XRP;
  indexedQueryManager: IndexedQueryManager;

  constructor(
    private config: WSServerConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) {
    this.client = new MCC.XRP(this.config.wsServerCredentials.chainConfiguration.mccCreate as XrpMccCreate);

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.XRP,
      entityManager: this.manager,
      maxValidIndexerDelaySec: this.config.wsServerCredentials.chainConfiguration.maxValidIndexerDelaySec,

      numberOfConfirmations: () => {
        return this.config.wsServerCredentials.chainConfiguration.numberOfConfirmations;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);

  }

  public async verify(attestationRequest: AttestationRequest) {
    return verifyXRP(
      this.client,
      attestationRequest.request,
      attestationRequest.options,
      this.indexedQueryManager
    )
  }

}
