# Deploy Tools Script (PowerShell)

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
        # Note: Standard SCP in PowerShell cannot easily accept a password securely without external tools (sshpass/expect).
        # We will use the username to pre-fill the SCP command.
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

# Menu Selection
Write-Host "What would you like to deploy?" -ForegroundColor Cyan
Write-Host "0) Everything"
Write-Host "1) Root Portal (index.html)"
Write-Host "2) Potential"
Write-Host "3) Evaluate"
Write-Host "4) JSON Vision"
Write-Host "5) Meeting Ticker"
Write-Host ""
$CHOICE = Read-Host "Enter Choice (0-5)"

Write-Host ""
Pause

# 2. Deploy Root Files
if ($CHOICE -eq "0" -or $CHOICE -eq "1") {
    Write-Host "---------------------------------------------" -ForegroundColor Green
    Write-Host "Uploading Root Portal (index.html, favicon)..."
    scp -P $PORT index.html favicon.svg "$($SSH_USER)@$($HOST_NAME):$REMOTE_BASE/"
}

# 3. Deploy Potential
if ($CHOICE -eq "0" -or $CHOICE -eq "2") {
    Write-Host "---------------------------------------------" -ForegroundColor Green
    Write-Host "Uploading 'Potential'..."
    scp -P $PORT -r potential/dist/. "$($SSH_USER)@$($HOST_NAME):$REMOTE_BASE/potential/"
}

# 4. Deploy Evaluate
if ($CHOICE -eq "0" -or $CHOICE -eq "3") {
    Write-Host "---------------------------------------------" -ForegroundColor Green
    Write-Host "Uploading 'Evaluate'..."
    scp -P $PORT -r evaluate/dist/. "$($SSH_USER)@$($HOST_NAME):$REMOTE_BASE/evaluate/"
}

# 5. Deploy JSON Vision
if ($CHOICE -eq "0" -or $CHOICE -eq "4") {
    Write-Host "---------------------------------------------" -ForegroundColor Green
    Write-Host "Uploading 'JSON Vision'..."
    scp -P $PORT -r json-vision/dist/. "$($SSH_USER)@$($HOST_NAME):$REMOTE_BASE/json-vision/"
}

# 6. Deploy Meeting Ticker
if ($CHOICE -eq "0" -or $CHOICE -eq "5") {
    Write-Host "---------------------------------------------" -ForegroundColor Green
    Write-Host "Uploading 'Meeting Ticker'..."
    scp -P $PORT -r meeting-ticker/dist/. "$($SSH_USER)@$($HOST_NAME):$REMOTE_BASE/meeting-ticker/"
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      Deployment Complete!" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
