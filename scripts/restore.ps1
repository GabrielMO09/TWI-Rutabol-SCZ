[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$BackupFile,

    [ValidatePattern('\A[a-z_][a-z0-9_]{0,62}\z')]
    [string]$TargetDb = 'rutabol_scz_restore',

    [switch]$Force,

    [ValidateNotNullOrEmpty()]
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin'
)

$ErrorActionPreference = 'Stop'
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$repoRoot = Split-Path -Parent $scriptDir
$sourceDb = 'rutabol_scz'
$exitCode = 0

function Find-PgTool([string]$Name) {
    $installed = Join-Path $PgBin "$Name.exe"
    if (Test-Path -LiteralPath $installed -PathType Leaf) {
        return (Resolve-Path -LiteralPath $installed).ProviderPath
    }
    $command = Get-Command "$Name.exe" -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($command) { return $command.Source }
    throw "No se encontro $Name.exe. Revise -PgBin o PATH."
}

function Get-DbSetting([string]$Name, [string]$Default) {
    $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if (-not [string]::IsNullOrEmpty($value)) { return $value }
    if ($fileSettings.ContainsKey($Name)) { return $fileSettings[$Name] }
    return $Default
}

function Invoke-PgQuery([string]$Database, [string]$Sql) {
    $result = & $psql @connection -X -qAt -v ON_ERROR_STOP=1 -d $Database -c $Sql 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Consulta en $Database fallida (psql codigo $LASTEXITCODE)."
    }
    return $result
}

$countSql = @'
SELECT count(*) FROM rutabol.usuario
UNION ALL SELECT count(*) FROM rutabol.tarjeta_credicard
UNION ALL SELECT count(*) FROM rutabol.movimiento_saldo
UNION ALL SELECT count(*) FROM rutabol.transaccion_pago
UNION ALL SELECT count(*) FROM rutabol.auditoria;
'@

# Una sola sentencia usa la misma instantanea para los cinco conteos.
# ORDER BY fija el orden de salida para compararlos por nombre.
$countSql = @'
SELECT total
FROM (
    SELECT 1 AS orden, count(*) AS total FROM rutabol.usuario
    UNION ALL SELECT 2, count(*) FROM rutabol.tarjeta_credicard
    UNION ALL SELECT 3, count(*) FROM rutabol.movimiento_saldo
    UNION ALL SELECT 4, count(*) FROM rutabol.transaccion_pago
    UNION ALL SELECT 5, count(*) FROM rutabol.auditoria
) AS conteos
ORDER BY orden;
'@

$previousPassword = $env:PGPASSWORD
$previousSslMode = $env:PGSSLMODE
$previousTimeout = $env:PGCONNECT_TIMEOUT

