import { CommonModule } from '@atc/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DBAttestationRequest } from '../../../entity/attester/dbAttestationRequest';
import { DBRoundResult } from '../../../entity/attester/dbRoundResult';
import { DBVotingRoundResult } from '../../../entity/attester/dbVotingRoundResult';
import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from '../../../entity/indexer/dbBlock';
import { DBState } from '../../../entity/indexer/dbState';
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from '../../../entity/indexer/dbTransaction';
import { IndexerController } from './controllers/indexer.controller';
import { ProofController } from './controllers/proof.controller';
import { StatusController } from './controllers/status.controller';
import { IndexerEngineService } from './services/indexer-engine.service';
import { ProofEngineService } from './services/proof-engine.service';
import { createTypeOrmOptions } from './utils/db-config';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forRootAsync({
      name: "attesterDatabase",
      useFactory: async () => createTypeOrmOptions("attesterDatabase", "web", [
        DBAttestationRequest, DBRoundResult, DBVotingRoundResult
      ]),
    }),
    TypeOrmModule.forRootAsync({
      name: "indexerDatabase",
      useFactory: async () => createTypeOrmOptions("indexerDatabase", "web", [
        DBTransactionBase, DBBlockBase, DBState,
        DBTransactionALGO0, DBTransactionALGO1, 
        DBTransactionBTC0, DBTransactionBTC1,
        DBTransactionDOGE0, DBTransactionDOGE1,
        DBTransactionLTC0, DBTransactionLTC1,
        DBTransactionXRP0, DBTransactionXRP1,
        DBBlockALGO, DBBlockBTC, DBBlockDOGE,
        DBBlockLTC, DBBlockXRP
      ]),
    }),
  ],
  controllers: [ProofController, StatusController, IndexerController],
  providers: [ProofEngineService, IndexerEngineService],
})
export class WebServerModule { }
