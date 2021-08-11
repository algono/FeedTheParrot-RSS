#!/bin/sh
sonarqube_vm_max_map_count=262144
current_vm_max_map_count="$(sysctl vm.max_map_count --values)"

[ $current_vm_max_map_count -lt $sonarqube_vm_max_map_count ] && sudo sysctl -w vm.max_map_count=$sonarqube_vm_max_map_count

# If the current user is a member of the 'docker' group, sudo is not needed
if id -Gn | grep -q '\bdocker\b'
then
  docker-compose up -d
else
  sudo docker-compose up -d
fi
