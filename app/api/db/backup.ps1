# Backup do banco antes de cada migration. Uso: powershell -File db\backup.ps1 [rotulo]
param([string]$label = 'manual')
$envf = Join-Path $PSScriptRoot '..\.env'
$vars = @{}; Get-Content $envf | ? { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | % { $vars[$matches[1]] = $matches[2] }
$pgd = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
$dir = Join-Path $PSScriptRoot '..\..\..\backups'; New-Item -ItemType Directory -Force $dir | Out-Null
$out = Join-Path $dir ("avagym_{0}_{1}.dump" -f (Get-Date -Format 'yyyyMMdd_HHmmss'), $label)
$env:PGPASSWORD = $vars['DB_PASSWORD']
& $pgd -U $(if ($vars['DB_USER']) { $vars['DB_USER'] } else { 'postgres' }) -h localhost -Fc -f $out $(if ($vars['DB_NAME']) { $vars['DB_NAME'] } else { 'avagym' })
if ($LASTEXITCODE -ne 0) { throw 'pg_dump falhou' }
Remove-Item Env:PGPASSWORD; "backup: $out"
