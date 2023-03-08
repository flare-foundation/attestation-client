import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection/reflection";

export class MonitorserverConfig implements IReflection<MonitorserverConfig> {

  port: number = 9600;

  instanciate(): MonitorserverConfig {
    return new MonitorserverConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
