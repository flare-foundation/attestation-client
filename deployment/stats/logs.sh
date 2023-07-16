#!/bin/bash

docker-compose -f docker-compose-stats.yaml -p stats logs -f --tail=1000 $1
