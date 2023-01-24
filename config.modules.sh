#!/bin/bash

# Important: no spaces before and after = sign!

# Set your hostname
# This cannot be changed later (easily).
# Do not use backslash at end !!!
export HOSTNAME=www.yourhostname.com

# Set your email for certificate expiration notification
# This cannot be changed later (easily).
export CERT_EMAIL=spam@google.com

# set true or false for modules to be installed (NO SPACES before and after = sign!)

# prerequisits 
export INSTALL_MYSQL=true

# services
export INSTALL_INDEXER=true
export INSTALL_VERIFIER=true
export INSTALL_MONITOR=true
export INSTALL_FRONTEND=true

# nodes
export INSTALL_NODES_TESTNET=true

# not supported yet
export INSTALL_NODES_MAINNET=false

# attestation client 
export INSTALL_FLARE=false
export INSTALL_SONGBIRD=false
export INSTALL_COSTON=false
export INSTALL_COSTON2=true
