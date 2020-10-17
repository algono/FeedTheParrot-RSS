## Fix sonarqube crash (memory issue)
The first time you do `docker-compose up`, you will probably get this error:
```shell
"[1]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]"
```
If this happens to you, and you are running a linux host (or through WSL), the fix is running this command directly on the host as root (easiest way is prepending the command with `sudo`):
```shell
sysctl -w vm.max_map_count=262144
```