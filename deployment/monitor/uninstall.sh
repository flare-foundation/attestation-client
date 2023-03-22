#!/bin/bash

docker-compose -f docker-compose-monitor.yaml down

docker volume prune -f
