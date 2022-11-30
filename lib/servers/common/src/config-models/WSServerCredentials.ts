import { DatabaseConnectOptions } from "../../../../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";
import { ServerUser } from "./ServerUser";

export class WSServerCredentials implements IReflection<WSServerCredentials> {
  public apiKeys: ServerUser[] = [];
  public indexerDatabase = new DatabaseConnectOptions();

  instanciate(): WSServerCredentials {
    return new WSServerCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("apiKeys", new ServerUser());
    return info;
  }

}
