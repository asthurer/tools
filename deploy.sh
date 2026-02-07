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

# Helper function for Tar-Pipe deployment
deploy_tar() {
    local SRC_DIR=$1
    local DEST_DIR=$2
    
    echo "Deploying $SRC_DIR to $DEST_DIR..."
    
    # Construct command: tar local -> ssh (mkdir && tar remove)
    # We use -C to change dir before tarring to avoid path issues
    CMD="mkdir -p $DEST_DIR && tar -xf - -C $DEST_DIR"
    
    if [ ! -z "$SSH_PASS" ] && command -v sshpass &> /dev/null; then
        tar -C "$SRC_DIR" -cf - . | sshpass -p "$SSH_PASS" ssh -p $PORT $SSH_USER@$HOST "$CMD"
    else
        tar -C "$SRC_DIR" -cf - . | ssh -p $PORT $SSH_USER@$HOST "$CMD"
    fi
}
# Special handler for root files which are individual files, not a dir content dump
deploy_root() {
    FILES="index.html tools.json favicon.png"
    CMD="tar -xf - -C $REMOTE_BASE"
    
    if [ ! -z "$SSH_PASS" ] && command -v sshpass &> /dev/null; then
        tar -cf - $FILES | sshpass -p "$SSH_PASS" ssh -p $PORT $SSH_USER@$HOST "$CMD"
    else
        tar -cf - $FILES | ssh -p $PORT $SSH_USER@$HOST "$CMD"
    fi
}

echo ""
read -p "Press Enter to start deployment..."

# 1. Always Deploy Root Files
echo "---------------------------------------------"
echo "Deploying Root Portal (index.html, tools.json, favicon)..."
deploy_root

# 2. Deploy Tools
index=0
menu_index=2
for id in "${TOOL_IDS[@]}"; do
  if [[ "$CHOICE" == "0" || "$CHOICE" == "$menu_index" ]]; then
      name="${TOOL_NAMES[$index]}"
      echo "---------------------------------------------"
      echo "Deploying $name..."
      
      deploy_tar "$id/dist" "$REMOTE_BASE/$id"
  fi
  ((index++))
  ((menu_index++))
done

echo ""
echo "============================================="
echo "      Deployment Complete!"
echo "============================================="
