
ALTER USER 'root'@'%' IDENTIFIED BY '$(DatabaseRootPassword)';

ALTER USER '$(IndexerWriterUsername)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(IndexerWriterPassword)';

ALTER USER '$(IndexerReaderUsername)'@'%' IDENTIFIED BY '$(IndexerReaderPassword)';

ALTER USER '$(AttesterWriterUsernameCoston)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordCoston)';

ALTER USER '$(AttesterReaderUsernameCoston)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordCoston)';

ALTER USER '$(AttesterWriterUsernameSongbird)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordSongbird)';

ALTER USER '$(AttesterReaderUsernameSongbird)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordSongbird)';

ALTER USER '$(AttesterWriterUsernameCoston2)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordCoston2)';

ALTER USER '$(AttesterReaderUsernameCoston2)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordCoston2)';

ALTER USER '$(AttesterWriterUsernameFlare)'@'$(DatabaseWriteAccessSource)' IDENTIFIED BY '$(AttesterWriterPasswordFlare)';

ALTER USER '$(AttesterReaderUsernameFlare)'@'%' IDENTIFIED BY '$(AttesterReaderPasswordFlare)';

FLUSH PRIVILEGES;