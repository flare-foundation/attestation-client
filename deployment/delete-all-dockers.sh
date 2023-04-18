#!/bin/bash

docker stop `docker ps -qa`
docker system prune --volumes --all