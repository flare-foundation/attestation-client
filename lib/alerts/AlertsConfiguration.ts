import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

class AlertAttestationConfig {
  name = "";
  @optional() mode = "dev";
  @optional() path: "";
  restart = "";
}

class AlertBackendConfig {
  name = "";
  address = "";
  restart = "";
}

class AlertDatabaseConfig implements IReflection<AlertDatabaseConfig> {
  name = "";
  @optional() database = "attester";
  connection = new DatabaseConnectOptions();

  instanciate() {
    return new AlertDatabaseConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

export class AlertConfig implements IReflection<AlertConfig> {
  @optional() interval = 5000;

  @optional() timeLate = 5;
  @optional() timeDown = 10;
  @optional() timeRestart = 20;
  stateSaveFilename = "";
  indexerRestart = "";

  @optional() indexers = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];
  @optional() nodes = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];
  @optional() dockers = ["algorand", "bitcoin", "dogecoin", "litecoin", "ripple"];

  @optional() attesters = [];
  @optional() backends = [];
  @optional() databases = [];

  instanciate() {
    return new AlertConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const res = new AdditionalTypeInfo();

    res.arrayMap.set("indexers", "string");
    res.arrayMap.set("nodes", "string");
    res.arrayMap.set("dockers", "string");

    res.arrayMap.set("attesters", new AlertAttestationConfig());
    res.arrayMap.set("backends", new AlertBackendConfig());
    res.arrayMap.set("databases", new AlertDatabaseConfig());

    return res;
  }
}
