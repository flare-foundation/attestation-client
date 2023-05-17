# Attestation-Suite maintenance scripts

To make maintenance of the Attestation Suite easier and more efficient, we have taken the time to prepare several useful scripts. These scripts are designed to help streamline common maintenance tasks and reduce the amount of time and effort required to manage the system.

By using these scripts, you can automate many routine tasks and simplify the process of updating, configuring, and managing the Attestation Suite. This can help to reduce the risk of errors and improve overall system stability and reliability.

Whether you need to update the system, or perform routine maintenance tasks, our scripts can help you to get the job done quickly and easily. We have taken care to ensure that our scripts are well-documented and easy to use, even for those who may not have extensive experience with the Attestation Suite or the underlying technologies.

# Update
Overall, updating the attestation-client repository, rebuilding the attestation-suite image, and restarting all connected repositories while keeping downtime to a minimum and ensuring node containers remain intact can be a complex and challenging task. However, by following best practices, leveraging appropriate tools and techniques, and communicating effectively with stakeholders, it is possible to achieve this goal and maintain a high level of service availability and reliability.
For that we prepared a script that helps you with this task.

-`./update.sh <NETWORK*>` will update repositrory to latest version, rebuild the `attestation-suite` image and restart affected containers. Nodes and databases containers will not be affected.

# Restart
When managing a complex system like Attestation Suite that involves multiple Docker containers with heavy nodes, it is not uncommon to encounter situations where it becomes necessary to restart certain containers to address issues or update configurations. However, in some cases, restarting all containers indiscriminately may result in unnecessary downtime, which can be particularly problematic in production environments where uninterrupted service is critical.

To avoid this, it is advisable to selectively restart only the containers that are directly relevant to the task at hand. In this particular case, the goal is to restart only the containers that contain the attestation suite images.

In such case use next restart scripts to assure minimal down time.

- `./restart/all.sh <NETWORK*>` to restart `attestation-client` and all `indexers`.
- `./restart/attestation-client.sh` to restart `attestation-client`.
- `./restart/indexer.sh <NETWORK*>` to restart `indexers`.

---
`*` use `mainnet` or `testnet`

# Drop database
Dropping a database can be a critical operation, and it is not something that should be taken lightly. However, there are certain situations where dropping a database may be necessary, such as when migrating to a new database schema, or recovering from data corruption (e.g. indexer continuation failure).

If dropping a database is indeed necessary, it is important to use the appropriate scripts and procedures to do so in a safe and controlled manner. 

In Attestation Suite all databases are in separated containers.

In general, the process of dropping a database involves next scripts:

- `./drop-database/indexer <NETWORK*> <CHAIN**>` will drop the database for NETWORK on CHAIN.
- `./drop-database/attestation-client` will drop the database for attestation client.
- `./drop-database/all-indexers <NETWORK*>` will drop the database for all indexers on NETWORK.

---
`*` use `mainnet` or `testnet`

`**` use `btc`, `doge` or `xrp`


# Complete restart
If you need to perform a *complete* restart of your Attestation Suite modules, we have prepared a set of scripts that can help you to do so quickly and easily. These scripts are designed to automate the process of restarting the various components of the Attestation Suite, including container nodes such as Bitcoin, Doge, and Ripple.

However, it is important to note that when using these scripts, the nodes will also be restarted, which can take some time to sync again. Therefore, unless this is absolutely necessary, we recommend using the [restart](#restart) option instead.

By using the [restart](#restart) option, you can restart the Attestation Suite modules without restarting the nodes, which can save time and prevent unnecessary disruption to your system. This option is ideal for routine maintenance tasks or minor updates that do not require a full restart.

Of course, if a complete restart is necessary, our scripts can help you to get the job done quickly and efficiently. We have taken care to ensure that our scripts are well-documented and easy to use, so you can be confident that you are performing the correct actions and achieving the desired results.

In summary, whether you need to perform a complete restart or a more targeted restart of your Attestation Suite modules, we have the tools and resources you need to get the job done quickly and efficiently. 

And with our clear documentation and helpful support team, you can be confident that you are making the right choices and achieving the best possible outcomes for your system.

Complere restart scripts:

- `./complete-restart/all.sh <NETWORK*>` to restart `attestation-client` and all `indexers`.
- `./complete-restart/attestation-client.sh` to restart `attestation-client`.
- `./complete-restart/indexer.sh <NETWORK*>` to restart `indexers`.
- `./complete-restart/verification-server.sh` to restart `versification-servers`.

---
`*` use `mainnet` or `testnet`



# Other
Other maintenance scripts:

- `./service/delete-all-dockers.sh` will stop and drop ALL containers and volumes. *HANDLE WITH CARE*. This is used for complete reinstalation.
