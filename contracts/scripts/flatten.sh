#!/bin/bash

echo $1
mkdir -p flattened/$(dirname "$1")
yarn hardhat flatten $1 > flattened/$1
yarn ts-node contracts/scripts/flatten-fix.ts flattened/$1
