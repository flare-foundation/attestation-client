# Services

All modules are running via Linux services and managed with `systemd`. `systemd` is a system and service manager for Linux operating systems. It is a command to introspect and control the state of the systemd system and service manager.

In each installation module it is stated what services are used for that module.

Service files are in `<installation root>/scripts/templates`:

- attester-alerts
- indexer-algo
- indexer-btc
- indexer-doge
- indexer-ltc
- indexer-xrp
- songbird-attester-client
- songbird-webserver
- coston-attester-client
- coston-webserver

[Here](./service-helpers.md) are some service helpers commands.

## Service installation

Services should be installed only once after the 1st deployment.

To install a `service name` copy the service file from `<installation root>/scripts/templates/<service name>.service` into `/home/<username>/.config/systemd/user/` and register it with the following `systemctl` command:

``` bash
systemctl --user enable <service name>.service
```

If you have changed the content of the service file, use `systemctl --user daemon-reload` before registering it.

## Service actions

Restart

``` bash
systemctl --user restart <service name>
```

Stop

``` bash
systemctl --user stop <service name>
```

Start

``` bash
systemctl --user start <service name>
```

## Logs

Service logs can be displayed with the `ctail` command (check [here](general-installation.md) how to install `ctail`):

``` bash
ctail -f -i <service log file>
```

or with system service journal command:

``` bash
journalctl --user -u <service name> -f -n 1000
```

[Home](./../README.md)/[General installation](../installation/general-installation.md)
