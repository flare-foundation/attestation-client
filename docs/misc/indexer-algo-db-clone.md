
Disable service
```
nano ~/.config/systemd/user/indexer-algo.service


systemctl --user daemon-reload
systemctl --user restart indexer-algo 
systemctl --user status indexer-algo 

```



```
sudo mysql

use indexer;
drop tables algo_block, algo_transactions0, algo_transactions1;
delete from state where name like 'ALGO%';

```

```

sudo mysqldump indexer state --where "name like '%ALGO%'" | xz | pv -W | ssh ubuntu@144.76.253.232 -i ~/.ssh/id_rsa "tee remote-dump.sql.xz | unxz | mysql -u indexerWriter -pPASSWORD indexer"

sudo mysqldump indexer algo_block algo_transactions0 algo_transactions1 | xz | pv -W | ssh ubuntu@144.76.253.232 -i ~/.ssh/id_rsa "tee remote-dump.sql.xz | unxz | mysql -u indexerWriter -pPASSWORD indexer"

```