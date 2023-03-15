import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { readSecureConfig } from "../../../../utils/config/configSecure";
import { getGlobalLogger } from "../../../../utils/logging/logger";
import { WebserverConfig } from "../config-models/WebserverConfig";

export async function createTypeOrmOptions(loggerLabel: string, entities: any[]): Promise<TypeOrmModuleOptions> {
  const config = await readSecureConfig(new WebserverConfig(), "webserver");

  if (
    process.env.NODE_ENV === "development" &&
    process.env.TEST_CREDENTIALS &&
    (config.attesterDatabase.inMemory || config.attesterDatabase.testSqlite3DBPath !== "")
  ) {
    return {
      name: "attesterDatabase",
      type: "better-sqlite3",
      database: config.attesterDatabase.testSqlite3DBPath !== "" ? config.attesterDatabase.testSqlite3DBPath : ":memory:",
      dropSchema: config.attesterDatabase.dropSchema !== undefined ? config.attesterDatabase.dropSchema : true,
      entities: entities,
      synchronize: config.attesterDatabase.synchronize !== undefined ? config.attesterDatabase.synchronize : true,
      migrationsRun: false,
      logging: false,
    };
  }

  // MySQL database, get config
  const databaseOptions = config.attesterDatabase;
  let databaseName = databaseOptions.database;
  let logger = getGlobalLogger(loggerLabel);
  logger.info(
    `^Yconnecting to database ^g^K${databaseName}^^ at ${databaseOptions.host} on port ${databaseOptions.port} as ${databaseOptions.username} (^W${process.env.NODE_ENV}^^)`
  );

  return {
    //name: databaseName,
    type: "mysql",
    host: databaseOptions.host,
    port: databaseOptions.port,
    username: databaseOptions.username,
    password: databaseOptions.password,
    database: databaseOptions.database,
    entities: entities,
    // migrations: [migrations],
    synchronize: true,
    migrationsRun: false,
    logging: false,

    //   migrations: ['dist/migrations/*.{ts,js}'],
    // logger: 'file',
    // synchronize: !productionMode, // never use TRUE in production!
    // autoLoadEntities: true,
  };
}
