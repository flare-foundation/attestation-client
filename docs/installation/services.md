[TOC](./../README.md)/[General installation](../installation/general-installation.md)
# Services
All modules are running via Linux services and manager with `systemd`. `systemd` is a system and service manager for Linux operating systems. It is a command to introspect and control the state of the systemd system and service manager.

In each installation module it is stated what services are used for that module.

Service files are in `<installation root>/scripts/templates`:
- attester-alerts
- indexer-algo
- indexer-btc
- indexer-doge
- indexer-ltc
- indexer-xrp
- songbird-attester-client
- songbird-backend
- coston-attester-client
- coston-backend

[Here](./service-helpers.md) are service helpers commands.

## Service installation

Services should be installed only once after the 1st deployment.

To install a `service name` copy the service file from `<installation root>/scripts/templates/<service name>.service` into `/home/<username>/.config/systemd/user/` and register it with the next `systemctl` command:
```
systemctl --user enable <service name>.service
```

If you have changed the content of service file use `systemctl --user daemon-reload` before registering it.


## Service actions

Restart
```
systemctl --user restart <service name>
```

Stop
```
systemctl --user stop <service name>
```

Start
```
systemctl --user start <service name>
```

## Logs

Service logs can be displayed with `ctail` command (check [here](general-installation.md) how to install `ctail`):

```
ctail -f -i <service log file>
```

or with system service journal command:
```
journalctl --user -u <service name> -f -n 1000
```