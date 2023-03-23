#!/bin/bash

docker-compose -f docker-compose-monitor.yaml -p monitor logs -f --tail=1000 $1
