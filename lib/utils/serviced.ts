import { getGlobalLogger, logException } from "./logger";

export enum EServiceStatus {
    unknown,
    active,
    inactive,
    failed,
    invalid,
}

// todo: add up/down time
export class ServiceStatus {

    name: string;

    status: EServiceStatus;

    constructor(name: string) {
        this.name = name;
    }

    async getStatus(): Promise<EServiceStatus> {

        try {
            const { exec } = require("child_process");
            const command = `systemctl --user status ${this.name}`;

            let response = "";

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    return EServiceStatus.invalid;
                }
                if (stderr) {
                    response = stderr;
                    getGlobalLogger().info(`statusResponseError '${stderr}'`);
                }
                else {
                    response = stdout;
                    getGlobalLogger().info(`statusResponse '${stdout}'`);
                }

                getGlobalLogger().info(`statusResponse '${response}'`);

                if (response === `Unit ${this.name}.service could not be found.`) {
                    return EServiceStatus.unknown;
                }
    
                if (response.indexOf("Active: inactive (dead)") >= 0) {
                    return EServiceStatus.inactive;
                }
    
                if (response.indexOf("Active: failed") >= 0) {
                    return EServiceStatus.inactive;
                }
    
                if (response.indexOf("Active: active (running)") >= 0) {
                    return EServiceStatus.active;
                }
    
                return EServiceStatus.invalid;
    
            });

        }
        catch (error) {
            logException(error, "ServiceStatus::getStatus");
            return EServiceStatus.invalid;
        }
    }

}