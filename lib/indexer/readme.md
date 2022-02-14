## Creation of database on server

```
sudo mysql
CREATE USER 'indexWriter'@'localhost' IDENTIFIED BY 'indexWriterPassw0rd';
CREATE DATABASE indexer;
GRANT ALL PRIVILEGES ON indexer.* TO 'indexWriter'@'localhost';

CREATE USER 'indexReader'@'%' IDENTIFIED BY 'another.password';
GRANT SELECT ON indexer.* TO 'indexReader'@'%';

FLUSH PRIVILEGES;

```