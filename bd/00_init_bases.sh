#!/bin/sh
# Primer arranque: crea las 3 bases de Rutabol-SCZ con un rol de aplicacion por base y carga esquema + datos.
#   rutabol_scz        -> operacion (la crea la imagen con POSTGRES_DB)
#   registro_academico -> instituciones y estudiantes
#   registro_transporte-> lineas, rutas, paradas y unidades oficiales
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_user="$DB_APP_USER" -v app_pass="$DB_APP_PASSWORD" \
  -v ac_db="$DB_ACADEMICO_NAME" -v ac_user="$DB_ACADEMICO_USER" -v ac_pass="$DB_ACADEMICO_PASSWORD" \
  -v tr_db="$DB_TRANSPORTE_NAME" -v tr_user="$DB_TRANSPORTE_USER" -v tr_pass="$DB_TRANSPORTE_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_pass') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'ac_user', :'ac_pass') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'tr_user', :'tr_pass') \gexec
SELECT format('CREATE DATABASE %I', :'ac_db') \gexec
SELECT format('CREATE DATABASE %I', :'tr_db') \gexec
-- Cada rol entra solo a su base.
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', d) FROM unnest(ARRAY[current_database(), :'ac_db', :'tr_db']) AS d \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'ac_db', :'ac_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'tr_db', :'tr_user') \gexec
SQL

cargar() { # base rol carpeta
  psql -v ON_ERROR_STOP=1 -v app_role="$2" --username "$POSTGRES_USER" --dbname "$1" \
    -f "/bd/$3/01_esquema.sql" -f "/bd/$3/02_datos.sql"
}
cargar "$POSTGRES_DB" "$DB_APP_USER" rutabol
cargar "$DB_ACADEMICO_NAME" "$DB_ACADEMICO_USER" academico
cargar "$DB_TRANSPORTE_NAME" "$DB_TRANSPORTE_USER" transporte
