import { optional } from "@flarenetwork/mcc";
import { DataSource, DataSourceOptions } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import { AttLogger } from "./logger";

/**
 *Class describing with data to establish connection to database
 */
export class DatabaseConnectOptions {
  @optional() type = "mysql";
  @optional() host = "localhost";
  @optional() port = 3306;
  database = "database";
  username = "username";
  password = "password";
  @optional() synchronize = true;
  @optional() logging = false;
  @optional() entities = undefined;
  @optional() migrations = [];
  @optional() subscribers = [];
  @optional() inMemory = false;
  @optional() testSqlite3DBPath: string | undefined = undefined;
}

/**
 * DatabaseService for storing the attestation data and indexer data
 */
export class DatabaseService {
  private logger!: AttLogger;

  private databaseName: string;
  private connectionName: string;
  public dataSource: DataSource;

  private options: DatabaseConnectOptions;

  isSqlite3 = false;

  public constructor(
    logger: AttLogger,
    options: DatabaseConnectOptions,
    databaseName = "",
    connectionName = "",
    testDBPath: boolean | string = false  // if boolean, then in-memory better-sqlite3 DB is used. If string then it is considered as a path to .db file. Can be used only for testing.
  ) {
    this.logger = logger;

    this.databaseName = databaseName;
    this.connectionName = connectionName == "" ? databaseName : connectionName;

    this.options = options;

    let path = this.databaseName;
    if (path !== "") path += "/";

    const entities = process.env.NODE_ENV === "development" ? `src/entity/${path}**/*.ts` : `dist/src/entity/${path}**/*.js`;

    const migrations = process.env.NODE_ENV === "development" ? `src/migration/${this.databaseName}*.ts` : `dist/src/migration/${this.databaseName}*.js`;

    if (process.env.NODE_ENV === "development" && (testDBPath || this.options.inMemory || this.options.testSqlite3DBPath)) {
      this.isSqlite3 = true;

      let dbPath: string | undefined = undefined;
      if(testDBPath && typeof testDBPath === "string") {
        dbPath = testDBPath;
      } else if(this.options.testSqlite3DBPath) {
        dbPath = this.options.testSqlite3DBPath;
      }
      let connectOptions = {
        name: this.connectionName,
        type: "better-sqlite3",
        database: dbPath ?? ":memory:",
        dropSchema: true,
        entities: this.options.entities ?? [entities],
        synchronize: true,
        migrationsRun: false,
        logging: false,
      } as DataSourceOptions;
      this.dataSource = new DataSource(connectOptions);
      this.logger.debug2(`entity: ${entities}`);
    } else {
      let connectOptions = {
        name: this.connectionName,
        type: "mysql",
        host: this.options.host,
        port: this.options.port,
        username: this.options.username,
        password: this.options.password,
        database: this.options.database,
        entities: this.options.entities ?? [entities],
        migrations: this.options.migrations ?? [migrations],
        synchronize: this.options.synchronize ?? true,
        logging: this.options.logging ?? false,
      } as MysqlConnectionOptions;

      this.dataSource = new DataSource(connectOptions);
      this.logger.debug(`entity: ${entities}`);
    }
  }

  public async connect() {
    this.logger.info(
      `^Yconnecting to database ^g^K${this.options.database}^^ at ${this.options.host} on port ${this.options.port} as ${this.options.username} (^W${process.env.NODE_ENV}^^)`
    );
    if (!this.dataSource.isInitialized) {
      // TODO: retry logic

      await this.dataSource.initialize();
    }
  }

  public get manager() {
    if (this.dataSource.manager) return this.dataSource.manager;
    throw Error(`no database connection ${this.databaseName}`);
  }
}
