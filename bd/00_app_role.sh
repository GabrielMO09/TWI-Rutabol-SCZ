#!/bin/sh
# Crea el rol de la aplicacion (el esquema v2 le da sus GRANT y exige que exista).
set -e
psql -v ON_ERROR_STOP=1 -v app_user="$DB_APP_USER" -v app_pass="$DB_APP_PASSWORD" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_pass') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SQL
