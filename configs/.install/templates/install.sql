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

CREATE DATABASE $(AttesterDatabaseCoston2);

CREATE USER '$(AttesterWriterUsernameCoston2)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordCoston2)';
GRANT ALL PRIVILEGES ON $(AttesterDatabaseCoston2).* TO '$(AttesterWriterUsernameCoston2)'@'$(DatabaseWriteAccessSource)';
GRANT PROCESS ON *.* TO '$(AttesterWriterUsernameCoston2)'@'$(DatabaseWriteAccessSource)';

CREATE USER '$(AttesterReaderUsernameCoston2)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordCoston)';
GRANT SELECT ON $(AttesterDatabaseCoston2).* TO '$(AttesterReaderUsernameCoston2)'@'%';


CREATE DATABASE $(AttesterDatabaseFlare);

CREATE USER '$(AttesterWriterUsernameFlare)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordFlare)';
GRANT ALL PRIVILEGES ON $(AttesterDatabaseSongbird).* TO '$(AttesterWriterUsernameFlare)'@'$(DatabaseWriteAccessSource)';
GRANT PROCESS ON *.* TO '$(AttesterWriterUsernameFlare)'@'$(DatabaseWriteAccessSource)';

CREATE USER '$(AttesterReaderUsernameFlare)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordFlare)';
GRANT SELECT ON $(AttesterDatabaseSongbird).* TO '$(AttesterReaderUsernameFlare)'@'%';


FLUSH PRIVILEGES;