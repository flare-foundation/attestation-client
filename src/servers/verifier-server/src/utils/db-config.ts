import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DBBlockALGO, DBBlockBase, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../../../../entity/indexer/dbBlock";
import { DBState } from "../../../../entity/indexer/dbState";
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from "../../../../entity/indexer/dbTransaction";
import { readSecureConfig } from "../../../../utils/configSecure";
import { getGlobalLogger } from "../../../../utils/logger";
import { VerifierServerConfig } from "../config-models/VerifierServerConfig";

export async function createTypeOrmOptions(loggerLabel: string): Promise<TypeOrmModuleOptions> {
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

   const config = await readSecureConfig(new VerifierServerConfig(), `verifier-server/${verifierType}-verifier`);

   if (process.env.NODE_ENV === "development" && process.env.TEST_CREDENTIALS &&
      (config.indexerDatabase.inMemory || config.indexerDatabase.testSqlite3DBPath !== "")) {
      return {
         name: "indexerDatabase",
         type: 'better-sqlite3',
         database: config.indexerDatabase.testSqlite3DBPath !== "" ? config.indexerDatabase.testSqlite3DBPath : ":memory:",
         dropSchema: true,
         entities: entities,
         synchronize: true,
         migrationsRun: false,
         logging: false
      };

   }

   // MySQL database, get config
   const databaseCredentials = config.indexerDatabase;
   let databaseName = databaseCredentials.database;
   let logger = getGlobalLogger(loggerLabel);
   logger.info(
      `^Yconnecting to database ^g^K${databaseName}^^ at ${databaseCredentials.host} on port ${databaseCredentials.port} as ${databaseCredentials.username} (^W${process.env.NODE_ENV}^^)`
   );

   return {
      name: "indexerDatabase",
      type: 'mysql',
      host: databaseCredentials.host,
      port: databaseCredentials.port,
      username: databaseCredentials.username,
      password: databaseCredentials.password,
      database: databaseCredentials.database,
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


