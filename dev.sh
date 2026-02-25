#!/usr/bin/env bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Check if a port is in use
is_port_in_use() {
    local port=$1
    if lsof -i ":$port" &>/dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Find the next available port starting from a given port
find_available_port() {
    local port=$1
    local max_attempts=100
    local attempts=0

    while is_port_in_use "$port"; do
        ((attempts++))
        if [ "$attempts" -ge "$max_attempts" ]; then
            echo "Error: Could not find an available port after $max_attempts attempts starting from $1" >&2
            exit 1
        fi
        ((port++))
    done

    echo "$port"
}

echo -e "${BLUE}Starting PonziLand Development Environment${NC}"
echo ""

if ! command -v nix &> /dev/null; then
    echo "Error: Nix is not installed. Please install Nix first."
    echo "Visit: https://nixos.org/download.html"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "flake.nix" ]; then
    echo "Error: flake.nix not found in $SCRIPT_DIR"
    echo "This script must be run from the PonziLand project root."
    exit 1
fi

echo -e "${GREEN}✓ Nix found${NC}"
echo -e "${GREEN}✓ In correct directory: $SCRIPT_DIR${NC}"
echo ""

echo -e "${BLUE}Installing client dependencies...${NC}"
cd "$SCRIPT_DIR/client"
bun install
cd "$SCRIPT_DIR"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Default ports
DEFAULT_PG_PORT=5432
DEFAULT_PGADMIN_PORT=5050
DEFAULT_VITE_PORT=5173

echo -e "${BLUE}Checking port availability...${NC}"

PG_PORT=$(find_available_port $DEFAULT_PG_PORT)
if [ "$PG_PORT" -ne "$DEFAULT_PG_PORT" ]; then
    echo -e "${YELLOW}⚠ Port $DEFAULT_PG_PORT in use, using port $PG_PORT for PostgreSQL${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL port $PG_PORT available${NC}"
fi

PGADMIN_PORT=$(find_available_port $DEFAULT_PGADMIN_PORT)
if [ "$PGADMIN_PORT" -ne "$DEFAULT_PGADMIN_PORT" ]; then
    echo -e "${YELLOW}⚠ Port $DEFAULT_PGADMIN_PORT in use, using port $PGADMIN_PORT for PGAdmin${NC}"
else
    echo -e "${GREEN}✓ PGAdmin port $PGADMIN_PORT available${NC}"
fi

VITE_PORT=$(find_available_port $DEFAULT_VITE_PORT)
if [ "$VITE_PORT" -ne "$DEFAULT_VITE_PORT" ]; then
    echo -e "${YELLOW}⚠ Port $DEFAULT_VITE_PORT in use, using port $VITE_PORT for Frontend${NC}"
else
    echo -e "${GREEN}✓ Frontend port $VITE_PORT available${NC}"
fi

echo ""
echo -e "${BLUE}Starting services:${NC}"
echo -e "  PostgreSQL on port $PG_PORT"
echo -e "  PGAdmin on port $PGADMIN_PORT"
echo -e "  Frontend on port $VITE_PORT"
echo ""

# Export ports for nix to read (requires --impure flag)
export PONZILAND_PG_PORT=$PG_PORT
export PONZILAND_PGADMIN_PORT=$PGADMIN_PORT
export PONZILAND_VITE_PORT=$VITE_PORT

# Check if running in interactive terminal
if [ -t 0 ] && [ -t 1 ]; then
    # Interactive - use TUI
    nix run --impure .#dev
else
    # Non-interactive - disable TUI
    nix run --impure .#dev -- --tui=false
fi
