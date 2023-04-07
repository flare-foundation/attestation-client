import { sleepms } from "../helpers/utils";
import { AttLogger, getGlobalLogger, logException } from "../logging/logger";

interface EventOnData { (data: string): void; }
interface EventContainerFilter { (name: string): boolean; }

/**
 * Docker container information and stats.
 */
export class ContainerInfo {
  name: string = "";
  id: string = "";
  image: string = "";

  status: string = "";
  restartCount: number = 0;

  memUsage: number = 0;
  memMaxUsage: number = 0;

  cpuUsage: number = 0;

  imageDiskUsage: number = 0;

  diskUsage: number = 0;
  diskIoRead: number = 0;
  diskIoWrite: number = 0;
  diskIoReadBytes: number = 0;
  diskIoWriteBytes: number = 0;

  networkTx: number = 0;
  networkRx: number = 0;
}

/**
 * Collection of docker container info and stats.
 */
export class DockerInfo {
  containers : Array<ContainerInfo> = [];
}

/**
 * Docker information class.
 * All information is retrieved over a socket.
 */
export class Docker {
  logger: AttLogger;
  dockerSocket: string;

  containerStatsStream = new Map<string, any>();
  containerStatsData = new Map<string, string>();

  dockerApiVersion = "1.41";

  constructor(dockerSockerName: string = '/var/run/docker.sock') {
    this.dockerSocket = dockerSockerName;
    this.logger = getGlobalLogger();
  }

  /**
   * Perform Docker API request over Docker Socket and wait for it to be completed
   * @param path Docker API request url
   * @param onData Callback event on data
   * @param onEnd Callback event on completed
   */
  public async dockerSockerRequestAsync(path: string, onData: EventOnData, useNoVersion = false) {
    let options = {
      socketPath: this.dockerSocket,
      path: useNoVersion ? `/v${this.dockerApiVersion}${path}` : path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
      }
    };

    const http = require('http');
    let done = false;

    const apiReq = http.request(options, (apiRes) => {
      apiRes.on('data', d => {
        onData(d.toString());
      });
      apiRes.on('end', () => {
        done = true;
      });
    });

    apiReq.on('error', err => {
      console.error(err)
      done = true;
    });

    apiReq.end();

