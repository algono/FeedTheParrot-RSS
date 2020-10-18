#!/bin/sh
sonarqube_vm_max_map_count=262144
current_vm_max_map_count="$(sysctl vm.max_map_count --values)"

[ $current_vm_max_map_count -lt $sonarqube_vm_max_map_count ] && sudo sysctl -w vm.max_map_count=$sonarqube_vm_max_map_count

docker-compose up -d
