import { optional } from "@flarenetwork/mcc";
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


export class AlertConfig implements IReflection<AlertConfig> {
    @optional() interval: number = 5000;

    @optional() timeLate: number = 5;
    @optional() timeDown: number = 10;
    @optional() timeRestart: number = 20;
    stateSaveFilename = "";
    indexerRestart = "";
    indexers = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];

    attesters = [];
    backends = [];

    instanciate() {
        return new AlertConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {

        const res = new AdditionalTypeInfo();

        res.arrayMap.set( "indexers" , "string" );
        res.arrayMap.set( "attesters" , new AlertAttestationConfig() );
        res.arrayMap.set( "backends" , new AlertBackendConfig() )

        return res;        
    }

}

