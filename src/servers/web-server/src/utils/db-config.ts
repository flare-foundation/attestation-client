import { WebserverConfig } from "@atc/common";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { readSecureConfig } from "../../../../utils/configSecure";
import { getGlobalLogger } from "../../../../utils/logger";

export async function createTypeOrmOptions(configKey: string, loggerLabel: string, entities: any[]): Promise<TypeOrmModuleOptions> {
   const config = await readSecureConfig(new WebserverConfig(), "webserver")[configKey];
   let databaseName = config.database;
   let logger = getGlobalLogger(loggerLabel);
   logger.info(
      `^Yconnecting to database ^g^K${databaseName}^^ at ${config.host} on port ${config.port} as ${config.username} (^W${process.env.NODE_ENV}^^)`
   );

   return {
      //name: databaseName,
      type: 'mysql',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
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
