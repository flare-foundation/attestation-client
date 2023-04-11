#!/bin/bash

if [[ -z "$1" ]] ; then
   docker-compose -f docker-compose-stats.yaml -p stats down   
else
   docker-compose -f docker-compose-stats.yaml -p stats stop $@
fi