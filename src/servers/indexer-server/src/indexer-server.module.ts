import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from '../../../entity/indexer/dbBlock';
import { DBState } from '../../../entity/indexer/dbState';
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from '../../../entity/indexer/dbTransaction';
import { CommonModule } from '../../common/src';
import { IndexerController } from './controllers/indexer.controller';
import { IndexerEngineService } from './services/indexer-engine.service';
import { IndexerServerConfigurationService } from './services/indexer-server-configuration.service';
import { createTypeOrmOptions } from './utils/db-config';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forRootAsync({
      name: "indexerDatabase",
      useFactory: async () => createTypeOrmOptions("indexer-server"),
    }),
  ],
  controllers: [IndexerController],
  providers: [
    {
      provide: 'SERVER_CONFIG',
      useFactory: async () => {
        const config = new IndexerServerConfigurationService();
        await config.initialize()
        return config;
      }
    },
    IndexerEngineService
  ],
})
export class IndexerServerModule { }
