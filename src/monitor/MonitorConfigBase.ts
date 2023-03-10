import { optional } from "@flarenetwork/mcc";
import { AttLogger } from "../utils/logging/logger";
import { MonitorBase } from "./MonitorBase";
import { MonitorConfig } from "./MonitorConfiguration";

/**
 * Monitor configuration base class.
 */
export class MonitorConfigBase {
  name = "";

  @optional() disabled: false;
  @optional() restart = "";
  @optional() timeRestart = 15;

  /**
   * Return monitor name.
   */
  getName?(): string;

  /**
   * Create monitor for this configuration.
   * @param config 
   * @param baseConfig 
   * @param logger 
   */
  createMonitor?(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger): MonitorBase<MonitorConfigBase>;
}
