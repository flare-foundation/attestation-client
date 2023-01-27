#!/bin/bash

./docker/scripts/common.sh

NODE_ENV=development yarn ts-node src/install/dockerSecureUpdateSql.ts

node dist/src/runIndexer.js -a xrp