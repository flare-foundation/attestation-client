import fs from "fs";
import * as nodeDiskInfo from "node-disk-info";
import * as os from "os";
import { getTimeMilli } from "../../utils/helpers/internetTime";
import { round } from "../../utils/helpers/utils";
import { logException } from "../../utils/logging/logger";
import { MonitorBase, PerformanceInfo } from "../MonitorBase";
import { MonitorConfigBase } from "../MonitorConfigBase";

export class SystemMonitor extends MonitorBase<MonitorConfigBase> {
  cpuUsed = 0;
  cpuTime = 0;

  disks = null;
  diskCheckTime = 0;

  async initialize() {
    this.config.name = "system";
  }

  async check() {
    return null;
  }

  async perf(): Promise<PerformanceInfo[]> {
    const resArray = [];

    const now = getTimeMilli();
    const cpus = os.cpus();

    // update memory information
    // check free memory
    //const freeMemory = round( os.freemem() / (1024*1024) , 1 );
    // check the total memory
    const totalMemory = round(os.totalmem() / (1024 * 1024), 1);

    const memInfo = fs.readFileSync("/proc/meminfo", "utf8");
    const availableMemory = round(Number(/MemAvailable:[ ]+(\d+)/.exec(memInfo)[1]) / 1024, 1);
    const freeMemory = round(Number(/MemFree:[ ]+(\d+)/.exec(memInfo)[1]) / 1024, 1);

    resArray.push(new PerformanceInfo(`system.memory`, "total", totalMemory, "MB"));

    resArray.push(new PerformanceInfo(`system.memory`, "free", freeMemory, "MB", `${round((freeMemory * 100) / totalMemory, 1)}% free`));

    resArray.push(new PerformanceInfo(`system.memory`, "available", availableMemory, "MB", `${round((availableMemory * 100) / totalMemory, 1)}% available`));

    // update disk information
    if (now > this.diskCheckTime) {
      nodeDiskInfo
        .getDiskInfo()
        .then((disks) => {
          this.disks = disks;

          // check once per 10 minutes
          this.diskCheckTime = now + 60 * 10 * 1000;
        })
        .catch((error) => {
          logException(error, `nodeDiskInfo`);
        });
    }

    if (this.disks) {
      for (const disk of this.disks) {
        if (disk.mounted !== "/") continue;

        const total = disk.available + disk.used;

        resArray.push(new PerformanceInfo(`system.disk.${disk.filesystem}`, `total`, round(total / (1024 * 1024), 3), "GB"));

        resArray.push(
          new PerformanceInfo(
            `system.disk.${disk.filesystem}`,
            `available`,
            round(disk.available / (1024 * 1024), 3),
            "GB",
            `${round((disk.available * 100) / total, 1)}% available`
          )
        );

        resArray.push(
          new PerformanceInfo(
            `system.disk.${disk.filesystem}`,
            `used`,
            round(disk.used / (1024 * 1024), 3),
            "GB",
            `${round((disk.used * 100) / total, 1)}% used`
          )
        );
      }
    }

    let used = 0;

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];

      used += cpu.times.sys + cpu.times.user;
    }

    used /= cpus.length;

    resArray.push(new PerformanceInfo(`system.cpu`, "count", cpus.length, "", cpus[0].model));

    if (this.cpuTime > 0) {
      resArray.push(new PerformanceInfo(`system.cpu`, "utilization", round(((used - this.cpuUsed) * 100) / (now - this.cpuTime), 1), "%"));
    }

    this.cpuTime = now;
    this.cpuUsed = used;

    return resArray;
  }
}
