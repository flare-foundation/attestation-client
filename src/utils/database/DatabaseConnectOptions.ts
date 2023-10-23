import { optional } from "@flarenetwork/mcc";

/**
 * Configuration class describing data connection options to establish connection to database
 */

export class DatabaseConnectOptions {
  /**
   * Database type. Can be `mysql` (production and development) or `better-sqlite3` (for development and tests only)
   */
  @optional() type = "mysql";

  /**
   * Database server address (host)
   */
  @optional() host = "localhost";

  /**
   * Database server port number.
   */
  @optional() port = 3306;

  /**
   * Database server port number.
   */
  @optional() name = "indexerDatabase";

  /**
   * Database name.
   */
  database = "database";

  /**
   * Database user name.
   */
  username = "username";

  /**
   * Database user password.
   */
  password = "password";

  /**
   * TypeORM setting for database changes synchronization.
   */
  @optional() synchronize;

  /**
   * TypeORM setting for logging queries.
   */
  @optional() logging = false;

  /**
   * The list of Entity objects. It is not meant to be obtained from .json files as the members
   * of the list are TypeORM entity classes.
   */
  @optional() entities = undefined;

  /**
   * TypeORM migrations.
   */
  @optional() migrations = [];

  /**
   * Indicator that the in-memory better-sqlite3 database is used. Test purposes only.
   */
  @optional() inMemory = false;

  /**
   * A path to the better-sqlite3 database file. Test purposes only.
   */
  @optional() testSqlite3DBPath = "";

  /**
   * TypeORM setting for dropping schema. Used with the better-sqlite3 database. Test purposes only.
   */
  @optional() dropSchema;
}
