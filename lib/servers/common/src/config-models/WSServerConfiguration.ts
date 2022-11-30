import { optional } from "@flarenetwork/mcc";
import { AttestationProviderConfig } from ".";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";

export class WSServerConfiguration implements IReflection<WSServerConfiguration> {
  @optional() port: number = 8088;
  @optional() checkAliveIntervalMs: number = 5000;

  public providers: AttestationProviderConfig[] = [];


  instanciate(): WSServerConfiguration {
    return new WSServerConfiguration();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("providers", new AttestationProviderConfig());
    return info;
  }

}