## Fix sonarqube crash (memory issue)
The first time you do `docker-compose up`, you will probably get this error:
```shell
"[1]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]"
```
A one-time solution to this error is running this command on the host:
```shell
sudo sysctl -w vm.max_map_count=262144
```

For a more permanent solution:

### Linux host

Modify the `/etc/sysctl.conf` file, adding the following line at the end:
```shell
vm.max_map_count=262144
```
Then run the following command to apply the changes:
```shell
sudo sysctl -p
```


### WSL

In this case, there is an issue where the file from the linux host solution is not used, therefore the changes are not applied at startup.

(Issue on GitHub with more details: https://github.com/microsoft/WSL/issues/4232)

The easiest workaround is to run the one-time command every time before starting the containers:
```shell
sudo sysctl -w vm.max_map_count=262144
```
Sadly, this will require your root account most of the time, but the other workaround is a bit too hacky for my taste.

To make this task easier, I created a shell script called `up-wsl.sh`, which runs the following commands:
```sh
sonarqube_vm_max_map_count=262144
current_vm_max_map_count="$(sysctl vm.max_map_count --values)"

[ $current_vm_max_map_count -lt $sonarqube_vm_max_map_count ] && sudo sysctl -w vm.max_map_count=$sonarqube_vm_max_map_count

docker-compose up -d
```
First, it checks for the current value, and compares it to the min value sonarqube needs.

- If it is less than that, then it runs the command to set it to that value (which will require root access).

- If not, root access won't be required.