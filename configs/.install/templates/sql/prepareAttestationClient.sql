CREATE DATABASE $(AttesterDatabase);

CREATE USER '$(AttesterWriterUsername)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPassword)';
GRANT ALL PRIVILEGES ON $(AttesterDatabase).* TO '$(AttesterWriterUsername)'@'$(DatabaseWriteAccessSource)';
GRANT PROCESS ON *.* TO '$(AttesterWriterUsername)'@'$(DatabaseWriteAccessSource)';

CREATE USER '$(AttesterReaderUsername)'@'%' IDENTIFIED BY '$(AttesterReaderPassword)';
GRANT SELECT ON $(AttesterDatabase).* TO '$(AttesterReaderUsername)'@'%';

ALTER USER 'root'@'%' IDENTIFIED BY '$(DatabaseRootPassword)';

ALTER USER '$(AttesterWriterUsername)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPassword)';

ALTER USER '$(AttesterReaderUsername)'@'%' IDENTIFIED BY '$(AttesterReaderPassword)';

FLUSH PRIVILEGES;