import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { readSecureConfig } from "../../../../utils/config/configSecure";
import { indexerEntities } from "../../../../utils/database/databaseEntities";
import { getGlobalLogger } from "../../../../utils/logging/logger";
import { VerifierServerConfig } from "../config-models/VerifierServerConfig";

export async function createTypeOrmOptions(loggerLabel: string): Promise<TypeOrmModuleOptions> {
  // Entity definition
  let verifierType = process.env.VERIFIER_TYPE;
  const config = await readSecureConfig(new VerifierServerConfig(), `verifier-server/${verifierType}-verifier`);
  // connecting to external postgres db
  if (process.env.NODE_ENV === "development" && process.env.EXTERNAL === "django") {
    // get custom entities

    if (verifierType !== "doge") {
      throw new Error("Currently only DOGE can connect to external postgres db");
    }
    const entities = indexerEntities(`${verifierType}-external`);
    const databaseCredentials = config.indexerDatabase;

    return {
      name: databaseCredentials.name,
      type: "postgres",
      host: databaseCredentials.host,
      port: databaseCredentials.port,
      username: databaseCredentials.username,
      password: databaseCredentials.password,
      database: databaseCredentials.database,
      entities: entities,
      synchronize: false,
      migrationsRun: false,
      logging: false,
    };
  }

  // Production connection to external postgres database
  if (process.env.EXTERNAL === "django") {
    if (verifierType !== "doge") {
      throw new Error("Currently only DOGE can connect to external postgres db");
    }
    const entities = indexerEntities(`${verifierType}-external`);
    const databaseCredentials = config.indexerDatabase;
    return {
      name: databaseCredentials.name,
      type: "postgres",
      host: databaseCredentials.host,
      port: databaseCredentials.port,
      username: databaseCredentials.username,
      password: databaseCredentials.password,
      database: databaseCredentials.database,
      entities: entities,
      synchronize: false,
      migrationsRun: false,
      logging: false,
    };
  }

  const entities = indexerEntities(verifierType);

  // In memory for testing
  if (
    process.env.NODE_ENV === "development" &&
    process.env.TEST_CREDENTIALS &&
    (config.indexerDatabase.inMemory || config.indexerDatabase.testSqlite3DBPath !== "")
  ) {
    return {
      name: "indexerDatabase",
      type: "better-sqlite3",
      database:
        config.indexerDatabase.testSqlite3DBPath && config.indexerDatabase.testSqlite3DBPath !== "" ? config.indexerDatabase.testSqlite3DBPath : ":memory:",
      dropSchema: config.indexerDatabase.dropSchema !== undefined ? config.indexerDatabase.dropSchema : true,
      entities: entities,
      synchronize: config.indexerDatabase.synchronize !== undefined ? config.indexerDatabase.synchronize : true,
      migrationsRun: false,
      logging: false,
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
    type: "mysql",
    host: databaseCredentials.host,
    port: databaseCredentials.port,
    username: databaseCredentials.username,
    password: databaseCredentials.password,
    database: databaseCredentials.database,
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
