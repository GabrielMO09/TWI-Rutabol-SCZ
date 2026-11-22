````markdown
# Respaldos y recuperación de Rutabol SCZ

RNF-12 se verifica con la ejecución diaria y un simulacro trimestral de restauración. Para RNF-05, registre el tiempo desde la detección de la caída hasta la recuperación operativa y contabilice esa interrupción en la medición mensual de disponibilidad del 99 %.

## Preparación en Windows 11

1. Ejecute los comandos desde la raíz del repositorio con Windows PowerShell. Compruebe que PostgreSQL 18 está iniciado en `127.0.0.1:5432` y que `pg_dump.exe`, `pg_restore.exe` y `psql.exe` están en `C:\Program Files\PostgreSQL\18\bin`. Si están en otra ruta, pase `-PgBin` a los scripts o agregue ese directorio al `PATH` de la cuenta que los ejecuta.
2. Complete `backend/.env` a partir de `backend/.env.example`. Los scripts usan `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_OWNER_USER`, `DB_OWNER_PASSWORD` y `DB_SSL`. Use `DB_NAME=rutabol_scz` y `DB_OWNER_USER=rutabol_owner`. Las variables del proceso tienen prioridad sobre el archivo y `PGPASSWORD` tiene prioridad sobre `DB_OWNER_PASSWORD`. En el archivo, encierre entre comillas las contraseñas que contienen `#` o espacios en los extremos. `DB_SSL=true` exige TLS.
3. Dé a la cuenta de Windows permiso de lectura sobre el proyecto y `backend/.env`, ejecución sobre los binarios y escritura en la carpeta de copias. Restrinja el acceso a `.env` y a los archivos `.dump`, que contienen datos de la aplicación. Use `rutabol_owner` para estos procedimientos y `rutabol_app` para el backend.

## Copia manual y programación diaria

```powershell
.\scripts\backup.ps1
```

La salida muestra la ruta de la copia terminada. Revise `backups\backup.log` y busque el último `OK`. El nombre usa fecha y hora UTC. La retención de 14 días elimina copias de este script que hayan superado esa edad en la carpeta seleccionada, después de publicar una copia nueva. Puede ajustar la carpeta con `-BackupDir` y la retención con `-RetentionDays`.

```powershell
.\scripts\schedule-backup.ps1 -Time 02:00 -RetentionDays 14
Start-ScheduledTask -TaskName 'Rutabol PostgreSQL Backup'
```

Ejecute el registro con la cuenta de Windows que utilizará la tarea. Si la directiva del equipo lo requiere, registre la tarea desde una consola elevada con esa misma cuenta y compruebe que tiene permiso de inicio de sesión por lotes. La tarea usa S4U y rutas locales, y puede ejecutarse con la sesión cerrada. Para la ejecución programada, configure la contraseña mediante `backend/.env` o mediante una variable disponible para el proceso de la tarea. Una variable definida solo en la consola donde registró la tarea no se transmite a esa ejecución. Use `-Force` al registrar de nuevo para actualizar la tarea existente.

Después de que termine la ejecución de prueba, confirme que `LastTaskResult` sea `0`, que exista un `.dump` nuevo y que `backup.log` tenga una entrada `OK` correspondiente. Compruebe también una ejecución con la sesión cerrada. Si el equipo está apagado a la hora prevista, Windows podrá ejecutar la tarea cuando vuelva a estar disponible.

```powershell
Get-ScheduledTaskInfo -TaskName 'Rutabol PostgreSQL Backup'
Get-Content .\backups\backup.log -Tail 15
```

