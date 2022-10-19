import { ServerCredentials } from "@atc/common";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { readCredentials } from "../../../../utils/config";
import { getGlobalLogger } from "../../../../utils/logger";

export async function createTypeOrmOptions(configKey: string, loggerLabel: string, entities: any[]): Promise<TypeOrmModuleOptions> {
   const credentials = readCredentials(new ServerCredentials(), "backend")[configKey];
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
