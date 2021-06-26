#!/bin/sh
docker run --rm --volumes-from sonarqube_db_1 -v $(pwd):/backup ubuntu bash -c "cd /var/lib/postgresql && tar xvf /backup/backup.tar --strip 1"