Conserve una copia protegida en otro medio o equipo si necesita recuperarse de la pérdida del disco local. [Documentación de PostgreSQL sobre copias lógicas](https://www.postgresql.org/docs/18/backup-dump.html) · [Documentación de Microsoft sobre el inicio de sesión de tareas](https://learn.microsoft.com/en-us/windows/win32/taskschd/principal-logontype)

## Restaurar en una base de verificación

1. Seleccione una copia generada por el script y conserve el archivo original. En el servidor de destino deben existir `rutabol_owner`, `rutabol_app` y los demás roles referenciados por el respaldo. El archivo conserva los permisos de los objetos de la base. Si usa otro clúster, prepare allí los roles y la configuración de conexión.
2. Conéctese a `postgres` como administrador en pgAdmin. En una sesión con autocommit, cree un destino vacío con el propietario de Rutabol. El `rutabol_owner` local carece de `CREATEDB`. Si el rol configurado sí tiene ese atributo, el script puede crear un destino inexistente. Use otro nombre para cada simulacro o prepare una base vacía.

   ```sql
   CREATE DATABASE rutabol_scz_restore
       WITH OWNER rutabol_owner TEMPLATE template0;
   ```

3. Seleccione la copia más reciente o indique explícitamente otro archivo. Ejecute la restauración.

   ```powershell
   $copy = Get-ChildItem .\backups -File -Filter 'rutabol_scz_*.dump' |
       Sort-Object Name -Descending |
       Select-Object -First 1

   if (-not $copy) { throw 'No hay copias disponibles.' }

   .\scripts\restore.ps1 -BackupFile $copy.FullName -TargetDb rutabol_scz_restore
   ```

4. Revise el resultado. El script cuenta usuarios, tarjetas, movimientos, tickets (`rutabol.transaccion_pago`) y auditoría. Si pudo consultar el origen antes de restaurar, muestra ambos valores. Las diferencias se señalan como advertencias porque el origen puede haber cambiado desde la copia. Un código de salida `0` indica que terminaron la carga y las consultas en el destino. Si `pg_restore` falla, se revierten sus cambios en la base de destino. Si el script acababa de crear la base, esta puede quedar vacía para reintentar. [Documentación de `pg_restore`](https://www.postgresql.org/docs/18/app-pgrestore.html)

## Simulacro trimestral

1. Programe una ventana de prueba y pause las escrituras si va a verificar igualdad exacta. Deje terminar la persistencia pendiente del backend. Tome y registre los cinco conteos del origen, genere una copia nueva y mantenga el origen estable hasta que el script haya tomado sus conteos. Para un respaldo histórico, use conteos registrados en el momento de esa copia, si están disponibles.
2. Restaure en una base de verificación nueva o vacía. Registre la fecha, el archivo, el destino, la duración, el código de salida y los conteos. Si falta una referencia histórica, registre que la comparación quedó pendiente y repita la comprobación con una copia tomada en una ventana sin escrituras.
3. Arranque una instancia aislada del backend con `DB_NAME` apuntando al destino, credenciales de `rutabol_app`, un puerto distinto y `ENABLE_DEMO_SEED=false`. Compruebe `GET /api/health/db` y pruebe login y consulta de tarjeta, saldo e historial. Si realiza operaciones de escritura, hágalo después de registrar los conteos iniciales.
4. Registre el tiempo hasta que la aplicación estuvo utilizable. Conserve el resultado y corrija cualquier fallo antes de cerrar el simulacro.

## Recuperación del servicio

Primero valide la copia en una base de verificación. Para intervenir sobre `rutabol_scz`, detenga el backend y coordine una ventana. Si el origen es legible, haga una copia previa y consérvela fuera de la carpeta sujeta a retención.

`-TargetDb rutabol_scz -Force` permite intervenir sobre el origen. Si ya existe, `pg_restore` elimina y repone dentro de una transacción los objetos incluidos en el archivo. Para recuperar el estado completo de una fecha, prepare una base vacía, ya sea con un nombre nuevo o con el nombre original tras apartar la base anterior. Los objetos creados después de la copia y ausentes del archivo pueden seguir presentes al restaurar sobre una base existente. Tras recuperar, valide la aplicación con `rutabol_app`, confirme `GET /api/health/db` y registre el fin de la interrupción.

## RPO y RTO esperados

- **RPO objetivo de 24 horas** con una copia válida cada día. Se mide desde la instantánea de la última copia válida. Una ejecución omitida o fallida puede ampliar la pérdida, al igual que los cambios que todavía estaban pendientes de persistir en el backend.
- **RTO objetivo inicial de 60 minutos** para una base local pequeña y una copia accesible. Incluye localizar la copia, restaurar, ejecutar verificaciones y volver a poner el backend en servicio. Confirme o ajuste esta estimación con los tiempos del simulacro.

## Alcance de la copia

Se respalda el esquema y los datos persistidos en `rutabol_scz`. Según `AVANCES_POSTGRESQL.txt`, los códigos de confirmación de correo y recuperación de contraseña, las posiciones GPS en vivo, los intentos de inicio de sesión, las conexiones SSE y los eventos de ocupación del simulador quedan en memoria del backend. Reiniciar o restaurar la base no recupera ese estado. En PostgreSQL se guarda el hash de las sesiones, no el token sin procesar.

La copia lógica de una sola base tampoco incluye roles globales de PostgreSQL, archivos de configuración del servidor ni `backend/.env`. Mantenga esos elementos disponibles para reconstruir el entorno. [Alcance de `pg_dump`](https://www.postgresql.org/docs/18/app-pgdump.html)
