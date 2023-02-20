# Compile typescript
# yarn tsc

# Run DataProvider
# node dist/src/spammer/attestation-spammer.js
yarn ts-node src/spammer/attestation-spammer.ts \
    -c BTC \
    -d 5 \
    -l BTC \
    -t \
    -f ../test/attestationClient/test-data
