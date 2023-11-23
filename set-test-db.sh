docker exec attestation-client-database-1 dropdb -U db db  
docker exec attestation-client-database-1 createdb -U db -E utf8 -T template0 db
docker exec attestation-client-database-1 pg_restore -U db --dbname=db /entrypoint/dump.sql