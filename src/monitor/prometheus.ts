import { Gauge, Metric, Pushgateway, Registry } from "prom-client";
import { AttLogger, logException } from "../utils/logging/logger";

export class Prometheus {
    logger: AttLogger;

    register: Registry;
    gateway: Pushgateway;

    metrics = new Map<string, Metric>();

    constructor(logger) {
        this.logger = logger;
        this.register = new Registry();
    }

    /**
     * Connect to Prometheus push gateway
     * @param url 
     */
    connectPushgateway(url: string) {
        try {
            this.gateway = new Pushgateway(url, [], this.register);
        }
        catch (error) {
            logException(error, `Prometheus.createPushgateway`);
        }
    }

    /**
     * 
     * @param jobName Push registered metric to connected push gateway.
     */
    push(jobName: string) {
        try {
            this.gateway
                .push({ jobName: jobName })
                .then(({ resp, body }) => {
                    console.log(`Body: ${body}`);
                    console.log(`Response status: ${resp.toString()}`);
                })
                .catch(err => {
                    console.log(`Error: ${err}`);
                });
        }
        catch (error) {
            logException(error, `Prometheus.push`);
        }
    }

    /**
     * Set gauge data, create and register it if not exists.
     * @param name
     * @param comment 
     * @param labels 
     * @param value 
     */
    setGauge(name: string, comment: string, labels: string, value: number) {
        try {
            const cleanName = name.toLowerCase().replaceAll("-", "_").replaceAll(".", "_").replaceAll("/", "_").replaceAll(" ", "").replaceAll("%","percent");

            let gauge = <Gauge>this.metrics.get(cleanName);

            if (!gauge) {
                this.logger.debug(`register prometheus gauge '^g${cleanName}^^ (${labels})'`);

                gauge = new Gauge({
                    name: cleanName,
                    help: comment,
                    registers: [this.register],
                    labelNames: labels ? [labels] : [],
                });
                this.register.registerMetric(gauge);

                this.metrics.set(cleanName, gauge);
            }

            gauge.set(+value);
        }
        catch (error) {
            logException(`registerGauge`, error);
        }
    }
}