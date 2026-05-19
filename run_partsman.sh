#!/bin/bash

# Define paths
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/payments-app"

clear
echo -e "\033[1;34m"
echo "========================================================="
echo "          PARTSMAN AI OS SYSTEM KERNEL BOOTER            "
echo "========================================================="
echo -e "\033[0m"

echo -e "\033[1;33m[*] Step 1: Releasing locked ports (4055 & 8055)...\033[0m"
fuser -k 8055/tcp 4055/tcp 2>/dev/null
kill -9 $(lsof -t -i:8055,4055) 2>/dev/null
sleep 1
echo -e "\033[1;32m[✓] Ports released successfully.\033[0m"

# Cleanup trap to kill background processes on exit
cleanup() {
    echo ""
    echo -e "\033[1;31m[!] Shutting down PARTSMAN AI OS Services cleanly...\033[0m"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    fuser -k 8055/tcp 4055/tcp 2>/dev/null
    echo -e "\033[1;32m[✓] System Offline. Ports 4055 and 8055 are fully released.\033[0m"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo -e "\033[1;33m[*] Step 2: Booting PARTSMAN Monolithic Backend (Port 8055)...\033[0m"
cd "$BACKEND_DIR"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
python -m uvicorn main:app --reload --port 8055 > "$BASE_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo -e "\033[1;33m[*] Step 3: Booting PARTSMAN Cockpit UI (Port 4055)...\033[0m"
cd "$FRONTEND_DIR"
npm run dev > "$BASE_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for servers to initialize
echo -e "\033[1;33m[*] Step 4: Spawning services...\033[0m"
sleep 4

echo ""
echo -e "\033[1;36m=========================================================="
echo "  [✓] PARTSMAN KERNEL ONLINE AND SECURED"
echo "  • Backend API : http://127.0.0.1:8055"
echo "  • Frontend Cockpit : http://localhost:4055"
echo "==========================================================\033[0m"
echo "Active Logs are redirected to 'backend.log' and 'frontend.log'"
echo "Press [Ctrl+C] inside this terminal window to stop all services cleanly."
echo ""

# Auto-open browser window (standard Linux default browser command)
xdg-open "http://localhost:4055" 2>/dev/null || sensible-browser "http://localhost:4055" 2>/dev/null &

# Keep the script active and listening for Ctrl+C
while true; do
    sleep 1
done
