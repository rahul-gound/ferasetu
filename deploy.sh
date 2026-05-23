#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting FeraSetu in production mode..."

export NODE_ENV=production
export PORT=5000
export HOST=0.0.0.0

exec node "$ROOT/backend/dist/index.js"
