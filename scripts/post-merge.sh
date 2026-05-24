#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Running post-merge setup..."

echo "Installing backend dependencies..."
npm install --prefix "$ROOT/backend"

echo "Installing frontend dependencies..."
npm install --prefix "$ROOT/frontend"

echo "Building backend..."
npm run build --prefix "$ROOT/backend"

echo "Post-merge setup complete."
