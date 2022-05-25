ALTER USER '$(IndexerWriterUsername)'@'localhost' IDENTIFIED BY '$(IndexerWriterPassword)';

ALTER USER '$(IndexerReaderUsername)'@'%' IDENTIFIED BY '$(IndexerReaderPassword)';

ALTER USER '$(AttesterWriterUsernameCoston)'@'localhost' IDENTIFIED BY '$(AttesterWriterPasswordCoston)';

ALTER USER '$(AttesterReaderUsernameCoston)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordCoston)';

ALTER USER '$(AttesterWriterUsernameSongbird)'@'localhost' IDENTIFIED BY '$(AttesterWriterPasswordSongbird)';

ALTER USER '$(AttesterReaderUsernameSongbird)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordSongbird)';

FLUSH PRIVILEGES;