    while (!done) {
      await sleepms(1);
    }
  }

  /**
   * Docker Socker request wrapped that returns result for given path.
   * @param path 
   * @returns 
   */
  public async dockerSockerRequest(path: string, useNoVersion = false) {

    let response = '';

    const apiReq = await this.dockerSockerRequestAsync(path, (data) => { response += data }, useNoVersion);

    return JSON.parse(response);
  }

  /**
   * Get docker API version.
   * @returns
   */
  public async getVersion() {
    return await this.dockerSockerRequest(`/version`, true);
  }


  /**
   * Get docker API info.
   * @returns
   */
  public async getInfo() {
    return await this.dockerSockerRequest(`/info`);
  }

  /**
   * Get all containers.
   * @returns
   */
  public async getAllContainers() {
    return await this.dockerSockerRequest(`/containers/json?all=1&size=true`);
  }

  /**
   * Get all images.
   * @returns 
   */
  public async getAllImages() {
    return await this.dockerSockerRequest(`/images/json?all=1`);
  }

  /**
   * Get all volumes.
   * @returns 
   */
  public async getAllVolumes() {
    return await this.dockerSockerRequest(`/volumes`);
  }

  /**
   * Get system usage information.
   * @returns 
   */
  public async getSystemUsageInformation() {
    return await this.dockerSockerRequest(`/system/df`);
  }

  /**
   * Inspect volume.
   * @returns 
   */
  public async getVolumeDetails(volumeName: string) {
    return await this.dockerSockerRequest(`/volumes/${volumeName}`);
  }

  /**
   * Get container details.
   * @param containerId 
   * @returns 
   */
  public async getContainerDetails(containerId: string) {
    return await this.dockerSockerRequest(`/containers/${containerId}/json`);
  }

  /**
   * Get container logs.
   * @param containerId 
   * @param tail 
   * @returns 
   */
  public async getContainerLogs(containerId: string, tail = 0) {
    return await this.dockerSockerRequest(`/containers/${containerId}/logs?tail=${tail == 0 ? "all" : tail}`);
  }

  /**
   * Get container stats.
   * @param containerId 
   * @returns 
   */
  public async getContainerStats(containerId: string) {
    return await this.dockerSockerRequest(`/containers/${containerId}/stats?stream=false`);
  }

  /**
   * Start container stats stream.
   * @param dockerId 
   * @param onData 
   * @returns 
   */
  public async startContainerStatsStream(dockerId: string, onData: EventOnData) {
    return await this.dockerSockerRequestAsync(`/containers/${dockerId}/stats?stream=true`, onData);
  }

  /**
   * Async start container stats stream and continuosly collect stats.
   * @param containerId 
   * @param containerName 
   * @returns 
   */
  private startContainerStats(containerId: string, containerName: string) {
    if (this.containerStatsData.get(containerId) != undefined) return;

    this.logger.debug(`starting container ${containerName} stats stream...`);
    this.containerStatsData.set(containerId, "");

    // eslint-disable-next-line
    this.startContainerStatsStream(containerId, (data: string) => {
      let allData = this.containerStatsData.get(containerId) + data;
      try {
        if (allData.endsWith(`}\n`)) {
          this.containerStatsStream.set(containerId, JSON.parse(allData));
          this.containerStatsData.set(containerId, "");
        }
        else {
          this.containerStatsData.set(containerId, allData);
        }
      }
      catch (error) {
        this.containerStatsData.set(containerId, "");
      }
    });
  }

  /**
   * Async get docker info.
   * @param outputInfo Should collected container information be displayed.
   * @param filter Filter to only collect info on selected containers.
   * @returns 
   */
  public async getDockerInfo(outputInfo = false, filter: EventContainerFilter = null): Promise<DockerInfo> {
    const system = await this.getSystemUsageInformation();

    const dockerInfo = new DockerInfo();
    for (const container of system.Containers) {
      try {
        const containerName = container.Names[0].substring(1);

        // filter what container are to be populated
        if (filter && !filter(containerName)) {
          continue;
        }

        this.startContainerStats(container.Id, containerName);

        const containerDetail = await this.getContainerDetails(container.Id);
        const containerStats = this.containerStatsStream.get(container.Id);

        const imageName = container.Image;
        const containerImage = system.Images.find(x => x.Id == container.ImageID);

        const containerInfo = new ContainerInfo();

        containerInfo.id = container.Id;
        containerInfo.name = containerName;
        containerInfo.image = imageName;
        containerInfo.status = container.State;

        containerInfo.imageDiskUsage = containerImage.Size ?? 0;
        containerInfo.diskUsage = container.SizeRw ?? 0;

        // get volumes size info
        if (containerDetail.Mounts) {
          for (const mount of containerDetail.Mounts) {
            if (mount.Type != "volume") {
              continue;
            }

            const volume = system.Volumes.find(x => x.Name == mount.Name);
            if (!volume) {
              continue;
            }

            containerInfo.diskUsage += volume.UsageData.Size;
          }
        }

        containerInfo.restartCount = containerDetail.RestartCount;

        if (outputInfo) {
          const color = containerInfo.status == "running" ? "^g^K" : "^r^W";
          const size = Math.round(containerInfo.diskUsage / (1024 * 1024));
          this.logger.info(`   ${containerInfo.name.padEnd(40, ' ')} ${color}${containerInfo.status.padEnd(12, ' ')}^^ size ${size.toString().padStart(10, ' ')} Mb`);
        }

        if (containerStats) {
          const used_memory = containerStats.memory_stats.usage - containerStats.memory_stats.stats.cache;
          const cpu_delta = containerStats.cpu_stats.cpu_usage.total_usage - containerStats.precpu_stats.cpu_usage.total_usage;
          const system_cpu_delta = containerStats.cpu_stats.system_cpu_usage - containerStats.precpu_stats.system_cpu_usage;
          const number_cpus = containerStats.cpu_stats.cpu_usage.percpu_usage.length;
          const cpu_usage = (cpu_delta / system_cpu_delta) * number_cpus * 100.0;

          containerInfo.cpuUsage = cpu_usage;
          containerInfo.memUsage = used_memory;

          // op value
          for (const op of containerStats.blkio_stats.io_service_bytes_recursive) {
            if (op.op == "Read") {
              containerInfo.diskIoReadBytes = op.value;
            }
            if (op.op == "Write") {
              containerInfo.diskIoReadBytes = op.value;
            }
          }
          for (const op of containerStats.blkio_stats.io_serviced_recursive) {
            if (op.op == "Read") {
              containerInfo.diskIoRead = op.value;
            }
            if (op.op == "Write") {
              containerInfo.diskIoRead = op.value;
            }
          }

          if (containerStats.networks) {
            for (const network of Object.keys(containerStats.networks)) {
              containerInfo.networkRx += containerStats.networks[network].rx_bytes;
              containerInfo.networkTx += containerStats.networks[network].tx_bytes;
            }
          }
        }

        dockerInfo.containers.push(containerInfo);
      } catch (error) {
        logException(error, "getDockerInfo");
        return null;
      }
    }

    return dockerInfo;
  }

}
