import { optional } from "@flarenetwork/mcc";
import { ChainConfiguration } from "../../../../source/ChainConfiguration";
import { DatabaseConnectOptions } from "../../../../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";
import { ServerUser } from "./ServerUser";

export class WSServerCredentials implements IReflection<WSServerCredentials> {
  public apiKeys: ServerUser[] = [];
  public indexerDatabase = new DatabaseConnectOptions();
  public chainConfiguration = new ChainConfiguration();

  @optional() port: number = 8088;
  @optional() checkAliveIntervalMs: number = 5000;

  sourceId: string = "";
  attestationTypes: string[] = [];


  instanciate(): WSServerCredentials {
    return new WSServerCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("apiKeys", new ServerUser());
    info.arrayMap.set("attestationTypes", "string");
    return info;
  }

}
