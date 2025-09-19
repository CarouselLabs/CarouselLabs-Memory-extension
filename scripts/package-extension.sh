#!/bin/bash
# Package MemLoop Extension for distribution
# Usage: ./scripts/package-extension.sh [dev|staging|prod] [output-dir]

set -euo pipefail

STAGE=${1:-dev}
OUTPUT_DIR=${2:-dist}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "📦 Packaging MemLoop Extension for $STAGE"

# Ensure we're in the extension directory
cd "$(dirname "$0")/.."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "📋 Copying extension files to temporary directory..."

# Copy all extension files except development files
rsync -av \
  --exclude='.git*' \
  --exclude='node_modules/' \
  --exclude='tests/' \
  --exclude='scripts/' \
  --exclude='*.md' \
  --exclude='*.code-workspace' \
  --exclude='package*.json' \
  --exclude='.eslint*' \
  --exclude='dist/' \
  . "$TEMP_DIR/"

# Validate critical files exist
echo "✅ Validating package contents..."
test -f "$TEMP_DIR/manifest.json" || { echo "❌ Missing manifest.json"; exit 1; }
test -f "$TEMP_DIR/config/auth.defaults.json" || { echo "❌ Missing auth.defaults.json"; exit 1; }
test -f "$TEMP_DIR/utils/auth.js" || { echo "❌ Missing auth.js"; exit 1; }
test -f "$TEMP_DIR/popup.html" || { echo "❌ Missing popup.html"; exit 1; }
test -f "$TEMP_DIR/sw.js" || { echo "❌ Missing service worker"; exit 1; }

# Create versioned package name
VERSION=$(jq -r '.version // "1.0.0"' package.json)
PACKAGE_NAME="memloop-extension-${STAGE}-${VERSION}-${TIMESTAMP}"
ZIP_FILE_PATH="$(pwd)/${OUTPUT_DIR}/${PACKAGE_NAME}.zip"

echo "📦 Creating package: $ZIP_FILE_PATH"

# Create the zip package
(cd "$TEMP_DIR" && zip -r -q "$ZIP_FILE_PATH" .)

# Get back to original directory
# No need for cd - as we are in a subshell

# Create latest symlink
LATEST_FILE="$(pwd)/${OUTPUT_DIR}/memloop-extension-${STAGE}-latest.zip"
ln -sf "$(basename "$ZIP_FILE_PATH")" "$LATEST_FILE"

echo "✅ Extension packaged successfully:"
echo "   📦 Package: $ZIP_FILE_PATH"
echo "   🔗 Latest: $LATEST_FILE"
echo "   📊 Size: $(du -h "$ZIP_FILE_PATH" | cut -f1)"

# Display package contents summary
echo ""
echo "📋 Package contents:"
unzip -l "$ZIP_FILE_PATH" | head -20
