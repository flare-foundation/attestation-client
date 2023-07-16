#!/bin/bash

docker-compose -f docker-compose-stats.yaml down

docker volume prune -f
