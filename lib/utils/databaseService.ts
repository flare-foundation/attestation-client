import { Connection, createConnection } from "typeorm";
import { AttLogger, logException } from "./logger";
import { sleepms } from "./utils";

export class DatabaseService {

    private logger!: AttLogger;

    _connection!: Connection;

    public constructor(logger: AttLogger) {
        this.logger = logger;

        this.connect()
    }

    private async connect() {
        this.logger.info(`Connecting to database at ${process.env.DB_HOST} on port ${parseInt(process.env.DB_HOST_PORT!, 10)} as ${process.env.DB_HOST_USER}`)
        // Typeorm/ES6/Typescript issue with importing modules
        const entities = process.env.NODE_ENV === 'development'
            ? "lib/entity/**/*.ts"
            : "dist/lib/entity/**/*.js"

        const migrations = process.env.NODE_ENV === 'development'
            ? "lib/migration/*.ts"
            : "dist/lib/migration/*.js"


        let type: "mysql" | "mariadb" | "postgres" | "cockroachdb" | "sqlite" | "mssql" | "sap" | "oracle" | "cordova" | "nativescript" | "react-native" | "sqljs" | "mongodb" | "aurora-data-api" | "aurora-data-api-pg" | "expo" | "better-sqlite3" | "capacitor";

        type = "mysql";

        switch (process.env.DB_HOST_TYPE) {
            case "mysql": type = "mysql"; break;
            case "postgres": type = "postgres"; break;
            case "sqlite": type = "sqlite"; break;
        }

        let options;

        if (type === "sqlite") {
            options = {
                type: type,
                database: process.env.DB_HOST_DATABASE!,
                entities: [entities],
                migrations: [migrations],
                synchronize: true,
                logging: false,
            }

        }
        else {
            options = {
                type: type,
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_HOST_PORT!, 10),
                username: process.env.DB_HOST_USER,
                password: process.env.DB_HOST_PASSWORD,
                database: process.env.DB_HOST_DATABASE,
                entities: [entities],
                migrations: [migrations],
                synchronize: true,
                migrationsRun: false,
                logging: false,
            }
        }

        createConnection(options).then(async conn => {
            this.logger.info(`Connected to database at ${process.env.DB_HOST} on port ${parseInt(process.env.DB_HOST_PORT!, 10)} as ${process.env.DB_HOST_USER}`);
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
        throw Error("No database connection")
    }

    async waitForDBConnection() {
        while (true) {
            if (!this.connection) {
                this.logger.info("Waiting for DB connection");
                await sleepms(1000);
                continue;
            }            
            break;
        }
    }
}