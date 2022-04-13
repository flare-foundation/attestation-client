import { optional } from "flare-mcc";
import { Connection, createConnection } from "typeorm";
import { AttLogger, logException } from "./logger";
import { sleepms } from "./utils";

export class DatabaseConnectOptions {
    @optional() type: string = "mysql";
    @optional() host: string = "localhost";
    @optional() port: number = 3306;
    database: string = "database";
    username: string = "username";
    password: string = "password";

}

export class DatabaseService {

    private logger!: AttLogger;

    _connection!: Connection;

    private name: string;

    private options: DatabaseConnectOptions;

    public constructor(logger: AttLogger, options: DatabaseConnectOptions, database: string="") {
        this.logger = logger;

        this.name = database;

        this.options = options;

        this.connect()
    }

    private async connect() {
        // Typeorm/ES6/Typescript issue with importing modules
        let path = this.name;
        if( path!== "" ) path+="/";
        const entities = process.env.NODE_ENV === 'development'
            ? `lib/entity/${path}**/*.ts`
            : `dist/lib/entity/${path}**/*.js`

        const migrations = process.env.NODE_ENV === 'development'
            ? `lib/migration/${this.name}*.ts`
            : `dist/lib/migration/${this.name}*.js`

        this.logger.info(`^Yconnecting to database ^g^K${this.name}^^ at ${this.options.host} on port ${this.options.port} as ${this.options.username} (^W${process.env.NODE_ENV}^^)`);
        this.logger.debug2( `entity: ${entities}` );

        let type: "mysql" | "mariadb" | "postgres" | "cockroachdb" | "sqlite" | "mssql" | "sap" | "oracle" | "cordova" | "nativescript" | "react-native" | "sqljs" | "mongodb" | "aurora-data-api" | "aurora-data-api-pg" | "expo" | "better-sqlite3" | "capacitor";

        type = "mysql";

        switch (this.options.type) {
            case "mysql": type = "mysql"; break;
            case "postgres": type = "postgres"; break;
            case "sqlite": type = "sqlite"; break;
        }

        let options;

        if (type === "sqlite") {
            options = {
                name: this.name,
                type: type,
                database: this.options.database!,
                entities: [entities],
                migrations: [migrations],
                synchronize: true,
                logging: false,
            }

        }
        else {
            options = {
                name: this.name,
                type: type,
                host: this.options.host,
                port: this.options.port,
                username: this.options.username,
                password: this.options.password,
                database: this.options.database,
                entities: [entities],
                migrations: [migrations],
                synchronize: true,
                migrationsRun: false,
                logging: false,
            }
        }

        createConnection(options).then(async conn => {
            this.logger.info(`^Gconnected to database ^g^K${this.name}^^`);
            this._connection = await conn
            return
        }).catch(async e => {
            logException( e , `connect` );

            await sleepms(3000)
            this.connect()
        })
    }

    public get connection() {
        return this._connection;
    }

    public get manager() {
        if (this._connection) return this._connection.manager
        throw Error(`no database connection ${this.name}`)
    }

    async waitForDBConnection() {
        while (true) {
            if (!this.connection) {
                this.logger.debug(`waiting for database connection ^b^K${this.name}^^`);
                await sleepms(1000);
                continue;
            }            
            break;
        }
    }
}