#!/bin/bash


# yarn ts-node src/install/install.ts ../attestation-suite-config/

mkdir -p credentials2

sudo docker run \
    -v /home/ubuntu/attestation-suite/attestation-client/deployment/credentials2:/app/attestation-client/credentials \
    attestation-suite \
    yarn ts-node src/install/installCredentials.ts 

sudo docker run \
    -v /home/ubuntu/attestation-suite/attestation-client/deployment/credentials2:/app/attestation-client/credentials \
    attestation-suite \
    cp configs/.install/configurations.json credentials/. 