import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../../../../entity/indexer/dbBlock";
import { DBState } from "../../../../entity/indexer/dbState";
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from "../../../../entity/indexer/dbTransaction";
import { readSecureConfig } from "../../../../utils/configSecure";
import { getGlobalLogger } from "../../../../utils/logger";
import { IndexerServerConfig } from "../config-models/IndexerServerConfig";

export async function createTypeOrmOptions(loggerLabel: string): Promise<TypeOrmModuleOptions> {
   // Entity definition
   let entities: any = [DBTransactionBase, DBBlockBase, DBState];

   let indexerType = process.env.INDEXER_TYPE;

   switch (indexerType) {
      case 'btc':
         entities.push(DBBlockBTC, DBTransactionBTC0, DBTransactionBTC1);
         break;
      case 'ltc':
         entities.push(DBBlockLTC, DBTransactionLTC0, DBTransactionLTC1);
         break;
      case 'doge':
         entities.push(DBBlockDOGE, DBTransactionDOGE0, DBTransactionDOGE1);
         break;
      case 'xrp':
         entities.push(DBBlockXRP, DBTransactionXRP0, DBTransactionXRP1);
         break;
      case 'algo':
         entities.push(DBBlockALGO, DBTransactionALGO0, DBTransactionALGO1);
         break;
      default:
         throw new Error(`Wrong indexer type '${indexerType}'`)
   }


   const config = await readSecureConfig(new IndexerServerConfig(),  `indexer-server/${indexerType}-indexer-server`);
   const databaseOptions = config.indexerDatabase;
   let databaseName = databaseOptions.database;
   let logger = getGlobalLogger(loggerLabel);
   logger.info(
      `^Yconnecting to database ^g^K${databaseName}^^ at ${databaseOptions.host} on port ${databaseOptions.port} as ${databaseOptions.username} (^W${process.env.NODE_ENV}^^)`
   );

   return {
      //name: databaseName,
      type: 'mysql',
      host: databaseOptions.host,
      port: databaseOptions.port,
      username: databaseOptions.username,
      password: databaseOptions.password,
      database: databaseOptions.database,
      entities: entities,
      // migrations: [migrations],
      synchronize: true,
      migrationsRun: false,
      logging: false

      //   migrations: ['dist/migrations/*.{ts,js}'],
      // logger: 'file',
      // synchronize: !productionMode, // never use TRUE in production!
      // autoLoadEntities: true,
   };
}
