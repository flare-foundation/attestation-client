CREATE DATABASE $($(Chain)IndexerDatabase);

CREATE USER '$($(Chain)IndexerWriterUsername)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$($(Chain)IndexerWriterPassword)';
GRANT ALL PRIVILEGES ON $($(Chain)IndexerDatabase).* TO '$($(Chain)IndexerWriterUsername)'@'$(DatabaseWriteAccessSource)';

CREATE USER '$($(Chain)IndexerReaderUsername)'@'%' IDENTIFIED BY '$($(Chain)IndexerReaderPassword)';
GRANT SELECT ON $($(Chain)IndexerDatabase).* TO '$($(Chain)IndexerReaderUsername)'@'%';


ALTER USER 'root'@'%' IDENTIFIED BY '$(DatabaseRootPassword)';

ALTER USER '$($(Chain)IndexerWriterUsername)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$($(Chain)IndexerWriterPassword)';

ALTER USER '$($(Chain)IndexerReaderUsername)'@'%' IDENTIFIED BY '$($(Chain)IndexerReaderPassword)';


FLUSH PRIVILEGES;