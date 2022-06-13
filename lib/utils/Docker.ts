import { execSync } from 'child_process';

export class RepositoryInfo {
    repository: string;
    tag: string;
    image_id: string;
    created: string;
    size: number;
    shared_size: number;
    unique_size: number;
    containers: string;

    constructor(repository: string,
        tag: string,
        image_id: string,
        created: string,
        size: number,
        shared_size: number,
        unique_size: number,
        containers: string) {
        this.repository = repository;
        this.tag = tag;
        this.image_id = image_id;
        this.created = created;
        this.size = size;
        this.shared_size = shared_size;
        this.unique_size = unique_size;
        this.containers = containers;
    }
}

export class ContainerInfo {
    container_id: string;
    image: string;
    command: string;
    local_volumes: string;
    size: number;
    created: string;
    status: string;
    names: string;

    constructor(
        container_id: string,
        image: string,
        command: string,
        local_volumes: string,
        size: number,
        created: string,
        status: string,
        names: string) {
        this.container_id = container_id;
        this.image = image;
        this.command = command;
        this.local_volumes = local_volumes;
        this.size = size;
        this.created = created;
        this.status = status;
        this.names = names;
    }
}

export class VolumeInfo {
    volume_name: string;
    size: number;

    constructor(
        volume_name: string,
        size: number) {
        this.volume_name = volume_name;
        this.size = size;
    }
}
export class DockerInfo {
    public repositoryInfo: RepositoryInfo[];
    public containerInfo: ContainerInfo[];
    public volumeInfo: VolumeInfo[];

}

export class Docker {


    public static getSize(size: string): number {

        if( size.indexOf("GB") > 0 ) {
            size=size.replace( /GB/ , "" );
            return parseFloat( size ) * (1024*1024*1024);
        }

        if( size.indexOf("MB") > 0 ) {
            size=size.replace( /MB/ , "" );
            return parseFloat( size ) * (1024*1024);
        }

        if( size.indexOf("KB") > 0 ) {
            size=size.replace( /KB/ , "" );
            return parseFloat( size ) * (1024);
        }

        if( size.indexOf("B") > 0 ) {
            size=size.replace( /B/ , "" );
            return parseFloat( size );
        }

        return parseFloat( size );
    }

    public static getDockerInfo(): DockerInfo {

        const buffer = this.execute('sudo docker system df --verbose');

        /*
        // Test
        const buffer = 
`Images space usage:

REPOSITORY                 TAG         IMAGE ID       CREATED        SIZE      SHARED SIZE   UNIQUE SIZE   CONTAINERS
flarefoundation/algorand   3.6.2-dev   3305ec93de1c   4 days ago     3.622GB   0B            3.622GB       1
flarefoundation/rippled    1.9.0       76cdc0e4dc7d   7 weeks ago    8.336GB   0B            8.336GB       1
flarefoundation/dogecoin   1.14.5      01d7c62a7772   2 months ago   1.846GB   72.76MB       1.773GB       1
flarefoundation/bitcoin    22.0        bf7c3fa43358   2 months ago   2.853GB   72.76MB       2.78GB        1
flarefoundation/litecoin   0.18.1      3fedbbd03519   2 months ago   2.051GB   72.76MB       1.978GB       1

Containers space usage:

CONTAINER ID   IMAGE                                COMMAND                  LOCAL VOLUMES   SIZE      CREATED       STATUS       NAMES
732da6631e58   flarefoundation/algorand:3.6.2-dev   "entrypoint.sh algod"    1               0B        3 days ago    Up 3 days    connected-chains_algorand_1
29b10a7d1d7e   flarefoundation/dogecoin:1.14.5      "dogecoind -conf=/op…"   1               0B        12 days ago   Up 12 days   connected-chains_dogecoin_1
ee9095587127   flarefoundation/litecoin:0.18.1      "litecoind -conf=/op…"   1               0B        12 days ago   Up 12 days   connected-chains_litecoin_1
0e095a5e44c9   flarefoundation/rippled:1.9.0        "rippled --conf=/opt…"   1               58.6MB    12 days ago   Up 12 days   connected-chains_rippled_1
2c996a8cf930   flarefoundation/bitcoin:22.0         "bitcoind -conf=/opt…"   1               0B        12 days ago   Up 12 days   connected-chains_bitcoin_1

Local Volumes space usage:

VOLUME NAME                      LINKS     SIZE
connected-chains_bitcoin-data    1         510.6GB
connected-chains_litecoin-data   1         91.93GB
connected-chains_dogecoin-data   1         62.58GB
connected-chains_ripple-data     1         617.3GB
connected-chains_algorand-data   1         809GB

Build cache usage: 0B

CACHE ID   CACHE TYPE   SIZE      CREATED   LAST USED   USAGE     SHARED`; /**/

        const lines = buffer.toString().split('\n');

        const repository: RepositoryInfo[] = [];
        const containers: ContainerInfo[] = [];
        const volumes: VolumeInfo[] = [];

        let mode: "none" | "repository" | "container" | "volume" = "none";
        let index = 0;

        lines.forEach((value) => {

            if (value !== '') {

                //const line: string = value.replace(/(\S) (\S)/g, '$1_$2').replace(/ (?= )/g, '');//.replace(/_/g," ");
                const line: string = value.replace(/ ( )+/g, '\t');
                const tokens = line.split('\t');

                if (tokens.length >= 3) {

                    if (tokens[0] === `REPOSITORY`) {
                        mode = "repository";
                        index = 0;
                    }
                    if (tokens[0] === `CONTAINER ID`) {
                        mode = "container";
                        index = 0;
                    }
                    if (tokens[0] === `VOLUME NAME`) {
                        mode = "volume";
                        index = 0;
                    }
                }
                else {
                    mode = "none";
                }

                if (mode !== "none" && index > 0) {
                    if (mode === "repository" && tokens.length === 8) {
                        repository.push(new RepositoryInfo(
                            tokens[0],
                            tokens[1],
                            tokens[2],
                            tokens[3].replace(/_/g," "),
                            Docker.getSize(tokens[4]),
                            Docker.getSize(tokens[5]),
                            Docker.getSize(tokens[6]),
                            tokens[7]));
                    }
                    if (mode === "container" && tokens.length === 8) {
                        containers.push(new ContainerInfo(
                            tokens[0],
                            tokens[1],
                            tokens[2],
                            tokens[3],
                            Docker.getSize(tokens[4]),
                            tokens[5].replace(/_/g," "),
                            tokens[6].replace(/_/g," "),
                            tokens[7]));
                    }
                    if (mode === "volume" && tokens.length === 3) {
                        volumes.push(new VolumeInfo(
                            tokens[0],
                            Docker.getSize(tokens[2])));
                    }

                }

                index++;
            }
        });

        const dockerInfo = new DockerInfo();

        dockerInfo.repositoryInfo = repository;
        dockerInfo.containerInfo = containers;
        dockerInfo.volumeInfo = volumes;

        return dockerInfo;
    }

    public static execute(command: string): Buffer {
        return execSync(command, { windowsHide: true, encoding: 'buffer' });
    }

}