# Ejecutar con la cuenta Windows que tendra acceso al proyecto y a PostgreSQL.
# PgBin apunta a PostgreSQL 18. La tarea usa una carpeta local y no guarda claves.
[CmdletBinding()]
param(
    [ValidatePattern('\A(?:[01][0-9]|2[0-3]):[0-5][0-9]\z')]
    [string]$Time = '02:00',

    [ValidateNotNullOrEmpty()]
    [string]$TaskName = 'Rutabol PostgreSQL Backup',

    [string]$BackupDir = '',

    [ValidateRange(1, 36500)]
    [int]$RetentionDays = 14,

    [ValidateNotNullOrEmpty()]
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin',

    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $BackupDir) { $BackupDir = Join-Path (Split-Path -Parent $scriptDir) 'backups' }

try {
    $backupScript = Join-Path $scriptDir 'backup.ps1'
    if (-not (Test-Path -LiteralPath $backupScript -PathType Leaf)) {
        throw 'No se encontro backup.ps1.'
    }
    $repoRoot = Split-Path -Parent $scriptDir
    $backupPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($BackupDir)
    $binPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PgBin)

    foreach ($tool in @('pg_dump.exe', 'pg_restore.exe')) {
        $installed = Join-Path $binPath $tool
        if (-not (Test-Path -LiteralPath $installed -PathType Leaf)) {
            $command = Get-Command $tool -CommandType Application -ErrorAction SilentlyContinue |
                Select-Object -First 1
            if (-not $command) { throw "No se encontro $tool. Revise -PgBin o PATH." }
        }
    }

    # El punto evita cerrar el argumento con una barra invertida antes de la comilla.
    if ($backupPath.EndsWith('\')) { $backupPath += '.' }
    if ($binPath.EndsWith('\')) { $binPath += '.' }
    $arguments = '-NoProfile -NonInteractive -File "{0}" -BackupDir "{1}" -RetentionDays {2} -PgBin "{3}"' `
        -f $backupScript, $backupPath, $RetentionDays, $binPath

    $powershell = Join-Path $PSHOME 'powershell.exe'
    if (-not (Test-Path -LiteralPath $powershell -PathType Leaf)) {
        $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    }
    $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments `
        -WorkingDirectory $repoRoot
    $clockTime = [DateTime]::ParseExact($Time, 'HH:mm', [Globalization.CultureInfo]::InvariantCulture)
    $trigger = New-ScheduledTaskTrigger -Daily -At ((Get-Date).Date.Add($clockTime.TimeOfDay))
    $account = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $principal = New-ScheduledTaskPrincipal -UserId $account -LogonType S4U -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
        -Principal $principal -Settings $settings -Force:$Force | Out-Null

    Write-Host "Tarea registrada para las $Time (hora local), con la cuenta $account."
    Write-Host "Nombre de la tarea: $TaskName"
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}

exit 0
