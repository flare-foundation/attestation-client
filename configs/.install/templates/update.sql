ALTER USER '$(IndexerWriterUsername)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(IndexerWriterPassword)';

ALTER USER '$(IndexerReaderUsername)'@'%' IDENTIFIED BY '$(IndexerReaderPassword)';

ALTER USER '$(AttesterWriterUsernameCoston)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordCoston)';

ALTER USER '$(AttesterReaderUsernameCoston)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordCoston)';

ALTER USER '$(AttesterWriterUsernameSongbird)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordSongbird)';

ALTER USER '$(AttesterReaderUsernameSongbird)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordSongbird)';

FLUSH PRIVILEGES;