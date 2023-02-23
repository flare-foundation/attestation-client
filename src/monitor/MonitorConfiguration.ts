import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection/reflection";
import { MonitorAttestationConfig } from "./monitors/AttestationMonitor";
import { MonitorDatabaseConfig } from "./monitors/DatabaseMonitor";
import { MonitorDockerConfig } from "./monitors/DockerMonitor";
import { MonitorIndexerConfig } from "./monitors/IndexerMonitor";
import { MonitorNodeConfig } from "./monitors/NodeMonitor";
import { MonitorUrlConfig } from "./monitors/UrlMonitor";

export class MonitorConfig implements IReflection<MonitorConfig> {
  stateSaveFilename = "";

  @optional() interval = 5000;

  @optional() timeLate = 5;
  @optional() timeDown = 10;
  @optional() timeRestart = 20;

  @optional() system = false;

  @optional() indexers: Array<MonitorIndexerConfig> = [];
  @optional() nodes: Array<MonitorNodeConfig> = [];
  @optional() dockers: Array<MonitorDockerConfig> = [];

  @optional() attesters: Array<MonitorAttestationConfig> = [];
  @optional() backends: Array<MonitorUrlConfig> = [];
  @optional() databases: Array<MonitorDatabaseConfig> = [];

  instanciate() {
    return new MonitorConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const res = new AdditionalTypeInfo();

    res.arrayMap.set("dockers", new MonitorDockerConfig());
    res.arrayMap.set("indexers", new MonitorIndexerConfig());
    res.arrayMap.set("attesters", new MonitorAttestationConfig());
    res.arrayMap.set("nodes", new MonitorNodeConfig());
    res.arrayMap.set("backends", new MonitorUrlConfig());
    res.arrayMap.set("databases", new MonitorDatabaseConfig());

    return res;
  }
}
