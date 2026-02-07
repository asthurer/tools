# Wrapper for Node.js build script
# This bypasses PowerShell complexity and ensures consistent cross-platform behavior
node build.js
if ($LASTEXITCODE -ne 0) { exit 1 }
