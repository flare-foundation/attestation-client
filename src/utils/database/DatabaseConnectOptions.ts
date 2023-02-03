import { optional } from "@flarenetwork/mcc";

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
  @optional() synchronize;
  @optional() logging = false;
  @optional() entities = undefined;
  @optional() migrations = [];
  @optional() subscribers = [];
  @optional() inMemory = false;
  @optional() testSqlite3DBPath = "";
  @optional() dropSchema;
}
