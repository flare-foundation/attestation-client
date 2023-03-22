#!/bin/bash

if [[ -z "$1" ]] ; then
   docker-compose -f docker-compose-monitor.yaml -p monitor down   
else
   docker-compose -f docker-compose-monitor.yaml -p monitor stop $@
fi