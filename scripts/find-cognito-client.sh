#!/usr/bin/env bash
set -euo pipefail

# Find a Cognito app client suitable for a Chrome extension (Hosted UI + PKCE)
# Outputs JSON compatible with the extension's baked defaults file.
#
# Requirements: awscli v2, jq
#
# Usage examples:
#   ./scripts/find-cognito-client.sh \
#     --region eu-west-1 \
#     --issuer https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_ABC123 \
#     --domain auth-carousel-dev.auth.eu-west-1.amazoncognito.com \
#     --exchange-url https://api.dev.carousellabs.co/auth/exchange \
#     --write-defaults
#
#   ./scripts/find-cognito-client.sh --region eu-west-1 --domain-prefix auth-carousel-dev \
#     --exchange-url https://api.dev.carousellabs.co/auth/exchange

usage() {
  cat <<'USAGE'
find-cognito-client.sh

Required:
  --region <aws-region>

Provide ONE of:
  --issuer <issuer-url>                # e.g. https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_ABC123
  --domain-prefix <hosted-ui-prefix>   # e.g. auth-carousel-dev
  --pool-id <eu-west-1_ABC123>

Optional:
  --profile <aws-profile>
  --domain <full-hosted-ui-domain>     # e.g. auth-carousel-dev.auth.eu-west-1.amazoncognito.com (overrides derived)
  --client-name-regex <pattern>        # prefer clients whose ClientName matches regex
  --exchange-url <https://.../auth/exchange>
  --write-defaults                     # write config/auth.defaults.json in the extension repo

Outputs JSON: { cognito_domain, cognito_client_id, auth_exchange_url }
USAGE
}

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: $1 is required" >&2; exit 1; }; }
need aws; need jq

PROFILE=""; REGION=""; ISSUER=""; POOL_ID=""; DOMAIN_PREFIX=""; DOMAIN="";
CLIENT_NAME_REGEX=""; EXCHANGE_URL=""; WRITE_DEFAULTS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="--profile $2"; shift 2;;
    --region) REGION="$2"; shift 2;;
    --issuer) ISSUER="$2"; shift 2;;
    --pool-id) POOL_ID="$2"; shift 2;;
    --domain-prefix) DOMAIN_PREFIX="$2"; shift 2;;
    --domain) DOMAIN="$2"; shift 2;;
    --client-name-regex) CLIENT_NAME_REGEX="$2"; shift 2;;
    --exchange-url) EXCHANGE_URL="$2"; shift 2;;
    --write-defaults) WRITE_DEFAULTS=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "unknown arg: $1" >&2; usage; exit 1;;
  esac
done

[[ -n "$REGION" ]] || { echo "--region is required" >&2; usage; exit 1; }

# Derive pool id if needed
if [[ -z "$POOL_ID" ]]; then
  if [[ -n "$ISSUER" ]]; then
    POOL_ID="${ISSUER##*/}"
  elif [[ -n "$DOMAIN_PREFIX" ]]; then
    DESC=$(aws $PROFILE cognito-idp describe-user-pool-domain --region "$REGION" --domain "$DOMAIN_PREFIX" 2>/dev/null || true)
    POOL_ID=$(echo "$DESC" | jq -r '.DomainDescription.UserPoolId // empty')
    [[ -n "$POOL_ID" ]] || { echo "could not derive pool id from domain-prefix" >&2; exit 1; }
  else
    echo "one of --issuer | --domain-prefix | --pool-id is required" >&2; usage; exit 1
  fi
fi

# Derive hosted UI domain if not provided
if [[ -z "$DOMAIN" ]]; then
  if [[ -n "$DOMAIN_PREFIX" ]]; then
    DOMAIN="$DOMAIN_PREFIX.auth.$REGION.amazoncognito.com"
  else
    # fall back to UserPool.Domain (domain prefix) if available
    UP=$(aws $PROFILE cognito-idp describe-user-pool --region "$REGION" --user-pool-id "$POOL_ID")
    DP=$(echo "$UP" | jq -r '.UserPool.Domain // empty')
    if [[ -n "$DP" ]]; then
      DOMAIN="$DP.auth.$REGION.amazoncognito.com"
    fi
  fi
fi

# Collect candidate clients
CLIENT_IDS=$(aws $PROFILE cognito-idp list-user-pool-clients --region "$REGION" --user-pool-id "$POOL_ID" --max-results 60 \
  | jq -r '.UserPoolClients[].ClientId')

[[ -n "$CLIENT_IDS" ]] || { echo "no app clients found in pool $POOL_ID" >&2; exit 1; }

BEST_JSON=""
while read -r CID; do
  [[ -n "$CID" ]] || continue
  J=$(aws $PROFILE cognito-idp describe-user-pool-client --region "$REGION" --user-pool-id "$POOL_ID" --client-id "$CID" \
      | jq '.UserPoolClient')
  NAME=$(echo "$J" | jq -r '.ClientName // ""')
  HAS_CODE=$(echo "$J" | jq -r '((.AllowedOAuthFlows // []) | index("code") != null)')
  IS_OAUTH=$(echo "$J" | jq -r '(.AllowedOAuthFlowsUserPoolClient == true)')
  HAS_SECRET=$(echo "$J" | jq -r '(.GenerateSecret == true)')
  if [[ "$HAS_CODE" == "true" && "$IS_OAUTH" == "true" && "$HAS_SECRET" == "false" ]]; then
    if [[ -z "$CLIENT_NAME_REGEX" || "$NAME" =~ $CLIENT_NAME_REGEX ]]; then
      BEST_JSON="$J"; break
    fi
  fi
done <<< "$CLIENT_IDS"

if [[ -z "$BEST_JSON" ]]; then
  # fallback: first oauth code-flow client without secret
  while read -r CID; do
    [[ -n "$CID" ]] || continue
    J=$(aws $PROFILE cognito-idp describe-user-pool-client --region "$REGION" --user-pool-id "$POOL_ID" --client-id "$CID" \
        | jq '.UserPoolClient')
    HAS_CODE=$(echo "$J" | jq -r '((.AllowedOAuthFlows // []) | index("code") != null)')
    IS_OAUTH=$(echo "$J" | jq -r '(.AllowedOAuthFlowsUserPoolClient == true)')
    HAS_SECRET=$(echo "$J" | jq -r '(.GenerateSecret == true)')
    if [[ "$HAS_CODE" == "true" && "$IS_OAUTH" == "true" && "$HAS_SECRET" == "false" ]]; then
      BEST_JSON="$J"; break
    fi
  done <<< "$CLIENT_IDS"
fi

[[ -n "$BEST_JSON" ]] || { echo "no suitable public PKCE client found in pool $POOL_ID" >&2; exit 1; }

CLIENT_ID=$(echo "$BEST_JSON" | jq -r '.ClientId')

OUT=$(jq -n --arg domain "$DOMAIN" --arg client "$CLIENT_ID" --arg exchange "$EXCHANGE_URL" '
  { cognito_domain: $domain, cognito_client_id: $client } + (if $exchange != "" then { auth_exchange_url: $exchange } else {} end)
')

echo "$OUT"

if [[ $WRITE_DEFAULTS -eq 1 ]]; then
  DEST="$(cd "$(dirname "$0")/.." && pwd)/config/auth.defaults.json"
  mkdir -p "$(dirname "$DEST")"
  echo "$OUT" | jq '{cognito_domain, cognito_client_id, auth_exchange_url: (.auth_exchange_url // "")}' > "$DEST"
  echo "wrote $DEST" >&2
fi








