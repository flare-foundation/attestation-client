import { optional } from "@flarenetwork/mcc";
import { DataSource } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import { AttLogger } from "./logger";

// temporary fix???

export class DatabaseConnectOptions {
  @optional() type = "mysql";
  @optional() host = "localhost";
  @optional() port = 3306;
  database = "database";
  username = "username";
  password = "password";
  @optional() synchronize = true;
  @optional() logging = false;
  @optional() entities = [`lib/entity/**/*.ts`];
  @optional() migrations = [];
  @optional() subscribers = [];
}

export class DatabaseService {
  private logger!: AttLogger;

  private databaseName: string;
  private connectionName: string;
  public dataSource: DataSource;

  private options: DatabaseConnectOptions;

  public constructor(logger: AttLogger, options: DatabaseConnectOptions, databaseName = "", connectionName = "") {
    this.logger = logger;

    this.databaseName = databaseName;
    this.connectionName = connectionName == "" ? databaseName : connectionName;

    this.options = options;

    let path = this.databaseName;
    if (path !== "") path += "/";

    const entities = process.env.NODE_ENV === "development" ? `lib/entity/${path}**/*.ts` : `dist/lib/entity/${path}**/*.js`;

    const migrations = process.env.NODE_ENV === "development" ? `lib/migration/${this.databaseName}*.ts` : `dist/lib/migration/${this.databaseName}*.js`;

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
      logging: this.options.logging ?? false
    } as MysqlConnectionOptions;

    this.dataSource = new DataSource(connectOptions);
    this.logger.debug2(`entity: ${entities}`);
  }

  public async connect() {
    if (!this.dataSource.isInitialized) {
      // TODO: retry logic
      this.logger.info(
        `^Yconnecting to database ^g^K${this.options.database}^^ at ${this.options.host} on port ${this.options.port} as ${this.options.username} (^W${process.env.NODE_ENV}^^)`
      );

      await this.dataSource.initialize();
    }
  }

  public get manager() {
    if (this.dataSource.manager) return this.dataSource.manager;
    throw Error(`no database connection ${this.databaseName}`);
  }

}
