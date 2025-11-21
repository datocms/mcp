#!/bin/bash

# DatoCMS MCP Desktop Extension Build Script
set -e

echo "Building DatoCMS MCP Desktop Extension..."

# Clean previous builds
rm -rf dxt-dist/
rm -f *.mcpb *.dxt

# Build TypeScript
npm run build

# Generate manifest
echo "Generating manifest..."
node scripts/generate-mcpb-manifest.js

# Copy package.json first
cp package.json dxt-dist/package.json

# Install production dependencies
echo "Installing production dependencies..."
cd dxt-dist
npm install --production --silent
cd ..

# Copy compiled server files AFTER npm install (npm install removes files not in package.json files array)
cp -r dist dxt-dist/dist
cp -r bin dxt-dist/bin

# Create .mcpbignore to NOT exclude dist (root .gitignore excludes it)
echo "# Override root .gitignore - include dist" > dxt-dist/.mcpbignore

# Copy assets
if [ -d "assets" ]; then
  mkdir -p dxt-dist/assets
  cp -r assets/* dxt-dist/assets/
fi

# Validate and pack using official CLI
echo "Validating manifest..."
npx mcpb validate dxt-dist/manifest.json

echo "Creating MCPB package..."
npx mcpb pack dxt-dist datocms-mcp.mcpb

echo ""
echo "Done! Created datocms-mcp.mcpb"
echo "To install: Open the file in Claude Desktop"
