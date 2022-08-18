CREATE DATABASE $(IndexerDatabase);

CREATE USER '$(IndexerWriterUsername)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(IndexerWriterPassword)';
GRANT ALL PRIVILEGES ON $(IndexerDatabase).* TO '$(IndexerWriterUsername)'@'$(DatabaseWriteAccessSource)';

CREATE USER '$(IndexerReaderUsername)'@'%' IDENTIFIED BY '$(IndexerReaderPassword)';
GRANT SELECT ON $(IndexerDatabase).* TO '$(IndexerReaderUsername)'@'%';


CREATE DATABASE $(AttesterDatabaseCoston);

CREATE USER '$(AttesterWriterUsernameCoston)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordCoston)';
GRANT ALL PRIVILEGES ON $(AttesterDatabaseCoston).* TO '$(AttesterWriterUsernameCoston)'@'$(DatabaseWriteAccessSource)';
GRANT PROCESS ON *.* TO '$(AttesterWriterUsernameCoston)'@'$(DatabaseWriteAccessSource)';

CREATE USER '$(AttesterReaderUsernameCoston)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordCoston)';
GRANT SELECT ON $(AttesterDatabaseCoston).* TO '$(AttesterReaderUsernameCoston)'@'%';


CREATE DATABASE $(AttesterDatabaseSongbird);

CREATE USER '$(AttesterWriterUsernameSongbird)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordSongbird)';
GRANT ALL PRIVILEGES ON $(AttesterDatabaseSongbird).* TO '$(AttesterWriterUsernameSongbird)'@'$(DatabaseWriteAccessSource)';
GRANT PROCESS ON *.* TO '$(AttesterWriterUsernameSongbird)'@'$(DatabaseWriteAccessSource)';

CREATE USER '$(AttesterReaderUsernameSongbird)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordSongbird)';
GRANT SELECT ON $(AttesterDatabaseSongbird).* TO '$(AttesterReaderUsernameSongbird)'@'%';


FLUSH PRIVILEGES;