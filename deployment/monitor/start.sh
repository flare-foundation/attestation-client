#!/bin/bash

docker-compose -f docker-compose-monitor.yaml -p monitor up -d $@
