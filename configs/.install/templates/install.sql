CREATE DATABASE $(IndexerDatabase);

CREATE USER '$(IndexerWriterUsername)'@'localhost' IDENTIFIED BY '$(IndexerWriterPassword)';
GRANT ALL PRIVILEGES ON $(IndexerDatabase).* TO '$(IndexerWriterUsername)'@'localhost';

CREATE USER '$(IndexerReaderUsername)'@'%' IDENTIFIED BY '$(IndexerReaderPassword)';
GRANT SELECT ON $(IndexerDatabase).* TO '$(IndexerReaderUsername)'@'%';


CREATE DATABASE $(AttesterDatabaseCoston);

CREATE USER '$(AttesterWriterUsernameCoston)'@'localhost' IDENTIFIED BY '$(AttesterWriterPasswordCoston)';
GRANT ALL PRIVILEGES ON $(AttesterDatabaseCoston).* TO '$(AttesterWriterUsernameCoston)'@'localhost';
GRANT PROCESS ON *.* TO '$(AttesterWriterUsernameCoston)'@'localhost';

CREATE USER '$(AttesterReaderUsernameCoston)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordCoston)';
GRANT SELECT ON $(AttesterDatabaseCoston).* TO '$(AttesterReaderUsernameCoston)'@'%';


CREATE DATABASE $(AttesterDatabaseSongbird);

CREATE USER '$(AttesterWriterUsernameSongbird)'@'localhost' IDENTIFIED BY '$(AttesterWriterPasswordSongbird)';
GRANT ALL PRIVILEGES ON $(AttesterDatabaseSongbird).* TO '$(AttesterWriterUsernameSongbird)'@'localhost';
GRANT PROCESS ON *.* TO '$(AttesterWriterUsernameSongbird)'@'localhost';

CREATE USER '$(AttesterReaderUsernameSongbird)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordSongbird)';
GRANT SELECT ON $(AttesterDatabaseSongbird).* TO '$(AttesterReaderUsernameSongbird)'@'%';


FLUSH PRIVILEGES;