#!/bin/bash

# A more robust script to stop development servers.

# --- Configuration ---
PORTS_TO_STOP=(4000 5173) # API port and UI port

# --- Helper Function ---
# Tries to stop a process gracefully, then forcefully.
stop_process() {
  local pid=$1
  echo "  - Attempting graceful shutdown (PID: $pid)..."
  kill "$pid" &> /dev/null
  sleep 1 # Give it a moment to shut down

  # Check if the process is still running
  if ps -p "$pid" > /dev/null; then
    echo "  - Process did not stop, forcing shutdown (PID: $pid)..."
    kill -9 "$pid" &> /dev/null
    sleep 1
  fi

  if ps -p "$pid" > /dev/null; then
    echo "  - FAILED to stop process with PID: $pid."
  else
    echo "  - Process stopped successfully."
  fi
}

# --- Main Logic ---
echo "Attempting to stop processes on ports: ${PORTS_TO_STOP[*]}"
echo "-------------------------------------------------"

STOPPED_SOMETHING=false

for port in "${PORTS_TO_STOP[@]}"; do
  echo "Checking port $port..."
  PIDS=$(lsof -t -i:"$port")

  if [ -n "$PIDS" ]; then
    STOPPED_SOMETHING=true
    for pid in $PIDS; do
      stop_process "$pid"
    done
  else
    echo "  - No process found on this port."
  fi
done

echo "-------------------------------------------------"
if [ "$STOPPED_SOMETHING" = false ]; then
  echo "All specified ports were already free."
fi
echo "Stop script finished."