#!/bin/bash

docker-compose -f docker-compose-stats.yaml -p stats up -d $@
