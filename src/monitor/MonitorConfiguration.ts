import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/database/DatabaseConnectOptions";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection/reflection";

class MonitorAttestationConfig {
  name = "";
  @optional() mode = "dev";
  @optional() path: "";
  restart = "";
}

class MonitorWebserverConfig {
  name = "";
  address = "";
  restart = "";
}

class MonitorDatabaseConfig implements IReflection<MonitorDatabaseConfig> {
  name = "";
  @optional() database = "attester";
  connection = new DatabaseConnectOptions();

  instanciate() {
    return new MonitorDatabaseConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

export class MonitorConfig implements IReflection<MonitorConfig> {
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
    return new MonitorConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const res = new AdditionalTypeInfo();

    res.arrayMap.set("indexers", "string");
    res.arrayMap.set("nodes", "string");
    res.arrayMap.set("dockers", "string");

    res.arrayMap.set("attesters", new MonitorAttestationConfig());
    res.arrayMap.set("backends", new MonitorWebserverConfig());
    res.arrayMap.set("databases", new MonitorDatabaseConfig());

    return res;
  }
}
