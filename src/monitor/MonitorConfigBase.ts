import { optional } from "@flarenetwork/mcc";
import { AttLogger } from "../utils/logging/logger";
import { MonitorBase } from "./MonitorBase";
import { MonitorConfig } from "./MonitorConfiguration";

export class MonitorConfigBase {
  name = "";

  @optional() disabled: false;
  @optional() restart = "";
  @optional() timeRestart = 15;

  getName?(): string;
  createMonitor?(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger): MonitorBase<MonitorConfigBase>;
}
