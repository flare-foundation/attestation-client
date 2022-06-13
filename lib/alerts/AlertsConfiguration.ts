import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";

class AlertAttestationConfig {
    name = "";
    @optional() mode = "dev";
    @optional() path: "";
    restart = "";
}

class AlertBackendConfig {
    name = "";
    address = "";
    restart = "";
}

class AlertDatabaseConfig implements IReflection<AlertDatabaseConfig> {
    name = "";
    @optional() database = "attester";
    connection = new DatabaseConnectOptions();

    instanciate() {
        return new AlertDatabaseConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
        return null;        
    }

}


export class AlertConfig implements IReflection<AlertConfig> {
    @optional() interval: number = 5000;

    @optional() timeLate: number = 5;
    @optional() timeDown: number = 10;
    @optional() timeRestart: number = 20;
    stateSaveFilename = "";
    indexerRestart = "";

    indexers = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];
    nodes = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];
    dockers = ["algorand", "bitcoin", "dogecoin", "litecoin", "ripple"];

    attesters = [];
    backends = [];
    databases = [];

    instanciate() {
        return new AlertConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {

        const res = new AdditionalTypeInfo();

        res.arrayMap.set( "indexers" , "string" );
        res.arrayMap.set( "nodes" , "string" );
        res.arrayMap.set( "dockers" , "string" );
        res.arrayMap.set( "attesters" , new AlertAttestationConfig() );
        res.arrayMap.set( "backends" , new AlertBackendConfig() )
        res.arrayMap.set( "database" , new AlertDatabaseConfig() )

        return res;        
    }

}

