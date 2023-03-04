import { DataSource, DataSourceOptions } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import { AttLogger } from "../logging/logger";
import { DatabaseConnectOptions } from "./DatabaseConnectOptions";

/**
 * DatabaseService class for managing the connection to a database.  It creates TypeORM connection and provides relevant entity manager class.
 * It supports two databases, MySQL and better-sqlite3. The latter is
 * used for testing purposes only.
 */
export class DatabaseService {
  private logger!: AttLogger;

  private databaseName: string;
  private connectionName: string;
  public dataSource: DataSource;

  private options: DatabaseConnectOptions;

  private _isSqlite3 = false;

  public constructor(
    logger: AttLogger,
    options: DatabaseConnectOptions,
    databaseName = "",
    connectionName = "",
    testDBPath: boolean | string = false // if boolean, then in-memory better-sqlite3 DB is used. If string then it is considered as a path to .db file. Can be used only for testing.
  ) {
    this.logger = logger;

    this.databaseName = databaseName;
    this.connectionName = connectionName == "" ? databaseName : connectionName;

    this.options = options;

    let path = this.databaseName;
    if (path !== "") path += "/";

    const entities = process.env.NODE_ENV === "development" ? `src/entity/${path}**/*.ts` : `dist/src/entity/${path}**/*.js`;

    if (process.env.NODE_ENV === "development" && (testDBPath || this.options.inMemory || this.options.testSqlite3DBPath !== "")) {
      this._isSqlite3 = true;

      let dbPath: string | undefined;
      if (testDBPath && typeof testDBPath === "string") {
        dbPath = testDBPath;
      } else if (this.options.testSqlite3DBPath !== "") {
        dbPath = this.options.testSqlite3DBPath;
      }
      const connectOptions = {
        name: this.connectionName,
        type: "better-sqlite3",
        database: dbPath ?? ":memory:",
        dropSchema: this.options.dropSchema !== undefined ? this.options.dropSchema : true,
        entities: this.options.entities ?? [entities],
        synchronize: this.options.synchronize !== undefined ? this.options.synchronize : true,
        migrationsRun: false,
        logging: false,
      } as DataSourceOptions;
      this.dataSource = new DataSource(connectOptions);
      this.logger.debug2(`entity: ${entities}`);
    } else {
      const connectOptions = {
        name: this.connectionName,
        type: "mysql",
        host: this.options.host,
        port: this.options.port,
        username: this.options.username,
        password: this.options.password,
        database: this.options.database,
        entities: this.options.entities ?? [entities],
        synchronize: this.options.synchronize ?? false,
        logging: this.options.logging ?? false,
      } as MysqlConnectionOptions;

      this.dataSource = new DataSource(connectOptions);
      this.logger.debug(`entity: ${entities}`);
    }
  }

  /**
   * Initializes the database connection.
   */
  public async connect() {
    this.logger.info(
      `^Yconnecting to database ^g^K${this.options.database}^^ at ${this.options.host} on port ${this.options.port} as ${this.options.username} (^W${process.env.NODE_ENV}^^)`
    );
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  /**
   * Returns true if the database used is Sqlite3 (better-sqlite3).
   */
  get isSqlite3() {
    return this._isSqlite3;
  }

  /**
   * Returns entity manager class if it exists.
   * Otherwise exception is thrown.
   */
  public get manager() {
    if (this.dataSource.manager) return this.dataSource.manager;
    throw Error(`no database connection ${this.databaseName}`);
  }
}
