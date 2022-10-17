import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { readCredentials } from "../../../../utils/config";
import { getGlobalLogger } from "../../../../utils/logger";
import { ServerCredentials } from "@atc/common";
import { DBAttestationRequest } from "../../../../entity/attester/dbAttestationRequest";
import { DBRoundResult } from "../../../../entity/attester/dbRoundResult";
import { DBVotingRoundResult } from "../../../../entity/attester/dbVotingRoundResult";

export async function createTypeOrmOptions(databaseName: string, loggerLabel: string): Promise<TypeOrmModuleOptions> {
   const credentials = readCredentials(new ServerCredentials(), "backend").attesterDatabase;

   let logger = getGlobalLogger(loggerLabel);

   const entities = [DBAttestationRequest, DBRoundResult, DBVotingRoundResult]

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
