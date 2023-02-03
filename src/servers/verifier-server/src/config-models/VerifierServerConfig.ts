import { optional } from "@flarenetwork/mcc";
import { ChainConfig } from "../../../../attester/configs/ChainConfig";
import { DatabaseConnectOptions } from "../../../../utils/database/DatabaseConnectOptions";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection/reflection";
import { ServerUser } from "./ServerUser";

export class VerifierServerConfig implements IReflection<VerifierServerConfig> {
  public apiKeys: ServerUser[] = [];
  public indexerDatabase = new DatabaseConnectOptions();
  public chainConfiguration = new ChainConfig();

  @optional() port: number = 8088;
  @optional() checkAliveIntervalMs: number = 5000;

  sourceId: string = "";
  attestationTypes: string[] = [];
 

  instanciate(): VerifierServerConfig {
    return new VerifierServerConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("apiKeys", new ServerUser());
    info.arrayMap.set("attestationTypes", "string");
    return info;
  }

}
