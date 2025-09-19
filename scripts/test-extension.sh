#!/bin/bash
# Test MemLoop Extension locally
# Usage: ./scripts/test-extension.sh [dev|staging|prod]

set -euo pipefail

STAGE=${1:-dev}

echo "🧪 Testing MemLoop Extension for $STAGE"

# Ensure we're in the extension directory
cd "$(dirname "$0")/.."

# Build the extension first
echo "🔧 Building extension..."
./scripts/ci-build.sh "$STAGE"

# Run additional validation tests
echo "🔍 Running validation tests..."

# Test 1: Validate manifest.json structure
echo "  ✓ Validating manifest.json..."
MANIFEST_VERSION=$(jq -r '.manifest_version' manifest.json)
if [ "$MANIFEST_VERSION" != "3" ]; then
    echo "    ❌ Expected manifest_version 3, got $MANIFEST_VERSION"
    exit 1
fi

# Test 2: Validate required permissions
echo "  ✓ Checking permissions..."
REQUIRED_PERMS=("storage" "activeTab" "identity")
for perm in "${REQUIRED_PERMS[@]}"; do
    if ! jq -e --arg perm "$perm" '.permissions | index($perm)' manifest.json > /dev/null; then
        echo "    ❌ Missing required permission: $perm"
        exit 1
    fi
done

# Test 3: Validate auth configuration
echo "  ✓ Validating auth configuration..."
AUTH_CONFIG="config/auth.defaults.json"
if [ ! -f "$AUTH_CONFIG" ]; then
    echo "    ❌ Missing auth configuration file"
    exit 1
fi

COGNITO_DOMAIN=$(jq -r '.cognito_domain' "$AUTH_CONFIG")
CLIENT_ID=$(jq -r '.cognito_client_id' "$AUTH_CONFIG")
EXCHANGE_URL=$(jq -r '.auth_exchange_url' "$AUTH_CONFIG")

# For dev environment, we allow null values but warn about them
if [ "$STAGE" == "dev" ]; then
    if [ "$COGNITO_DOMAIN" == "null" ] || [ -z "$COGNITO_DOMAIN" ]; then
        echo "    ⚠️  Warning: Null cognito_domain in dev environment (expected if SSM not configured)"
    fi
    if [ "$CLIENT_ID" == "null" ] || [ -z "$CLIENT_ID" ]; then
        echo "    ⚠️  Warning: Null cognito_client_id in dev environment (expected if SSM not configured)"
    fi
else
    # For staging/prod, we require valid values
    if [ "$COGNITO_DOMAIN" == "null" ] || [ -z "$COGNITO_DOMAIN" ]; then
        echo "    ❌ Invalid or missing cognito_domain in $STAGE environment"
        exit 1
    fi
    if [ "$CLIENT_ID" == "null" ] || [ -z "$CLIENT_ID" ]; then
        echo "    ❌ Invalid or missing cognito_client_id in $STAGE environment"
        exit 1
    fi
fi

if [ "$EXCHANGE_URL" == "null" ] || [ -z "$EXCHANGE_URL" ]; then
    echo "    ❌ Invalid or missing auth_exchange_url"
    exit 1
fi

# Test 4: Validate critical JavaScript files
echo "  ✓ Checking JavaScript files..."
CRITICAL_FILES=(
    "utils/auth.js"
    "utils/auto_config.js"
    "popup.js"
    "sw.js"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "    ❌ Missing critical file: $file"
        exit 1
    fi
    
    # Basic syntax check (if node is available)
    if command -v node >/dev/null 2>&1; then
        if ! node -c "$file" 2>/dev/null; then
            echo "    ❌ Syntax error in $file"
            exit 1
        fi
    fi
done

# Test 5: Validate expected stage-specific URLs
echo "  ✓ Validating stage-specific configuration..."
case "$STAGE" in
    dev)
        EXPECTED_EXCHANGE="https://api.dev.carousellabs.co/auth/exchange"
        ;;
    staging)
        EXPECTED_EXCHANGE="https://api.staging.carousellabs.co/auth/exchange"
        ;;
    prod)
        EXPECTED_EXCHANGE="https://api.carousellabs.co/auth/exchange"
        ;;
esac

if [ "$EXCHANGE_URL" != "$EXPECTED_EXCHANGE" ]; then
    echo "    ⚠️  Exchange URL mismatch: expected $EXPECTED_EXCHANGE, got $EXCHANGE_URL"
fi

# Test 6: Package the extension and verify
echo "  ✓ Testing packaging..."
./scripts/package-extension.sh "$STAGE" "test-dist"

if [ ! -f "test-dist/memloop-extension-${STAGE}-latest.zip" ]; then
    echo "    ❌ Package creation failed"
    exit 1
fi

# Clean up test artifacts
rm -rf test-dist/

echo "✅ All tests passed for $STAGE!"
echo ""
echo "📋 Extension Summary:"
echo "   Stage: $STAGE"
echo "   Cognito Domain: $COGNITO_DOMAIN"
echo "   Client ID: $CLIENT_ID"
echo "   Exchange URL: $EXCHANGE_URL"
