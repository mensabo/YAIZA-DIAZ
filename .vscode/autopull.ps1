# Auto pull en bucle: trae cambios de origin/master cada 2 minutos.
# Usa --ff-only para no tocar nada si hay cambios locales en conflicto.
Set-Location (Join-Path $PSScriptRoot "..")

while ($true) {
    git pull origin master --ff-only
    Start-Sleep -Seconds 120
}
