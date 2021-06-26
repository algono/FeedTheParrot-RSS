#!/bin/sh
docker run --rm --volumes-from sonarqube_db_1 -v $(pwd):/backup ubuntu tar cvf /backup/backup.tar /var/lib/postgresql
