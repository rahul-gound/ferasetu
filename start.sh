#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start backend in background
cd "$ROOT/backend" && node dist/index.js &
BACKEND_PID=$!

# Start frontend
cd "$ROOT/frontend" && npm run dev

# If frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null
