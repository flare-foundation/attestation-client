CREATE DATABASE indexer;

CREATE USER 'indexWriter'@'localhost' IDENTIFIED BY 'indexWriterPassw0rd!';
GRANT ALL PRIVILEGES ON indexer.* TO 'indexWriter'@'localhost';

CREATE USER 'indexReader'@'%' IDENTIFIED BY 'another.Passw0rd!';
GRANT SELECT ON indexer.* TO 'indexReader'@'%';


CREATE DATABASE attester;

CREATE USER 'attesterWriter'@'localhost' IDENTIFIED BY 'attesterWriterPassw0rd!';
GRANT ALL PRIVILEGES ON attester.* TO 'attesterWriter'@'localhost';
GRANT PROCESS ON *.* TO 'attesterWriter'@'localhost';

CREATE USER 'attesterReader'@'%' IDENTIFIED BY 'another.Passw0rd';
GRANT SELECT ON attester.* TO 'attesterReader'@'%';


CREATE DATABASE attesterSgb;

CREATE USER 'attesterWriter'@'localhost' IDENTIFIED BY 'attesterWriterPassw0rd!';
GRANT ALL PRIVILEGES ON attesterSgb.* TO 'attesterWriter'@'localhost';
GRANT PROCESS ON *.* TO 'attesterWriter'@'localhost';

CREATE USER 'attesterReader'@'%' IDENTIFIED BY 'another.Passw0rd';
GRANT SELECT ON attesterSgb.* TO 'attesterReader'@'%';


FLUSH PRIVILEGES;