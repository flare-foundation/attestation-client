#!/bin/bash

sudo docker run \
    -v /home/ubuntu/attestation-suite/attestation-client/deployment/credentials2:/app/attestation-suite-config \
    -v /home/ubuntu/attestation-suite/attestation-client/deployment/credentials2:/app/credentials \
    attestation-suite \
    yarn ts-node src/install/secureConfigurations.ts -o ../credentials

