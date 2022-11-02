#!/bin/bash

# Important: no spaces before and after = sign!

# Set your hostname
# This cannot be changed later.
# Do not use backslash at end !!!
export HOSTNAME=www.yourhostname.com

# Set your email for certificate
# This cannot be changed later.
export CERT_EMAIL=spam@google.com

# Set secret or private key
# This can be changed later with command `nano ~/attestation-suite/attestation-suite-config/networks.credentials.json` and update config afterwards
export SECRET_FLARE="0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122"
export SECRET_SONGBIRD="0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122"
export SECRET_COSTON="0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122"
export SECRET_COSTON2="0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122"

# Change this if you want to have specific password. If left like this it will be auto generated.
# It must be 64 characters long because it is also used for ALGO token
# This cannot be changed later.
export SECRET_NODES_TESTNET="$(GENERATE_RANDOM_PASSWORD_64)"
export SECRET_NODES_MAINNET="$(GENERATE_RANDOM_PASSWORD_64)"
