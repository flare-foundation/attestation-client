#!/bin/bash

# set secret or private key (NO SPACES before and after = sign!)
export SECRET_FLARE=""
export SECRET_SONGBIRD=""
export SECRET_COSTON=""
export SECRET_COSTON2=""

# set your hostname or ip
export HOSTNAME=www.yourhostname.com

# change this if you want to have specific password
# it must be 64 characters long because it is also used for ALGO token
export SECRET_NODES_TESTNET="$(GENERATE_RANDOM_PASSWORD_64)"
export SECRET_NODES_MAINNET="$(GENERATE_RANDOM_PASSWORD_64)"
