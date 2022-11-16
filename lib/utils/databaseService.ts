import { optional } from "@flarenetwork/mcc";
import { Connection, createConnection, DataSource } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import { AttLogger, logException } from "./logger";
import { sleepms } from "./utils";

// temporary fix???

export class DatabaseConnectOptions {
  @optional() type = "mysql";
  @optional() host = "localhost";
  @optional() port = 3306;
  database = "database";
  username = "username";
  password = "password";
}

export class DatabaseSourceOptions {
  type = "mysql";
  host = "localhost";
  port = 3306;
  database = "database";
  username = "username";
  password = "password";
  synchronize = true;
  logging = false;
  entities = [`lib/entity/**/*.ts`];
  migrations = [];
  subscribers = [];
}

export class DatabaseService {
  private logger!: AttLogger;

  // _connection!: Connection;

  private databaseName: string;
  private connectionName: string;
  public dataSource: DataSource;

  private options: DatabaseSourceOptions;

  public constructor(logger: AttLogger, options: DatabaseSourceOptions, databaseName = "", connectionName = "") {
    this.logger = logger;

    this.databaseName = databaseName;
    this.connectionName = connectionName == "" ? databaseName : connectionName;

    let connectoptions = {
      type: options.type,
      host: options.host,
      port: options.port,
      username: options.username,
      password: options.password,
      database: options.database,
      entities: options.entities,
      synchronize: options.synchronize,
      logging: options.logging,
    } as MysqlConnectionOptions;

    this.dataSource = new DataSource(connectoptions);

    // this.dataSource
    //   .initialize()
    //   .then((nekej) => {
    //     console.log(nekej);
    //   })
    //   .catch((error) => console.log(error));

    // eslint-disable-next-line
  }

  public async init() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  // private async connect() {
  //   // Typeorm/ES6/Typescript issue with importing modules
  //   // let path = this.databaseName;
  //   const entities = `lib/entity/**/*.ts`;
  //   // if (path !== "") path += "/";
  //   // const entities = process.env.NODE_ENV === "development" ? `lib/entity/${path}**/*.ts` : `dist/lib/entity/${path}**/*.js`;

  //   // const migrations = process.env.NODE_ENV === "development" ? `lib/migration/${this.databaseName}*.ts` : `dist/lib/migration/${this.databaseName}*.js`;

  //   this.logger.info(
  //     `^Yconnecting to database ^g^K${this.options.database}^^ at ${this.options.host} on port ${this.options.port} as ${this.options.username} (^W${process.env.NODE_ENV}^^)`
  //   );
  //   this.logger.debug2(`entity: ${entities}`);

  //   let type:
  //     | "mysql"
  //     | "mariadb"
  //     | "postgres"
  //     | "cockroachdb"
  //     | "sqlite"
  //     | "mssql"
  //     | "sap"
  //     | "oracle"
  //     | "cordova"
  //     | "nativescript"
  //     | "react-native"
  //     | "sqljs"
  //     | "mongodb"
  //     | "aurora-data-api"
  //     | "aurora-data-api-pg"
  //     | "expo"
  //     | "better-sqlite3"
  //     | "capacitor";

  //   type = "mysql";

  //   switch (this.options.type) {
  //     case "mysql":
  //       type = "mysql";
  //       break;
  //     case "postgres":
  //       type = "postgres";
  //       break;
  //     case "sqlite":
  //       type = "sqlite";
  //       break;
  //   }

  //   let options;

  //   if (type === "sqlite") {
  //     options = {
  //       name: this.connectionName,
  //       type: type,
  //       database: this.options.database!,
  //       entities: [entities],
  //       migrations: [],
  //       synchronize: true,
  //       logging: false,
  //     };
  //   } else {
  //     options = {
  //       name: this.connectionName,
  //       type: type,
  //       host: this.options.host,
  //       port: this.options.port,
  //       username: this.options.username,
  //       password: this.options.password,
  //       database: this.options.database,
  //       entities: [entities],
  //       migrations: [],
  //       synchronize: true,
  //       migrationsRun: false,
  //       logging: false,
  //     };
  //   }

  //   createConnection(options)
  //     .then(async (conn) => {
  //       this.logger.info(`^Gconnected to database ^g^K${this.databaseName}^^`);
  //       this._connection = conn;
  //       return;
  //     })
  //     .catch(async (e) => {
  //       logException(e, `connect`);

  //       await sleepms(3000);

  //       // eslint-disable-next-line
  //       this.connect();
  //     });
  // }

  public get connection() {
    return this.dataSource;
  }

  public get manager() {
    if (this.dataSource.manager) return this.dataSource.manager;
    throw Error(`no database connection ${this.databaseName}`);
  }

  async waitForDBConnection() {
    while (true) {
      try {
        if (!this.connection) {
          this.logger.debug(`waiting for database connection ^b^K${this.databaseName}^^`);
          await sleepms(1000);
          continue;
        }
      } catch (error) {
        logException(error, `waitForDBConnection`);
        await sleepms(1000);
        continue;
      }
      break;
    }
  }
}
