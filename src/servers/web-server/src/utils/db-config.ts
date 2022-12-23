import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { readSecureConfig } from "../../../../utils/configSecure";
import { getGlobalLogger } from "../../../../utils/logger";
import { WebserverConfig } from "../../../common/src";

export async function createTypeOrmOptions(configKey: "attesterDatabase" | "indexerDatabase", loggerLabel: string, entities: any[]): Promise<TypeOrmModuleOptions> {
   const config = await readSecureConfig(new WebserverConfig(), "webserver");
   const databaseOptions = configKey === "attesterDatabase" ? config.attesterDatabase : config.indexerDatabase;
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
