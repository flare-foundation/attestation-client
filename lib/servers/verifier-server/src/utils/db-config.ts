import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../../../../entity/indexer/dbBlock";
import { DBState } from "../../../../entity/indexer/dbState";
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from "../../../../entity/indexer/dbTransaction";
import { readSecureCredentials } from "../../../../utils/configSecure";
import { getGlobalLogger } from "../../../../utils/logger";
import { WSServerCredentials } from "../../../common/src";

export async function createTypeOrmOptions(configKey: string, loggerLabel: string): Promise<TypeOrmModuleOptions> {
   // Entity definition
   let entities: any = [DBTransactionBase, DBBlockBase, DBState];

   let verifierType = process.env.VERIFIER_TYPE;

   switch (verifierType) {
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
         throw new Error(`Wrong verifier type '${verifierType}'`)
   }

   if(process.env.IN_MEMORY_DB && process.env.NODE_ENV !== "production") {
      return {
         name: configKey,
         type: 'better-sqlite3',
         database: ':memory:',
         dropSchema: true,
         entities: entities,
         synchronize: true,
         migrationsRun: false,
         logging: false
      };
   }

   // MySQL database, get credentials
   const credentials = await readSecureCredentials(new WSServerCredentials(), "backend")[configKey];
   let databaseName = credentials.database;
   let logger = getGlobalLogger(loggerLabel);
   logger.info(
      `^Yconnecting to database ^g^K${databaseName}^^ at ${credentials.host} on port ${credentials.port} as ${credentials.username} (^W${process.env.NODE_ENV}^^)`
   );

   return {
      name: databaseName,
      type: 'mysql',
      host: credentials.host,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      database: credentials.database,
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


