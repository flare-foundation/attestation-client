import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";

export class WSServerConfiguration implements IReflection<WSServerConfiguration> {
  @optional() port: number = 8088;
  @optional() checkAliveIntervalMs: number = 5000;

  instanciate(): WSServerConfiguration {
    return new WSServerConfiguration();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }

}