import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection/reflection";
import { MonitorAttestationConfig } from "./monitors/AttestationMonitor";
import { MonitorDatabaseConfig } from "./monitors/DatabaseMonitor";
import { MonitorDockerConfig } from "./monitors/DockerMonitor";
import { MonitorIndexerConfig } from "./monitors/IndexerMonitor";
import { MonitorNodeConfig } from "./monitors/NodeMonitor";
import { MonitorUrlConfig } from "./monitors/UrlMonitor";
import { Web3BalanceConfig } from "./monitors/Web3BalanceMonitor";

/**
 * Prometheus configuration.
 */
export class PrometheusConfig {
  @optional() pushGatewayEnabled = false;
  @optional() pushGatewayUrl = "http://127.0.0.1:9091";
  @optional() monitorServerEnabled = false;
  @optional() monitorServerPort = 3010;
}

/**
 * Monitor configuration.
 */
export class MonitorConfig implements IReflection<MonitorConfig> {
  @optional() interval = 5000;

  @optional() timeLate = 5;
  @optional() timeDown = 10;
  @optional() timeRestart = 20;

  prometheus = new PrometheusConfig();

  @optional() system = false;

  @optional() indexers: Array<MonitorIndexerConfig> = [];
  @optional() nodes: Array<MonitorNodeConfig> = [];
  @optional() dockers: Array<MonitorDockerConfig> = [];

  @optional() attesters: Array<MonitorAttestationConfig> = [];
  @optional() backends: Array<MonitorUrlConfig> = [];
  @optional() databases: Array<MonitorDatabaseConfig> = [];

  @optional() balances: Array<Web3BalanceConfig> = [];

  instantiate() {
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
    res.arrayMap.set("balances", new Web3BalanceConfig());

    return res;
  }
}
