# Monitor

Monitoring software is an essential component of any modern software development project. It allows developers to track the performance and behavior of their applications in real-time, making it easier to identify and troubleshoot issues as they arise. In recent years, Prometheus and Grafana have emerged as popular choices for monitoring and visualizing system metrics.

Attestation Suite monitoring utility, uses Prometheus and Grafana. This utility provides an easy and efficient way to monitor and track the progress of attestation suite tests. With Prometheus, your utility can collect and store metrics from different sources, while Grafana allows you to visualize this data in a variety of formats such as graphs, charts, and tables.

The monitoring utility provides a comprehensive view of your Attestation Suite working status, allowing you to quickly identify any potential issues. By tracking metrics such as indexer history latency, block bottom times, node system usage you can quickly identify patterns and trends that may be impacting the performance of your system. This information can then be used to optimize your systems and ensure they are running efficiently.

---

## Installation notes

- Grafana is running on local port 9100 (not default)
- Prometheus is running on local port 9090 (default)
- push gateway is running on local port 9091 (default)
- from outside the `https://<url_name>` points on Grafana
- from outside the `https://<url_name>/prometheus` points on Prometheus
- from outside the `https://<url_name>/pushgateway` points on push gateway
- from outside the `https://<url_name>/monitor` points on monitor webserver

## Prometheus installation

Create `tools/prometheus` folder.

Use this `prometheus.yml` configuration.

```
global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s
alerting:
  alertmanagers:
  - follow_redirects: true
    enable_http2: true
    scheme: http
    timeout: 10s
    api_version: v2
    static_configs:
    - targets: []
rule_files:
  - rules.yml
scrape_configs:
- job_name: attestationsuite
  honor_timestamps: true
  scrape_interval: 15s
  scrape_timeout: 10s
  metrics_path: /monitor/metrics
  scheme: https
  follow_redirects: true
  enable_http2: true
  static_configs:
  - targets:
    - <url_name>
```

Use this `run.sh` script.

```
docker run \
    -p 9090:9090 \
    -v /home/ubuntu/tools/prometheus/:/etc/prometheus/ \
    prom/prometheus
```

Monitor can be configured to provide data to Prometheus with:

- Push Gateway
- Monitor Metrics server

## Grafana instalation

Grafana is started from a prepared docker with command:

```
sudo docker run -d -p 9100:3000 grafana/grafana-enterprise
```

Default login username is `admin` and password `admin`.

### Add Prometheus data source

### Import Grafana monitoring template

## Push gateway

Monitor can be configured to work with push gateway or ad a Prometheus server.
TODO: Write pros cons.

Run push gateway with this command.

```
sudo sudo docker pull prom/pushgateway
sudo docker run -d -p 9091:9091 prom/pushgateway
```

## NGINX

Here is example of nginx server configuration:

```
server {
        listen 443 ssl;
        listen [::]:443 ssl;
        server_name <url_name>;

        #Size archive        client_max_body_size 50M;

        ssl_certificate          /etc/letsencrypt/live/<url_name>/fullchain.pem;
        ssl_certificate_key      /etc/letsencrypt/live/<url_name>/privkey.pem;
        ssl_trusted_certificate  /etc/letsencrypt/live/<url_name>/chain.pem;

        location / {
           proxy_set_header Host $http_host;
           proxy_pass         http://localhost:9100;
        }

        location /prometheus/ {
           rewrite /prometheus/(.*) /$1  break;
           proxy_set_header Host $http_host;
           proxy_pass         http://localhost:9090;
        }

        location /monitor/ {
           rewrite /monitor/(.*) /$1  break;
           proxy_pass         http://localhost:3010;
        }

        location /pushgateway/ {
           rewrite /pushgateway/(.*) /$1  break;
           proxy_pass         http://localhost:9091;
        }
}

```
