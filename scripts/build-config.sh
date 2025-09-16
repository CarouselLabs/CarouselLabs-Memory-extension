#!/bin/bash
# Build-time config injection per unified deployment guide
# Usage: ./scripts/build-config.sh [dev|staging|prod]

set -euo pipefail

STAGE=${1:-dev}
REGION=${2:-eu-west-1}
TENANT=${3:-carousel-labs}

echo "Building config for stage: $STAGE"

# SSM path per unified guide convention
PARAM="/tf/$STAGE/$TENANT/services/mem0/cognito_config"

# Fetch Cognito config from SSM
echo "Fetching SSM parameter: $PARAM"
COGNITO_CONFIG=$(aws ssm get-parameter \
  --with-decryption \
  --region "$REGION" \
  --name "$PARAM" \
  --query Parameter.Value --output text)

# Extract values using jq
COGNITO_DOMAIN=$(echo "$COGNITO_CONFIG" | jq -r '.domainUrl // .domain' | sed 's#^https://##')
CLIENT_ID=$(echo "$COGNITO_CONFIG" | jq -r '.webClientId // .clientId')

# Build auth exchange URL per stage
case "$STAGE" in
  dev)
    EXCHANGE_URL="https://api.dev.carousellabs.co/auth/exchange"
    ;;
  staging)
    EXCHANGE_URL="https://api.staging.carousellabs.co/auth/exchange"
    ;;
  prod)
    EXCHANGE_URL="https://api.carousellabs.co/auth/exchange"
    ;;
  *)
    echo "Unknown stage: $STAGE" >&2
    exit 1
    ;;
esac

# Write baked defaults
CONFIG_FILE="config/auth.defaults.json"
echo "Writing $CONFIG_FILE"

jq -n \
  --arg domain "$COGNITO_DOMAIN" \
  --arg client "$CLIENT_ID" \
  --arg exchange "$EXCHANGE_URL" \
  '{
    cognito_domain: $domain,
    cognito_client_id: $client,
    auth_exchange_url: $exchange
  }' > "$CONFIG_FILE"

echo "✅ Config written for $STAGE:"
cat "$CONFIG_FILE"





