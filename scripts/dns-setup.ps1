# Hace que Windows consulte el BIND9 local SOLO para rutabol.scz (no cambia tu DNS general).
# Ejecutar como Administrador:  powershell -ExecutionPolicy Bypass -File scripts\dns-setup.ps1
# Para revertir:                 ... -File scripts\dns-setup.ps1 -Quitar
param([switch]$Quitar)
$ns = "rutabol.scz"
Get-DnsClientNrptRule | Where-Object { $_.Namespace -contains ".rutabol.test" } | Remove-DnsClientNrptRule -Force  # regla de la versión anterior
Get-DnsClientNrptRule | Where-Object { $_.Namespace -contains $ns } | Remove-DnsClientNrptRule -Force
if (-not $Quitar) {
  Add-DnsClientNrptRule -Namespace $ns -NameServers "127.0.0.1"
  Clear-DnsClientCache
  Resolve-DnsName rutabol.scz -Type A
}