try {
    if ($TargetDb -cin @('postgres', 'template0', 'template1')) {
        throw 'Seleccione una base de datos de Rutabol.'
    }
    if ($TargetDb -ceq $sourceDb -and -not $Force) {
        throw "Restaurar sobre $sourceDb requiere -Force explicito."
    }
    if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) {
        throw 'El archivo de respaldo no existe.'
    }
    $archive = (Resolve-Path -LiteralPath $BackupFile).ProviderPath
    $pgRestore = Find-PgTool 'pg_restore'
    $psql = Find-PgTool 'psql'
    & $pgRestore --list $archive 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo leer el indice del respaldo (codigo $LASTEXITCODE)."
    }

    $fileSettings = @{}
    $envPath = Join-Path $repoRoot 'backend\.env'
    if (Test-Path -LiteralPath $envPath -PathType Leaf) {
        foreach ($line in Get-Content -LiteralPath $envPath -Encoding UTF8) {
            if ($line -match '^\s*(DB_HOST|DB_PORT|DB_NAME|DB_OWNER_USER|DB_OWNER_PASSWORD|DB_SSL)\s*=\s*(.*)$') {
                $key = $Matches[1]
                $value = $Matches[2].Trim()
                if ($value -match '^([''"])(.*?)\1\s*(?:#.*)?$') {
                    $value = $Matches[2]
                } else {
                    $value = ($value -replace '#.*$', '').TrimEnd()
                }
                $fileSettings[$key] = $value
            }
        }
    }

    if ((Get-DbSetting 'DB_NAME' $sourceDb) -cne $sourceDb) {
        throw "DB_NAME debe indicar el origen $sourceDb. Use -TargetDb para el destino."
    }
    $connection = @(
        '-w', '-h', (Get-DbSetting 'DB_HOST' '127.0.0.1'),
        '-p', (Get-DbSetting 'DB_PORT' '5432'),
        '-U', (Get-DbSetting 'DB_OWNER_USER' 'rutabol_owner')
    )
    if ([string]::IsNullOrEmpty($env:PGPASSWORD)) {
        $env:PGPASSWORD = Get-DbSetting 'DB_OWNER_PASSWORD' ''
    }
    if ([string]::IsNullOrEmpty($env:PGPASSWORD)) {
        throw 'Falta PGPASSWORD o DB_OWNER_PASSWORD.'
    }
    if ((Get-DbSetting 'DB_SSL' 'false') -eq 'true') {
        $env:PGSSLMODE = 'require'
    }
    if (-not $env:PGCONNECT_TIMEOUT) { $env:PGCONNECT_TIMEOUT = '5' }

    $sourceCounts = @()
    try { $sourceCounts = @(Invoke-PgQuery $sourceDb $countSql) }
    catch { Write-Warning 'Origen no disponible para comparar los conteos.' }

    $destinationExists = Invoke-PgQuery 'postgres' `
        "SELECT 1 FROM pg_database WHERE datname = '$TargetDb';"

    $restoreOptions = @('--single-transaction')
    if ($destinationExists -ne '1') {
        try {
            [void](Invoke-PgQuery 'postgres' "CREATE DATABASE $TargetDb WITH TEMPLATE template0;")
        } catch {
            throw "No se pudo crear $TargetDb. Verifique que exista o pida a un administrador que cree una base vacia con el dueno configurado."
        }
    } elseif ($TargetDb -ceq $sourceDb) {
        # Solo se llega aqui con -Force.
        $restoreOptions += '--clean', '--if-exists'
    } else {
        $hasApplicationObjects = Invoke-PgQuery $TargetDb @'
SELECT EXISTS (
    SELECT 1
    FROM pg_namespace
    WHERE nspname NOT IN ('public', 'information_schema')
      AND nspname !~ '^pg_'
    UNION ALL
    SELECT 1 FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
    UNION ALL
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
    UNION ALL
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
);
'@
        if ($hasApplicationObjects -ne 'f') {
            throw "El destino $TargetDb contiene objetos. Use una base nueva o vacia."
        }
    }

    & $pgRestore @connection @restoreOptions -d $TargetDb $archive 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore fallo (codigo $LASTEXITCODE). Revise el archivo, los roles y los permisos del destino."
    }

    $targetCounts = @(Invoke-PgQuery $TargetDb $countSql)
    $labels = @('usuarios', 'tarjetas', 'movimientos', 'tickets', 'auditoria')
    if ($targetCounts.Count -ne $labels.Count) {
        throw 'La consulta del destino no devolvio los cinco conteos esperados.'
    }

    $canCompare = $sourceCounts.Count -eq $labels.Count
    $results = for ($i = 0; $i -lt $labels.Count; $i++) {
        $sourceValue = 'N/D'
        $status = 'Sin comparacion'
        if ($canCompare) {
            $sourceValue = $sourceCounts[$i]
            $status = 'Igual'
            if ($sourceValue -ne $targetCounts[$i]) { $status = 'Difiere' }
        }
        [pscustomobject]@{
            Entidad = $labels[$i]
            OrigenAntes = $sourceValue
            Destino = $targetCounts[$i]
            Comparacion = $status
        }
    }
    $results | Format-Table -AutoSize
    if ($results.Comparacion -contains 'Difiere') {
        Write-Warning 'Hay diferencias con el origen actual. Contraste con los conteos de la fecha del respaldo.'
    }
    Write-Host "Restauracion y consultas completadas en $TargetDb."
} catch {
    $exitCode = 1
    [Console]::Error.WriteLine($_.Exception.Message)
} finally {
    $env:PGPASSWORD = $previousPassword
    $env:PGSSLMODE = $previousSslMode
    $env:PGCONNECT_TIMEOUT = $previousTimeout
}

exit $exitCode
