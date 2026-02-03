# Deploy Tools Script (PowerShell) - Dynamic Version

$HOST_NAME = "s1359.use1.mysecurecloudhost.com"
$PORT = "22"
$REMOTE_BASE = "/home/pacecod1/asthurer.com/tools"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      Deploying Tools to $HOST_NAME" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Load .env variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "SSH_USER=(.*)") { $global:SSH_USER = $matches[1] }
    }
}

# 1. User ID (Use ENV or Ask)
if ([string]::IsNullOrWhiteSpace($SSH_USER)) {
    $SSH_USER = Read-Host "Enter SSH Username (e.g., pacecod1)"
}

if ([string]::IsNullOrWhiteSpace($SSH_USER)) {
    Write-Error "Username is required!"
    exit 1
}

Write-Host ""
Write-Host "Deploying as user: $SSH_USER" -ForegroundColor Yellow
Write-Host "NOTE: You will still be prompted for your SSH password (once for each folder) unless you use SSH keys." -ForegroundColor Yellow
Write-Host "PowerShell standard SCP does not accept password arguments for security reasons." -ForegroundColor DarkGray
Write-Host ""
Pause

# Load tools from JSON
$jsonContent = Get-Content "tools.json" -Raw
$tools = $jsonContent | ConvertFrom-Json

# Menu Selection
Write-Host "What would you like to deploy?" -ForegroundColor Cyan
Write-Host "0) All Tools + Root Portal"
Write-Host "1) Root Portal (index.html)"

$i = 2
foreach ($tool in $tools) {
    Write-Host "$i) $($tool.name)"
    $tool | Add-Member -MemberType NoteProperty -Name "MenuIndex" -Value $i
    $i++
}

Write-Host ""
$CHOICE = Read-Host "Enter Choice (0-$($i-1))"

Write-Host ""
Pause

# Helper function to check choice
function Should-Deploy ($index) {
    return ($CHOICE -eq "0" -or $CHOICE -eq "$index")
}

# 1. Always Deploy Root Files (to ensure JSON is up to date)
Write-Host "---------------------------------------------" -ForegroundColor Green
Write-Host "Deploying Root Portal (index.html, tools.json, favicon)..."
# Use tar pipe for root files
tar -cf - index.html tools.json favicon.svg | ssh -p $PORT "$($SSH_USER)@$($HOST_NAME)" "tar -xf - -C $REMOTE_BASE"

# 2. Deploy Tools Loop
if ($CHOICE -ne "1") {
    foreach ($tool in $tools) {
        if (Should-Deploy $tool.MenuIndex) {
            Write-Host "---------------------------------------------" -ForegroundColor Green
            Write-Host "Deploying '$($tool.name)'..."
            
            $folder = $tool.id
            $remotePath = "$REMOTE_BASE/$folder"
            
            # Navigate to dist, tar content, pipe to ssh which mkdirs and untars
            if (Test-Path "$folder/dist") {
                Push-Location "$folder/dist"
                try {
                    # Note: We use . in tar to capture all files in current dir
                    tar -cf - . | ssh -p $PORT "$($SSH_USER)@$($HOST_NAME)" "mkdir -p $remotePath && tar -xf - -C $remotePath"
                } finally {
                    Pop-Location
                }
            } else {
                Write-Error "Dist folder not found for $folder! Did you build it?"
            }
        }
    }
}


Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      Deployment Complete!" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
