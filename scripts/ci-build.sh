#!/bin/bash
# CI/CD Build script for MemLoop Extension
# Usage: ./scripts/ci-build.sh [dev|staging|prod]

set -euo pipefail

STAGE=${1:-dev}
REGION=${AWS_REGION:-eu-west-1}
TENANT=${TENANT:-carousel-labs}

echo "🔧 Building MemLoop Extension for stage: $STAGE"

# Ensure we're in the extension directory
cd "$(dirname "$0")/.."

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Run linting
echo "🔍 Running linter..."
npm run lint

# Build configuration
echo "⚙️ Building configuration for $STAGE..."
chmod +x scripts/build-config.sh
./scripts/build-config.sh "$STAGE" "$REGION" "$TENANT"

# Validate configuration
echo "✅ Validating configuration..."
if ! jq empty manifest.json; then
    echo "❌ Invalid manifest.json"
    exit 1
fi

if ! jq empty config/auth.defaults.json; then
    echo "❌ Invalid auth.defaults.json"
    exit 1
fi

# Validate required auth config fields
if ! jq -e '.cognito_domain' config/auth.defaults.json > /dev/null; then
    echo "❌ Missing cognito_domain in auth config"
    exit 1
fi

if ! jq -e '.cognito_client_id' config/auth.defaults.json > /dev/null; then
    echo "❌ Missing cognito_client_id in auth config"
    exit 1
fi

if ! jq -e '.auth_exchange_url' config/auth.defaults.json > /dev/null; then
    echo "❌ Missing auth_exchange_url in auth config"
    exit 1
fi

echo "✅ MemLoop Extension build completed successfully for $STAGE"
echo "📋 Configuration summary:"
cat config/auth.defaults.json | jq .
