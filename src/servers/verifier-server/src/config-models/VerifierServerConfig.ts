import { optional } from "@flarenetwork/mcc";
import { ChainConfig } from "../../../../attester/configs/ChainConfig";
import { DatabaseConnectOptions } from "../../../../utils/database/DatabaseConnectOptions";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection/reflection";
import { ServerUser } from "./ServerUser";

export class VerifierServerConfig implements IReflection<VerifierServerConfig> {
  /**
   * List of API keys that can use the service
   */
  public apiKeys: ServerUser[] = [];
  /**
   * Indexer database credentials and configs.
   */
  public indexerDatabase = new DatabaseConnectOptions();
  /**
   * Blockchain connection credentials and configs.
   */
  public chainConfiguration = new ChainConfig();
  /**
   * The page size for indexer API queries when listing outputs
   */
  @optional() public indexerServerPageLimit = 100;

  /**
   * Port number for the verifier server
   */
  @optional() port: number = 8088;
  /**
   * Web socket connection check interval in milliseconds.
   * Currently web sockets are not used.
   */
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
