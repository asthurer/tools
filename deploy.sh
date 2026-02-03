#!/bin/bash

# Deployment Config
HOST="s1359.use1.mysecurecloudhost.com"
PORT="22"
REMOTE_BASE="/home/pacecod1/asthurer.com/tools"

echo "============================================="
echo "      Deploying Tools to $HOST"
echo "============================================="

# Load .env variables if available
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 1. User ID (Use ENV or Ask)
if [ -z "$SSH_USER" ]; then
    read -p "Enter SSH Username (e.g., pacecod1): " SSH_USER
fi

if [ -z "$SSH_USER" ]; then
  echo "Username is required!"
  exit 1
fi

# Helper function for SCP
upload_scp() {
    local SRC=$1
    local DEST=$2
    if [ ! -z "$SSH_PASS" ] && command -v sshpass &> /dev/null; then
        echo "Uploading $SRC (using sshpass)..."
        sshpass -p "$SSH_PASS" scp -P $PORT -r $SRC $SSH_USER@$HOST:$DEST
    else
        echo "Uploading $SRC (manual password entry)..."
        scp -P $PORT -r $SRC $SSH_USER@$HOST:$DEST
    fi
}

echo ""
echo "Deploying as user: $SSH_USER"
if [ ! -z "$SSH_PASS" ]; then
    if ! command -v sshpass &> /dev/null; then
        echo "WARNING: SSH_PASS found in .env but 'sshpass' is not installed."
        echo "You will still be prompted for the password."
        echo "To automate fully, install sshpass (e.g., apt-get install sshpass)."
    else
        echo "Password found in .env - employing sshpass for automation."
    fi
fi
echo ""
# Menu Selection
echo "What would you like to deploy?"
echo "0) Everything"
echo "1) Root Portal (index.html)"
echo "2) Potential"
echo "3) Evaluate"
echo "4) JSON Vision"
echo "5) Meeting Ticker"
echo ""
read -p "Enter Choice (0-5): " CHOICE

echo ""
read -p "Press Enter to start deployment..."

# 2. Deploy Root Files (index.html, favicon)
if [[ "$CHOICE" == "0" || "$CHOICE" == "1" ]]; then
    echo "---------------------------------------------"
    upload_scp "index.html favicon.svg" "$REMOTE_BASE/"
fi

# 3. Deploy Potential
if [[ "$CHOICE" == "0" || "$CHOICE" == "2" ]]; then
    echo "---------------------------------------------"
    upload_scp "potential/dist/." "$REMOTE_BASE/potential/"
fi

# 4. Deploy Evaluate
if [[ "$CHOICE" == "0" || "$CHOICE" == "3" ]]; then
    echo "---------------------------------------------"
    upload_scp "evaluate/dist/." "$REMOTE_BASE/evaluate/"
fi

# 5. Deploy JSON Vision
if [[ "$CHOICE" == "0" || "$CHOICE" == "4" ]]; then
    echo "---------------------------------------------"
    upload_scp "json-vision/dist/." "$REMOTE_BASE/json-vision/"
fi

# 6. Deploy Meeting Ticker
if [[ "$CHOICE" == "0" || "$CHOICE" == "5" ]]; then
    echo "---------------------------------------------"
    upload_scp "meeting-ticker/dist/." "$REMOTE_BASE/meeting-ticker/"
fi

echo ""
echo "============================================="
echo "      Deployment Complete!"
echo "============================================="
