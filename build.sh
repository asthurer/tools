#!/bin/bash

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}      Building All Tools from tools.json${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

if [ ! -f "tools.json" ]; then
    echo -e "${RED}ERROR: tools.json not found!${NC}"
    exit 1
fi

BUILD_DIR=".build"
if [ -d "$BUILD_DIR" ]; then rm -rf "$BUILD_DIR"; fi
mkdir -p "$BUILD_DIR"

success_count=0
failure_count=0
failed_tools=()

tool_count=$(jq '. | length' tools.json)

for i in $(seq 0 $((tool_count - 1))); do
    tool_id=$(jq -r ".[$i].id" tools.json)
    tool_name=$(jq -r ".[$i].name" tools.json)
    
    echo -e "${YELLOW}---------------------------------------------${NC}"
    echo -e "${CYAN}Building: $tool_name ($tool_id)${NC}"
    
    if [ ! -d "$tool_id" ]; then
        echo -e "  ${YELLOW}Skipping: Directory not found${NC}"
        ((failure_count++))
        failed_tools+=("$tool_name")
        continue
    fi
    
    cd "$tool_id" || continue
    
    if [ ! -f "package.json" ]; then
        echo -e "  ${YELLOW}Skipping: No package.json${NC}"
        ((success_count++))
        cd ..
        continue
    fi
    
    echo -e "  ${GRAY}Installing dependencies...${NC}"
    if [ "$tool_id" == "code-vision" ]; then
         echo -e "  ${GRAY}(Using --legacy-peer-deps)${NC}"
         npm install --legacy-peer-deps --silent > /dev/null 2>&1
    else
         npm install --silent > /dev/null 2>&1
    fi
    
    echo -e "  ${GREEN}Building...${NC}"
    if npm run build; then
        echo -e "  ${GREEN}✓ Build successful!${NC}"
        
        DEST_DIR="../$BUILD_DIR/$tool_id"
        mkdir -p "$DEST_DIR"
        
        if [ -d "dist" ]; then
            cp -r dist/* "$DEST_DIR/"
            echo -e "  ${GREEN}✓ Artifacts copied to .build/$tool_id${NC}"
            ((success_count++))
        else
            echo -e "  ${YELLOW}WARNING: dist folder not found!${NC}"
        fi
    else
        echo -e "  ${RED}✗ Build failed!${NC}"
        ((failure_count++))
        failed_tools+=("$tool_name")
    fi
    
    cd ..
    echo ""
done

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}      Build Summary${NC}"
echo -e "Total: $tool_count | Success: $success_count | Failed: $failure_count"

if [ ${#failed_tools[@]} -gt 0 ]; then
    echo -e "${RED}Failed Tools: ${failed_tools[*]}${NC}"
    exit 1
fi
echo -e "${CYAN}=============================================${NC}"
