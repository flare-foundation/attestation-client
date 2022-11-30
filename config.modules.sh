#!/bin/bash

# set true or false for modules to be installed (NO SPACES before and after = sign!)

# prerequisits 
export INSTALL_MYSQL=true

# services
export INSTALL_INDEXER=true
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
