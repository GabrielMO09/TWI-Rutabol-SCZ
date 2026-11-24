[CmdletBinding()]
param(
    [string]$BackupDir = '',

    [ValidateRange(1, 36500)]
    [int]$RetentionDays = 14,

    [ValidateNotNullOrEmpty()]
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin'
)

$ErrorActionPreference = 'Stop'
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $BackupDir) { $BackupDir = Join-Path (Split-Path -Parent $scriptDir) 'backups' }
$repoRoot = Split-Path -Parent $scriptDir
$dbName = 'rutabol_scz'
# Las tres bases del sistema; la operacion va primero y manda sobre DB_NAME.
$databases = @($dbName, 'registro_academico', 'registro_transporte')
$logPath = $null
$partialPath = $null
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

function Write-BackupLog([string]$Message) {
    Add-Content -LiteralPath $logPath -Encoding UTF8 `
        -Value ('{0:yyyy-MM-dd HH:mm:ss zzz} {1}' -f (Get-Date), $Message)
}

$previousPassword = $env:PGPASSWORD
$previousSslMode = $env:PGSSLMODE
$previousTimeout = $env:PGCONNECT_TIMEOUT

try {
    $backupPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($BackupDir)
    [void][System.IO.Directory]::CreateDirectory($backupPath)
    $logPath = Join-Path $backupPath 'backup.log'
    Write-BackupLog "INICIO base=$dbName"

    $pgDump = Find-PgTool 'pg_dump'
    $pgRestore = Find-PgTool 'pg_restore'

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

    if ((Get-DbSetting 'DB_NAME' $dbName) -cne $dbName) {
        throw "DB_NAME debe ser $dbName para este respaldo."
    }
    $dbHost = Get-DbSetting 'DB_HOST' '127.0.0.1'
    $dbPort = Get-DbSetting 'DB_PORT' '5432'
    $owner = Get-DbSetting 'DB_OWNER_USER' 'rutabol_owner'
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

    # Publicar cada archivo solo despues de comprobar que el indice se puede leer.
    $stamp = [DateTime]::UtcNow.ToString("yyyyMMdd'T'HHmmssfff'Z'")
    $suffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)
    $published = @()
    foreach ($name in $databases) {
        $fileName = "${name}_${stamp}_${suffix}.dump"
        $finalPath = Join-Path $backupPath $fileName
        $partialPath = "$finalPath.partial"

        & $pgDump -w -h $dbHost -p $dbPort -U $owner -d $name -Fc -f $partialPath 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "pg_dump de $name fallo (codigo $LASTEXITCODE). Revise conexion, permisos y espacio."
        }
        & $pgRestore --list $partialPath 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "No se pudo leer el indice del respaldo de $name (codigo $LASTEXITCODE)."
        }
        [System.IO.File]::Move($partialPath, $finalPath)
        $partialPath = $null
        Write-BackupLog "COPIA archivo=$fileName bytes=$((Get-Item -LiteralPath $finalPath).Length)"
        $published += $finalPath
    }

    # Aplicar la retencion solo despues de publicar una copia nueva.
    $cutoff = [DateTime]::UtcNow.AddDays(-$RetentionDays)
    $expired = Get-ChildItem -LiteralPath $backupPath -File -Filter '*_*.dump' |
        Where-Object {
            $_.Name -cmatch '^(rutabol_scz|registro_academico|registro_transporte)_\d{8}T\d{9}Z_[0-9a-f]{8}\.dump$' -and
            $_.LastWriteTimeUtc -lt $cutoff -and $published -notcontains $_.FullName
        }
    foreach ($file in $expired) {
        Remove-Item -LiteralPath $file.FullName
        Write-BackupLog "RETENCION eliminado=$($file.Name)"
    }

    Write-BackupLog 'OK'
    $published | Write-Output
} catch {
    $exitCode = 1
    $message = $_.Exception.Message
    if ($logPath) {
        try { Write-BackupLog "ERROR $message" }
        catch { [Console]::Error.WriteLine('No se pudo escribir backup.log.') }
    }
    [Console]::Error.WriteLine($message)
} finally {
    if ($partialPath -and (Test-Path -LiteralPath $partialPath -PathType Leaf)) {
        Remove-Item -LiteralPath $partialPath -ErrorAction SilentlyContinue
    }
    $env:PGPASSWORD = $previousPassword
    $env:PGSSLMODE = $previousSslMode
    $env:PGCONNECT_TIMEOUT = $previousTimeout
}

exit $exitCode
