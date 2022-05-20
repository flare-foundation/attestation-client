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

            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        resolve( EServiceStatus.invalid );
                        return;
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
                        resolve(EServiceStatus.unknown);
                        return;
                    }

                    if (response.indexOf("Active: inactive (dead)") >= 0) {
                        resolve(EServiceStatus.inactive);
                        return;
                    }

                    if (response.indexOf("Active: failed") >= 0) {
                        resolve(EServiceStatus.inactive);
                        return;
                    }

                    if (response.indexOf("Active: active (running)") >= 0) {
                        resolve(EServiceStatus.active);
                        return;
                    }

                    /*
                    ● indexer-algo.service
                         Loaded: loaded (/home/ubuntu/.config/systemd/user/indexer-algo.service; enabled; vendor preset: enabled)
                         Active: active (running) since Fri 2022-05-20 06:05:57 UTC; 1min 9s ago
                       Main PID: 72465 (node)
                         CGroup: /user.slice/user-1000.slice/user@1000.service/indexer-algo.service
                                 └─72465 /home/ubuntu/.nvm/versions/node/v14.15.4/bin/node /home/ubuntu/attestation-suite/global/indexer/dist/lib/indexer/indexer.js -a ALGO                
                    */

                    resolve(EServiceStatus.invalid);
                    return;
                });

            });
        }
        catch (error) {
            logException(error, "ServiceStatus::getStatus");
            return EServiceStatus.invalid;
        }
    }
}